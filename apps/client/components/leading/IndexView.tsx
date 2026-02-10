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
            <div className="h-[200px] flex items-center justify-center text-sm text-[var(--text-tertiary)]">
                차트 데이터 없음
            </div>
        );
    }

    const prices = chartData.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1 || 1;

    return (
        <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={40}
                    />
                    <YAxis
                        domain={[minPrice - padding, maxPrice + padding]}
                        tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        width={60}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'var(--text-primary)',
                        }}
                        formatter={(value: number | undefined) => [
                            value != null ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--',
                            '가격',
                        ]}
                        labelFormatter={(label) => `시간: ${label}`}
                    />
                    <ReferenceLine
                        y={data.previousClose}
                        stroke="var(--text-tertiary)"
                        strokeDasharray="4 4"
                        opacity={0.5}
                    />
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke={color}
                        strokeWidth={2}
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
            <div className="rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] p-5">
                <div className="text-sm text-[var(--text-tertiary)]">데이터를 불러올 수 없습니다</div>
            </div>
        );
    }

    const isPositive = data.change >= 0;
    const changeColor = isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]';

    return (
        <div className="rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] overflow-hidden">
            {/* 헤더 */}
            <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">{data.name}</h3>
                        <span className="text-xs text-[var(--text-tertiary)]">{data.symbol}</span>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-[var(--text-primary)]">
                            {data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-sm font-medium ${changeColor}`}>
                            {isPositive ? '+' : ''}{data.change.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            {' '}({isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%)
                        </div>
                    </div>
                </div>
                {!data.marketOpen && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                            장 마감
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                            거래시간 {data.tradingHours}
                        </span>
                    </div>
                )}
            </div>

            {/* 차트 */}
            <div className="p-4">
                <IndexChart data={data} color={color} />
            </div>

            {/* 상세 정보 */}
            <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-[var(--bg-secondary)]">
                        <div className="text-[10px] text-[var(--text-tertiary)] mb-0.5">전일종가</div>
                        <div className="text-xs font-medium text-[var(--text-primary)]">
                            {data.previousClose.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-[var(--bg-secondary)]">
                        <div className="text-[10px] text-[var(--text-tertiary)] mb-0.5">고가</div>
                        <div className="text-xs font-medium text-[var(--rise-color)]">
                            {data.high > 0 ? data.high.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--'}
                        </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-[var(--bg-secondary)]">
                        <div className="text-[10px] text-[var(--text-tertiary)] mb-0.5">저가</div>
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
    });

    const updatedTime = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' })
        : null;

    return (
        <div>
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">지수</h2>
                    {updatedTime && (
                        <span className="text-[11px] text-[var(--text-tertiary)]">
                            {updatedTime} 기준
                        </span>
                    )}
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] transition-colors"
                    title="새로고침"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-6">
                    <div>
                        <div className="h-5 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse mb-3" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[0, 1].map((i) => (
                                <div key={i} className="h-[380px] rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] animate-pulse" />
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="h-5 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse mb-3" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[0, 1].map((i) => (
                                <div key={i} className="h-[380px] rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* 국내 지수 섹션 */}
                    <div>
                        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">국내 지수</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <IndexDetailCard
                                data={data?.kospiIndex ?? null}
                                color="var(--rise-color, #ef4444)"
                            />
                            <IndexDetailCard
                                data={data?.kosdaqIndex ?? null}
                                color="#8b5cf6"
                            />
                        </div>
                    </div>

                    {/* 선물 지수 섹션 */}
                    <div>
                        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">선물 지수</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <IndexDetailCard
                                data={data?.kospi ?? null}
                                color="var(--rise-color, #ef4444)"
                            />
                            <IndexDetailCard
                                data={data?.nasdaq ?? null}
                                color="#22c55e"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
