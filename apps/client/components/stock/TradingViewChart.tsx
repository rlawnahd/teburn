'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDailyChart, DailyCandle } from '@/lib/api/stocks';
import {
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface ChartProps {
    stockCode: string;
}

interface CandleData extends DailyCandle {
    candleHeight: [number, number]; // [low, high] for the wick
    bodyHeight: [number, number];   // [open, close] or [close, open]
    isUp: boolean;
}

function formatDate(dateStr: string): string {
    return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
}

function formatPrice(price: number): string {
    return price.toLocaleString();
}

function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload as CandleData;
    const color = d.isUp ? 'var(--rise-color)' : 'var(--fall-color)';
    const changeRate = ((d.close - d.open) / d.open * 100).toFixed(2);

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 shadow-lg text-sm">
            <p className="text-[var(--text-secondary)] mb-1">{d.date.slice(0, 4)}.{d.date.slice(4, 6)}.{d.date.slice(6, 8)}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <span className="text-[var(--text-tertiary)]">시가</span>
                <span className="text-right text-[var(--text-primary)]">{formatPrice(d.open)}</span>
                <span className="text-[var(--text-tertiary)]">고가</span>
                <span className="text-right text-[var(--rise-color)]">{formatPrice(d.high)}</span>
                <span className="text-[var(--text-tertiary)]">저가</span>
                <span className="text-right text-[var(--fall-color)]">{formatPrice(d.low)}</span>
                <span className="text-[var(--text-tertiary)]">종가</span>
                <span className="text-right font-medium" style={{ color }}>{formatPrice(d.close)}</span>
                <span className="text-[var(--text-tertiary)]">등락</span>
                <span className="text-right font-medium" style={{ color }}>{d.isUp ? '+' : ''}{changeRate}%</span>
                <span className="text-[var(--text-tertiary)]">거래량</span>
                <span className="text-right text-[var(--text-primary)]">{d.volume.toLocaleString()}</span>
            </div>
        </div>
    );
}

export default function StockChart({ stockCode }: ChartProps) {
    const { data: candles, isLoading } = useQuery({
        queryKey: ['dailyChart', stockCode],
        queryFn: () => fetchDailyChart(stockCode, 60),
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="card overflow-hidden">
                <div className="h-[300px] sm:h-[400px] flex items-center justify-center">
                    <div className="text-sm text-[var(--text-tertiary)]">차트 로딩 중...</div>
                </div>
            </div>
        );
    }

    if (!candles || candles.length === 0) {
        return (
            <div className="card overflow-hidden">
                <div className="h-[200px] flex items-center justify-center">
                    <div className="text-sm text-[var(--text-tertiary)]">차트 데이터가 없습니다</div>
                </div>
            </div>
        );
    }

    const chartData: CandleData[] = candles.map(c => ({
        ...c,
        candleHeight: [c.low, c.high],
        bodyHeight: c.close >= c.open ? [c.open, c.close] : [c.close, c.open],
        isUp: c.close >= c.open,
    }));

    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.05;

    return (
        <div className="card overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--border-color)]">
                <span className="text-sm font-medium text-[var(--text-primary)]">일봉 차트</span>
                <span className="text-sm text-[var(--text-tertiary)] ml-2">최근 {candles.length}일</span>
            </div>
            <div className="h-[300px] sm:h-[400px] px-1">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                            axisLine={false}
                            tickLine={false}
                            interval={Math.floor(chartData.length / 6)}
                        />
                        <YAxis
                            domain={[minPrice - padding, maxPrice + padding]}
                            tickFormatter={(v: number) => v >= 10000 ? `${Math.round(v / 1000)}k` : v.toString()}
                            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                            axisLine={false}
                            tickLine={false}
                            width={50}
                            orientation="right"
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {/* Candle wicks (high-low line) */}
                        <Bar dataKey="candleHeight" barSize={1} isAnimationActive={false}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.isUp ? 'var(--rise-color)' : 'var(--fall-color)'} />
                            ))}
                        </Bar>

                        {/* Candle body (open-close) */}
                        <Bar dataKey="bodyHeight" barSize={6} isAnimationActive={false}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.isUp ? 'var(--rise-color)' : 'var(--fall-color)'} />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
