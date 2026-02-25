/**
 * ═══════════════════════════════════════════
 *  TEBURN 자동매매봇
 *
 *  TEBURN 주도주 분석 + KIS Open API 자동매매
 *  - TEBURN의 주도주 점수(S등급)를 시그널로 활용
 *  - RSI/MA 기술적 필터로 진입 타이밍 검증
 *  - KIS API로 자동 매수/매도
 *  - 손절/익절/트레일링 스탑 자동 관리
 * ═══════════════════════════════════════════
 */

import { config } from './config.js';
import { getTradeSignals, type TradeSignal } from './signalProvider.js';
import { applyTechnicalFilter, setTokenGetter } from './technicalFilter.js';
import {
  getAccessToken,
  getStockPrice,
  buyStock,
  calculateBuyQty,
  getAccountBalance,
} from './kisTrader.js';
import {
  addPosition,
  hasPosition,
  canEnterNewPosition,
  monitorPositions,
  closeAllPositions,
  getAllPositions,
  getPositionCount,
  getDailyPnl,
  syncPositionsFromAccount,
} from './riskManager.js';
import { initNotifier, notify } from './notifier.js';

// ─── 장 상태 판단 (기존 marketStatus.ts 로직 참고) ──

function isMarketOpen(): boolean {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const day = kst.getDay();

  // 주말
  if (day === 0 || day === 6) return false;

  const hhmm = `${String(kst.getHours()).padStart(2, '0')}:${String(kst.getMinutes()).padStart(2, '0')}`;

  return hhmm >= config.bot.marketOpenTime && hhmm <= config.bot.marketCloseTime;
}

function isCloseTime(): boolean {
  if (!config.bot.sellAllBeforeClose) return false;

  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const hhmm = `${String(kst.getHours()).padStart(2, '0')}:${String(kst.getMinutes()).padStart(2, '0')}`;

  return hhmm >= config.bot.sellAllTime;
}

function getKSTString(): string {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

// ─── 매매 사이클 ────────────────────────

async function tradingCycle(): Promise<void> {
  const now = getKSTString();
  console.log(`\n═══ 매매 사이클 [${now}] ═══`);

  // 1. 장 마감 전 전량 청산
  if (isCloseTime()) {
    await closeAllPositions('장 마감 전 전량 청산');
    return;
  }

  // 2. 기존 포지션 모니터링 (손절/익절 체크)
  if (getPositionCount() > 0) {
    console.log(`\n📍 포지션 모니터링 (${getPositionCount()}개)...`);
    const results = await monitorPositions();

    for (const r of results) {
      if (r.action !== 'hold') {
        console.log(`  → ${r.stockName}: ${r.action} (${r.pnlPercent.toFixed(2)}%)`);
      } else {
        console.log(`  → ${r.stockName}: 보유 중 (${r.pnlPercent.toFixed(2)}%)`);
      }
    }
  }

  // 3. 신규 진입 가능 여부 체크
  const { allowed, reason } = canEnterNewPosition();
  if (!allowed) {
    console.log(`\n⛔ 신규 진입 불가: ${reason}`);
    return;
  }

  // 4. TEBURN에서 시그널 조회
  console.log('\n🔍 TEBURN 시그널 조회...');
  const signals = await getTradeSignals();

  if (signals.length === 0) {
    console.log('📭 매매 시그널 없음');
    return;
  }

  console.log(`🎯 시그널 ${signals.length}개:`);
  signals.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.stockName} (${s.grade}등급, ${s.hotnessScore}점, +${s.changeRate.toFixed(1)}%)`);
  });

  // 5. 시그널별 진입 시도
  for (const signal of signals) {
    // 이미 보유 중이면 스킵
    if (hasPosition(signal.stockCode)) {
      console.log(`  ⏭ ${signal.stockName}: 이미 보유 중`);
      continue;
    }

    // 포지션 한도 재체크
    const check = canEnterNewPosition();
    if (!check.allowed) {
      console.log(`  ⛔ ${check.reason} — 탐색 중단`);
      break;
    }

    // 기술적 필터
    console.log(`\n🔬 ${signal.stockName} 기술적 분석 중...`);
    const technical = await applyTechnicalFilter(signal.stockCode);

    if (!technical.passed) {
      console.log(`  ❌ 필터 미통과: ${technical.reasons.join(', ')}`);
      continue;
    }

    console.log(`  ✅ 필터 통과: ${technical.reasons.join(', ')}`);

    // 실시간 가격 재확인
    const livePrice = await getStockPrice(signal.stockCode);
    if (!livePrice) {
      console.log(`  ❌ 실시간 가격 조회 실패`);
      continue;
    }

    // 매수 수량 계산
    const qty = calculateBuyQty(livePrice.currentPrice, config.risk.positionSizeKrw);
    if (qty <= 0) {
      console.log(`  ❌ 매수 수량 0 (가격: ${livePrice.currentPrice.toLocaleString()}원, 투자금: ${config.risk.positionSizeKrw.toLocaleString()}원)`);
      continue;
    }

    // 매수 주문
    console.log(`\n🚀 매수: ${signal.stockName} ${qty}주 @ ${livePrice.currentPrice.toLocaleString()}원`);
    const order = await buyStock(signal.stockCode, qty);

    if (order.success) {
      // 포지션 등록
      addPosition({
        stockCode: signal.stockCode,
        stockName: signal.stockName,
        entryPrice: livePrice.currentPrice,
        qty,
        entryTime: Date.now(),
        highPrice: livePrice.currentPrice,
        reason: signal.reason,
        hotnessScore: signal.hotnessScore,
      });

      // 텔레그램 알림
      await notify('buy', {
        stockName: signal.stockName,
        stockCode: signal.stockCode,
        price: livePrice.currentPrice,
        qty,
        hotnessScore: signal.hotnessScore,
        grade: signal.grade,
        reason: signal.reason,
        technicalInfo: technical.reasons.join(', '),
      });
    }

    // API rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  // 요약
  console.log(`\n📊 현재 상태: 포지션 ${getPositionCount()}개 | 당일 손익: ${getDailyPnl().toLocaleString()}원`);
}

// ─── 메인 루프 ──────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  🤖 TEBURN 자동매매봇');
  console.log(`  🌐 TEBURN API: ${config.teburnApiUrl}`);
  console.log(`  🏦 KIS API: ${config.kis.isMock ? '모의투자' : '실투자'}`);
  console.log(`  🎯 시그널: ${config.strategy.minGrade}등급 이상 (${config.strategy.minHotnessScore}점+)`);
  console.log(`  💰 1회 투자: ${config.risk.positionSizeKrw.toLocaleString()}원`);
  console.log(`  📊 최대 포지션: ${config.risk.maxPositions}개`);
  console.log(`  🛑 손절: ${config.risk.stopLossPercent}% | 🎯 익절: ${config.risk.takeProfitPercent}%`);
  console.log(`  ⏱  체크 주기: ${config.bot.checkIntervalMs / 1000}초`);
  console.log('═══════════════════════════════════════════\n');

  // 초기화
  initNotifier();
  setTokenGetter(getAccessToken);

  // KIS 연결 확인
  try {
    await getAccessToken();
    console.log('✅ KIS API 연결 확인\n');
  } catch (e: any) {
    console.error('❌ KIS API 연결 실패:', e.message);
    console.error('   .env 파일의 KIS_APP_KEY, KIS_APP_SECRET을 확인하세요');
    process.exit(1);
  }

  // 기존 보유 종목 동기화
  await syncPositionsFromAccount();

  // 시작 알림
  await notify('startup', {});

  // 메인 루프
  async function loop() {
    if (isMarketOpen()) {
      try {
        await tradingCycle();
      } catch (e: any) {
        console.error(`⚠️ 사이클 에러: ${e.message}`);
        await notify('error', { message: e.message });
      }
    } else {
      const now = getKSTString();
      const day = new Date().getDay();
      if (day === 0 || day === 6) {
        console.log(`\n😴 [${now}] 주말 — 대기 중`);
      } else {
        console.log(`\n😴 [${now}] 장외 시간 — 대기 중`);
      }
    }
  }

  // 즉시 첫 실행
  await loop();

  // 주기적 실행
  setInterval(loop, config.bot.checkIntervalMs);

  console.log(`\n🔄 ${config.bot.checkIntervalMs / 1000}초 간격으로 루프 시작\n`);
}

// 종료 처리
process.on('SIGINT', async () => {
  console.log('\n\n👋 봇 종료...');
  if (getPositionCount() > 0) {
    console.log(`⚠️  보유 포지션 ${getPositionCount()}개 — 수동 관리 필요`);
  }
  process.exit(0);
});

process.on('uncaughtException', async (e) => {
  console.error('💥 치명적 에러:', e);
  await notify('error', { message: `치명적: ${e.message}` });
});

// 시작
main().catch((e) => {
  console.error('💥', e);
  process.exit(1);
});
