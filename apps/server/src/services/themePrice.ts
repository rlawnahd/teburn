import { getStockPricesByNames, StockPrice } from './kisApi';
import themesData from '../data/themes.json';

interface ThemeData {
    stocks: string[];
    keywords: string[];
}

interface ThemesJson {
    [themeName: string]: ThemeData;
}

const themes: ThemesJson = themesData as ThemesJson;

// 테마별 등락률 결과
export interface ThemePriceInfo {
    themeName: string;
    avgChangeRate: number;      // 평균 등락률
    topGainer: StockPrice | null;  // 최고 상승 종목
    topLoser: StockPrice | null;   // 최고 하락 종목
    stockPrices: StockPrice[];  // 종목별 가격
    stockCount: number;         // 조회된 종목 수
    totalStocks: number;        // 전체 종목 수
    updatedAt: Date;
}

// 캐시 (메모리)
let themePriceCache: Map<string, ThemePriceInfo> = new Map();
let lastCacheUpdate: Date | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5분

// 단일 테마 등락률 계산
export async function calculateThemePrice(themeName: string): Promise<ThemePriceInfo | null> {
    const theme = themes[themeName];
    if (!theme) {
        return null;
    }

    // 종목 현재가 조회 (최대 10개만 조회 - API 호출 제한)
    const stocksToQuery = theme.stocks.slice(0, 10);
    const prices = await getStockPricesByNames(stocksToQuery);

    if (prices.size === 0) {
        return {
            themeName,
            avgChangeRate: 0,
            topGainer: null,
            topLoser: null,
            stockPrices: [],
            stockCount: 0,
            totalStocks: theme.stocks.length,
            updatedAt: new Date(),
        };
    }

    const stockPrices = Array.from(prices.values());

    // 평균 등락률 계산
    const avgChangeRate = stockPrices.reduce((sum, p) => sum + p.changeRate, 0) / stockPrices.length;

    // 최고 상승/하락 종목
    const sorted = [...stockPrices].sort((a, b) => b.changeRate - a.changeRate);
    const topGainer = sorted[0] || null;
    const topLoser = sorted[sorted.length - 1] || null;

    return {
        themeName,
        avgChangeRate: Math.round(avgChangeRate * 100) / 100,
        topGainer,
        topLoser,
        stockPrices,
        stockCount: stockPrices.length,
        totalStocks: theme.stocks.length,
        updatedAt: new Date(),
    };
}

// 모든 테마 등락률 조회 (캐시 사용)
export async function getAllThemePrices(forceRefresh = false): Promise<ThemePriceInfo[]> {
    // 캐시 유효성 체크
    if (!forceRefresh && lastCacheUpdate && Date.now() - lastCacheUpdate.getTime() < CACHE_TTL) {
        console.log('📦 테마 가격 캐시 사용');
        return Array.from(themePriceCache.values());
    }

    console.log('🔄 테마 가격 새로 조회 시작...');
    const results: ThemePriceInfo[] = [];
    const themeNames = Object.keys(themes);

    // 주요 테마만 조회 (API 호출량 제한)
    const priorityThemes = ['반도체', '2차전지', '바이오', '자동차', '조선', '방산', 'AI', '게임', '엔터', '금융'];
    const themesToQuery = themeNames.filter(name => priorityThemes.includes(name));

    for (const themeName of themesToQuery) {
        try {
            const themePrice = await calculateThemePrice(themeName);
            if (themePrice) {
                results.push(themePrice);
                themePriceCache.set(themeName, themePrice);
            }
        } catch (error) {
            console.error(`테마 가격 조회 실패: ${themeName}`, error);
        }
    }

    // 조회하지 않은 테마는 캐시에서 가져오거나 기본값
    for (const themeName of themeNames) {
        if (!themesToQuery.includes(themeName)) {
            const cached = themePriceCache.get(themeName);
            if (cached) {
                results.push(cached);
            } else {
                results.push({
                    themeName,
                    avgChangeRate: 0,
                    topGainer: null,
                    topLoser: null,
                    stockPrices: [],
                    stockCount: 0,
                    totalStocks: themes[themeName].stocks.length,
                    updatedAt: new Date(),
                });
            }
        }
    }

    lastCacheUpdate = new Date();
    console.log(`✅ 테마 가격 조회 완료: ${results.length}개`);

    return results;
}

// 캐시된 테마 가격 조회 (API 호출 없음)
export function getCachedThemePrices(): ThemePriceInfo[] {
    return Array.from(themePriceCache.values());
}

// 캐시 유효 여부
export function isCacheValid(): boolean {
    return lastCacheUpdate !== null && Date.now() - lastCacheUpdate.getTime() < CACHE_TTL;
}

// 마지막 업데이트 시간
export function getLastUpdateTime(): Date | null {
    return lastCacheUpdate;
}
