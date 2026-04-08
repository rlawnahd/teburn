// 주도주 점수 통합 서비스
// 천이요 트레이더의 5원칙 + 우리 시스템 강점을 결합한 점수 체계
// 주도주 점수 = 거래대금(25) + 상대강도(20) + 거래량급증(15) + 대장주집중도(15) +
//              시세패턴(10) + 등락률(10) + 시장시선(5) = 총 100점
// 연속성 보너스: 최대 +30점 (100점 초과 가능)

import { themePriceCache } from './themePriceCache';
import { getBatchVolumeSurgeRates } from './volumeSurgeService';
import { getBatchStockNewsCountFromApi } from './naverApi';
import HotnessHistory from '../models/HotnessHistory';
import { updateGlobalSubscriptions } from './wsServer';
import { mergeBatchScores } from './realtimeHotness';
import { getKospiIndexData, getKosdaqIndexData } from './indexService';
import { getBatchStockAiReasons } from './stockReasonService';

export interface HotnessScore {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
    themes: string[];

    // 주도주 점수 상세
    totalScore: number;                  // 총점 (0~100)
    tradingValueScore: number;           // 거래대금 (0~25) — 거래대금 > 상승률
    relativeStrengthScore: number;       // 상대 강도 (0~20) — 지수 대비
    volumeScore: number;                 // 거래량 급증 (0~15)
    themeConcentrationScore: number;     // 대장주 집중도 (0~15) — 첫 반응 종목
    patternScore: number;                // 시세 패턴 (0~10) — 당일 두 번 시세
    momentumScore: number;               // 등락률 (0~10)
    newsScore: number;                   // 시장 시선 (0~5) — 뉴스/조회수
    streakScore: number;                 // 연속성 (0~30) 보너스
    streakDays: number;                  // 연속 상위권 일수

    // 자동 생성 메타
    reason: string;                      // "주도 이유" 한 줄 (자동 생성)
    confidence: number;                  // 확실함 점수 (0~100, 신뢰도)

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

// === 천이요 원칙 ③: 거래대금 > 상승률 ===
// 거래대금 점수 (0~25) — 시총 대비 거래대금 비율 기반
export function calculateTradingValueScore(tradingValue: number, marketCap: number = 0): number {
    const billion = tradingValue / 100000000; // 억 단위

    // 시총 데이터가 있으면 시총 대비 비율로 계산
    if (marketCap > 0) {
        const ratio = (billion / marketCap) * 100; // 시총 대비 거래대금 비율(%)
        if (ratio >= 10) return 25;
        if (ratio >= 5) return 22;
        if (ratio >= 3) return 18;
        if (ratio >= 1.5) return 14;
        if (ratio >= 0.8) return 10;
        if (ratio >= 0.3) return 5;
        return 2;
    }

    // 시총 없으면 절대값 기준 (fallback)
    if (billion >= 1000) return 25;
    if (billion >= 500) return 22;
    if (billion >= 300) return 18;
    if (billion >= 200) return 14;
    if (billion >= 100) return 10;
    if (billion >= 50) return 5;
    return 2;
}

// === 천이요 원칙 ⑤: 지수 대비 강함 ===
// 상대 강도 점수 (0~20) — 종목 등락률 - 시장 등락률 (alpha)
export function calculateRelativeStrengthScore(stockChangeRate: number, marketChangeRate: number): number {
    const alpha = stockChangeRate - marketChangeRate;

    // 코스피 -2%일 때 종목 +5% → alpha +7% → 매우 강함
    // 코스피 +2%일 때 종목 +5% → alpha +3% → 평범
    if (alpha >= 15) return 20;   // 시장 대비 압도적
    if (alpha >= 10) return 17;
    if (alpha >= 7) return 14;
    if (alpha >= 5) return 11;
    if (alpha >= 3) return 8;
    if (alpha >= 1) return 5;
    if (alpha >= 0) return 2;
    return 0; // 시장보다 약함
}

// === 천이요 원칙 ①: 시세 두 번 (당일 패턴) ===
// 시세 패턴 점수 (0~10) — 장중 고점 찍고 눌렸다가 재반등 패턴
export function calculatePatternScore(currentRate: number, intradayHighRate: number): number {
    // 한 번도 시세 안 났으면 0점 (intradayHigh == currentRate)
    if (intradayHighRate <= 0) return 0;

    // 장중 최고점 - 현재 등락률 = 눌림 정도
    const pullback = intradayHighRate - currentRate;

    // 처음 시세 (한 번 강하게 움직임): 5%+ 도달
    if (intradayHighRate < 5) return 0;

    // Case A: 첫 시세 후 약간 눌렸다가 재반등 중 (가장 이상적)
    // 고점 대비 1~3% 눌린 상태 + 현재도 충분히 강함
    if (pullback >= 1 && pullback <= 3 && currentRate >= 5) {
        return 10; // 두 번째 시세 직전 — 매수 적기
    }

    // Case B: 첫 시세 후 깊게 눌림 (3~5%)
    if (pullback > 3 && pullback <= 5 && currentRate >= 3) {
        return 7;
    }

    // Case C: 한 번 강하게 시세 났는데 거의 안 눌림 (이미 큰 시세 진행 중)
    if (pullback < 1 && intradayHighRate >= 7) {
        return 5;
    }

    // Case D: 너무 깊게 눌림 (5%+) — 약화 가능성
    if (pullback > 5) {
        return 0;
    }

    return 0;
}

// === 등락률 점수 (0~10) — 비중 축소 ===
export function calculateMomentumScore(changeRate: number): number {
    if (changeRate >= 20) return 10;  // 상한가 근접
    if (changeRate >= 15) return 8;
    if (changeRate >= 10) return 7;
    if (changeRate >= 7) return 5;
    if (changeRate >= 5) return 4;
    if (changeRate >= 3) return 2;
    if (changeRate >= 1) return 1;
    return 0;
}

// === 거래량 급증률 점수 (0~15) — 유지 ===
function calculateVolumeSurgeScore(surgeRate: number | null): number {
    if (surgeRate === null) return 0;
    if (surgeRate >= 10) return 15;
    if (surgeRate >= 5) return 12;
    if (surgeRate >= 3) return 9;
    if (surgeRate >= 2) return 6;
    if (surgeRate >= 1.5) return 3;
    return 0;
}

// === 천이요 원칙 ②: 시장 시선 (조회수/뉴스) ===
// 뉴스 점수 (0~5) — 비중 축소 (간접 지표라 가중치 낮춤)
function calculateNewsScore(newsCount: number): number {
    if (newsCount >= 10) return 5;
    if (newsCount >= 5) return 4;
    if (newsCount >= 3) return 3;
    if (newsCount >= 1) return 2;
    return 0;
}

// === 천이요 원칙 ④: 테마 대장주 ===
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
 * 종목별 "주도 이유" 한 줄 자동 생성
 * 가장 두드러진 시그널 1~2개를 뽑아 문장화
 */
function generateReason(params: {
    relativeStrengthScore: number;
    themeConcentrationScore: number;
    themeConcentration: number;
    volumeSurgeRate: number | null;
    streakDays: number;
    patternScore: number;
    tradingValueScore: number;
    changeRate: number;
    themes: string[];
}): string {
    const reasons: { priority: number; text: string }[] = [];

    // 1. 시장 대비 압도적 강도 (최우선)
    if (params.relativeStrengthScore >= 14) {
        reasons.push({ priority: 1, text: '시장 대비 압도적 강도' });
    } else if (params.relativeStrengthScore >= 8) {
        reasons.push({ priority: 5, text: '시장 대비 강세' });
    }

    // 2. 거래량 폭증
    if (params.volumeSurgeRate && params.volumeSurgeRate >= 5) {
        reasons.push({ priority: 2, text: `거래량 ${Math.round(params.volumeSurgeRate)}배 급증` });
    } else if (params.volumeSurgeRate && params.volumeSurgeRate >= 3) {
        reasons.push({ priority: 6, text: `거래량 ${params.volumeSurgeRate.toFixed(1)}배` });
    }

    // 3. 테마 대장주
    if (params.themeConcentrationScore >= 12 && params.themes[0]) {
        reasons.push({ priority: 3, text: `${params.themes[0]} 대장주` });
    } else if (params.themeConcentration >= 20 && params.themes[0]) {
        reasons.push({ priority: 7, text: `${params.themes[0]} 주도` });
    }

    // 4. 연속 주도주
    if (params.streakDays >= 3) {
        reasons.push({ priority: 4, text: `${params.streakDays}일 연속 주도주` });
    }

    // 5. 시세 패턴 (눌림목 재반등)
    if (params.patternScore >= 8) {
        reasons.push({ priority: 8, text: '눌림목 재반등' });
    }

    // 6. 거래대금 폭증
    if (params.tradingValueScore >= 22) {
        reasons.push({ priority: 9, text: '거래대금 집중' });
    }

    // 7. 상한가 임박
    if (params.changeRate >= 20) {
        reasons.push({ priority: 0, text: '상한가 근접' });
    }

    // 우선순위 정렬 후 상위 2개
    reasons.sort((a, b) => a.priority - b.priority);
    const top = reasons.slice(0, 2).map(r => r.text);

    if (top.length === 0) return '시장 관심 종목';
    return top.join(' · ');
}

/**
 * 확실함 점수 (0~100) — 7개 지표 중 얼마나 골고루 충족되었는가
 * 단순 총점이 아닌, 여러 지표가 동시에 강한지를 측정
 */
function calculateConfidence(params: {
    tradingValueScore: number;
    relativeStrengthScore: number;
    volumeScore: number;
    themeConcentrationScore: number;
    patternScore: number;
    momentumScore: number;
    newsScore: number;
}): number {
    // 각 지표가 만점 기준 60% 이상이면 "강함"으로 카운트
    const checks = [
        params.tradingValueScore >= 15,        // 25 * 0.6
        params.relativeStrengthScore >= 12,    // 20 * 0.6
        params.volumeScore >= 9,               // 15 * 0.6
        params.themeConcentrationScore >= 9,   // 15 * 0.6
        params.patternScore >= 6,              // 10 * 0.6
        params.momentumScore >= 6,             // 10 * 0.6
        params.newsScore >= 3,                 // 5 * 0.6
    ];
    const strongCount = checks.filter(Boolean).length;
    return Math.round((strongCount / checks.length) * 100);
}

/**
 * 코스피/코스닥 등락률 조회 (상대 강도 계산용)
 * 종목코드는 6자리 — 코스피와 코스닥 구분 어려우므로 둘 다 가져와서 평균/최소 사용
 */
async function getMarketChangeRate(): Promise<number> {
    try {
        const [kospi, kosdaq] = await Promise.all([
            getKospiIndexData().catch(() => null),
            getKosdaqIndexData().catch(() => null),
        ]);
        const rates: number[] = [];
        if (kospi) rates.push(kospi.changePercent);
        if (kosdaq) rates.push(kosdaq.changePercent);
        if (rates.length === 0) return 0;
        // 코스피/코스닥 평균 (종목별 정확한 시장 매칭은 추후 개선)
        return rates.reduce((a, b) => a + b, 0) / rates.length;
    } catch {
        return 0;
    }
}

/**
 * 여러 종목의 주도주 점수 일괄 계산
 */
export async function calculateBatchHotness(
    stocks: Array<{ stockCode: string; stockName: string; themes: string[] }>
): Promise<HotnessScore[]> {
    const stockCodes = stocks.map((s) => s.stockCode);
    const stockNames = stocks.map((s) => s.stockName);

    // 모든 지표 병렬 조회 + 시장 등락률
    const [volumeSurges, newsCounts, streakScores, marketChangeRate] = await Promise.all([
        getBatchVolumeSurgeRates(stockCodes),
        getBatchStockNewsCountFromApi(stockNames, 30),
        calculateBatchStreakScores(stockCodes),
        getMarketChangeRate(),
    ]);

    const results: HotnessScore[] = [];

    for (const stock of stocks) {
        const priceData = themePriceCache.getStockPrice(stock.stockCode);
        if (!priceData) continue;

        const volumeSurge = volumeSurges.get(stock.stockCode) || null;
        const newsData = newsCounts.get(stock.stockName) || { count: 0, latestNewsTitle: null };
        const newsCount = newsData.count;

        // 점수 계산
        const tradingValueScore = calculateTradingValueScore(priceData.tradingValue, priceData.marketCap);
        const relativeStrengthScore = calculateRelativeStrengthScore(priceData.changeRate, marketChangeRate);
        const volumeScore = calculateVolumeSurgeScore(volumeSurge);
        const { score: themeConcentrationScore, concentration: themeConcentration } =
            calculateThemeConcentrationScore(stock.stockCode, stock.themes);
        const patternScore = calculatePatternScore(priceData.changeRate, priceData.intradayHighRate || priceData.changeRate);
        const momentumScore = calculateMomentumScore(priceData.changeRate);
        const newsScore = calculateNewsScore(newsCount);
        const streak = streakScores.get(stock.stockCode) || { score: 0, days: 0 };

        // 기본 100점 = 거래대금(25) + 상대강도(20) + 거래량(15) + 집중도(15) + 패턴(10) + 등락률(10) + 뉴스(5)
        const baseScore = tradingValueScore + relativeStrengthScore + volumeScore +
                         themeConcentrationScore + patternScore + momentumScore + newsScore;
        const totalScore = baseScore + streak.score; // 연속성 보너스

        // 자동 생성: 주도 이유 + 확실함 점수
        const reason = generateReason({
            relativeStrengthScore,
            themeConcentrationScore,
            themeConcentration,
            volumeSurgeRate: volumeSurge,
            streakDays: streak.days,
            patternScore,
            tradingValueScore,
            changeRate: priceData.changeRate,
            themes: stock.themes,
        });
        const confidence = calculateConfidence({
            tradingValueScore,
            relativeStrengthScore,
            volumeScore,
            themeConcentrationScore,
            patternScore,
            momentumScore,
            newsScore,
        });

        results.push({
            stockCode: stock.stockCode,
            stockName: stock.stockName,
            currentPrice: priceData.currentPrice,
            changeRate: priceData.changeRate,
            tradingValue: priceData.tradingValue,
            themes: stock.themes,

            totalScore,
            tradingValueScore,
            relativeStrengthScore,
            volumeScore,
            themeConcentrationScore,
            patternScore,
            momentumScore,
            newsScore,
            streakScore: streak.score,
            streakDays: streak.days,

            volumeSurgeRate: volumeSurge,
            newsCount,
            latestNews: newsData.latestNewsTitle,
            themeConcentration,

            reason,
            confidence,

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

        // TOP 30만 캐시에 저장 (전체 저장하면 WebSocket 구독 폭발)
        const top30 = scored.slice(0, 30);

        // TOP 10에 AI 기반 주도 이유 붙이기 (지표 이유를 덮어씀)
        try {
            const top10 = top30.slice(0, 10);
            const aiReasons = await getBatchStockAiReasons(
                top10.map(s => ({
                    stockCode: s.stockCode,
                    stockName: s.stockName,
                    changeRate: s.changeRate,
                    tradingValue: s.tradingValue,
                    grade: s.grade,
                    themes: s.themes,
                    volumeSurgeRate: s.volumeSurgeRate,
                    relativeStrengthScore: s.relativeStrengthScore,
                }))
            );
            for (const stock of top30) {
                const aiReason = aiReasons.get(stock.stockCode);
                if (aiReason) {
                    stock.reason = aiReason; // AI 이유가 있으면 기존 지표 이유 덮어씀
                }
            }
            console.log(`🤖 AI 주도 이유 생성 완료: ${aiReasons.size}개`);
        } catch (err) {
            console.error('AI 주도 이유 생성 실패 (계속 진행):', err);
        }

        hotStocksCache = { data: top30, timestamp: Date.now() };

        // 글로벌 구독 종목 업데이트 (WebSocket) — TOP 30만
        updateGlobalSubscriptions(top30.map(s => s.stockCode));

        // 실시간 점수 배치 병합
        mergeBatchScores(top30);

        console.log(`주도주 점수 계산 완료: ${top30.length}개 (후보 ${scored.length}개 중, ${((Date.now() - startTime) / 1000).toFixed(1)}초)`);
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
        return hotStocksCache.data.slice(0, limit);
    }

    // 캐시 만료됐지만 데이터 있음 → 이전 데이터 즉시 반환 + 백그라운드 갱신
    if (hotStocksCache) {
        refreshHotStocks();
        return hotStocksCache.data.slice(0, limit);
    }

    // 캐시 아예 없음 (첫 요청) → 계산 후 반환
    await refreshHotStocks();
    return hotStocksCache ? hotStocksCache.data.slice(0, limit) : [];
}

/**
 * 오늘의 주도주 Hero 1종목 선정
 * S등급 + 확실함 점수 60% 이상 + 총점 최상위
 * 조건 미달이면 null (오늘은 확실한 주도주 없음)
 */
export interface HeroData {
    stock: HotnessScore | null;
    theme: {
        themeName: string;
        avgChangeRate: number;
        sCount: number;
        aCount: number;
        topStocks: { stockCode: string; stockName: string; changeRate: number }[];
        confidence: number;
    } | null;
}

export async function getHeroData(): Promise<HeroData> {
    const stocks = await getTopHotStocks(30);
    if (stocks.length === 0) return { stock: null, theme: null };

    // === Hero 종목 선정 ===
    // S등급 + 확실함 60%+ 중 총점 최상위
    const heroCandidate = stocks.find(s => s.grade === 'S' && s.confidence >= 60);
    const heroStock = heroCandidate || null;

    // === Hero 테마 선정 ===
    // S/A 등급 종목이 2개 이상 + 평균 등락률 5%+ 인 테마
    const themeMap = new Map<string, {
        themeName: string;
        stocks: HotnessScore[];
    }>();

    for (const stock of stocks) {
        if (stock.grade !== 'S' && stock.grade !== 'A') continue;
        for (const themeName of stock.themes) {
            if (!themeMap.has(themeName)) {
                themeMap.set(themeName, { themeName, stocks: [] });
            }
            themeMap.get(themeName)!.stocks.push(stock);
        }
    }

    let bestTheme: HeroData['theme'] = null;
    let bestThemeScore = 0;

    for (const [themeName, data] of themeMap) {
        const sCount = data.stocks.filter(s => s.grade === 'S').length;
        const aCount = data.stocks.filter(s => s.grade === 'A').length;
        if (data.stocks.length < 2) continue;

        const avgChangeRate = data.stocks.reduce((sum, s) => sum + s.changeRate, 0) / data.stocks.length;
        if (avgChangeRate < 5) continue;

        // 테마 점수 = S등급 가중치 3 + A등급 1 + 평균 등락률
        const themeScore = sCount * 3 + aCount + avgChangeRate / 10;

        if (themeScore > bestThemeScore) {
            bestThemeScore = themeScore;
            // 테마 신뢰도: S/A 종목 평균 confidence
            const avgConfidence = Math.round(
                data.stocks.reduce((sum, s) => sum + s.confidence, 0) / data.stocks.length
            );
            bestTheme = {
                themeName,
                avgChangeRate: Math.round(avgChangeRate * 100) / 100,
                sCount,
                aCount,
                topStocks: data.stocks.slice(0, 4).map(s => ({
                    stockCode: s.stockCode,
                    stockName: s.stockName,
                    changeRate: s.changeRate,
                })),
                confidence: avgConfidence,
            };
        }
    }

    return { stock: heroStock, theme: bestTheme };
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
