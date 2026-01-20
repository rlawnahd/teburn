// 뉴스-종목/테마 매칭 서비스
import News from '../models/News';
import Theme from '../models/Theme';

interface NewsMatch {
    newsId: string;
    title: string;
    link: string;
    press: string;
    publishedAt: Date;
}

interface StockNewsCount {
    stockName: string;
    stockCode: string;
    newsCount: number;
    recentNews: NewsMatch[];
}

interface ThemeNewsCount {
    themeName: string;
    newsCount: number;
    recentNews: NewsMatch[];
}

// 종목별 뉴스 매칭 캐시
const stockNewsCache = new Map<string, { data: StockNewsCount; timestamp: number }>();
// 테마별 뉴스 매칭 캐시
const themeNewsCache = new Map<string, { data: ThemeNewsCount; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10분

/**
 * 오늘 뉴스에서 특정 종목 언급 횟수 조회
 */
export async function getStockNewsCount(stockName: string): Promise<StockNewsCount> {
    // 캐시 확인
    const cached = stockNewsCache.get(stockName);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 종목명이 포함된 뉴스 검색 (정규식 사용)
    const news = await News.find({
        title: { $regex: stockName, $options: 'i' },
        crawledAt: { $gte: today },
    })
        .sort({ crawledAt: -1 })
        .limit(10)
        .lean();

    const result: StockNewsCount = {
        stockName,
        stockCode: '',
        newsCount: news.length,
        recentNews: news.map((n) => ({
            newsId: n._id.toString(),
            title: n.title,
            link: n.link,
            press: n.press || '',
            publishedAt: n.publishedAt || n.crawledAt,
        })),
    };

    // 캐시 저장
    stockNewsCache.set(stockName, { data: result, timestamp: Date.now() });

    return result;
}

/**
 * 오늘 뉴스에서 테마 관련 언급 횟수 조회
 * (테마명 + 키워드로 검색)
 */
export async function getThemeNewsCount(themeName: string): Promise<ThemeNewsCount> {
    // 캐시 확인
    const cached = themeNewsCache.get(themeName);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 테마 정보 조회 (키워드 포함)
    const theme = await Theme.findOne({ name: themeName }).lean();
    const searchTerms = [themeName];
    if (theme?.keywords) {
        searchTerms.push(...theme.keywords);
    }

    // OR 조건으로 검색
    const regexPattern = searchTerms.map((term) => `(${term})`).join('|');
    const news = await News.find({
        title: { $regex: regexPattern, $options: 'i' },
        crawledAt: { $gte: today },
    })
        .sort({ crawledAt: -1 })
        .limit(10)
        .lean();

    const result: ThemeNewsCount = {
        themeName,
        newsCount: news.length,
        recentNews: news.map((n) => ({
            newsId: n._id.toString(),
            title: n.title,
            link: n.link,
            press: n.press || '',
            publishedAt: n.publishedAt || n.crawledAt,
        })),
    };

    // 캐시 저장
    themeNewsCache.set(themeName, { data: result, timestamp: Date.now() });

    return result;
}

/**
 * 여러 종목의 뉴스 카운트 일괄 조회
 */
export async function getBatchStockNewsCount(
    stockNames: string[]
): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 모든 종목명으로 OR 검색
    const regexPattern = stockNames.map((name) => `(${name})`).join('|');

    const news = await News.find({
        title: { $regex: regexPattern, $options: 'i' },
        crawledAt: { $gte: today },
    }).lean();

    // 각 종목별로 카운트
    for (const stockName of stockNames) {
        const count = news.filter((n) =>
            n.title.toLowerCase().includes(stockName.toLowerCase())
        ).length;
        result.set(stockName, count);
    }

    return result;
}

/**
 * 여러 테마의 뉴스 카운트 일괄 조회
 */
export async function getBatchThemeNewsCount(
    themeNames: string[]
): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 테마별 키워드 조회
    const themes = await Theme.find({ name: { $in: themeNames } }).lean();
    const themeKeywordsMap = new Map<string, string[]>();
    for (const theme of themes) {
        themeKeywordsMap.set(theme.name, [theme.name, ...(theme.keywords || [])]);
    }

    // 오늘 모든 뉴스 조회
    const news = await News.find({
        crawledAt: { $gte: today },
    }).lean();

    // 각 테마별로 카운트
    for (const themeName of themeNames) {
        const keywords = themeKeywordsMap.get(themeName) || [themeName];
        const count = news.filter((n) =>
            keywords.some((keyword) =>
                n.title.toLowerCase().includes(keyword.toLowerCase())
            )
        ).length;
        result.set(themeName, count);
    }

    return result;
}

/**
 * 뉴스 노출 점수화 (0~20점)
 */
export function calculateNewsScore(newsCount: number): number {
    // 10건+ = 20점, 5건 = 15점, 3건 = 10점, 1건 = 5점, 0건 = 0점
    if (newsCount >= 10) return 20;
    if (newsCount >= 5) return 15;
    if (newsCount >= 3) return 10;
    if (newsCount >= 1) return 5;
    return 0;
}

/**
 * 캐시 클리어
 */
export function clearNewsMatchingCache(): void {
    stockNewsCache.clear();
    themeNewsCache.clear();
    console.log('🗑️ 뉴스 매칭 캐시 클리어');
}
