// 핫함 점수 통합 서비스
// 핫함 = 거래대금(20) + 검색량(20) + 등락률(15) + 거래량급증(15) + 뉴스(15) = 총 85점

import { themePriceCache } from './themePriceCache';
import { getBatchVolumeSurgeRates } from './volumeSurgeService';
import { getBatchSearchSurgeRates } from './naverDataLab';
import { getBatchStockNewsCountFromApi } from './naverApi';

export interface HotnessScore {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
    themes: string[];

    // 핫함 점수 상세
    totalScore: number;         // 총점 (0~85)
    tradingValueScore: number;  // 거래대금 (0~20)
    searchScore: number;        // 검색량 급증 (0~20)
    momentumScore: number;      // 등락률 (0~15)
    volumeScore: number;        // 거래량 급증 (0~15)
    newsScore: number;          // 뉴스 노출 (0~15)

    // 원본 데이터
    volumeSurgeRate: number | null;  // 거래량 급증률 (배수)
    searchSurgeRate: number | null;  // 검색량 급증률 (%)
    newsCount: number;               // 뉴스 건수

    // 등급
    grade: 'HOT' | 'WARM' | 'NORMAL' | 'COOL' | 'COLD';
}

// 등급 기준 (85점 만점 기준)
function getGrade(score: number): HotnessScore['grade'] {
    if (score >= 60) return 'HOT';
    if (score >= 45) return 'WARM';
    if (score >= 30) return 'NORMAL';
    if (score >= 15) return 'COOL';
    return 'COLD';
}

// 핫함 점수 캐시 (5분 유지)
let hotStocksCache: { data: HotnessScore[]; timestamp: number } | null = null;
const HOT_STOCKS_CACHE_TTL = 5 * 60 * 1000; // 5분

// 거래대금 점수 (0~20)
function calculateTradingValueScore(tradingValue: number): number {
    const billion = tradingValue / 100000000; // 억 단위
    if (billion >= 1000) return 20;  // 1000억 이상
    if (billion >= 500) return 17;   // 500억 이상
    if (billion >= 300) return 14;   // 300억 이상
    if (billion >= 200) return 11;   // 200억 이상
    if (billion >= 100) return 8;    // 100억 이상
    if (billion >= 50) return 5;     // 50억 이상
    return 2;                        // 50억 미만
}

// 등락률 점수 (0~15)
function calculateMomentumScore(changeRate: number): number {
    if (changeRate >= 20) return 15;  // 상한가 근접
    if (changeRate >= 15) return 13;
    if (changeRate >= 10) return 11;
    if (changeRate >= 7) return 9;
    if (changeRate >= 5) return 7;
    if (changeRate >= 3) return 5;
    if (changeRate >= 1) return 3;
    return 0;
}

// 거래량 급증률 점수 (0~15)
function calculateVolumeSurgeScore(surgeRate: number | null): number {
    if (surgeRate === null) return 0;
    if (surgeRate >= 10) return 15;
    if (surgeRate >= 5) return 12;
    if (surgeRate >= 3) return 9;
    if (surgeRate >= 2) return 6;
    if (surgeRate >= 1.5) return 3;
    return 0;
}

// 검색량 점수 (0~20) - ratio 값 기준 (0~100)
function calculateSearchScore(ratio: number | null): number {
    if (ratio === null) return 0;
    if (ratio >= 80) return 20;   // 검색량 많음
    if (ratio >= 60) return 16;
    if (ratio >= 40) return 12;
    if (ratio >= 20) return 8;
    return 4;                      // 검색량 적어도 최소 점수
}

// 뉴스 점수 (0~15)
function calculateNewsScore(newsCount: number): number {
    if (newsCount >= 10) return 15;
    if (newsCount >= 5) return 12;
    if (newsCount >= 3) return 9;
    if (newsCount >= 1) return 5;
    return 0;
}

/**
 * 여러 종목의 핫함 점수 일괄 계산
 */
export async function calculateBatchHotness(
    stocks: Array<{ stockCode: string; stockName: string; themes: string[] }>
): Promise<HotnessScore[]> {
    const stockCodes = stocks.map((s) => s.stockCode);
    const stockNames = stocks.map((s) => s.stockName);

    // 모든 지표 병렬 조회
    const [volumeSurges, searchSurges, newsCounts] = await Promise.all([
        getBatchVolumeSurgeRates(stockCodes),
        getBatchSearchSurgeRates(stockNames),
        getBatchStockNewsCountFromApi(stockNames, 30), // 상위 30개만 API 검색
    ]);

    const results: HotnessScore[] = [];

    for (const stock of stocks) {
        const priceData = themePriceCache.getStockPrice(stock.stockCode);
        if (!priceData) continue;

        const volumeSurge = volumeSurges.get(stock.stockCode) || null;
        const searchSurge = searchSurges.get(stock.stockName) || null;
        const newsCount = newsCounts.get(stock.stockName) || 0;

        // 점수 계산
        const tradingValueScore = calculateTradingValueScore(priceData.tradingValue);
        const searchScore = calculateSearchScore(searchSurge);
        const momentumScore = calculateMomentumScore(priceData.changeRate);
        const volumeScore = calculateVolumeSurgeScore(volumeSurge);
        const newsScore = calculateNewsScore(newsCount);

        const totalScore = tradingValueScore + searchScore + momentumScore + volumeScore + newsScore;

        results.push({
            stockCode: stock.stockCode,
            stockName: stock.stockName,
            currentPrice: priceData.currentPrice,
            changeRate: priceData.changeRate,
            tradingValue: priceData.tradingValue,
            themes: stock.themes,

            totalScore,
            tradingValueScore,
            searchScore,
            momentumScore,
            volumeScore,
            newsScore,

            volumeSurgeRate: volumeSurge,
            searchSurgeRate: searchSurge,
            newsCount,

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
        console.log('주도주 점수 캐시 사용');
        return hotStocksCache.data.slice(0, limit);
    }

    console.log('주도주 점수 계산 시작...');
    const startTime = Date.now();

    const allPrices = themePriceCache.getAllThemePrices();

    // 종목별 테마 매핑 + 가격 정보 저장
    const stockThemesMap = new Map<string, Set<string>>();
    const stockDataMap = new Map<string, { code: string; name: string; changeRate: number; tradingValue: number }>();

    for (const theme of allPrices.themes) {
        for (const stock of theme.topStocks) {
            // 기존 데이터보다 등락률이 높은 경우만 업데이트 (중복 종목 처리)
            const existing = stockDataMap.get(stock.stockCode);
            if (!existing || stock.changeRate > existing.changeRate) {
                // 거래대금 정보 가져오기
                const priceData = themePriceCache.getStockPrice(stock.stockCode);
                stockDataMap.set(stock.stockCode, {
                    code: stock.stockCode,
                    name: stock.stockName,
                    changeRate: stock.changeRate,
                    tradingValue: priceData?.tradingValue || 0,
                });
            }
            if (!stockThemesMap.has(stock.stockCode)) {
                stockThemesMap.set(stock.stockCode, new Set());
            }
            stockThemesMap.get(stock.stockCode)!.add(theme.themeName);
        }
    }

    // 상승 종목만 필터 (4% 이상) + 거래대금 순 정렬
    const candidates: Array<{ stockCode: string; stockName: string; themes: string[]; tradingValue: number }> = [];

    for (const [stockCode, data] of stockDataMap) {
        if (data.changeRate >= 4) {
            candidates.push({
                stockCode,
                stockName: data.name,
                themes: Array.from(stockThemesMap.get(stockCode) || []).slice(0, 3),
                tradingValue: data.tradingValue,
            });
        }
    }

    // 거래대금 순으로 정렬 (뉴스 검색 시 상위 30개만 검색하므로)
    candidates.sort((a, b) => b.tradingValue - a.tradingValue);

    console.log(`📊 4% 이상 상승 종목: ${candidates.length}개 (전체 ${stockDataMap.size}개 중)`);
    console.log(`📊 거래대금 TOP 5: ${candidates.slice(0, 5).map(c => c.stockName).join(', ')}`);

    // 핫함 점수 계산
    const scored = await calculateBatchHotness(candidates);

    // 캐시 저장
    hotStocksCache = { data: scored, timestamp: Date.now() };
    console.log(`주도주 점수 계산 완료: ${scored.length}개 (${((Date.now() - startTime) / 1000).toFixed(1)}초)`);

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
