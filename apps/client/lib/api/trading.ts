import axios from 'axios';
import { MarketStatusInfo } from './themes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Position {
    stockCode: string;
    stockName: string;
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
    pnl: number;
    pnlRate: number;
    boughtAt: string;
}

export interface TradingAccountData {
    dateKey: string;
    initialCapital: number;
    cash: number;
    positions: Position[];
    totalValue: number;
    totalPnl: number;
    totalPnlRate: number;
    dailyPnl: number;
    todayTradeCount: number;
    winCount: number;
    loseCount: number;
}

export interface TradeRecord {
    _id: string;
    stockCode: string;
    stockName: string;
    type: 'buy' | 'sell';
    filledPrice: number;
    quantity: number;
    amount: number;
    fee: number;
    tax: number;
    signal: {
        hotnessGrade: string;
        hotnessScore: number;
        volumeSurgeRate: number;
        changeRate: number;
        newsCount: number;
    } | null;
    sellReason: string | null;
    pnl: number | null;
    pnlRate: number | null;
    filledAt: string;
}

export interface DailyHistory {
    date: string;
    totalValue: number;
    dailyPnl: number;
    totalPnlRate: number;
}

export interface TradingStats {
    totalTrades: number;
    winRate: number;
    avgPnl: number;
    maxWin: number;
    maxLoss: number;
}

export interface TradingDashboard {
    account: TradingAccountData | null;
    recentTrades: TradeRecord[];
    dailyHistory: DailyHistory[];
    stats: TradingStats;
    marketStatus: MarketStatusInfo;
}

interface DashboardResponse {
    success: boolean;
    data: TradingDashboard;
}

interface TradesResponse {
    success: boolean;
    data: {
        trades: TradeRecord[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

export const fetchTradingDashboard = async (): Promise<TradingDashboard> => {
    const { data } = await axios.get<DashboardResponse>(`${API_URL}/trading/dashboard`);
    return data.data;
};

// 키움 실제 체결내역 (수동 + 자동)
export interface KiwoomTrade {
    orderNo: string;
    stockCode: string;
    stockName: string;
    tradeType: string;
    orderQty: number;
    filledQty: number;
    filledPrice: number;
    orderTime: string;
    ioBuySell: string;
}

interface HistoryResponse {
    success: boolean;
    data: {
        trades: KiwoomTrade[];
        marketStatus: MarketStatusInfo;
    };
}

export const fetchTradeHistory = async (date?: string): Promise<{
    trades: KiwoomTrade[];
    marketStatus: MarketStatusInfo;
}> => {
    const { data } = await axios.get<HistoryResponse>(`${API_URL}/trading/history`, {
        params: date ? { date } : {},
    });
    return data.data;
};

export const fetchTrades = async (
    page: number = 1,
    limit: number = 20,
    type?: 'buy' | 'sell'
): Promise<{
    trades: TradeRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
    const { data } = await axios.get<TradesResponse>(`${API_URL}/trading/trades`, {
        params: { page, limit, type },
    });
    return data.data;
};
