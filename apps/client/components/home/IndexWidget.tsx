'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchIndexData, IndexData } from '@/lib/api/indices';

function IndexCard({ data, label, onClick }: { data: IndexData | null; label: string; onClick: () => void }) {
    if (!data) {
        return (
            <button
                onClick={onClick}
                className="flex items-center justify-between px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer text-left"
            >
                <div className="min-w-0">
                    <div className="text-[11px] text-[var(--text-tertiary)] truncate">{label}</div>
                    <div className="text-[13px] font-medium text-[var(--text-secondary)]">--</div>
                </div>
            </button>
        );
    }

    const isPositive = data.change >= 0;
    const changeColor = isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]';

    return (
        <button
            onClick={onClick}
            className="flex items-center justify-between px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer text-left"
        >
            <div className="min-w-0 flex-1">
                <div className="text-[11px] text-[var(--text-tertiary)] truncate">{data.name}</div>
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                        {data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[11px] font-medium ${changeColor}`}>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border-color)] border border-[var(--border-color)] mb-2">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-11 bg-[var(--bg-primary)] animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border-color)] border border-[var(--border-color)] mb-2">
            <IndexCard data={data?.kospiIndex ?? null} label="코스피" onClick={() => onTabChange('index')} />
            <IndexCard data={data?.kosdaqIndex ?? null} label="코스닥" onClick={() => onTabChange('index')} />
            <IndexCard data={data?.kospi ?? null} label="KOSPI 야간선물" onClick={() => onTabChange('index')} />
            <IndexCard data={data?.nasdaq ?? null} label="NASDAQ 선물" onClick={() => onTabChange('index')} />
        </div>
    );
}
