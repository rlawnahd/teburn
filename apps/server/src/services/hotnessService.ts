// 핫함 점수 통합 서비스
// 핫함 = 거래량 급증(25) + 검색량(25) + 뉴스(20) + 수급(20) + 등락률(10)

import { themePriceCache, CachedStockPrice } from './themePriceCache';
import { getVolumeSurgeRate, calculateVolumeSurgeScore, getBatchVolumeSurgeRates } from './volumeSurgeService';
import { getSearchSurgeRate, calculateSearchScore, getBatchSearchSurgeRates } from './naverDataLab';
import { getStockNewsCount, getBatchStockNewsCount, calculateNewsScore } from './newsMatchingService';
import { getTodaySupply, getBatchSupply, calculateSupplyScore } from './supplyService';

export interface HotnessScore {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
    themes: string[];

    // 핫함 점수 상세
    totalScore: number;      // 총점 (0~100)
    volumeScore: number;     // 거래량 급증 (0~25)
    searchScore: number;     // 검색량 급증 (0~25)
    newsScore: number;       // 뉴스 노출 (0~20)
    supplyScore: number;     // 수급 (0~20)
    momentumScore: number;   // 등락률 (0~10)

    // 원본 데이터
    volumeSurgeRate: number | null;  // 거래량 급증률 (배수)
    searchSurgeRate: number | null;  // 검색량 급증률 (%)
    newsCount: number;               // 뉴스 건수
    foreignNet: number | null;       // 외국인 순매수 (원)
    instNet: number | null;          // 기관 순매수 (원)

    // 등급
    grade: 'HOT' | 'WARM' | 'NORMAL' | 'COOL' | 'COLD';
}

// 등급 기준
function getGrade(score: number): HotnessScore['grade'] {
    if (score >= 70) return 'HOT';
    if (score >= 50) return 'WARM';
    if (score >= 30) return 'NORMAL';
    if (score >= 15) return 'COOL';
    return 'COLD';
}

// 핫함 점수 캐시 (5분 유지)
let hotStocksCache: { data: HotnessScore[]; timestamp: number } | null = null;
const HOT_STOCKS_CACHE_TTL = 5 * 60 * 1000; // 5분

// 등락률 점수 (0~10)
function calculateMomentumScore(changeRate: number): number {
    if (changeRate >= 15) return 10;  // 상한가 근접
    if (changeRate >= 10) return 8;
    if (changeRate >= 5) return 6;
    if (changeRate >= 2) return 4;
    if (changeRate >= 0) return 2;
    return 0;
}

/**
 * 단일 종목의 핫함 점수 계산
 */
export async function calculateStockHotness(
    stockCode: string,
    stockName: string,
    themes: string[] = []
): Promise<HotnessScore | null> {
    const priceData = themePriceCache.getStockPrice(stockCode);
    if (!priceData) {
        return null;
    }

    // 각 지표 조회
    const [volumeSurge, searchSurge, newsData, supplyData] = await Promise.all([
        getVolumeSurgeRate(stockCode),
        getSearchSurgeRate(stockName),
        getStockNewsCount(stockName),
        getTodaySupply(stockCode),
    ]);

    // 점수 계산
    const volumeScore = calculateVolumeSurgeScore(volumeSurge);
    const searchScore = calculateSearchScore(searchSurge);
    const newsScore = calculateNewsScore(newsData.newsCount);
    const supplyScore = calculateSupplyScore(supplyData);
    const momentumScore = calculateMomentumScore(priceData.changeRate);

    const totalScore = volumeScore + searchScore + newsScore + supplyScore + momentumScore;

    return {
        stockCode,
        stockName,
        currentPrice: priceData.currentPrice,
        changeRate: priceData.changeRate,
        tradingValue: priceData.tradingValue,
        themes,

        totalScore,
        volumeScore,
        searchScore,
        newsScore,
        supplyScore,
        momentumScore,

        volumeSurgeRate: volumeSurge,
        searchSurgeRate: searchSurge,
        newsCount: newsData.newsCount,
        foreignNet: supplyData?.foreignNet || null,
        instNet: supplyData?.instNet || null,

        grade: getGrade(totalScore),
    };
}

/**
 * 여러 종목의 핫함 점수 일괄 계산 (최적화)
 */
export async function calculateBatchHotness(
    stocks: Array<{ stockCode: string; stockName: string; themes: string[] }>
): Promise<HotnessScore[]> {
    const stockCodes = stocks.map((s) => s.stockCode);
    const stockNames = stocks.map((s) => s.stockName);

    // 모든 지표 병렬 조회
    const [volumeSurges, searchSurges, newsCounts, supplies] = await Promise.all([
        getBatchVolumeSurgeRates(stockCodes),
        getBatchSearchSurgeRates(stockNames),
        getBatchStockNewsCount(stockNames),
        getBatchSupply(stockCodes),
    ]);

    const results: HotnessScore[] = [];

    for (const stock of stocks) {
        const priceData = themePriceCache.getStockPrice(stock.stockCode);
        if (!priceData) continue;

        const volumeSurge = volumeSurges.get(stock.stockCode) || null;
        const searchSurge = searchSurges.get(stock.stockName) || null;
        const newsCount = newsCounts.get(stock.stockName) || 0;
        const supplyData = supplies.get(stock.stockCode) || null;

        const volumeScore = calculateVolumeSurgeScore(volumeSurge);
        const searchScore = calculateSearchScore(searchSurge);
        const newsScore = calculateNewsScore(newsCount);
        const supplyScore = calculateSupplyScore(supplyData);
        const momentumScore = calculateMomentumScore(priceData.changeRate);

        const totalScore = volumeScore + searchScore + newsScore + supplyScore + momentumScore;

        results.push({
            stockCode: stock.stockCode,
            stockName: stock.stockName,
            currentPrice: priceData.currentPrice,
            changeRate: priceData.changeRate,
            tradingValue: priceData.tradingValue,
            themes: stock.themes,

            totalScore,
            volumeScore,
            searchScore,
            newsScore,
            supplyScore,
            momentumScore,

            volumeSurgeRate: volumeSurge,
            searchSurgeRate: searchSurge,
            newsCount,
            foreignNet: supplyData?.foreignNet || null,
            instNet: supplyData?.instNet || null,

            grade: getGrade(totalScore),
        });
    }

    // 핫함 점수 순 정렬
    results.sort((a, b) => b.totalScore - a.totalScore);

    return results;
}

/**
 * 전체 종목 중 핫함 TOP N 조회 (캐시 적용)
 */
export async function getTopHotStocks(limit: number = 30): Promise<HotnessScore[]> {
    // 캐시 확인
    if (hotStocksCache && Date.now() - hotStocksCache.timestamp < HOT_STOCKS_CACHE_TTL) {
        console.log('🔥 핫함 점수 캐시 사용');
        return hotStocksCache.data.slice(0, limit);
    }

    console.log('🔥 핫함 점수 계산 시작...');
    const startTime = Date.now();

    const allPrices = themePriceCache.getAllThemePrices();

    // 종목별 테마 매핑
    const stockThemesMap = new Map<string, Set<string>>();
    const stockDataMap = new Map<string, { code: string; name: string }>();

    for (const theme of allPrices.themes) {
        for (const stock of theme.topStocks) {
            if (!stockDataMap.has(stock.stockCode)) {
                stockDataMap.set(stock.stockCode, {
                    code: stock.stockCode,
                    name: stock.stockName,
                });
            }
            if (!stockThemesMap.has(stock.stockCode)) {
                stockThemesMap.set(stock.stockCode, new Set());
            }
            stockThemesMap.get(stock.stockCode)!.add(theme.themeName);
        }
    }

    // 상승 종목만 필터 (4% 이상)
    const candidates: Array<{ stockCode: string; stockName: string; themes: string[] }> = [];

    for (const [stockCode, data] of stockDataMap) {
        const price = themePriceCache.getStockPrice(stockCode);
        if (price && price.changeRate >= 4) {
            candidates.push({
                stockCode,
                stockName: data.name,
                themes: Array.from(stockThemesMap.get(stockCode) || []).slice(0, 3),
            });
        }
    }

    // 핫함 점수 계산
    const scored = await calculateBatchHotness(candidates);

    // 캐시 저장
    hotStocksCache = { data: scored, timestamp: Date.now() };
    console.log(`🔥 핫함 점수 계산 완료: ${scored.length}개 (${((Date.now() - startTime) / 1000).toFixed(1)}초)`);

    return scored.slice(0, limit);
}

/**
 * 테마별 핫함 점수 집계
 */
export async function getThemeHotness(themeName: string): Promise<{
    themeName: string;
    avgHotnessScore: number;
    topStocks: HotnessScore[];
    grade: HotnessScore['grade'];
}> {
    const themePrice = themePriceCache.getThemePrice(themeName);
    if (!themePrice) {
        return {
            themeName,
            avgHotnessScore: 0,
            topStocks: [],
            grade: 'COLD',
        };
    }

    const stocks = themePrice.topStocks.map((s) => ({
        stockCode: s.stockCode,
        stockName: s.stockName,
        themes: [themeName],
    }));

    const scored = await calculateBatchHotness(stocks);
    const avgScore = scored.length > 0
        ? scored.reduce((sum, s) => sum + s.totalScore, 0) / scored.length
        : 0;

    return {
        themeName,
        avgHotnessScore: Math.round(avgScore * 100) / 100,
        topStocks: scored,
        grade: getGrade(avgScore),
    };
}
