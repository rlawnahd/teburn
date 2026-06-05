'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Crown, Flame } from 'lucide-react';
import { fetchHero, HeroData, HotStock, HeroTheme } from '@/lib/api/leading';
import { formatTradingValue } from '@/lib/utils/format';

function ConfidenceGauge({ value }: { value: number }) {
    const color = value >= 85 ? 'var(--rise-color)' : value >= 70 ? '#f59e0b' : 'var(--text-tertiary)';
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-[var(--text-tertiary)]">신뢰도</span>
            <div className="w-16 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${value}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-[12px] font-semibold" style={{ color }}>{value}%</span>
        </div>
    );
}

function StockHero({ stock }: { stock: HotStock }) {
    const router = useRouter();
    const isProfit = stock.changeRate > 0;

    return (
        <button
            onClick={() => router.push(`/stocks/${encodeURIComponent(stock.stockCode)}`)}
            className="w-full text-left p-4 rounded-xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--rise-bg)] to-[var(--bg-primary)] hover:shadow-lg transition-all"
        >
            <div className="flex items-center gap-1.5 mb-2">
                <Crown size={14} className="text-amber-500" />
                <span className="text-[12px] font-bold text-amber-600 tracking-wide">오늘의 주도주</span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">{stock.stockName}</h3>
                <span className={`text-xl font-bold ${isProfit ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                    {isProfit ? '+' : ''}{stock.changeRate.toFixed(2)}%
                </span>
            </div>

            {stock.reason && (
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                    {stock.reason}
                </p>
            )}

            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                    <span className="text-[var(--text-tertiary)]">
                        거래대금 <span className="text-[var(--text-primary)] font-medium">{formatTradingValue(stock.tradingValue)}</span>
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                        점수 <span className="text-[var(--text-primary)] font-medium">{stock.totalScore}</span>
                    </span>
                </div>
                {typeof stock.confidence === 'number' && (
                    <ConfidenceGauge value={stock.confidence} />
                )}
            </div>
        </button>
    );
}

function ThemeHero({ theme }: { theme: HeroTheme }) {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push(`/themes/${encodeURIComponent(theme.themeName)}`)}
            className="w-full text-left p-4 rounded-xl border border-[var(--border-color)] bg-gradient-to-br from-amber-500/10 to-[var(--bg-primary)] hover:shadow-lg transition-all"
        >
            <div className="flex items-center gap-1.5 mb-2">
                <Flame size={14} className="text-[var(--rise-color)]" />
                <span className="text-[12px] font-bold text-[var(--rise-color)] tracking-wide">오늘의 주도 테마</span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">{theme.themeName}</h3>
                <span className="text-xl font-bold text-[var(--rise-color)]">
                    +{theme.avgChangeRate.toFixed(2)}%
                </span>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-3 truncate">
                {theme.sCount > 0 && <span>S등급 {theme.sCount}개</span>}
                {theme.sCount > 0 && theme.aCount > 0 && ' · '}
                {theme.aCount > 0 && <span>A등급 {theme.aCount}개</span>}
                {' · '}
                {theme.topStocks.slice(0, 3).map(s => s.stockName).join(', ')}
            </p>

            <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">
                    동반 상승 <span className="text-[var(--text-primary)] font-medium">{theme.topStocks.length}종목</span>
                </span>
                <ConfidenceGauge value={theme.confidence} />
            </div>
        </button>
    );
}

export default function HeroCard() {
    const { data, isLoading } = useQuery<HeroData>({
        queryKey: ['hero'],
        queryFn: fetchHero,
        refetchInterval: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
                ))}
            </div>
        );
    }

    // 둘 다 없으면 표시 안 함
    if (!data?.stock && !data?.theme) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {data.stock ? <StockHero stock={data.stock} /> : (
                <div className="p-4 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-center">
                    <p className="text-sm text-[var(--text-tertiary)]">오늘은 확실한 주도주가 없습니다</p>
                </div>
            )}
            {data.theme ? <ThemeHero theme={data.theme} /> : (
                <div className="p-4 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-center">
                    <p className="text-sm text-[var(--text-tertiary)]">오늘은 주도 테마가 명확하지 않습니다</p>
                </div>
            )}
        </div>
    );
}
