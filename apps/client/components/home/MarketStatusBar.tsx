'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHotStocks, HotStock } from '@/lib/api/leading';
import { MarketStatusInfo } from '@/lib/api/themes';

function statusBadge(ms: MarketStatusInfo) {
    const map: Record<string, { label: string; color: string; dot: boolean }> = {
        regular: { label: '장중', color: 'var(--success-color)', dot: true },
        pre_market: { label: '장전 시간외', color: 'var(--accent)', dot: true },
        post_market: { label: '장후 시간외', color: 'var(--warning-color)', dot: true },
        closed: { label: '장 마감', color: 'var(--text-tertiary)', dot: false },
    };
    const info = map[ms.status] ?? map.closed;
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: info.color }}>
            {info.dot && (
                <span
                    className="inline-block h-1.5 w-1.5 rounded-full animate-pulse-soft"
                    style={{ background: info.color }}
                />
            )}
            {info.label}
        </span>
    );
}

function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    if (diff < 0) return '방금 전';
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return '방금 전';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    return `${hr}시간 전`;
}

function computeKpis(stocks: HotStock[]) {
    const total = stocks.length;
    if (total === 0) return null;
    const marketTemp = Math.round(stocks.reduce((sum, s) => sum + s.totalScore, 0) / total);
    const sCount = stocks.filter(s => s.grade === 'S').length;
    const aCount = stocks.filter(s => s.grade === 'A').length;
    const limitUpCount = stocks.filter(s => s.changeRate >= 29.9).length;

    const sStocks = stocks.filter(s => s.grade === 'S');
    const themeMap = new Map<string, { count: number; totalChange: number }>();
    sStocks.forEach(s => {
        s.themes.forEach(theme => {
            const entry = themeMap.get(theme) ?? { count: 0, totalChange: 0 };
            themeMap.set(theme, { count: entry.count + 1, totalChange: entry.totalChange + s.changeRate });
        });
    });
    let topTheme: string | null = null;
    let topThemeAvgChange = 0;
    let topThemeCount = 0;
    themeMap.forEach((val, key) => {
        if (val.count > topThemeCount) {
            topThemeCount = val.count;
            topTheme = key;
            topThemeAvgChange = val.totalChange / val.count;
        }
    });

    return { marketTemp, sCount, aCount, limitUpCount, topTheme, topThemeAvgChange, topThemeCount };
}

export default function MarketStatusBar() {
    const { data } = useQuery({
        queryKey: ['hotStocks'],
        queryFn: () => fetchHotStocks(20),
        refetchInterval: 5 * 60 * 1000,
        staleTime: 30 * 1000,
    });

    const stocks = data?.stocks ?? [];
    const kpis = computeKpis(stocks);
    const marketStatus = data?.marketStatus;
    const lastUpdate = data?.lastUpdateTime;

    if (!kpis || !marketStatus) return null;

    const tempColor =
        kpis.marketTemp >= 60 ? 'var(--rise-color)' : kpis.marketTemp >= 40 ? 'var(--text-primary)' : 'var(--fall-color)';

    return (
        <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
            <div className="max-w-[1280px] mx-auto px-4 py-2">
                {/* 한 줄 KPI + 장 상태 */}
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide text-xs">
                    {/* 장 상태 배지 */}
                    {statusBadge(marketStatus)}

                    <span className="h-3 w-px bg-[var(--border-color)] flex-shrink-0" />

                    {/* 시장 온도 */}
                    <span className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[var(--text-tertiary)]">시장온도</span>
                        <span className="font-semibold" style={{ color: tempColor }}>{kpis.marketTemp}</span>
                    </span>

                    <span className="h-3 w-px bg-[var(--border-color)] flex-shrink-0" />

                    {/* S등급 */}
                    <span className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[var(--text-tertiary)]">S등급</span>
                        <span className="font-semibold" style={{ color: 'var(--grade-s)' }}>{kpis.sCount}개</span>
                    </span>

                    {/* 갱신 시각 — 우측 밀기 */}
                    <span className="ml-auto flex-shrink-0 text-[var(--text-disabled)]">
                        {lastUpdate ? formatRelativeTime(lastUpdate) : ''}
                    </span>
                </div>
            </div>
        </div>
    );
}
