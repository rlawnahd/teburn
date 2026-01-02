import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// 캐시된 종목 가격 정보
export interface CachedStockPrice {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    tradingValue: number;
    updatedAt: string;
}

// 테마 목록 아이템 (캐시된 가격 포함)
export interface ThemeListItem {
    name: string;
    stockCount: number;
    keywords: string[];
    // 캐시된 가격 정보
    avgChangeRate: number | null;
    topStocks: CachedStockPrice[];
    priceUpdatedAt: string | null;
}

// 종목별 가격 정보 (상세 페이지용)
export interface StockWithPrice {
    name: string;
    code: string;
    currentPrice: number | null;
    changePrice: number | null;
    changeRate: number | null;
    volume: number | null;
}

// 테마 상세 정보
export interface ThemeDetail {
    name: string;
    stocks: string[];
    stocksWithPrice: StockWithPrice[];
    keywords: string[];
    avgChangeRate: number | null;
    priceUpdatedAt: string | null;
}

// 캐시 통계
export interface CacheStats {
    lastUpdateTime: string | null;
    cachedThemes: number;
    cachedStocks: number;
}

// API 응답 타입
interface ThemeListResponse {
    success: boolean;
    data: ThemeListItem[];
    total: number;
    cacheStats: CacheStats;
}

interface ThemeDetailResponse {
    success: boolean;
    data: ThemeDetail;
}

interface StockThemesResponse {
    success: boolean;
    data: {
        stock: string;
        themes: string[];
    };
}

// 모든 테마 목록 조회
export const fetchThemes = async (): Promise<ThemeListItem[]> => {
    const { data } = await axios.get<ThemeListResponse>(`${API_URL}/themes`);
    return data.data;
};

// 특정 테마 상세 조회
export const fetchThemeDetail = async (themeName: string): Promise<ThemeDetail> => {
    const { data } = await axios.get<ThemeDetailResponse>(
        `${API_URL}/themes/${encodeURIComponent(themeName)}`
    );
    return data.data;
};

// 종목명으로 관련 테마 찾기
export const fetchThemesByStock = async (stockName: string): Promise<string[]> => {
    const { data } = await axios.get<StockThemesResponse>(
        `${API_URL}/themes/stock/${encodeURIComponent(stockName)}`
    );
    return data.data.themes;
};

// 테마 히스토리 아이템
export interface ThemeHistoryItem {
    timestamp: string;
    avgChangeRate: number;
    topStock: string;
    topStockRate: number;
}

// 테마 히스토리 응답
interface ThemeHistoryResponse {
    success: boolean;
    data: {
        themeName: string;
        period: string;
        history: ThemeHistoryItem[];
    };
}

// 테마 히스토리 조회
export const fetchThemeHistory = async (
    themeName: string,
    period: 'today' | '1d' | '7d' | '30d' = 'today'
): Promise<ThemeHistoryItem[]> => {
    const { data } = await axios.get<ThemeHistoryResponse>(
        `${API_URL}/themes/${encodeURIComponent(themeName)}/history`,
        { params: { period } }
    );
    return data.data.history;
};
