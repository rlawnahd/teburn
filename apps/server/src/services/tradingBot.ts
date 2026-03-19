import { getTopHotStocks, HotnessScore } from './hotnessService';
import { themePriceCache } from './themePriceCache';
import { getMarketStatus } from '../utils/marketStatus';
import {
    isKiwoomConfigured,
    placeBuyOrder,
    placeSellOrder,
    getKiwoomStockPrice,
} from './kiwoomApi';
import {
    getTodayAccount,
    recordBuy,
    recordSell,
    updatePositionPrices,
    getTodayDailyLoss,
    syncWithKiwoomBalance,
} from './tradingService';
import { SellReason } from '../models/Trade';
import mongoose from 'mongoose';

const STRATEGY = {
    INITIAL_CAPITAL: 1000000,
    STOP_LOSS_RATE: -2,
    TAKE_PROFIT_RATE: 5,
    DAILY_LOSS_LIMIT: -100000,
    MIN_HOTNESS_GRADE: ['S', 'A'] as string[],
    MIN_VOLUME_SURGE: 3,
    MIN_CHANGE_RATE: 5,
    MIN_NEWS_COUNT: 1,
    TRADE_START_MINUTES: 9 * 60 + 10,  // 09:10
    TIME_EXIT_MINUTES: 15 * 60,
    FEE_RATE: 0.00015,
    TAX_RATE: 0.0018,
};

let botInterval: ReturnType<typeof setInterval> | null = null;
let isBotRunning = false;

function checkBuySignal(stock: HotnessScore): boolean {
    if (!STRATEGY.MIN_HOTNESS_GRADE.includes(stock.grade)) return false;
    if ((stock.volumeSurgeRate || 0) < STRATEGY.MIN_VOLUME_SURGE) return false;
    if (stock.changeRate < STRATEGY.MIN_CHANGE_RATE) return false;
    if (stock.newsCount < STRATEGY.MIN_NEWS_COUNT) return false;
    return true;
}

function checkSellSignal(
    position: { avgBuyPrice: number; currentPrice: number; stockCode: string },
    hotStocks: HotnessScore[],
    timeInMinutes: number,
    dailyPnl: number,
): SellReason | null {
    const pnlRate = ((position.currentPrice - position.avgBuyPrice) / position.avgBuyPrice) * 100;

    if (pnlRate <= STRATEGY.STOP_LOSS_RATE) return 'stop_loss';
    if (pnlRate >= STRATEGY.TAKE_PROFIT_RATE) return 'take_profit';
    if (timeInMinutes >= STRATEGY.TIME_EXIT_MINUTES) return 'time_exit';
    if (dailyPnl <= STRATEGY.DAILY_LOSS_LIMIT) return 'daily_limit';

    const stockHotness = hotStocks.find(s => s.stockCode === position.stockCode);
    if (stockHotness && !STRATEGY.MIN_HOTNESS_GRADE.includes(stockHotness.grade)) {
        return 'grade_drop';
    }

    return null;
}

async function executeTradingCycle(): Promise<void> {
    if (isBotRunning) return;
    isBotRunning = true;

    try {
        const marketStatus = getMarketStatus();
        if (marketStatus.status !== 'regular') return;

        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstNow = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + kstOffset);
        const timeInMinutes = kstNow.getHours() * 60 + kstNow.getMinutes();

        if (timeInMinutes < STRATEGY.TRADE_START_MINUTES) return;

        // 키움 실잔고 동기화
        await syncWithKiwoomBalance();

        const account = await getTodayAccount();
        const hotStocks = await getTopHotStocks(30);
        const dailyPnl = await getTodayDailyLoss();
        const dailyLimitReached = dailyPnl <= STRATEGY.DAILY_LOSS_LIMIT;

        // === 매도 체크 === (배열 복사하여 순회)
        for (const position of [...account.positions]) {
            const priceData = themePriceCache.getStockPrice(position.stockCode);
            if (priceData) {
                position.currentPrice = priceData.currentPrice;
            }

            const sellReason = checkSellSignal(position, hotStocks, timeInMinutes, dailyPnl);

            if (sellReason) {
                console.log(`🔔 매도 신호: ${position.stockName} (사유: ${sellReason})`);
                const sellResult = await placeSellOrder(position.stockCode, position.quantity);

                if (sellResult.success) {
                    const priceInfo = await getKiwoomStockPrice(position.stockCode);
                    const filledPrice = priceInfo?.currentPrice || position.currentPrice;
                    const amount = filledPrice * position.quantity;

                    await recordSell({
                        stockCode: position.stockCode,
                        stockName: position.stockName,
                        filledPrice,
                        quantity: position.quantity,
                        fee: Math.round(amount * STRATEGY.FEE_RATE),
                        tax: Math.round(amount * STRATEGY.TAX_RATE),
                        sellReason,
                        buyTradeId: position.buyTradeId,
                        avgBuyPrice: position.avgBuyPrice,
                        kiwoomOrderId: sellResult.orderId,
                    });
                } else {
                    console.error(`❌ 매도 주문 실패: ${position.stockName} — ${sellResult.message}`);
                }
            }
        }

        // === 매수 체크 ===
        const updatedAccount = await getTodayAccount();
        if (updatedAccount.positions.length > 0) return;
        if (dailyLimitReached) return;

        for (const stock of hotStocks) {
            if (!checkBuySignal(stock)) continue;

            const availableCash = updatedAccount.cash;
            if (availableCash < 100000) break;

            const quantity = Math.floor(availableCash / stock.currentPrice);
            if (quantity <= 0) continue;

            console.log(`🔔 매수 신호: ${stock.stockName} (등급: ${stock.grade}, 점수: ${stock.totalScore}, 급증: ${stock.volumeSurgeRate}배)`);
            const buyResult = await placeBuyOrder(stock.stockCode, quantity);

            if (buyResult.success) {
                const priceInfo = await getKiwoomStockPrice(stock.stockCode);
                const filledPrice = priceInfo?.currentPrice || stock.currentPrice;
                const amount = filledPrice * quantity;

                await recordBuy({
                    stockCode: stock.stockCode,
                    stockName: stock.stockName,
                    filledPrice,
                    quantity,
                    fee: Math.round(amount * STRATEGY.FEE_RATE),
                    kiwoomOrderId: buyResult.orderId,
                    signal: {
                        hotnessGrade: stock.grade,
                        hotnessScore: stock.totalScore,
                        volumeSurgeRate: stock.volumeSurgeRate || 0,
                        changeRate: stock.changeRate,
                        newsCount: stock.newsCount,
                    },
                });
                break;
            } else {
                console.error(`❌ 매수 주문 실패: ${stock.stockName} — ${buyResult.message}`);
            }
        }

        // 보유 종목 현재가 갱신
        const priceMap = new Map<string, number>();
        const finalAccount = await getTodayAccount();
        for (const pos of finalAccount.positions) {
            const priceData = themePriceCache.getStockPrice(pos.stockCode);
            if (priceData) priceMap.set(pos.stockCode, priceData.currentPrice);
        }
        if (priceMap.size > 0) {
            await updatePositionPrices(priceMap);
        }

    } catch (error) {
        console.error('❌ 매매 사이클 에러:', error);
    } finally {
        isBotRunning = false;
    }
}

export function startTradingBot(): void {
    if (!isKiwoomConfigured()) {
        console.log('⚠️ 키움 REST API 미설정 — 자동매매 봇 비활성화');
        console.log('  설정 필요: KIWOOM_APP_KEY, KIWOOM_SECRET_KEY, KIWOOM_ACCOUNT_NO');
        return;
    }

    console.log('🤖 자동매매 봇 시작 (5분 간격)');
    console.log(`  전략: Hotness S/A + 거래량 ${STRATEGY.MIN_VOLUME_SURGE}배+ + 상승률 ${STRATEGY.MIN_CHANGE_RATE}%+`);
    console.log(`  손절: ${STRATEGY.STOP_LOSS_RATE}% | 익절: +${STRATEGY.TAKE_PROFIT_RATE}% | 시간청산: 15:00`);
    console.log(`  일일 손실 한도: ${STRATEGY.DAILY_LOSS_LIMIT.toLocaleString()}원`);

    botInterval = setInterval(executeTradingCycle, 5 * 60 * 1000);
    executeTradingCycle();
}

export function stopTradingBot(): void {
    if (botInterval) {
        clearInterval(botInterval);
        botInterval = null;
        console.log('🛑 자동매매 봇 중지');
    }
}
