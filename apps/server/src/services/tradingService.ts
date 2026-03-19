import Trade, { ITrade, SellReason } from '../models/Trade';
import TradingAccount, { ITradingAccount, IPosition } from '../models/TradingAccount';
import { getAccountBalance, getCashBalance, isKiwoomConfigured } from './kiwoomApi';
import mongoose from 'mongoose';

const DEFAULT_INITIAL_CAPITAL = 1000000;

function getTodayDateKey(): string {
    const now = new Date();
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kst = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + KST_OFFSET);
    return kst.toISOString().split('T')[0];
}

export async function getTodayAccount(): Promise<ITradingAccount> {
    const today = getTodayDateKey();

    let account = await TradingAccount.findOne({ dateKey: today });
    if (account) return account;

    const yesterday = await TradingAccount.findOne().sort({ dateKey: -1 });

    account = await TradingAccount.create({
        dateKey: today,
        initialCapital: DEFAULT_INITIAL_CAPITAL,
        cash: yesterday ? yesterday.cash : DEFAULT_INITIAL_CAPITAL,
        positions: yesterday ? yesterday.positions : [],
        totalValue: yesterday ? yesterday.totalValue : DEFAULT_INITIAL_CAPITAL,
        totalPnl: yesterday ? yesterday.totalPnl : 0,
        totalPnlRate: yesterday ? yesterday.totalPnlRate : 0,
        dailyPnl: 0,
        todayTradeCount: 0,
        winCount: yesterday ? yesterday.winCount : 0,
        loseCount: yesterday ? yesterday.loseCount : 0,
    });

    return account;
}

export async function recordBuy(params: {
    stockCode: string;
    stockName: string;
    filledPrice: number;
    quantity: number;
    fee: number;
    kiwoomOrderId: string | null;
    signal: {
        hotnessGrade: string;
        hotnessScore: number;
        volumeSurgeRate: number;
        changeRate: number;
        newsCount: number;
    };
}): Promise<ITrade> {
    const amount = params.filledPrice * params.quantity;

    const trade = await Trade.create({
        stockCode: params.stockCode,
        stockName: params.stockName,
        type: 'buy',
        status: 'filled',
        orderPrice: params.filledPrice,
        filledPrice: params.filledPrice,
        quantity: params.quantity,
        amount,
        fee: params.fee,
        tax: 0,
        signal: params.signal,
        sellReason: null,
        buyTradeId: null,
        pnl: null,
        pnlRate: null,
        kiwoomOrderId: params.kiwoomOrderId,
        orderedAt: new Date(),
        filledAt: new Date(),
    });

    const account = await getTodayAccount();
    account.cash -= (amount + params.fee);
    account.positions.push({
        stockCode: params.stockCode,
        stockName: params.stockName,
        quantity: params.quantity,
        avgBuyPrice: params.filledPrice,
        currentPrice: params.filledPrice,
        pnl: 0,
        pnlRate: 0,
        buyTradeId: trade._id as mongoose.Types.ObjectId,
        boughtAt: new Date(),
    });
    account.totalValue = account.cash + account.positions.reduce(
        (sum, p) => sum + p.currentPrice * p.quantity, 0
    );
    account.todayTradeCount += 1;
    await account.save();

    console.log(`📈 매수 기록: ${params.stockName} ${params.quantity}주 @ ${params.filledPrice}원`);
    return trade;
}

export async function recordSell(params: {
    stockCode: string;
    stockName: string;
    filledPrice: number;
    quantity: number;
    fee: number;
    tax: number;
    sellReason: SellReason;
    buyTradeId: mongoose.Types.ObjectId;
    avgBuyPrice: number;
    kiwoomOrderId: string | null;
}): Promise<ITrade> {
    const amount = params.filledPrice * params.quantity;
    const buyAmount = params.avgBuyPrice * params.quantity;
    const pnl = amount - buyAmount - params.fee - params.tax;
    const pnlRate = ((params.filledPrice - params.avgBuyPrice) / params.avgBuyPrice) * 100;

    const trade = await Trade.create({
        stockCode: params.stockCode,
        stockName: params.stockName,
        type: 'sell',
        status: 'filled',
        orderPrice: params.filledPrice,
        filledPrice: params.filledPrice,
        quantity: params.quantity,
        amount,
        fee: params.fee,
        tax: params.tax,
        signal: null,
        sellReason: params.sellReason,
        buyTradeId: params.buyTradeId,
        pnl,
        pnlRate: Math.round(pnlRate * 100) / 100,
        kiwoomOrderId: params.kiwoomOrderId,
        orderedAt: new Date(),
        filledAt: new Date(),
    });

    const account = await getTodayAccount();
    account.cash += (amount - params.fee - params.tax);
    account.positions = account.positions.filter(
        p => p.buyTradeId.toString() !== params.buyTradeId.toString()
    );
    account.totalValue = account.cash + account.positions.reduce(
        (sum, p) => sum + p.currentPrice * p.quantity, 0
    );
    account.dailyPnl += pnl;
    account.totalPnl += pnl;
    account.totalPnlRate = ((account.totalValue - account.initialCapital) / account.initialCapital) * 100;
    account.todayTradeCount += 1;
    if (pnl > 0) account.winCount += 1;
    else account.loseCount += 1;
    await account.save();

    const emoji = pnl > 0 ? '💰' : '💸';
    console.log(`${emoji} 매도 기록: ${params.stockName} ${params.quantity}주 @ ${params.filledPrice}원 (${pnl > 0 ? '+' : ''}${pnl}원, ${params.sellReason})`);
    return trade;
}

export async function updatePositionPrices(priceMap: Map<string, number>): Promise<void> {
    const account = await getTodayAccount();
    let changed = false;

    for (const position of account.positions) {
        const currentPrice = priceMap.get(position.stockCode);
        if (currentPrice && currentPrice !== position.currentPrice) {
            position.currentPrice = currentPrice;
            position.pnl = (currentPrice - position.avgBuyPrice) * position.quantity;
            position.pnlRate = ((currentPrice - position.avgBuyPrice) / position.avgBuyPrice) * 100;
            changed = true;
        }
    }

    if (changed) {
        account.totalValue = account.cash + account.positions.reduce(
            (sum, p) => sum + p.currentPrice * p.quantity, 0
        );
        account.totalPnlRate = ((account.totalValue - account.initialCapital) / account.initialCapital) * 100;
        await account.save();
    }
}

/**
 * 키움 실제 잔고와 동기화
 */
export async function syncWithKiwoomBalance(): Promise<void> {
    if (!isKiwoomConfigured()) return;

    try {
        const [balance, cash] = await Promise.all([
            getAccountBalance(),
            getCashBalance(),
        ]);

        if (!balance && cash === null) return;

        const account = await getTodayAccount();

        // 예수금 동기화
        if (cash !== null) {
            account.cash = cash;
        }

        // 잔고 동기화
        if (balance) {
            account.totalValue = balance.estimatedAsset || (account.cash + balance.totalEvalAmount);
            account.totalPnl = balance.totalPnl;
            account.totalPnlRate = balance.totalPnlRate;

            // initialCapital: 첫 동기화 시 추정예탁자산으로 설정
            if (account.initialCapital === DEFAULT_INITIAL_CAPITAL && balance.estimatedAsset > 0) {
                account.initialCapital = balance.estimatedAsset;
            }

            // 보유 종목 동기화
            if (balance.positions.length > 0) {
                account.positions = balance.positions
                    .filter(p => p.quantity > 0)
                    .map(p => ({
                        stockCode: p.stockCode,
                        stockName: p.stockName,
                        quantity: p.quantity,
                        avgBuyPrice: p.avgBuyPrice,
                        currentPrice: p.currentPrice,
                        pnl: p.pnl,
                        pnlRate: p.pnlRate,
                        buyTradeId: new mongoose.Types.ObjectId(),
                        boughtAt: new Date(),
                    }));
            }
        }

        await account.save();
        console.log(`🔄 키움 잔고 동기화 완료 — 현금: ${account.cash.toLocaleString()}원, 총평가: ${account.totalValue.toLocaleString()}원`);
    } catch (error) {
        console.error('❌ 키움 잔고 동기화 실패:', error);
    }
}

export async function getDashboardData(): Promise<{
    account: ITradingAccount | null;
    recentTrades: any[];
    dailyHistory: Array<{ date: string; totalValue: number; dailyPnl: number; totalPnlRate: number }>;
    stats: { totalTrades: number; winRate: number; avgPnl: number; maxWin: number; maxLoss: number };
}> {
    const account = await TradingAccount.findOne().sort({ dateKey: -1 });

    const recentTrades = await Trade.find({ status: 'filled' })
        .sort({ filledAt: -1 })
        .limit(50)
        .lean();

    const dailyHistory = await TradingAccount.find()
        .sort({ dateKey: -1 })
        .limit(30)
        .lean()
        .then(accounts => accounts.reverse().map(a => ({
            date: a.dateKey,
            totalValue: a.totalValue,
            dailyPnl: a.dailyPnl,
            totalPnlRate: Math.round(a.totalPnlRate * 100) / 100,
        })));

    const sellTrades = await Trade.find({ type: 'sell', status: 'filled' }).lean();
    const totalTrades = sellTrades.length;
    const wins = sellTrades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
    const avgPnl = totalTrades > 0
        ? Math.round(sellTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / totalTrades)
        : 0;
    const pnls = sellTrades.map(t => t.pnl || 0);
    const maxWin = pnls.length > 0 ? Math.max(...pnls) : 0;
    const maxLoss = pnls.length > 0 ? Math.min(...pnls) : 0;

    return {
        account: account || null,
        recentTrades,
        dailyHistory,
        stats: { totalTrades, winRate, avgPnl, maxWin, maxLoss },
    };
}

export async function getTodayDailyLoss(): Promise<number> {
    const account = await getTodayAccount();
    return account.dailyPnl;
}
