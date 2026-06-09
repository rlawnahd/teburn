// 메모리 진단 — 의심 자료구조 크기 스냅샷 (장중 메모리 누수 추적용, read-only)
import { themePriceCache } from './themePriceCache';
import { getRealtimeScoreCount } from './realtimeHotness';
import { getWsDiagnostics } from './wsServer';
import { getKisSubscriptionCount, getPriceCallbackCount } from './kisWebSocket';
import { getKisQueueLength } from './kisRateLimiter';
import { getChartHistoryStats } from './indexService';
import { getRealtimeHistoryStats } from './themeHistoryService';
import { getStockReasonCacheSize } from './stockReasonService';
import { getNaverNewsCacheSize } from './naverApi';

function mb(bytes: number): number {
    return Math.round((bytes / 1048576) * 10) / 10;
}

export function getMemoryDiagnostics() {
    const m = process.memoryUsage();
    return {
        timestamp: new Date().toISOString(),
        uptimeSec: Math.round(process.uptime()),
        memoryMB: {
            rss: mb(m.rss),
            heapTotal: mb(m.heapTotal),
            heapUsed: mb(m.heapUsed),
            external: mb(m.external),
            arrayBuffers: mb(m.arrayBuffers),
        },
        structures: {
            ws: getWsDiagnostics(),
            kisSubscriptions: getKisSubscriptionCount(),
            kisPriceCallbacks: getPriceCallbackCount(),
            kisQueueLength: getKisQueueLength(),
            realtimeScores: getRealtimeScoreCount(),
            themeCache: themePriceCache.getStats(),
            chartHistory: getChartHistoryStats(),
            realtimeHistory: getRealtimeHistoryStats(),
            stockReasonCache: getStockReasonCacheSize(),
            naverNewsCache: getNaverNewsCacheSize(),
        },
    };
}
