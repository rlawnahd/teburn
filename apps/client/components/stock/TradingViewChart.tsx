'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } from 'lightweight-charts';
import { fetchChart, ChartPeriod, DailyCandle } from '@/lib/api/stocks';
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

interface OhlcvInfo {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    changeRate: number;
    isUp: boolean;
}

function formatTime(dateStr: string, period: ChartPeriod): any {
    if (['1', '5', '15', '30', '60'].includes(period) && dateStr.length >= 12) {
        const y = parseInt(dateStr.slice(0, 4));
        const m = parseInt(dateStr.slice(4, 6)) - 1;
        const d = parseInt(dateStr.slice(6, 8));
        const h = parseInt(dateStr.slice(8, 10));
        const min = parseInt(dateStr.slice(10, 12));
        return Date.UTC(y, m, d, h, min) / 1000;
    }
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

function formatPrice(v: number): string {
    return v.toLocaleString();
}

function formatVolume(v: number): string {
    const billion = v / 100000000;
    if (billion >= 10000) return `${(billion / 10000).toFixed(1)}조`;
    if (billion >= 1) return `${billion.toFixed(0)}억`;
    if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
    return `${v}`;
}

function OhlcvLegend({ info }: { info: OhlcvInfo | null }) {
    if (!info) return null;

    const color = info.isUp ? 'var(--rise-color)' : 'var(--fall-color)';

    return (
        <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="text-[var(--text-tertiary)]">시 <span className="text-[var(--text-primary)] font-medium">{formatPrice(info.open)}</span></span>
            <span className="text-[var(--text-tertiary)]">고 <span style={{ color: 'var(--rise-color)' }} className="font-medium">{formatPrice(info.high)}</span></span>
            <span className="text-[var(--text-tertiary)]">저 <span style={{ color: 'var(--fall-color)' }} className="font-medium">{formatPrice(info.low)}</span></span>
            <span className="text-[var(--text-tertiary)]">종 <span style={{ color }} className="font-medium">{formatPrice(info.close)}</span></span>
            <span className="text-[var(--text-tertiary)]">
                <span style={{ color }} className="font-medium">{info.isUp ? '+' : ''}{info.changeRate.toFixed(2)}%</span>
            </span>
            <span className="text-[var(--text-tertiary)]">거래대금 <span className="text-[var(--text-primary)] font-medium">{formatVolume(info.close * info.volume)}</span></span>
        </div>
    );
}

export default function StockChart({ stockCode }: ChartProps) {
    const [period, setPeriod] = useState<ChartPeriod>('D');
    const [hoverInfo, setHoverInfo] = useState<OhlcvInfo | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const candlesRef = useRef<DailyCandle[]>([]);
    const { theme } = useTheme();

    const days = period === 'M' ? 1825 : period === 'W' ? 1095 : period === 'D' ? 730 : 90;

    const { data: candles, isLoading } = useQuery({
        queryKey: ['chart', stockCode, period],
        queryFn: () => fetchChart(stockCode, period, days),
        staleTime: period === 'D' ? 5 * 60 * 1000 : 60 * 1000,
    });

    useEffect(() => {
        if (candles) candlesRef.current = candles;
    }, [candles]);

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
                scaleMargins: { top: 0.15, bottom: 0.2 },
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

        const timeToCandle = new Map<string, DailyCandle>();
        const candleData = candles.map(c => {
            const time = formatTime(c.date, period);
            timeToCandle.set(String(time), c);
            return { time, open: c.open, high: c.high, low: c.low, close: c.close };
        });

        candleSeries.setData(candleData as any);

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: {
                type: 'custom',
                formatter: (v: number) => formatVolume(v),
            },
            priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        const volumeData = candles.map(c => ({
            time: formatTime(c.date, period) as any,
            value: c.close * c.volume,
            color: c.close >= c.open
                ? (isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)')
                : (isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)'),
        }));

        volumeSeries.setData(volumeData);
        chart.timeScale().fitContent();

        // Crosshair move → update OHLCV legend
        chart.subscribeCrosshairMove((param) => {
            if (!param.time) {
                // 마우스가 차트 밖으로 나가면 마지막 캔들 정보 표시
                const last = candles[candles.length - 1];
                if (last) {
                    setHoverInfo({
                        open: last.open, high: last.high, low: last.low, close: last.close,
                        volume: last.volume,
                        changeRate: ((last.close - last.open) / last.open) * 100,
                        isUp: last.close >= last.open,
                    });
                }
                return;
            }

            const c = timeToCandle.get(String(param.time));
            if (c) {
                setHoverInfo({
                    open: c.open, high: c.high, low: c.low, close: c.close,
                    volume: c.volume,
                    changeRate: ((c.close - c.open) / c.open) * 100,
                    isUp: c.close >= c.open,
                });
            }
        });

        // 초기값: 마지막 캔들
        const last = candles[candles.length - 1];
        if (last) {
            setHoverInfo({
                open: last.open, high: last.high, low: last.low, close: last.close,
                volume: last.volume,
                changeRate: ((last.close - last.open) / last.open) * 100,
                isUp: last.close >= last.open,
            });
        }

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
            {/* Period tabs + OHLCV legend */}
            <div className="px-3 py-2 border-b border-[var(--border-color)] space-y-1">
                <div className="flex items-center gap-1">
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
                <OhlcvLegend info={hoverInfo} />
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
