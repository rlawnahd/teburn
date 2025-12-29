'use client';

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { DividendRecord } from '@/lib/api/etf';

interface DividendHistoryChartProps {
    dividends: DividendRecord[];
    symbol: string;
}

export default function DividendHistoryChart({
    dividends,
    symbol,
}: DividendHistoryChartProps) {
    const chartData = useMemo(() => {
        return dividends.map((d) => {
            const date = new Date(d.exDate);
            return {
                month: `${date.getMonth() + 1}월`,
                amount: d.amount,
                date: d.exDate,
                status: d.status,
            };
        });
    }, [dividends]);

    const avgAmount = useMemo(() => {
        if (dividends.length === 0) return 0;
        const sum = dividends.reduce((acc, d) => acc + d.amount, 0);
        return sum / dividends.length;
    }, [dividends]);

    const maxAmount = useMemo(() => {
        if (dividends.length === 0) return 1;
        return Math.max(...dividends.map((d) => d.amount)) * 1.2;
    }, [dividends]);

    if (dividends.length === 0) {
        return (
            <div className="bg-[var(--bg-tertiary)] rounded-2xl p-5">
                <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">{symbol} 분배금 이력</div>
                <div className="h-48 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
                    분배금 이력이 없습니다
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-tertiary)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{symbol} 분배금 이력</div>
                <div className="text-xs text-[var(--text-tertiary)]">
                    평균: <span className="font-bold text-[var(--accent-blue)]">${avgAmount.toFixed(4)}</span>
                </div>
            </div>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                            axisLine={{ stroke: 'var(--border-color)' }}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, maxAmount]}
                            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `$${v.toFixed(2)}`}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload || !payload[0]) return null;
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] p-3 text-xs">
                                        <div className="text-[var(--text-tertiary)] mb-1">{data.month}</div>
                                        <div className="font-bold text-[var(--accent-blue)]">${data.amount.toFixed(4)}</div>
                                        <div className="text-[var(--text-tertiary)] mt-1">배당락일: {data.date}</div>
                                    </div>
                                );
                            }}
                        />
                        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => {
                                const isPast = new Date(entry.date) < new Date();
                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={isPast ? 'var(--accent-blue)' : 'var(--accent-blue-light)'}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-[var(--accent-blue)]"></div>
                    <span className="text-[var(--text-tertiary)]">지급 완료</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-[var(--accent-blue-light)]"></div>
                    <span className="text-[var(--text-tertiary)]">예정</span>
                </div>
            </div>
        </div>
    );
}
