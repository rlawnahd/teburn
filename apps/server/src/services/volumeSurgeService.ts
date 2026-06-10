// 거래량 급증률 계산 서비스
import StockVolumeHistory from '../models/StockVolumeHistory';
import { themePriceCache, CachedStockPrice } from './themePriceCache';

interface VolumeSurgeInfo {
    stockCode: string;
    stockName: string;
    todayVolume: number;
    avgVolume20: number;
    surgeRate: number; // 배수 (예: 5.2 = 5.2배)
}

// 급증률 캐시 (1시간)
const surgeRateCache = new Map<string, { data: number; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

const SURGE_SAMPLE_DAYS = 20;

/**
 * 거래량 급증률 계산 (순수 함수).
 * 오늘(todayMidnight 이후) 레코드를 평균 분모에서 제외하고, 가장 최근 maxSamples개만 사용한다.
 * @returns 급증 배수(소수 2자리) / 과거 데이터 없으면 null
 */
export function computeSurgeRate(
    history: { date: Date; volume: number }[],
    todayMidnight: Date,
    todayVolume: number,
    maxSamples: number = SURGE_SAMPLE_DAYS,
): number | null {
    const past = history
        .filter((h) => h.date.getTime() < todayMidnight.getTime()) // 당일 제외 (자기오염 차단)
        .sort((a, b) => b.date.getTime() - a.date.getTime())       // 최신순
        .slice(0, maxSamples)
        .map((h) => h.volume);

    if (past.length === 0) return null;

    const avgVolume = past.reduce((sum, v) => sum + v, 0) / past.length;
    if (avgVolume === 0) {
        return todayVolume > 0 ? 10 : 0;
    }

    return Math.round((todayVolume / avgVolume) * 100) / 100;
}

/** KST 자정(서버 로컬 자정과 동일 구성) — 저장 경로(saveTodayVolumeHistory)의 date 경계와 일치 */
function getTodayMidnight(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * 오늘의 거래량 히스토리 저장 (장 마감 후 실행)
 */
export async function saveTodayVolumeHistory(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allPrices = themePriceCache.getAllThemePrices();
    let savedCount = 0;

    // 모든 종목의 거래량 저장
    const stocksToSave = new Map<string, CachedStockPrice>();

    for (const theme of allPrices.themes) {
        for (const stock of theme.topStocks) {
            if (!stocksToSave.has(stock.stockCode)) {
                stocksToSave.set(stock.stockCode, stock);
            }
        }
    }

    for (const [stockCode, stock] of stocksToSave) {
        try {
            await StockVolumeHistory.findOneAndUpdate(
                { stockCode, date: today },
                {
                    stockCode,
                    stockName: stock.stockName,
                    date: today,
                    volume: stock.volume,
                    tradingValue: stock.tradingValue,
                    changeRate: stock.changeRate,
                },
                { upsert: true }
            );
            savedCount++;
        } catch (error) {
            // 중복 키 에러 무시
        }
    }

    console.log(`📊 거래량 히스토리 저장: ${savedCount}개 종목`);
    return savedCount;
}

/**
 * 특정 종목의 거래량 급증률 계산
 * (오늘 거래량 / 20일 평균 거래량)
 */
export async function getVolumeSurgeRate(stockCode: string): Promise<number | null> {
    // 캐시 확인
    const cached = surgeRateCache.get(stockCode);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    // 현재 거래량 조회
    const currentPrice = themePriceCache.getStockPrice(stockCode);
    if (!currentPrice) {
        return null;
    }

    const todayVolume = currentPrice.volume;

    // 과거 20일 평균 거래량 조회 (오늘 제외)
    const todayMidnight = getTodayMidnight();
    const twentyDaysAgo = new Date(todayMidnight);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - SURGE_SAMPLE_DAYS);

    const history = await StockVolumeHistory.find({
        stockCode,
        date: { $gte: twentyDaysAgo, $lt: todayMidnight },
    })
        .select('date volume')
        .sort({ date: -1 })
        .limit(SURGE_SAMPLE_DAYS)
        .lean();

    const surgeRate = computeSurgeRate(
        history.map((h) => ({ date: h.date as Date, volume: h.volume as number })),
        todayMidnight,
        todayVolume,
    );

    if (surgeRate === null) {
        return null;
    }

    // 캐시 저장
    surgeRateCache.set(stockCode, { data: surgeRate, timestamp: Date.now() });

    return surgeRate;
}

/**
 * 여러 종목의 거래량 급증률 일괄 조회
 */
export async function getBatchVolumeSurgeRates(
    stockCodes: string[]
): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    // 과거 20일 데이터 일괄 조회 (오늘 제외)
    const todayMidnight = getTodayMidnight();
    const twentyDaysAgo = new Date(todayMidnight);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - SURGE_SAMPLE_DAYS);

    const history = await StockVolumeHistory.find({
        stockCode: { $in: stockCodes },
        date: { $gte: twentyDaysAgo, $lt: todayMidnight },
    })
        .select('stockCode date volume')
        .sort({ date: -1 })
        .lean();

    // 종목별 히스토리 그룹화 (최신순 정렬은 위 쿼리에서 보장)
    const historyByStock = new Map<string, { date: Date; volume: number }[]>();
    for (const h of history) {
        const arr = historyByStock.get(h.stockCode) || [];
        arr.push({ date: h.date as Date, volume: h.volume as number });
        historyByStock.set(h.stockCode, arr);
    }

    for (const stockCode of stockCodes) {
        const currentPrice = themePriceCache.getStockPrice(stockCode);
        if (!currentPrice) continue;

        const surgeRate = computeSurgeRate(
            historyByStock.get(stockCode) || [],
            todayMidnight,
            currentPrice.volume,
        );
        // null(과거 데이터 없음)이면 맵에 넣지 않음 → 소비처에서 0점 처리 (단일 버전과 일치)
        if (surgeRate !== null) {
            result.set(stockCode, surgeRate);
        }
    }

    return result;
}

/**
 * 거래량 급증률 점수화 (0~25점)
 */
export function calculateVolumeSurgeScore(surgeRate: number | null): number {
    if (surgeRate === null) return 0;

    // 10배+ = 25점, 5배 = 20점, 3배 = 15점, 2배 = 10점, 1.5배 = 5점
    if (surgeRate >= 10) return 25;
    if (surgeRate >= 5) return 20;
    if (surgeRate >= 3) return 15;
    if (surgeRate >= 2) return 10;
    if (surgeRate >= 1.5) return 5;
    return 0;
}

/**
 * 캐시 클리어
 */
export function clearVolumeSurgeCache(): void {
    surgeRateCache.clear();
    console.log('🗑️ 거래량 급증률 캐시 클리어');
}
