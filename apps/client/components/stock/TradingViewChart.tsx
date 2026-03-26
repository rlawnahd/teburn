'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import { fetchDailyChart } from '@/lib/api/stocks';
import { useTheme } from '@/components/ui/ThemeProvider';

interface ChartProps {
    stockCode: string;
}

export default function StockChart({ stockCode }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const { theme } = useTheme();

    const { data: candles, isLoading } = useQuery({
        queryKey: ['dailyChart', stockCode],
        queryFn: () => fetchDailyChart(stockCode, 90),
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (!chartContainerRef.current || !candles || candles.length === 0) return;

        const container = chartContainerRef.current;
        const isDark = theme === 'dark';

        // Clear previous chart
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
                timeVisible: false,
            },
            handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chart;

        // Candlestick series — 한국 주식 컨벤션: 상승=빨강, 하락=파랑
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#ef4444',
            downColor: '#3b82f6',
            borderUpColor: '#ef4444',
            borderDownColor: '#3b82f6',
            wickUpColor: '#ef4444',
            wickDownColor: '#3b82f6',
        });

        const candleData = candles.map(c => ({
            time: `${c.date.slice(0, 4)}-${c.date.slice(4, 6)}-${c.date.slice(6, 8)}` as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        candleSeries.setData(candleData);

        // Volume series
        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        const volumeData = candles.map(c => ({
            time: `${c.date.slice(0, 4)}-${c.date.slice(4, 6)}-${c.date.slice(6, 8)}` as any,
            value: c.volume,
            color: c.close >= c.open
                ? (isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)')
                : (isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)'),
        }));

        volumeSeries.setData(volumeData);

        // Fit content
        chart.timeScale().fitContent();

        // Resize observer
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
    }, [candles, theme]);

    if (isLoading) {
        return (
            <div className="card overflow-hidden">
                <div className="h-[300px] sm:h-[400px] flex items-center justify-center">
                    <div className="text-base text-[var(--text-tertiary)]">차트 로딩 중...</div>
                </div>
            </div>
        );
    }

    if (!candles || candles.length === 0) {
        return (
            <div className="card overflow-hidden">
                <div className="h-[200px] flex items-center justify-center">
                    <div className="text-base text-[var(--text-tertiary)]">차트 데이터가 없습니다</div>
                </div>
            </div>
        );
    }

    return (
        <div className="card overflow-hidden">
            <div className="h-[300px] sm:h-[400px]">
                <div ref={chartContainerRef} className="w-full h-full" />
            </div>
        </div>
    );
}
