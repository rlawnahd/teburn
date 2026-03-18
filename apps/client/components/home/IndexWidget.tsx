'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchIndexData, IndexData } from '@/lib/api/indices';
import { Skeleton } from '@/components/ui/Skeleton';

function IndexCard({ data, label, onClick }: { data: IndexData | null; label: string; onClick: () => void }) {
    if (!data) {
        return (
            <button
                onClick={onClick}
                className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer text-left"
            >
                <div className="min-w-0">
                    <div className="text-[12px] text-[var(--text-tertiary)] truncate">{label}</div>
                    <div className="text-[13px] font-medium text-[var(--text-secondary)]">--</div>
                </div>
            </button>
        );
    }

    const isPositive = data.change >= 0;
    const isNegative = data.change < 0;
    const changeColor = isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]';
    const bgTint = isPositive ? 'bg-[var(--rise-bg)]' : isNegative ? 'bg-[var(--fall-bg)]' : 'bg-[var(--bg-primary)]';

    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-between px-2.5 py-1.5 ${bgTint} hover:brightness-95 transition-all cursor-pointer text-left`}
        >
            <div className="min-w-0 flex-1">
                <div className="text-[12px] text-[var(--text-tertiary)] truncate">{data.name}</div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                        {data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[12px] font-medium ${changeColor} flex items-center gap-0.5`}>
                        <span className="text-[8px]">{isPositive ? '▲' : isNegative ? '▼' : ''}</span>
                        {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
                    </span>
                </div>
            </div>
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

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border-color)] border border-[var(--border-color)] rounded mb-2 overflow-hidden">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-[var(--bg-primary)] px-2.5 py-1.5">
                        <Skeleton className="h-3 w-14 rounded-sm mb-1" />
                        <Skeleton className="h-4 w-20 rounded-sm" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border-color)] border border-[var(--border-color)] rounded mb-2 overflow-hidden">
            <IndexCard data={data?.kospiIndex ?? null} label="코스피" onClick={() => onTabChange('index')} />
            <IndexCard data={data?.kosdaqIndex ?? null} label="코스닥" onClick={() => onTabChange('index')} />
            <IndexCard data={data?.kospi ?? null} label="KOSPI 야간선물" onClick={() => onTabChange('index')} />
            <IndexCard data={data?.nasdaq ?? null} label="NASDAQ 선물" onClick={() => onTabChange('index')} />
        </div>
    );
}
