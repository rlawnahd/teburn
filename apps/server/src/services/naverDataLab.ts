// 네이버 DataLab API - 검색량 트렌드 조회
// https://developers.naver.com/docs/serviceapi/datalab/search/search.md
import axios from 'axios';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '';

interface SearchTrendRequest {
    startDate: string; // YYYY-MM-DD
    endDate: string;
    timeUnit: 'date' | 'week' | 'month';
    keywordGroups: Array<{
        groupName: string;
        keywords: string[];
    }>;
}

interface SearchTrendResult {
    title: string;
    keywords: string[];
    data: Array<{
        period: string;
        ratio: number; // 0~100 상대값
    }>;
}

interface SearchTrendResponse {
    startDate: string;
    endDate: string;
    timeUnit: string;
    results: SearchTrendResult[];
}

// 검색량 캐시 (1시간 유지)
const searchTrendCache = new Map<string, { data: number; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1시간

/**
 * 네이버 DataLab 검색어 트렌드 조회
 */
export async function getSearchTrend(keywords: string[]): Promise<SearchTrendResponse | null> {
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
        console.warn('⚠️ 네이버 API 키가 설정되지 않음');
        return null;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // 최근 7일

    const request: SearchTrendRequest = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        timeUnit: 'date',
        keywordGroups: keywords.map((keyword) => ({
            groupName: keyword,
            keywords: [keyword],
        })),
    };

    try {
        const response = await axios.post<SearchTrendResponse>(
            'https://openapi.naver.com/v1/datalab/search',
            request,
            {
                headers: {
                    'X-Naver-Client-Id': NAVER_CLIENT_ID,
                    'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('❌ 네이버 DataLab API 에러:', error.response?.data || error.message);
        return null;
    }
}

/**
 * 특정 키워드의 검색량 급증률 계산
 * (최근 1일 평균 / 최근 7일 평균) * 100
 */
export async function getSearchSurgeRate(keyword: string): Promise<number | null> {
    // 캐시 확인
    const cached = searchTrendCache.get(keyword);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    const trend = await getSearchTrend([keyword]);
    if (!trend || trend.results.length === 0) {
        return null;
    }

    const data = trend.results[0].data;
    if (data.length < 3) {
        return null;
    }

    // 오늘 데이터 제외, 어제 vs 그 전 평균 비교
    const yesterdayRatio = data[data.length - 2].ratio; // 어제
    const previousAvg =
        data.slice(0, -2).reduce((sum, d) => sum + d.ratio, 0) / (data.length - 2); // 그 전 평균

    if (previousAvg === 0) {
        return yesterdayRatio > 0 ? 100 : 0;
    }

    const surgeRate = ((yesterdayRatio - previousAvg) / previousAvg) * 100;

    // 캐시 저장
    searchTrendCache.set(keyword, { data: surgeRate, timestamp: Date.now() });

    return Math.round(surgeRate * 100) / 100;
}

/**
 * 여러 종목의 검색량 급증률 일괄 조회
 * (API 제한: 한 번에 5개까지)
 */
export async function getBatchSearchSurgeRates(
    keywords: string[]
): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    // 5개씩 나눠서 요청
    const chunks: string[][] = [];
    for (let i = 0; i < keywords.length; i += 5) {
        chunks.push(keywords.slice(i, i + 5));
    }

    for (const chunk of chunks) {
        const trend = await getSearchTrend(chunk);
        if (!trend) continue;

        for (const item of trend.results) {
            const data = item.data;
            if (data.length < 3) continue; // 최소 3일 데이터 필요

            // 오늘 데이터 제외, 어제 vs 그 전 평균 비교
            const yesterdayRatio = data[data.length - 2].ratio; // 어제
            const previousAvg =
                data.slice(0, -2).reduce((sum, d) => sum + d.ratio, 0) / (data.length - 2); // 그 전 평균

            let surgeRate = 0;
            if (previousAvg > 0) {
                surgeRate = ((yesterdayRatio - previousAvg) / previousAvg) * 100;
            } else if (yesterdayRatio > 0) {
                surgeRate = 100;
            }

            result.set(item.title, Math.round(surgeRate * 100) / 100);
        }

        // API rate limit 방지 (1초 대기)
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return result;
}

/**
 * 검색량 급증률 점수화 (0~25점)
 */
export function calculateSearchScore(surgeRate: number | null): number {
    if (surgeRate === null) return 0;

    // 급증률에 따른 점수
    // 300%+ = 25점, 200% = 20점, 100% = 15점, 50% = 10점, 0% = 5점, 마이너스 = 0점
    if (surgeRate >= 300) return 25;
    if (surgeRate >= 200) return 20;
    if (surgeRate >= 100) return 15;
    if (surgeRate >= 50) return 10;
    if (surgeRate >= 0) return 5;
    return 0;
}
