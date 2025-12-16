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
    stocks?: string[];           // 수혜주
    negativeStocks?: string[];   // 피해주
    themes?: string[]; // 관련 테마 (반도체, 2차전지 등)
    score?: number;
}

interface NewsResponse {
    message: string;
    data: NewsItem[];
}

// ✅ 환경변수 가져오기 (없으면 로컬호스트 기본값 사용)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const fetchNews = async (): Promise<NewsItem[]> => {
    const { data } = await axios.get<NewsResponse>(`${API_URL}/news`);
    return data.data;
};

// AI 분석 결과 타입
export interface AnalysisResult {
    sentiment: 'positive' | 'negative' | 'neutral';
    aiReason: string;
    stocks: string[];           // 수혜주
    negativeStocks: string[];   // 피해주
    themes: string[];
    score: number;
}

interface AnalyzeResponse {
    message: string;
    data: AnalysisResult;
}

// 개별 뉴스 AI 분석 요청
export const analyzeNewsItem = async (news: NewsItem): Promise<AnalysisResult> => {
    const { data } = await axios.post<AnalyzeResponse>(`${API_URL}/news/analyze`, {
        title: news.title,
        summary: news.summary,
        link: news.link,
        press: news.press,
        createdAt: news.createdAt,
    });
    return data.data;
};

// 분석 완료된 뉴스 응답 타입
interface AnalyzedNewsResponse {
    message: string;
    data: NewsItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// DB에서 분석 완료된 뉴스 조회
export const fetchAnalyzedNews = async (page = 1, limit = 20): Promise<AnalyzedNewsResponse> => {
    const { data } = await axios.get<AnalyzedNewsResponse>(
        `${API_URL}/news/analyzed?page=${page}&limit=${limit}`
    );
    return data;
};
