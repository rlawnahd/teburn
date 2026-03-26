'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import { fetchChart, ChartPeriod } from '@/lib/api/stocks';
import { useTheme } from '@/components/ui/ThemeProvider';

interface ChartProps {
    stockCode: string;
}

const PERIOD_TABS: { key: ChartPeriod; label: string }[] = [
    { key: '1', label: '1분' },
    { key: '5', label: '5분' },
    { key: '15', label: '15분' },
    { key: 'D', label: '일' },
    { key: 'W', label: '주' },
    { key: 'M', label: '월' },
];

function formatTime(dateStr: string, period: ChartPeriod): string {
    if (['1', '5', '15', '30', '60'].includes(period)) {
        // 분봉: YYYYMMDDHHMMSS → YYYY-MM-DD
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

export default function StockChart({ stockCode }: ChartProps) {
    const [period, setPeriod] = useState<ChartPeriod>('D');
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const { theme } = useTheme();

    const days = period === 'M' ? 200 : period === 'W' ? 120 : 90;

    const { data: candles, isLoading } = useQuery({
        queryKey: ['chart', stockCode, period],
        queryFn: () => fetchChart(stockCode, period, days),
        staleTime: period === 'D' ? 5 * 60 * 1000 : 60 * 1000,
    });

    useEffect(() => {
        if (!chartContainerRef.current || !candles || candles.length === 0) return;

        const container = chartContainerRef.current;
        const isDark = theme === 'dark';
        const isMinute = ['1', '5', '15', '30', '60'].includes(period);

        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: isDark ? '#9ca3af' : '#6b7280',
                fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
                horzLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: isDark ? '#4b5563' : '#d1d5db',
                    labelBackgroundColor: isDark ? '#374151' : '#e5e7eb',
                },
                horzLine: {
                    color: isDark ? '#4b5563' : '#d1d5db',
                    labelBackgroundColor: isDark ? '#374151' : '#e5e7eb',
                },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.1, bottom: 0.2 },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: isMinute,
            },
            handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chart;

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#ef4444',
            downColor: '#3b82f6',
            borderUpColor: '#ef4444',
            borderDownColor: '#3b82f6',
            wickUpColor: '#ef4444',
            wickDownColor: '#3b82f6',
        });

        const candleData = candles.map(c => ({
            time: formatTime(c.date, period) as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        candleSeries.setData(candleData);

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        const volumeData = candles.map(c => ({
            time: formatTime(c.date, period) as any,
            value: c.volume,
            color: c.close >= c.open
                ? (isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)')
                : (isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)'),
        }));

        volumeSeries.setData(volumeData);
        chart.timeScale().fitContent();

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                chart.applyOptions({ width, height });
            }
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, [candles, theme, period]);

    return (
        <div className="card overflow-hidden">
            {/* Period tabs */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border-color)]">
                {PERIOD_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setPeriod(tab.key)}
                        className={`px-2.5 py-1 text-sm rounded transition-colors ${
                            period === tab.key
                                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium'
                                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="h-[300px] sm:h-[400px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-base text-[var(--text-tertiary)]">차트 로딩 중...</div>
                    </div>
                ) : !candles || candles.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-base text-[var(--text-tertiary)]">차트 데이터가 없습니다</div>
                    </div>
                ) : (
                    <div ref={chartContainerRef} className="w-full h-full" />
                )}
            </div>
        </div>
    );
}
