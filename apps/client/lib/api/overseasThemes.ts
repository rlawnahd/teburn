import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// 해외 종목 정보
export interface OverseasStock {
    symbol: string;
    name: string;
    exchange: string;
}

// 해외 테마 목록 아이템
export interface OverseasThemeListItem {
    name: string;
    stockCount: number;
    keywords: string[];
}

// 해외 테마 상세 정보
export interface OverseasThemeDetail {
    name: string;
    stocks: OverseasStock[];
    keywords: string[];
}

// 해외 주식 시세
export interface OverseasStockPrice {
    symbol: string;
    name: string;
    korName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    high: number;
    low: number;
    open: number;
    prevClose: number;
}

// 해외 테마 시세
export interface OverseasThemePrice {
    themeName: string;
    avgChangeRate: number;
    prices: OverseasStockPrice[];
    updatedAt: string;
}

// 해외 테마 등락률
export interface OverseasThemeRate {
    themeName: string;
    avgChangeRate: number;
    topStock: string;
    topStockRate: number;
}

// API 응답 타입
interface OverseasThemeListResponse {
    success: boolean;
    data: OverseasThemeListItem[];
    total: number;
}

interface OverseasThemeDetailResponse {
    success: boolean;
    data: OverseasThemeDetail;
}

interface OverseasThemePriceResponse {
    success: boolean;
    data: OverseasThemePrice;
}

interface OverseasThemeRatesResponse {
    success: boolean;
    data: OverseasThemeRate[];
}

// 모든 해외 테마 목록 조회
export const fetchOverseasThemes = async (): Promise<OverseasThemeListItem[]> => {
    const { data } = await axios.get<OverseasThemeListResponse>(`${API_URL}/overseas-themes`);
    return data.data;
};

// 특정 해외 테마 상세 조회
export const fetchOverseasThemeDetail = async (themeName: string): Promise<OverseasThemeDetail> => {
    const { data } = await axios.get<OverseasThemeDetailResponse>(
        `${API_URL}/overseas-themes/${encodeURIComponent(themeName)}`
    );
    return data.data;
};

// 특정 해외 테마 시세 조회
export const fetchOverseasThemePrices = async (themeName: string): Promise<OverseasThemePrice> => {
    const { data } = await axios.get<OverseasThemePriceResponse>(
        `${API_URL}/overseas-themes/${encodeURIComponent(themeName)}/prices`
    );
    return data.data;
};

// 전체 해외 테마 등락률 조회
export const fetchOverseasThemeRates = async (): Promise<OverseasThemeRate[]> => {
    const { data } = await axios.get<OverseasThemeRatesResponse>(`${API_URL}/overseas-themes/all/rates`);
    return data.data;
};
