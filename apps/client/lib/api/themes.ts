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
    leaderStock?: CachedStockPrice | null;
    totalTradingValue?: number;
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

// 장 상태 타입
export type MarketStatus = 'pre_market' | 'regular' | 'post_market' | 'closed';

export interface MarketStatusInfo {
    status: MarketStatus;
    statusText: string;
    isOpen: boolean;
    nextOpenTime?: string;
    closeTime?: string;
}

// API 응답 타입
interface ThemeListResponse {
    success: boolean;
    data: ThemeListItem[];
    total: number;
    marketStatus: MarketStatusInfo;
    cacheStats: CacheStats;
}

// 테마 목록 + 메타 정보
export interface ThemesData {
    themes: ThemeListItem[];
    marketStatus: MarketStatusInfo;
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

// 모든 테마 목록 조회 (전체 데이터 반환)
export const fetchThemesWithMeta = async (): Promise<ThemesData> => {
    const { data } = await axios.get<ThemeListResponse>(`${API_URL}/themes`);
    return {
        themes: data.data,
        marketStatus: data.marketStatus,
        cacheStats: data.cacheStats,
    };
};

// 모든 테마 목록 조회 (하위 호환성)
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

// 테마 흐름 타임라인
export interface ThemeTimelineSlot {
    time: string;
    avgChangeRate: number;
    tradingActivity: number;
}

export interface ThemeTimelineItem {
    themeName: string;
    currentRate: number;
    slots: ThemeTimelineSlot[];
}

interface TimelineResponse {
    success: boolean;
    data: ThemeTimelineItem[];
    marketStatus: MarketStatusInfo;
}

export const fetchThemeTimeline = async (): Promise<{
    timeline: ThemeTimelineItem[];
    marketStatus: MarketStatusInfo;
}> => {
    const { data } = await axios.get<TimelineResponse>(`${API_URL}/themes/timeline/today`);
    return { timeline: data.data, marketStatus: data.marketStatus };
};

// 종목명으로 관련 테마 찾기
export const fetchThemesByStock = async (stockName: string): Promise<string[]> => {
    const { data } = await axios.get<StockThemesResponse>(
        `${API_URL}/themes/stock/${encodeURIComponent(stockName)}`
    );
    return data.data.themes;
};
