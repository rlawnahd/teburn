import axios from 'axios';
import { MarketStatusInfo } from './themes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// 대금상위 종목
export interface LeadingStock {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
    themes: string[];
}

// 주도섹터
export interface LeadingSector {
    themeName: string;
    avgChangeRate: number;
    totalTradingValue: number;
    leadingScore: number;
    topStock: {
        name: string;
        changeRate: number;
        tradingValue: number;
    } | null;
    stockCount: number;
}

// 캘린더 날짜별 데이터 (주도주 기반)
export interface CalendarDay {
    date: string;
    topStocks: Array<{
        rank: number;
        stockName: string;
        stockCode: string;
        changeRate: number;
        tradingValue: number;
        themes: string[];
    }>;
}

// 날짜 상세 주도주
export interface DayDetailStock {
    rank: number;
    stockCode: string;
    stockName: string;
    changeRate: number;
    tradingValue: number;
    themes: string[];
}

// API 응답 타입
interface LeadingStocksResponse {
    success: boolean;
    data: {
        stocks: LeadingStock[];
        marketStatus: MarketStatusInfo;
        lastUpdateTime: string | null;
        total: number;
    };
}

interface LeadingSectorsResponse {
    success: boolean;
    data: {
        sectors: LeadingSector[];
        marketStatus: MarketStatusInfo;
        lastUpdateTime: string | null;
        total: number;
    };
}

interface CalendarResponse {
    success: boolean;
    data: {
        year: number;
        month: number;
        days: CalendarDay[];
    };
}

interface DayDetailResponse {
    success: boolean;
    data: {
        date: string;
        topStocks: DayDetailStock[];
    };
}

// 거래대금 상위 종목 조회
export const fetchLeadingStocks = async (
    minRate: number = 4,
    limit: number = 30
): Promise<{
    stocks: LeadingStock[];
    marketStatus: MarketStatusInfo;
    lastUpdateTime: string | null;
}> => {
    const { data } = await axios.get<LeadingStocksResponse>(`${API_URL}/leading/stocks`, {
        params: { minRate, limit },
    });
    return {
        stocks: data.data.stocks,
        marketStatus: data.data.marketStatus,
        lastUpdateTime: data.data.lastUpdateTime,
    };
};

// 주도섹터 목록 조회
export const fetchLeadingSectors = async (
    limit: number = 20
): Promise<{
    sectors: LeadingSector[];
    marketStatus: MarketStatusInfo;
    lastUpdateTime: string | null;
}> => {
    const { data } = await axios.get<LeadingSectorsResponse>(`${API_URL}/leading/sectors`, {
        params: { limit },
    });
    return {
        sectors: data.data.sectors,
        marketStatus: data.data.marketStatus,
        lastUpdateTime: data.data.lastUpdateTime,
    };
};

// 캘린더 데이터 조회 (월별)
export const fetchCalendarData = async (
    year: number,
    month: number
): Promise<CalendarDay[]> => {
    const { data } = await axios.get<CalendarResponse>(`${API_URL}/leading/calendar`, {
        params: { year, month },
    });
    return data.data.days;
};

// 특정 날짜 상세 조회 (주도주)
export const fetchDayDetail = async (date: string): Promise<DayDetailStock[]> => {
    const { data } = await axios.get<DayDetailResponse>(`${API_URL}/leading/calendar/${date}`);
    return data.data.topStocks;
};

// 주도주 점수 종목 (총 85점 만점)
export interface HotStock {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
    themes: string[];

    totalScore: number;         // 총점 (0~85)
    tradingValueScore: number;  // 거래대금 점수 (0~20)
    searchScore: number;        // 검색량 점수 (0~20)
    momentumScore: number;      // 등락률 점수 (0~15)
    volumeScore: number;        // 거래량 급증 점수 (0~15)
    newsScore: number;          // 뉴스 점수 (0~15)

    volumeSurgeRate: number | null;
    searchSurgeRate: number | null;
    newsCount: number;

    grade: 'HOT' | 'WARM' | 'NORMAL' | 'COOL' | 'COLD';
}

interface HotStocksResponse {
    success: boolean;
    data: {
        stocks: HotStock[];
        marketStatus: MarketStatusInfo;
        lastUpdateTime: string | null;
        total: number;
    };
}

// 주도주 점수 TOP 종목 조회
export const fetchHotStocks = async (
    limit: number = 30
): Promise<{
    stocks: HotStock[];
    marketStatus: MarketStatusInfo;
    lastUpdateTime: string | null;
}> => {
    const { data } = await axios.get<HotStocksResponse>(`${API_URL}/leading/hot`, {
        params: { limit },
    });
    return {
        stocks: data.data.stocks,
        marketStatus: data.data.marketStatus,
        lastUpdateTime: data.data.lastUpdateTime,
    };
};
