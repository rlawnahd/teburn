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

// 주도주 점수 정보
export interface HotnessInfo {
    totalScore: number;
    grade: 'HOT' | 'WARM' | 'NORMAL' | 'COOL' | 'COLD';
    tradingValueScore: number;
    searchScore: number;
    momentumScore: number;
    volumeScore: number;
    newsScore: number;
    volumeSurgeRate: number | null;
    searchSurgeRate: number | null;
    newsCount: number;
}

// 종목 상세 정보
export interface StockDetail {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    tradingValue: number;
    updatedAt: string;
    themes: string[];
    news: {
        title: string;
        link: string;
        press: string;
        summary: string;
        createdAt: string;
    }[];
    hotness: HotnessInfo | null;
}

interface StockDetailResponse {
    success: boolean;
    data: StockDetail;
}

// 종목 검색
export interface SearchStockResult {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
}

export const searchStocks = async (query: string): Promise<SearchStockResult[]> => {
    if (!query.trim()) return [];
    const { data } = await axios.get<{ success: boolean; data: SearchStockResult[] }>(
        `${API_URL}/stocks/search`,
        { params: { q: query } }
    );
    return data.data;
};

// 종목 상세 조회 (종목코드로)
export const fetchStockDetail = async (stockCode: string): Promise<StockDetail> => {
    const { data } = await axios.get<StockDetailResponse>(
        `${API_URL}/stocks/${encodeURIComponent(stockCode)}`
    );
    return data.data;
};
