/**
 * 리스크 매니저
 * 포지션 추적, 손절/익절, 일일 손실 한도 관리
 */

import { config } from './config.js';
import { getStockPrice, sellStock, getAccountBalance, type BalanceItem } from './kisTrader.js';
import { notify } from './notifier.js';

export interface Position {
  stockCode: string;
  stockName: string;
  entryPrice: number;
  qty: number;
  entryTime: number;
  highPrice: number;       // 보유 중 최고가 (트레일링 스탑용)
  reason: string;          // 매수 사유
  hotnessScore: number;
}

// 인메모리 포지션 추적
const positions = new Map<string, Position>();
let dailyRealizedPnl = 0;    // 당일 실현 손익
let dailyResetDate = '';       // 일일 리셋 날짜

// ─── 포지션 관리 ────────────────────────

export function addPosition(pos: Position): void {
  positions.set(pos.stockCode, pos);
  console.log(`📌 포지션 추가: ${pos.stockName}(${pos.stockCode}) ${pos.qty}주 @ ${pos.entryPrice.toLocaleString()}원`);
}

export function removePosition(stockCode: string): Position | undefined {
  const pos = positions.get(stockCode);
  positions.delete(stockCode);
  return pos;
}

export function getPosition(stockCode: string): Position | undefined {
  return positions.get(stockCode);
}

export function getAllPositions(): Position[] {
  return Array.from(positions.values());
}

export function getPositionCount(): number {
  return positions.size;
}

export function hasPosition(stockCode: string): boolean {
  return positions.has(stockCode);
}

// ─── 일일 리셋 ─────────────────────────

function checkDailyReset(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyResetDate !== today) {
    dailyRealizedPnl = 0;
    dailyResetDate = today;
    console.log(`📅 일일 손익 리셋 (${today})`);
  }
}

export function getDailyPnl(): number {
  checkDailyReset();
  return dailyRealizedPnl;
}

// ─── 진입 가능 여부 체크 ─────────────────

export function canEnterNewPosition(): { allowed: boolean; reason: string } {
  checkDailyReset();

  // 최대 포지션 수 체크
  if (positions.size >= config.risk.maxPositions) {
    return { allowed: false, reason: `최대 포지션 수(${config.risk.maxPositions}) 도달` };
  }

  // 일일 손실 한도 체크
  if (dailyRealizedPnl <= -config.risk.dailyLossLimitKrw) {
    return {
      allowed: false,
      reason: `일일 손실 한도(${config.risk.dailyLossLimitKrw.toLocaleString()}원) 도달 (현재: ${dailyRealizedPnl.toLocaleString()}원)`,
    };
  }

  return { allowed: true, reason: 'OK' };
}

// ─── 포지션 모니터링 (손절/익절/트레일링) ───

export interface MonitorResult {
  stockCode: string;
  stockName: string;
  action: 'hold' | 'stop_loss' | 'take_profit' | 'trailing_stop';
  currentPrice: number;
  entryPrice: number;
  pnlPercent: number;
  pnlKrw: number;
}

/**
 * 모든 포지션 모니터링 — 손절/익절 조건 체크 및 자동 매도
 */
export async function monitorPositions(): Promise<MonitorResult[]> {
  const results: MonitorResult[] = [];

  for (const [stockCode, pos] of positions) {
    const price = await getStockPrice(stockCode);
    if (!price) {
      results.push({
        stockCode,
        stockName: pos.stockName,
        action: 'hold',
        currentPrice: 0,
        entryPrice: pos.entryPrice,
        pnlPercent: 0,
        pnlKrw: 0,
      });
      continue;
    }

    const currentPrice = price.currentPrice;
    const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
    const pnlKrw = (currentPrice - pos.entryPrice) * pos.qty;

    // 최고가 갱신
    if (currentPrice > pos.highPrice) {
      pos.highPrice = currentPrice;
    }

    let action: MonitorResult['action'] = 'hold';

    // 1. 손절 체크
    if (pnlPercent <= -config.risk.stopLossPercent) {
      action = 'stop_loss';
    }
    // 2. 익절 체크
    else if (pnlPercent >= config.risk.takeProfitPercent) {
      action = 'take_profit';
    }
    // 3. 트레일링 스탑 체크
    else if (config.risk.trailingStopEnabled && pos.highPrice > pos.entryPrice) {
      const dropFromHigh = ((pos.highPrice - currentPrice) / pos.highPrice) * 100;
      if (dropFromHigh >= config.risk.trailingStopPercent && pnlPercent > 0) {
        action = 'trailing_stop';
      }
    }

    // 매도 실행
    if (action !== 'hold') {
      const actionLabel =
        action === 'stop_loss' ? '🛑 손절' :
        action === 'take_profit' ? '🎯 익절' :
        '📉 트레일링 스탑';

      console.log(`${actionLabel}: ${pos.stockName} | ${pnlPercent.toFixed(2)}% (${pnlKrw.toLocaleString()}원)`);

      const result = await sellStock(stockCode, pos.qty);

      if (result.success) {
        dailyRealizedPnl += pnlKrw;
        removePosition(stockCode);

        await notify('sell', {
          stockName: pos.stockName,
          stockCode,
          action: actionLabel,
          entryPrice: pos.entryPrice,
          exitPrice: currentPrice,
          qty: pos.qty,
          pnlPercent,
          pnlKrw,
        });
      }
    }

    results.push({
      stockCode,
      stockName: pos.stockName,
      action,
      currentPrice,
      entryPrice: pos.entryPrice,
      pnlPercent,
      pnlKrw,
    });

    // API rate limit
    await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}

/**
 * 장 마감 전 전량 청산
 */
export async function closeAllPositions(reason: string = '장 마감 청산'): Promise<void> {
  console.log(`\n🔔 ${reason} — 전량 청산 시작`);

  for (const [stockCode, pos] of positions) {
    const price = await getStockPrice(stockCode);
    const currentPrice = price?.currentPrice || pos.entryPrice;
    const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
    const pnlKrw = (currentPrice - pos.entryPrice) * pos.qty;

    const result = await sellStock(stockCode, pos.qty);

    if (result.success) {
      dailyRealizedPnl += pnlKrw;
      removePosition(stockCode);

      await notify('sell', {
        stockName: pos.stockName,
        stockCode,
        action: `🔔 ${reason}`,
        entryPrice: pos.entryPrice,
        exitPrice: currentPrice,
        qty: pos.qty,
        pnlPercent,
        pnlKrw,
      });
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`✅ 전량 청산 완료 | 당일 실현 손익: ${dailyRealizedPnl.toLocaleString()}원`);
}

/**
 * 서버 시작 시 KIS 잔고와 포지션 동기화
 */
export async function syncPositionsFromAccount(): Promise<void> {
  const balance = await getAccountBalance();
  if (!balance) return;

  console.log(`💰 예수금: ${balance.totalDeposit.toLocaleString()}원`);
  console.log(`📊 보유 종목: ${balance.holdings.length}개`);

  for (const h of balance.holdings) {
    if (!positions.has(h.stockCode)) {
      addPosition({
        stockCode: h.stockCode,
        stockName: h.stockName,
        entryPrice: h.avgPrice,
        qty: h.qty,
        entryTime: Date.now(),
        highPrice: h.currentPrice,
        reason: '기존 보유 (동기화)',
        hotnessScore: 0,
      });
    }
  }
}
