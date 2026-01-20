import ThemeHistory from '../models/ThemeHistory';
import { themePriceCache } from './themePriceCache';
import { getMarketStatus } from '../utils/marketStatus';

// 메모리 캐시: 오늘 실시간 히스토리 (1분 간격, 최대 390개 = 6.5시간)
interface RealtimeHistoryItem {
    timestamp: Date;
    avgChangeRate: number;
    topStock: string;
    topStockRate: number;
}

const realtimeHistoryCache: Map<string, RealtimeHistoryItem[]> = new Map();
const MAX_REALTIME_ITEMS = 390; // 장 운영시간 약 6.5시간 분량

// 메모리에 실시간 히스토리 저장 (1분 간격)
function saveRealtimeHistory(): void {
    const marketStatus = getMarketStatus();
    if (!marketStatus.isOpen) return;

    const themePricesData = themePriceCache.getAllThemePrices();
    if (themePricesData.themes.length === 0) return;

    const timestamp = new Date();

    for (const theme of themePricesData.themes) {
        const item: RealtimeHistoryItem = {
            timestamp,
            avgChangeRate: theme.avgChangeRate,
            topStock: theme.topStocks[0]?.stockName || '',
            topStockRate: theme.topStocks[0]?.changeRate || 0,
        };

        if (!realtimeHistoryCache.has(theme.themeName)) {
            realtimeHistoryCache.set(theme.themeName, []);
        }

        const history = realtimeHistoryCache.get(theme.themeName)!;
        history.push(item);

        // 최대 개수 초과 시 오래된 데이터 삭제
        if (history.length > MAX_REALTIME_ITEMS) {
            history.shift();
        }
    }
}

// 오늘 날짜가 바뀌면 메모리 캐시 초기화
let lastCacheDate: string = '';

function clearCacheIfNewDay(): void {
    const today = new Date().toDateString();
    if (lastCacheDate !== today) {
        realtimeHistoryCache.clear();
        lastCacheDate = today;
        console.log('📅 새로운 날: 실시간 히스토리 캐시 초기화');
    }
}

// 메모리 캐시에서 오늘 히스토리 조회
export function getRealtimeHistory(themeName: string): RealtimeHistoryItem[] {
    return realtimeHistoryCache.get(themeName) || [];
}

// DB에 5분 간격 스냅샷 저장 (과거 데이터용)
export async function saveThemeSnapshot(): Promise<void> {
    const marketStatus = getMarketStatus();

    // 장 운영 시간에만 저장 (정규장 + 동시호가)
    if (!marketStatus.isOpen) {
        return;
    }

    const themePricesData = themePriceCache.getAllThemePrices();

    if (themePricesData.themes.length === 0) {
        console.log('⏭️ 테마 히스토리: 캐시된 데이터 없음, 스킵');
        return;
    }

    const timestamp = new Date();
    const documents = themePricesData.themes.map(theme => ({
        themeName: theme.themeName,
        avgChangeRate: theme.avgChangeRate,
        topStock: theme.topStocks[0]?.stockName || '',
        topStockRate: theme.topStocks[0]?.changeRate || 0,
        timestamp,
    }));

    try {
        await ThemeHistory.insertMany(documents);
        console.log(`📊 테마 히스토리 DB 저장: ${documents.length}개 테마`);
    } catch (error: any) {
        console.error('테마 히스토리 저장 실패:', error.message);
    }
}

// 테마별 히스토리 조회 (하이브리드: 오늘=메모리, 과거=DB)
export async function getThemeHistory(
    themeName: string,
    period: 'today' | '1d' | '7d' | '30d' = 'today'
): Promise<{ timestamp: Date; avgChangeRate: number; topStock: string; topStockRate: number }[]> {
    // 오늘 데이터는 메모리 캐시에서 (1분 간격 실시간)
    if (period === 'today') {
        const realtimeData = getRealtimeHistory(themeName);
        return realtimeData.map(h => ({
            timestamp: h.timestamp,
            avgChangeRate: h.avgChangeRate,
            topStock: h.topStock,
            topStockRate: h.topStockRate,
        }));
    }

    // 과거 데이터는 DB에서 (5분 간격)
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case '1d':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const history = await ThemeHistory.find({
        themeName,
        timestamp: { $gte: startDate },
    })
        .sort({ timestamp: 1 })
        .lean();

    return history.map(h => ({
        timestamp: h.timestamp,
        avgChangeRate: h.avgChangeRate,
        topStock: h.topStock,
        topStockRate: h.topStockRate,
    }));
}

// 전체 테마 최신 히스토리 조회 (오늘 기준)
export async function getAllThemesTodayHistory(): Promise<Map<string, { timestamp: Date; avgChangeRate: number }[]>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const history = await ThemeHistory.find({
        timestamp: { $gte: today },
    })
        .sort({ timestamp: 1 })
        .lean();

    const result = new Map<string, { timestamp: Date; avgChangeRate: number }[]>();

    for (const h of history) {
        if (!result.has(h.themeName)) {
            result.set(h.themeName, []);
        }
        result.get(h.themeName)!.push({
            timestamp: h.timestamp,
            avgChangeRate: h.avgChangeRate,
        });
    }

    return result;
}

// 히스토리 수집 시작
let realtimeInterval: NodeJS.Timeout | null = null;  // 1분 간격 (메모리)
let dbInterval: NodeJS.Timeout | null = null;        // 5분 간격 (DB)

export function startHistoryCollection(): void {
    if (realtimeInterval) {
        return;
    }

    // 날짜 체크 및 캐시 초기화
    clearCacheIfNewDay();

    // 즉시 한 번 실행
    saveRealtimeHistory();
    saveThemeSnapshot();

    // 1분마다 메모리에 저장 (실시간 차트용)
    realtimeInterval = setInterval(() => {
        clearCacheIfNewDay();
        saveRealtimeHistory();
    }, 60 * 1000);
    console.log('⏰ 실시간 히스토리 수집 시작: 1분 간격 (메모리)');

    // 5분마다 DB에 저장 (과거 조회용)
    dbInterval = setInterval(saveThemeSnapshot, 5 * 60 * 1000);
    console.log('⏰ DB 히스토리 수집 시작: 5분 간격');
}

export function stopHistoryCollection(): void {
    if (realtimeInterval) {
        clearInterval(realtimeInterval);
        realtimeInterval = null;
    }
    if (dbInterval) {
        clearInterval(dbInterval);
        dbInterval = null;
    }
}
