// apps/server/src/services/naverApi.ts
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface NewsItem {
    title: string;
    link: string;
    press: string; // API는 언론사 정보를 따로 안 줘서 파싱하거나 비워야 함
    summary: string;
    createdAt: string;
}

export const fetchNaverNewsApi = async (query: string = '주식'): Promise<NewsItem[]> => {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn('⚠️ 네이버 API 키가 설정되지 않음');
        return [];
    }

    try {
        const url = 'https://openapi.naver.com/v1/search/news.json';
        const response = await axios.get(url, {
            params: {
                query,
                display: 10,
                start: 1,
                sort: 'date',
            },
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
            },
        });

        return response.data.items.map((item: any) => {
            const cleanTitle = item.title
                .replace(/<[^>]*>?/gm, '')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&');
            const cleanDesc = item.description
                .replace(/<[^>]*>?/gm, '')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&');

            const dateObj = new Date(item.pubDate);
            const kstOffset = 9 * 60 * 60 * 1000;
            const kstDate = new Date(dateObj.getTime() + kstOffset);
            const formattedDate = isNaN(dateObj.getTime())
                ? item.pubDate
                : kstDate.toISOString().slice(0, 16).replace('T', ' ');

            return {
                title: cleanTitle,
                link: item.link,
                press: '네이버뉴스',
                summary: cleanDesc,
                createdAt: formattedDate,
                pubDate: dateObj, // 원본 Date 객체 추가
            };
        });
    } catch (error) {
        console.error('❌ Naver API Error:', error);
        return [];
    }
};

// 종목별 24시간 이내 뉴스 개수 조회 (네이버 검색 API 사용)
const stockNewsCountCache = new Map<string, { count: number; timestamp: number }>();
const STOCK_NEWS_CACHE_TTL = 10 * 60 * 1000; // 10분

export const getStockNewsCountFromApi = async (stockName: string): Promise<number> => {
    // 캐시 확인
    const cached = stockNewsCountCache.get(stockName);
    if (cached && Date.now() - cached.timestamp < STOCK_NEWS_CACHE_TTL) {
        return cached.count;
    }

    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn(`⚠️ 네이버 API 키 없음 - ${stockName} 뉴스 검색 스킵`);
        return 0;
    }

    try {
        const url = 'https://openapi.naver.com/v1/search/news.json';
        const response = await axios.get(url, {
            params: {
                query: `${stockName} 주가`,
                display: 20,
                start: 1,
                sort: 'date',
            },
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
            },
        });

        // 24시간 이내 뉴스만 카운트
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const recentNews = response.data.items.filter((item: any) => {
            const pubDate = new Date(item.pubDate).getTime();
            return pubDate >= since;
        });

        const count = recentNews.length;

        // 캐시 저장
        stockNewsCountCache.set(stockName, { count, timestamp: Date.now() });

        return count;
    } catch (error: any) {
        console.error(`❌ 네이버 API 에러 (${stockName}):`, error.message || error);
        return 0;
    }
};

// 여러 종목의 뉴스 개수 일괄 조회 (API 호출 제한으로 상위 N개만)
export const getBatchStockNewsCountFromApi = async (
    stockNames: string[],
    limit: number = 30
): Promise<Map<string, number>> => {
    const result = new Map<string, number>();
    const targetStocks = stockNames.slice(0, limit);

    console.log(`📰 네이버 API로 뉴스 검색: ${targetStocks.length}개 종목 (${targetStocks.slice(0, 3).join(', ')}...)`);

    // 첫 번째 종목 상세 로그
    if (targetStocks.length > 0) {
        const firstStock = targetStocks[0];
        const testCount = await getStockNewsCountFromApi(firstStock);
        console.log(`📰 [테스트] ${firstStock}: ${testCount}건`);
    }

    // 병렬 처리 (5개씩 배치)
    const batchSize = 5;
    for (let i = 0; i < targetStocks.length; i += batchSize) {
        const batch = targetStocks.slice(i, i + batchSize);
        const counts = await Promise.all(
            batch.map(async (name) => {
                const count = await getStockNewsCountFromApi(name);
                return { name, count };
            })
        );
        counts.forEach(({ name, count }) => result.set(name, count));

        // API 호출 제한 방지 (배치 사이 100ms 대기)
        if (i + batchSize < targetStocks.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    // 검색 안 한 종목은 0으로 설정
    stockNames.forEach((name) => {
        if (!result.has(name)) {
            result.set(name, 0);
        }
    });

    const matched = Array.from(result.entries()).filter(([, count]) => count > 0);
    if (matched.length > 0) {
        console.log(`📰 뉴스 있는 종목: ${matched.map(([name, count]) => `${name}(${count})`).join(', ')}`);
    }

    return result;
};
