'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { fetchIndexData, IndexData } from '@/lib/api/indices';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    ReferenceLine,
} from 'recharts';

function IndexChart({ data, color }: { data: IndexData; color: string }) {
    const chartData = data.chartData.map((p) => {
        const d = new Date(p.time);
        return {
            time: d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' }),
            price: p.price,
        };
    });

    if (chartData.length === 0) {
        return (
            <div className="h-[140px] sm:h-[180px] flex items-center justify-center text-[13px] text-[var(--text-tertiary)]">
                차트 데이터 없음
            </div>
        );
    }

    const prices = chartData.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1 || 1;

    return (
        <div className="h-[140px] sm:h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} />
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--border-color)' }}
                        interval="preserveStartEnd"
                        minTickGap={40}
                    />
                    <YAxis
                        domain={[minPrice - padding, maxPrice + padding]}
                        tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        width={55}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0',
                            fontSize: '11px',
                            padding: '4px 8px',
                            color: 'var(--text-primary)',
                        }}
                        formatter={(value: number | undefined) => [
                            value != null ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--',
                            '',
                        ]}
                        labelFormatter={(label) => label}
                    />
                    <ReferenceLine
                        y={data.previousClose}
                        stroke="var(--text-tertiary)"
                        strokeDasharray="4 4"
                        opacity={0.4}
                    />
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function IndexDetailCard({ data, color }: { data: IndexData | null; color: string }) {
    if (!data) {
        return (
            <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-3">
                <div className="text-[13px] text-[var(--text-tertiary)]">데이터를 불러올 수 없습니다</div>
            </div>
        );
    }

    const isPositive = data.change >= 0;
    const changeColor = isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]';

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] overflow-hidden">
            {/* 헤더 */}
            <div className="px-3 py-2 border-b border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{data.name}</span>
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <span className="text-base font-semibold text-[var(--text-primary)]">
                            {data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-[13px] font-medium ${changeColor} ml-2`}>
                            {isPositive ? '+' : ''}{data.change.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            {' '}({isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
                <div className="mt-1">
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                        {data.tradingHours}
                    </span>
                </div>
            </div>

            {/* 차트 */}
            <div className="p-2">
                <IndexChart data={data} color={color} />
            </div>

            {/* 상세 정보 */}
            <div className="px-3 pb-2">
                <div className="grid grid-cols-3 border-t border-[var(--border-color)]">
                    <div className="py-1.5 pr-2 border-r border-[var(--border-color)]">
                        <div className="text-[11px] text-[var(--text-tertiary)]">전일종가</div>
                        <div className="text-xs font-medium text-[var(--text-primary)]">
                            {data.previousClose.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="py-1.5 px-2 border-r border-[var(--border-color)]">
                        <div className="text-[11px] text-[var(--text-tertiary)]">고가</div>
                        <div className="text-xs font-medium text-[var(--rise-color)]">
                            {data.high > 0 ? data.high.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--'}
                        </div>
                    </div>
                    <div className="py-1.5 pl-2">
                        <div className="text-[11px] text-[var(--text-tertiary)]">저가</div>
                        <div className="text-xs font-medium text-[var(--fall-color)]">
                            {data.low > 0 ? data.low.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--'}
                        </div>
                    </div>
                </div>
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
        ? new Date(dataUpdatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' })
        : null;

    return (
        <div>
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">지수 현황</h2>
                    {updatedTime && (
                        <span className="text-[11px] text-[var(--text-tertiary)]">
                            {updatedTime}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] transition-colors"
                    title="새로고침"
                    aria-label="새로고침"
                >
                    <RefreshCw size={12} />
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[0, 1].map((section) => (
                        <div key={section}>
                            <div className="h-3 w-16 bg-[var(--bg-tertiary)] animate-pulse mb-2" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[0, 1].map((i) => (
                                    <div key={i} className="h-[300px] bg-[var(--bg-primary)] border border-[var(--border-color)] animate-pulse" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">국내 지수</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <IndexDetailCard data={data?.kospiIndex ?? null} color="var(--rise-color)" />
                            <IndexDetailCard data={data?.kosdaqIndex ?? null} color="var(--accent-blue)" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">선물 지수</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <IndexDetailCard data={data?.kospi ?? null} color="var(--rise-color)" />
                            <IndexDetailCard data={data?.nasdaq ?? null} color="var(--success-color)" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
