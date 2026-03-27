// 주도주 점수 통합 서비스
// 주도주 점수 = 거래대금(35) + 등락률(20) + 거래량급증(15) + 뉴스(15) + 대장주집중도(15) = 총 100점
// 연속성 보너스: 최대 +30점 (100점 초과 가능)

import { themePriceCache } from './themePriceCache';
import { getBatchVolumeSurgeRates } from './volumeSurgeService';
import { getBatchStockNewsCountFromApi } from './naverApi';
import HotnessHistory from '../models/HotnessHistory';
import { updateGlobalSubscriptions } from './wsServer';
import { mergeBatchScores } from './realtimeHotness';

export interface HotnessScore {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
    themes: string[];

    // 주도주 점수 상세
    totalScore: number;                // 총점 (0~100)
    tradingValueScore: number;         // 거래대금 (0~30)
    momentumScore: number;             // 등락률 (0~20)
    volumeScore: number;               // 거래량 급증 (0~15)
    newsScore: number;                 // 뉴스 노출 (0~10)
    themeConcentrationScore: number;   // 대장주 집중도 (0~10)
    streakScore: number;               // 연속성 (0~15)
    streakDays: number;                // 연속 상위권 일수

    // 원본 데이터
    volumeSurgeRate: number | null;  // 거래량 급증률 (배수)
    newsCount: number;               // 뉴스 건수
    latestNews: string | null;       // 최신 뉴스 제목
    themeConcentration: number;      // 최대 집중도 (%)

    // 등급
    grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

// 등급 기준 (100점 만점 기준)
export function getGrade(score: number): HotnessScore['grade'] {
    if (score >= 70) return 'S';
    if (score >= 50) return 'A';
    if (score >= 35) return 'B';
    if (score >= 20) return 'C';
    return 'D';
}

// 주도주 점수 캐시 (5분 유지, stale-while-revalidate)
let hotStocksCache: { data: HotnessScore[]; timestamp: number } | null = null;
const HOT_STOCKS_CACHE_TTL = 5 * 60 * 1000; // 5분
let refreshPromise: Promise<void> | null = null;

// 거래대금 점수 (0~35)
export function calculateTradingValueScore(tradingValue: number): number {
    const billion = tradingValue / 100000000; // 억 단위
    if (billion >= 1000) return 35;  // 1000억 이상
    if (billion >= 500) return 30;   // 500억 이상
    if (billion >= 300) return 25;   // 300억 이상
    if (billion >= 200) return 20;   // 200억 이상
    if (billion >= 100) return 14;   // 100억 이상
    if (billion >= 50) return 8;     // 50억 이상
    return 3;                        // 50억 미만
}

// 등락률 점수 (0~20)
export function calculateMomentumScore(changeRate: number): number {
    if (changeRate >= 20) return 20;  // 상한가 근접
    if (changeRate >= 15) return 17;
    if (changeRate >= 10) return 14;
    if (changeRate >= 7) return 11;
    if (changeRate >= 5) return 8;
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

// 뉴스 점수 (0~15)
function calculateNewsScore(newsCount: number): number {
    if (newsCount >= 10) return 15;
    if (newsCount >= 5) return 12;
    if (newsCount >= 3) return 9;
    if (newsCount >= 1) return 4;
    return 0;
}

// 대장주 집중도 점수 (0~15)
// 테마 내 거래대금 점유율로 자금이 집중되는 대장주 식별
function calculateThemeConcentrationScore(stockCode: string, themes: string[]): { score: number; concentration: number } {
    let maxConcentration = 0;

    for (const themeName of themes) {
        const themeData = themePriceCache.getThemePrice(themeName);
        if (!themeData || themeData.topStocks.length === 0) continue;

        const totalTradingValue = themeData.topStocks.reduce((sum, s) => sum + s.tradingValue, 0);
        if (totalTradingValue === 0) continue;

        const stockData = themeData.topStocks.find(s => s.stockCode === stockCode);
        if (!stockData) continue;

        const concentration = (stockData.tradingValue / totalTradingValue) * 100;
        if (concentration > maxConcentration) {
            maxConcentration = concentration;
        }
    }

    let score = 0;
    if (maxConcentration >= 50) score = 15;
    else if (maxConcentration >= 40) score = 12;
    else if (maxConcentration >= 30) score = 9;
    else if (maxConcentration >= 20) score = 6;
    else if (maxConcentration >= 10) score = 3;

    return { score, concentration: Math.round(maxConcentration * 10) / 10 };
}

// 연속성 점수 (0~15)
// DailyLeadingTheme 기반 연속 주도주 계산
// 실제 장 운영일(DailyLeadingTheme에 기록된 날) 기준으로 연속 여부 판단
// → 공휴일/주말 상관없이 정확한 영업일 기준
import DailyLeadingTheme from '../models/DailyLeadingTheme';

async function calculateBatchStreakScores(stockCodes: string[]): Promise<Map<string, { score: number; days: number }>> {
    const result = new Map<string, { score: number; days: number }>();

    if (stockCodes.length === 0) return result;

    // 최근 장 운영일 3일 조회 (오늘 제외, 가장 최근 3개 영업일)
    const recentDays = await DailyLeadingTheme.find()
        .sort({ date: -1 })
        .limit(4) // 오늘 포함될 수 있으니 4개 조회
        .select('date')
        .lean();

    if (recentDays.length === 0) return result;

    // 오늘 날짜 (KST 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstToday = new Date(now.getTime() + kstOffset).toISOString().split('T')[0];

    // DailyLeadingTheme의 date는 UTC로 저장되어 있어서 KST로 변환 필요
    const allTradingDates = recentDays
        .map(d => new Date(new Date(d.date).getTime() + kstOffset).toISOString().split('T')[0]);

    // 과거 영업일만 (오늘 제외) — 현재 계산 대상 종목은 이미 오늘 리스트에 있음
    const pastDates = allTradingDates.filter(d => d !== kstToday).slice(0, 3);

    if (pastDates.length === 0) return result;

    const histories = await HotnessHistory.find({
        date: { $in: pastDates },
        stockCode: { $in: stockCodes },
    }).select('stockCode date').lean();

    const stockDates = new Map<string, Set<string>>();
    for (const h of histories) {
        if (!stockDates.has(h.stockCode)) stockDates.set(h.stockCode, new Set());
        stockDates.get(h.stockCode)!.add(h.date);
    }

    for (const code of stockCodes) {
        const dates = stockDates.get(code);
        if (!dates) {
            result.set(code, { score: 0, days: 0 });
            continue;
        }

        // 가장 최근 과거 영업일부터 연속 체크
        let pastStreak = 0;
        for (const td of pastDates) {
            if (dates.has(td)) pastStreak++;
            else break;
        }

        // 오늘(현재 리스트에 있음) + 과거 연속일 = 총 연속일
        const totalDays = pastStreak > 0 ? pastStreak + 1 : 0;

        let score = 0;
        if (totalDays >= 3) score = 30;
        else if (totalDays >= 2) score = 20;

        result.set(code, { score, days: totalDays });
    }

    return result;
}

/**
 * 여러 종목의 주도주 점수 일괄 계산
 */
export async function calculateBatchHotness(
    stocks: Array<{ stockCode: string; stockName: string; themes: string[] }>
): Promise<HotnessScore[]> {
    const stockCodes = stocks.map((s) => s.stockCode);
    const stockNames = stocks.map((s) => s.stockName);

    // 모든 지표 병렬 조회
    const [volumeSurges, newsCounts, streakScores] = await Promise.all([
        getBatchVolumeSurgeRates(stockCodes),
        getBatchStockNewsCountFromApi(stockNames, 30), // 상위 30개만 API 검색
        calculateBatchStreakScores(stockCodes),
    ]);

    const results: HotnessScore[] = [];

    for (const stock of stocks) {
        const priceData = themePriceCache.getStockPrice(stock.stockCode);
        if (!priceData) continue;

        const volumeSurge = volumeSurges.get(stock.stockCode) || null;
        const newsData = newsCounts.get(stock.stockName) || { count: 0, latestNewsTitle: null };
        const newsCount = newsData.count;

        // 점수 계산
        const tradingValueScore = calculateTradingValueScore(priceData.tradingValue);
        const momentumScore = calculateMomentumScore(priceData.changeRate);
        const volumeScore = calculateVolumeSurgeScore(volumeSurge);
        const newsScore = calculateNewsScore(newsCount);
        const { score: themeConcentrationScore, concentration: themeConcentration } =
            calculateThemeConcentrationScore(stock.stockCode, stock.themes);
        const streak = streakScores.get(stock.stockCode) || { score: 0, days: 0 };

        const baseScore = tradingValueScore + momentumScore + volumeScore + newsScore + themeConcentrationScore;
        const totalScore = baseScore + streak.score; // 보너스 포함, 100점 초과 가능

        results.push({
            stockCode: stock.stockCode,
            stockName: stock.stockName,
            currentPrice: priceData.currentPrice,
            changeRate: priceData.changeRate,
            tradingValue: priceData.tradingValue,
            themes: stock.themes,

            totalScore,
            tradingValueScore,
            momentumScore,
            volumeScore,
            newsScore,
            themeConcentrationScore,
            streakScore: streak.score,
            streakDays: streak.days,

            volumeSurgeRate: volumeSurge,
            newsCount,
            latestNews: newsData.latestNewsTitle,
            themeConcentration,

            grade: getGrade(baseScore), // 등급은 기본 100점 기준
        });
    }

    // 주도주 점수 순 정렬
    results.sort((a, b) => b.totalScore - a.totalScore);

    return results;
}

/**
 * 주도주 점수 재계산 (내부용)
 * refreshPromise를 공유하여 동시 요청 시 같은 계산을 기다림
 */
async function doRefresh(): Promise<void> {
    try {
        console.log('주도주 점수 계산 시작...');
        const startTime = Date.now();

        const allPrices = themePriceCache.getAllThemePrices();

        const stockThemesMap = new Map<string, Set<string>>();
        const stockDataMap = new Map<string, { code: string; name: string; changeRate: number; tradingValue: number }>();

        for (const theme of allPrices.themes) {
            for (const stock of theme.topStocks) {
                const existing = stockDataMap.get(stock.stockCode);
                if (!existing || stock.changeRate > existing.changeRate) {
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

        const candidates: Array<{ stockCode: string; stockName: string; themes: string[]; tradingValue: number }> = [];

        for (const [stockCode, data] of stockDataMap) {
            // 등락률 필터 없음 — 전체 종목 대상으로 점수 계산 후 TOP N 선정
            candidates.push({
                stockCode,
                stockName: data.name,
                themes: Array.from(stockThemesMap.get(stockCode) || []).slice(0, 3),
                tradingValue: data.tradingValue,
            });
        }

        candidates.sort((a, b) => b.tradingValue - a.tradingValue);

        console.log(`📊 후보 종목: ${candidates.length}개 (전체 ${stockDataMap.size}개 중)`);
        console.log(`📊 거래대금 TOP 5: ${candidates.slice(0, 5).map(c => c.stockName).join(', ')}`);

        const scored = await calculateBatchHotness(candidates);

        hotStocksCache = { data: scored, timestamp: Date.now() };

        // 글로벌 구독 종목 업데이트 (WebSocket)
        updateGlobalSubscriptions(scored.map(s => s.stockCode));

        // 실시간 점수 배치 병합
        mergeBatchScores(scored);

        console.log(`주도주 점수 계산 완료: ${scored.length}개 (${((Date.now() - startTime) / 1000).toFixed(1)}초)`);
    } catch (error) {
        console.error('주도주 점수 계산 실패:', error);
    } finally {
        refreshPromise = null;
    }
}

function refreshHotStocks(): Promise<void> {
    if (!refreshPromise) {
        refreshPromise = doRefresh();
    }
    return refreshPromise;
}

/**
 * 주도주 캐시 데이터 반환 (어드민 모니터링용)
 */
export function getHotStocksCache(): HotnessScore[] {
    return hotStocksCache?.data || [];
}

/**
 * 전체 종목 중 주도주 점수 TOP N 조회 (stale-while-revalidate)
 */
export async function getTopHotStocks(limit: number = 30): Promise<HotnessScore[]> {
    // 캐시 유효 → 즉시 반환
    if (hotStocksCache && Date.now() - hotStocksCache.timestamp < HOT_STOCKS_CACHE_TTL) {
        console.log('주도주 점수 캐시 사용');
        return hotStocksCache.data.slice(0, limit);
    }

    // 캐시 만료됐지만 데이터 있음 → 이전 데이터 즉시 반환 + 백그라운드 갱신
    if (hotStocksCache) {
        console.log('주도주 점수 stale 캐시 반환 + 백그라운드 갱신');
        refreshHotStocks();
        return hotStocksCache.data.slice(0, limit);
    }

    // 캐시 아예 없음 (첫 요청) → 계산 후 반환
    await refreshHotStocks();
    return hotStocksCache ? hotStocksCache.data.slice(0, limit) : [];
}

/**
 * 서버 시작 시 주도주 점수 사전 계산 (warmup)
 */
export async function warmupHotStocks(): Promise<void> {
    console.log('🔥 주도주 점수 사전 계산 시작...');
    await refreshHotStocks();
    console.log('🔥 주도주 점수 사전 계산 완료');
}

/**
 * 당일 주도주 점수를 DB에 스냅샷 저장 (장 마감 시 1회 호출)
 */
export async function saveDailyHotnessHistory(): Promise<void> {
    if (!hotStocksCache || hotStocksCache.data.length === 0) {
        console.log('주도주 히스토리: 캐시 데이터 없음, 스킵');
        return;
    }

    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const dateStr = kstDate.toISOString().split('T')[0];

    let saved = 0;
    for (const stock of hotStocksCache.data) {
        try {
            await HotnessHistory.findOneAndUpdate(
                { stockCode: stock.stockCode, date: dateStr },
                {
                    stockCode: stock.stockCode,
                    stockName: stock.stockName,
                    totalScore: stock.totalScore,
                    grade: stock.grade,
                    tradingValueScore: stock.tradingValueScore,
                    momentumScore: stock.momentumScore,
                    volumeScore: stock.volumeScore,
                    newsScore: stock.newsScore,
                    themeConcentrationScore: stock.themeConcentrationScore,
                    streakScore: stock.streakScore,
                    date: dateStr,
                },
                { upsert: true }
            );
            saved++;
        } catch (err) {
            // unique index 충돌은 무시
        }
    }
    console.log(`주도주 히스토리 저장 완료: ${saved}개 (${dateStr})`);
}

/**
 * 테마별 주도주 점수 집계
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
            grade: 'D',
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
