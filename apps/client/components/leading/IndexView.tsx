'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { fetchIndexData, IndexData } from '@/lib/api/indices';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    ReferenceLine,
} from 'recharts';

// 방향색: 상승=빨강, 하락=파랑 (한국 시장 관습)
function dirColor(change: number): string {
    return change >= 0 ? 'var(--rise-color)' : 'var(--fall-color)';
}

// 현재 KST 요일/분 (0=일~6=토, 자정 기준 분)
function kstNow(): { day: number; minutes: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    return { day: dayMap[wd] ?? 0, minutes: hour * 60 + minute };
}

// 지수별 개장 여부 판정 (KST 시간 기준 — 서버 marketOpen이 KIS에선 부정확)
function isMarketOpen(data: IndexData): boolean {
    const { day, minutes } = kstNow();
    const weekday = day >= 1 && day <= 5;
    if (data.category === 'index') {
        // 국내 지수 정규장 09:00~15:30
        return weekday && minutes >= 540 && minutes < 930;
    }
    // 해외(NASDAQ) 선물 — 거의 24시간, 서버 판정 사용
    if (data.name.includes('NASDAQ') || data.symbol === 'NQ=F') {
        return data.marketOpen;
    }
    // KOSPI200 선물 — 주간 09:00~15:45 또는 야간 18:00~익일 05:00 (근사)
    const dayOpen = weekday && minutes >= 540 && minutes < 945;
    const nightOpen = minutes >= 1080 || minutes < 300;
    return dayOpen || nightOpen;
}

function gradId(data: IndexData): string {
    return 'idxgrad-' + data.symbol.replace(/[^a-zA-Z0-9]/g, '');
}

function IndexChart({ data }: { data: IndexData }) {
    const color = dirColor(data.change);
    const id = gradId(data);

    const chartData = data.chartData.map((p) => {
        const d = new Date(p.time);
        return {
            time: d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }),
            price: p.price,
        };
    });

    if (chartData.length === 0) {
        return (
            <div className="h-[140px] sm:h-[170px] flex items-center justify-center text-sm text-[var(--text-tertiary)]">
                차트 데이터 없음
            </div>
        );
    }

    const prices = chartData.map((d) => d.price);
    const minPrice = Math.min(...prices, data.previousClose);
    const maxPrice = Math.max(...prices, data.previousClose);
    const padding = (maxPrice - minPrice) * 0.1 || 1;

    return (
        <div className="h-[140px] sm:h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} vertical={false} />
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={48}
                    />
                    <YAxis
                        domain={[minPrice - padding, maxPrice + padding]}
                        tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        width={48}
                        orientation="right"
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            padding: '6px 10px',
                            color: 'var(--text-primary)',
                        }}
                        formatter={(value: number | undefined) => [
                            value != null ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--',
                            '',
                        ]}
                        labelFormatter={(label) => label}
                    />
                    <ReferenceLine y={data.previousClose} stroke="var(--text-tertiary)" strokeDasharray="4 4" opacity={0.35} />
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#${id})`}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function IndexDetailCard({ data }: { data: IndexData }) {
    const isPositive = data.change >= 0;
    const dirClass = isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]';
    const arrow = isPositive ? '▲' : '▼';
    const open = isMarketOpen(data);

    return (
        <div className={`card overflow-hidden transition-opacity ${open ? '' : 'opacity-60'}`}>
            {/* 헤더 — 종목명 + 큰 가격(방향색) */}
            <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium text-[var(--text-secondary)] truncate">{data.name}</span>
                        {!open && (
                            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                                마감
                            </span>
                        )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-[var(--text-tertiary)]">{data.tradingHours}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                    {!open && <span className="text-xs text-[var(--text-tertiary)]">종가</span>}
                    <span className={`text-2xl font-bold tabular-nums ${dirClass}`}>
                        {data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-sm font-medium tabular-nums ${dirClass}`}>
                        {arrow} {Math.abs(data.change).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        {' '}({isPositive ? '+' : '-'}{Math.abs(data.changePercent).toFixed(2)}%)
                    </span>
                </div>
            </div>

            {/* 영역 차트 */}
            <div className="px-2">
                <IndexChart data={data} />
            </div>

            {/* 상세 — 보더리스, 가벼운 인라인 */}
            <div className="px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">
                    전일 <span className="text-[var(--text-secondary)] tabular-nums">{data.previousClose.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </span>
                <span className="text-[var(--text-tertiary)]">
                    고 <span className="text-[var(--rise-color)] tabular-nums">{data.high > 0 ? data.high.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--'}</span>
                </span>
                <span className="text-[var(--text-tertiary)]">
                    저 <span className="text-[var(--fall-color)] tabular-nums">{data.low > 0 ? data.low.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--'}</span>
                </span>
            </div>
        </div>
    );
}

export default function IndexView() {
    const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
        queryKey: ['index-detail'],
        queryFn: fetchIndexData,
        refetchInterval: 60 * 1000,
        staleTime: 30 * 1000,
        retry: 3,
        retryDelay: (attempt) => Math.min(attempt * 3000, 10000),
    });

    const updatedTime = dataUpdatedAt
        ? (() => {
            const d = new Date(dataUpdatedAt);
            const date = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' }).format(d);
            const time = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
            return `${date} ${time}`;
        })()
        : null;

    // null(미제공/오류) 카드는 숨김 — 깨진 카드 대신 비표시
    const domestic = [data?.kospiIndex, data?.kosdaqIndex].filter(Boolean) as IndexData[];
    const futures = [data?.kospi, data?.nasdaq].filter(Boolean) as IndexData[];

    return (
        <div>
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">지수 현황</h2>
                    {updatedTime && (
                        <span className="text-sm text-[var(--text-tertiary)]">{updatedTime}</span>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] transition-colors rounded"
                    title="새로고침"
                    aria-label="새로고침"
                >
                    <RefreshCw size={12} />
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[0, 1].map((section) => (
                        <div key={section} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[0, 1].map((i) => (
                                <div key={i} className="h-[260px] bg-[var(--bg-primary)] rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-5">
                    {domestic.length > 0 && (
                        <div>
                            <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">국내 지수</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {domestic.map((d) => (
                                    <IndexDetailCard key={d.symbol} data={d} />
                                ))}
                            </div>
                        </div>
                    )}
                    {futures.length > 0 && (
                        <div>
                            <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">선물 지수</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {futures.map((d) => (
                                    <IndexDetailCard key={d.symbol} data={d} />
                                ))}
                            </div>
                        </div>
                    )}
                    {domestic.length === 0 && futures.length === 0 && (
                        <div className="card p-8 text-center text-sm text-[var(--text-tertiary)]">
                            지수 데이터를 불러올 수 없습니다
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
