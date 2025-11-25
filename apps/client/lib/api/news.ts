import axios from 'axios';

// ... (NewsItem 인터페이스 등은 기존 유지) ...

export interface NewsItem {
    title: string;
    link: string;
    press: string;
    summary: string;
    createdAt: string;
    isDetailed?: boolean; // 상위 5개 상세 분석 여부
    aiReason?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    stocks?: string[];
    score?: number;
}

interface NewsResponse {
    message: string;
    data: NewsItem[];
}

// ✅ 환경변수 가져오기 (없으면 로컬호스트 기본값 사용)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const fetchNews = async (): Promise<NewsItem[]> => {
    // ✅ 주소 교체: API_URL + '/news'
    const { data } = await axios.get<NewsResponse>(`${API_URL}/news`);
    return data.data;
};
