'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchFuturesData, FuturesData } from '@/lib/api/futures';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface FuturesCardProps {
    data: FuturesData | null;
    label: string;
    onClick: () => void;
}

function FuturesCard({ data, label, onClick }: FuturesCardProps) {
    if (!data) {
        return (
            <button
                onClick={onClick}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer"
            >
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[var(--text-tertiary)] truncate">{label}</div>
                    <div className="text-sm font-medium text-[var(--text-secondary)]">--</div>
                </div>
            </button>
        );
    }

    const isPositive = data.change >= 0;
    const changeColor = isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]';
    const lineColor = isPositive ? 'var(--rise-color, #ef4444)' : 'var(--fall-color, #3b82f6)';

    // 스파크라인용 차트 데이터 (최근 데이터만)
    const sparkData = data.chartData.length > 0
        ? data.chartData.slice(-30).map((p) => ({ v: p.price }))
        : [];

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--text-tertiary)] transition-colors cursor-pointer"
        >
            <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[var(--text-tertiary)] truncate">{data.name}</div>
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[11px] font-medium ${changeColor}`}>
                        {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
                    </span>
                    {!data.marketOpen && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
                            마감
                        </span>
                    )}
                </div>
            </div>
            {sparkData.length > 1 && (
                <div className="w-16 h-8 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                            <YAxis domain={['dataMin', 'dataMax']} hide />
                            <Line
                                type="monotone"
                                dataKey="v"
                                stroke={lineColor}
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </button>
    );
}

export default function FuturesWidget({ onTabChange }: { onTabChange: (tab: string) => void }) {
    const { data, isLoading } = useQuery({
        queryKey: ['futures-widget'],
        queryFn: fetchFuturesData,
        refetchInterval: 60 * 1000,
        staleTime: 30 * 1000,
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-3 mb-4">
                {[0, 1].map((i) => (
                    <div
                        key={i}
                        className="h-14 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] animate-pulse"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-3 mb-4">
            <FuturesCard
                data={data?.kospi ?? null}
                label="KOSPI 200 야간선물"
                onClick={() => onTabChange('futures')}
            />
            <FuturesCard
                data={data?.nasdaq ?? null}
                label="NASDAQ 100 선물"
                onClick={() => onTabChange('futures')}
            />
        </div>
    );
}
