import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// 테마 목록 아이템
export interface ThemeListItem {
    name: string;
    stockCount: number;
    keywords: string[];
}

// 테마 상세 정보
export interface ThemeDetail {
    name: string;
    stocks: string[];
    keywords: string[];
}

// API 응답 타입
interface ThemeListResponse {
    success: boolean;
    data: ThemeListItem[];
    total: number;
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
