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

    // 과거 20일 평균 거래량 조회
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const history = await StockVolumeHistory.find({
        stockCode,
        date: { $gte: twentyDaysAgo },
    })
        .sort({ date: -1 })
        .limit(20)
        .lean();

    if (history.length === 0) {
        return null;
    }

    const avgVolume = history.reduce((sum, h) => sum + h.volume, 0) / history.length;

    if (avgVolume === 0) {
        return todayVolume > 0 ? 10 : 0; // 10배로 처리
    }

    const surgeRate = todayVolume / avgVolume;

    // 캐시 저장
    surgeRateCache.set(stockCode, { data: surgeRate, timestamp: Date.now() });

    return Math.round(surgeRate * 100) / 100;
}

/**
 * 여러 종목의 거래량 급증률 일괄 조회
 */
export async function getBatchVolumeSurgeRates(
    stockCodes: string[]
): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    // 과거 20일 데이터 일괄 조회
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const history = await StockVolumeHistory.find({
        stockCode: { $in: stockCodes },
        date: { $gte: twentyDaysAgo },
    }).lean();

    // 종목별 평균 계산
    const avgVolumeMap = new Map<string, number>();
    const volumeCountMap = new Map<string, number>();

    for (const h of history) {
        const current = avgVolumeMap.get(h.stockCode) || 0;
        const count = volumeCountMap.get(h.stockCode) || 0;
        avgVolumeMap.set(h.stockCode, current + h.volume);
        volumeCountMap.set(h.stockCode, count + 1);
    }

    for (const stockCode of stockCodes) {
        const totalVolume = avgVolumeMap.get(stockCode) || 0;
        const count = volumeCountMap.get(stockCode) || 0;
        const avgVolume = count > 0 ? totalVolume / count : 0;

        const currentPrice = themePriceCache.getStockPrice(stockCode);
        if (!currentPrice) continue;

        const todayVolume = currentPrice.volume;

        if (avgVolume === 0) {
            result.set(stockCode, todayVolume > 0 ? 10 : 0);
        } else {
            const surgeRate = todayVolume / avgVolume;
            result.set(stockCode, Math.round(surgeRate * 100) / 100);
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
