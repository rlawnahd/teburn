import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface FuturesChartPoint {
    time: string;
    price: number;
}

export interface FuturesData {
    symbol: string;
    name: string;
    currentPrice: number;
    previousClose: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    chartData: FuturesChartPoint[];
    marketOpen: boolean;
}

interface FuturesResponse {
    success: boolean;
    data: {
        nasdaq: FuturesData | null;
        kospi: FuturesData | null;
    };
}

// 전체 선물 데이터 조회
export const fetchFuturesData = async (): Promise<{
    nasdaq: FuturesData | null;
    kospi: FuturesData | null;
}> => {
    const { data } = await axios.get<FuturesResponse>(`${API_URL}/futures`);
    return data.data;
};
