'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useEffect, useState } from 'react';
import { fetchIndexData, IndexData } from '@/lib/api/indices';
import { Skeleton } from '@/components/ui/Skeleton';

function MiniSparkline({ data, isPositive }: { data: { price: number }[]; isPositive: boolean }) {
    if (!data || data.length < 2) return null;
    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const w = 56, h = 18;
    const points = prices.map((p, i) =>
        `${(i / (prices.length - 1)) * w},${h - ((p - min) / range) * h}`
    ).join(' ');
    return (
        <svg width={w} height={h} className="flex-shrink-0">
            <polyline points={points} fill="none"
                stroke={isPositive ? 'var(--rise-color)' : 'var(--fall-color)'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IndexCard({ data, label, flash, onClick }: { data: IndexData | null; label: string; flash: 'rise' | 'fall' | null; onClick: () => void }) {
    if (!data) {
        return (
            <button
                onClick={onClick}
                className="flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer text-left"
            >
                <div className="min-w-0">
                    <div className="text-[12px] text-[var(--text-tertiary)] truncate">{label}</div>
                    <div className="text-sm font-medium text-[var(--text-secondary)]">--</div>
                </div>
            </button>
        );
    }

    const isPositive = data.change >= 0;
    const isNegative = data.change < 0;
    const changeColor = isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]';
    const bgTint = isPositive ? 'bg-[var(--rise-bg)]' : isNegative ? 'bg-[var(--fall-bg)]' : 'bg-[var(--bg-primary)]';
    const sessionLabel = data.marketOpen ? (data.category === 'index' ? '장중' : '거래중') : (data.category === 'index' ? '마감' : '휴장');

    const flashClass = flash === 'rise' ? 'animate-flash-rise' : flash === 'fall' ? 'animate-flash-fall' : '';

    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-between px-3 py-2 ${bgTint} hover:brightness-95 transition-all cursor-pointer text-left ${flashClass}`}
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                    <div className="text-[12px] text-[var(--text-tertiary)] truncate">{data.name}</div>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{sessionLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                        {data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[12px] font-medium ${changeColor} flex items-center gap-0.5`}>
                        <span className="text-[10px]">{isPositive ? '▲' : isNegative ? '▼' : ''}</span>
                        {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
                    </span>
                </div>
            </div>
            {data.chartData && data.chartData.length >= 2 && (
                <MiniSparkline data={data.chartData} isPositive={isPositive} />
            )}
        </button>
    );
}

export default function IndexWidget({ onTabChange }: { onTabChange: (tab: string) => void }) {
    const { data, isLoading } = useQuery({
        queryKey: ['index-detail'],
        queryFn: fetchIndexData,
        refetchInterval: 60 * 1000,
        staleTime: 30 * 1000,
        retry: 3,
        retryDelay: (attempt) => Math.min(attempt * 3000, 10000),
    });

    // 지수 가격 플래시
    const prevDataRef = useRef<typeof data>(null);
    const [flashes, setFlashes] = useState<Record<string, 'rise' | 'fall' | null>>({});

    useEffect(() => {
        if (!data || !prevDataRef.current) { prevDataRef.current = data; return; }
        const prev = prevDataRef.current;
        const newFlashes: Record<string, 'rise' | 'fall'> = {};
        const pairs: [string, IndexData | null | undefined, IndexData | null | undefined][] = [
            ['kospi', prev.kospiIndex, data.kospiIndex],
            ['kosdaq', prev.kosdaqIndex, data.kosdaqIndex],
            ['kospiFuture', prev.kospi, data.kospi],
            ['nasdaq', prev.nasdaq, data.nasdaq],
        ];
        pairs.forEach(([key, p, c]) => {
            if (p && c && p.currentPrice !== c.currentPrice) {
                newFlashes[key] = c.currentPrice > p.currentPrice ? 'rise' : 'fall';
            }
        });
        setFlashes(newFlashes);
        prevDataRef.current = data;
        const timer = setTimeout(() => setFlashes({}), 1500);
        return () => clearTimeout(timer);
    }, [data]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border-color)] border border-[var(--border-color)] rounded-xl mb-2 overflow-hidden">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-[var(--bg-primary)] px-3 py-2">
                        <Skeleton className="h-3 w-14 rounded-sm mb-1" />
                        <Skeleton className="h-4 w-20 rounded-sm" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border-color)] border border-[var(--border-color)] rounded-xl mb-2 overflow-hidden">
            <IndexCard data={data?.kospiIndex ?? null} label="코스피" flash={flashes['kospi'] || null} onClick={() => onTabChange('index')} />
            <IndexCard data={data?.kosdaqIndex ?? null} label="코스닥" flash={flashes['kosdaq'] || null} onClick={() => onTabChange('index')} />
            <IndexCard data={data?.kospi ?? null} label="KOSPI 야간선물" flash={flashes['kospiFuture'] || null} onClick={() => onTabChange('index')} />
            <IndexCard data={data?.nasdaq ?? null} label="NASDAQ 선물" flash={flashes['nasdaq'] || null} onClick={() => onTabChange('index')} />
        </div>
    );
}
