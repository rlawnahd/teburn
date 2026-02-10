import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface IndexChartPoint {
    time: string;
    price: number;
}

export type IndexCategory = 'index' | 'futures';

export interface IndexData {
    symbol: string;
    name: string;
    category: IndexCategory;
    currentPrice: number;
    previousClose: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    chartData: IndexChartPoint[];
    marketOpen: boolean;
    tradingHours: string;
}

interface IndexResponse {
    success: boolean;
    data: {
        nasdaq: IndexData | null;
        kospi: IndexData | null;
        kospiIndex: IndexData | null;
        kosdaqIndex: IndexData | null;
    };
}

// 전체 지수 데이터 조회
export const fetchIndexData = async (): Promise<{
    nasdaq: IndexData | null;
    kospi: IndexData | null;
    kospiIndex: IndexData | null;
    kosdaqIndex: IndexData | null;
}> => {
    const { data } = await axios.get<IndexResponse>(`${API_URL}/indices`);
    return data.data;
};
