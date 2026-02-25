/**
 * TEBURN 시그널 프로바이더
 * 기존 TEBURN 서버의 /api/leading/hot 에서 주도주 데이터를 가져와
 * 자동매매 시그널로 변환
 */

import axios from 'axios';
import { config } from './config.js';

// TEBURN의 HotnessScore 타입 (hotnessService.ts 기반)
export interface HotnessScore {
  stockCode: string;
  stockName: string;
  currentPrice: number;
  changeRate: number;
  tradingValue: number;
  themes: string[];
  totalScore: number;
  tradingValueScore: number;
  momentumScore: number;
  volumeScore: number;
  newsScore: number;
  themeConcentrationScore: number;
  volumeSurgeRate: number | null;
  newsCount: number;
  latestNews: string | null;
  themeConcentration: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

export interface TradeSignal {
  stockCode: string;
  stockName: string;
  currentPrice: number;
  changeRate: number;
  tradingValue: number;
  hotnessScore: number;
  grade: string;
  themes: string[];
  reason: string;          // 매수 사유 요약
  confidence: number;      // 신뢰도 (0~1)
}

const gradeOrder: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

/**
 * TEBURN API에서 주도주 데이터 조회
 */
export async function fetchHotStocks(): Promise<HotnessScore[]> {
  try {
    const { data } = await axios.get<HotnessScore[]>(
      `${config.teburnApiUrl}/api/leading/hot`,
      { timeout: 10000 }
    );
    return data;
  } catch (error: any) {
    console.error('❌ TEBURN API 호출 실패:', error.message);
    return [];
  }
}

/**
 * 주도주 데이터를 매매 시그널로 변환
 * TEBURN의 hotnessScore + 기본 필터링
 */
export async function getTradeSignals(): Promise<TradeSignal[]> {
  const hotStocks = await fetchHotStocks();

  if (hotStocks.length === 0) {
    console.log('📭 TEBURN에서 주도주 데이터 없음');
    return [];
  }

  console.log(`📊 TEBURN 주도주 ${hotStocks.length}개 수신`);

  const { minGrade, minHotnessScore, minChangeRate, maxChangeRate, minTradingValue } = config.strategy;
  const minGradeNum = gradeOrder[minGrade] || 5;

  const signals: TradeSignal[] = [];

  for (const stock of hotStocks) {
    const stockGradeNum = gradeOrder[stock.grade] || 0;

    // 1. 등급 필터
    if (stockGradeNum < minGradeNum) continue;

    // 2. 점수 필터
    if (stock.totalScore < minHotnessScore) continue;

    // 3. 등락률 범위 필터
    if (stock.changeRate < minChangeRate || stock.changeRate > maxChangeRate) continue;

    // 4. 거래대금 필터
    if (stock.tradingValue < minTradingValue) continue;

    // 매수 사유 생성
    const reasons: string[] = [];
    if (stock.grade === 'S') reasons.push(`S등급(${stock.totalScore}점)`);
    else reasons.push(`${stock.grade}등급(${stock.totalScore}점)`);
    if (stock.volumeSurgeRate && stock.volumeSurgeRate >= 3) reasons.push(`거래량 ${stock.volumeSurgeRate.toFixed(1)}배 급증`);
    if (stock.newsCount >= 5) reasons.push(`뉴스 ${stock.newsCount}건`);
    if (stock.themeConcentration >= 30) reasons.push(`테마 집중도 ${stock.themeConcentration}%`);
    if (stock.themes.length > 0) reasons.push(`테마: ${stock.themes.slice(0, 2).join(', ')}`);

    // 신뢰도 계산 (점수 기반)
    const confidence = Math.min(1, stock.totalScore / 100);

    signals.push({
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      currentPrice: stock.currentPrice,
      changeRate: stock.changeRate,
      tradingValue: stock.tradingValue,
      hotnessScore: stock.totalScore,
      grade: stock.grade,
      themes: stock.themes,
      reason: reasons.join(' | '),
      confidence,
    });
  }

  // 신뢰도 순 정렬
  signals.sort((a, b) => b.confidence - a.confidence);

  console.log(`🎯 매매 시그널 ${signals.length}개 생성 (${minGrade}등급 이상, ${minHotnessScore}점+)`);
  return signals;
}
