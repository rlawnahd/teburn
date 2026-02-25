/**
 * 기술적 지표 필터
 * TEBURN 시그널을 추가 검증하기 위한 RSI, MA 필터
 * KIS API의 일봉/분봉 데이터를 사용
 */

import axios from 'axios';
import { config } from './config.js';

// KIS 토큰 (kisTrader에서 공유)
let getToken: (() => Promise<string>) | null = null;

export function setTokenGetter(fn: () => Promise<string>) {
  getToken = fn;
}

interface ChartCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * KIS API로 일봉 데이터 조회
 */
async function fetchDailyCandles(stockCode: string, count: number = 60): Promise<ChartCandle[]> {
  if (!getToken) throw new Error('토큰 getter 미설정');

  const token = await getToken();
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10).replace(/-/g, '');

  // 약 3개월 전
  const startDate = new Date(today.getTime() - count * 2 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, '');

  try {
    const { data } = await axios.get(
      `${config.kis.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          authorization: `Bearer ${token}`,
          appkey: config.kis.appKey,
          appsecret: config.kis.appSecret,
          tr_id: 'FHKST03010100',
        },
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: stockCode,
          FID_INPUT_DATE_1: startDate,
          FID_INPUT_DATE_2: endDate,
          FID_PERIOD_DIV_CODE: 'D',
          FID_ORG_ADJ_PRC: '0',
        },
        timeout: 5000,
      }
    );

    if (data.rt_cd !== '0' || !data.output2) return [];

    return data.output2
      .filter((d: any) => d.stck_bsop_date)
      .map((d: any) => ({
        date: d.stck_bsop_date,
        open: parseInt(d.stck_oprc) || 0,
        high: parseInt(d.stck_hgpr) || 0,
        low: parseInt(d.stck_lwpr) || 0,
        close: parseInt(d.stck_clpr) || 0,
        volume: parseInt(d.acml_vol) || 0,
      }))
      .reverse(); // 오래된 날짜 → 최신 순서로
  } catch (error: any) {
    console.error(`차트 조회 실패 (${stockCode}):`, error.message);
    return [];
  }
}

/**
 * RSI 계산 (Wilder's smoothing)
 */
function calculateRSI(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * 단순 이동평균 계산
 */
function calculateSMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export interface TechnicalResult {
  stockCode: string;
  passed: boolean;
  rsi: number | null;
  fastMA: number | null;
  slowMA: number | null;
  maSignal: 'bullish' | 'bearish' | 'neutral';
  reasons: string[];
}

/**
 * 종목에 대한 기술적 필터 적용
 * - RSI가 과매수 구간이 아닌지
 * - 단기 MA > 장기 MA (상승 추세)인지
 */
export async function applyTechnicalFilter(stockCode: string): Promise<TechnicalResult> {
  const result: TechnicalResult = {
    stockCode,
    passed: true,
    rsi: null,
    fastMA: null,
    slowMA: null,
    maSignal: 'neutral',
    reasons: [],
  };

  // 필터 모두 비활성화면 바로 통과
  if (!config.strategy.rsiEnabled && !config.strategy.maEnabled) {
    result.reasons.push('기술적 필터 비활성화');
    return result;
  }

  const candles = await fetchDailyCandles(stockCode);

  if (candles.length < 20) {
    result.reasons.push('차트 데이터 부족 — 필터 스킵');
    return result;
  }

  const closes = candles.map((c) => c.close);

  // RSI 필터
  if (config.strategy.rsiEnabled) {
    const rsi = calculateRSI(closes, config.strategy.rsiPeriod);
    result.rsi = rsi;

    if (rsi !== null) {
      if (rsi > config.strategy.rsiOverbought) {
        result.passed = false;
        result.reasons.push(`RSI ${rsi.toFixed(1)} → 과매수 구간 (${config.strategy.rsiOverbought} 초과)`);
      } else if (rsi < config.strategy.rsiOversold) {
        result.reasons.push(`RSI ${rsi.toFixed(1)} → 과매도 구간 (반등 기대)`);
      } else {
        result.reasons.push(`RSI ${rsi.toFixed(1)} → 정상`);
      }
    }
  }

  // MA 필터
  if (config.strategy.maEnabled) {
    const fastMA = calculateSMA(closes, config.strategy.maFastPeriod);
    const slowMA = calculateSMA(closes, config.strategy.maSlowPeriod);
    result.fastMA = fastMA;
    result.slowMA = slowMA;

    if (fastMA !== null && slowMA !== null) {
      if (fastMA > slowMA) {
        result.maSignal = 'bullish';
        result.reasons.push(`MA${config.strategy.maFastPeriod}(${fastMA.toFixed(0)}) > MA${config.strategy.maSlowPeriod}(${slowMA.toFixed(0)}) → 상승추세`);
      } else {
        result.maSignal = 'bearish';
        result.passed = false;
        result.reasons.push(`MA${config.strategy.maFastPeriod}(${fastMA.toFixed(0)}) < MA${config.strategy.maSlowPeriod}(${slowMA.toFixed(0)}) → 하락추세`);
      }
    }
  }

  // API rate limit 방지
  await new Promise((r) => setTimeout(r, 100));

  return result;
}
