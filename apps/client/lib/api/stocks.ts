import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// 종목 현재가 정보
export interface StockPrice {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    high: number;
    low: number;
    open: number;
}

// 테마 가격 정보
export interface ThemePriceInfo {
    themeName: string;
    avgChangeRate: number;
    topGainer: StockPrice | null;
    topLoser: StockPrice | null;
    stockPrices: StockPrice[];
    stockCount: number;
    totalStocks: number;
    updatedAt: string;
}

// API 응답 타입
interface StockPriceResponse {
    success: boolean;
    data: StockPrice;
}

interface ThemePricesResponse {
    success: boolean;
    data: ThemePriceInfo[];
    cached: boolean;
    lastUpdate: string | null;
}

interface SingleThemePriceResponse {
    success: boolean;
    data: ThemePriceInfo;
}

// 단일 종목 현재가 조회
export const fetchStockPrice = async (stockName: string): Promise<StockPrice> => {
    const { data } = await axios.get<StockPriceResponse>(
        `${API_URL}/stocks/price/${encodeURIComponent(stockName)}`
    );
    return data.data;
};

// 모든 테마 등락률 조회
export const fetchThemePrices = async (refresh = false): Promise<{
    data: ThemePriceInfo[];
    cached: boolean;
    lastUpdate: string | null;
}> => {
    const { data } = await axios.get<ThemePricesResponse>(
        `${API_URL}/stocks/themes${refresh ? '?refresh=true' : ''}`
    );
    return {
        data: data.data,
        cached: data.cached,
        lastUpdate: data.lastUpdate,
    };
};

// 단일 테마 등락률 조회
export const fetchThemePrice = async (themeName: string): Promise<ThemePriceInfo> => {
    const { data } = await axios.get<SingleThemePriceResponse>(
        `${API_URL}/stocks/themes/${encodeURIComponent(themeName)}`
    );
    return data.data;
};
