'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { fetchMarketThemes, MarketTheme } from '@/lib/api/leading';
import { searchStocks } from '@/lib/api/stocks';

function ThemeChip({ theme, onStockClick }: { theme: MarketTheme; onStockClick: (name: string) => void }) {
    return (
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)] transition-colors">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">{theme.name}</span>
                <span className="text-xs text-[var(--text-tertiary)]">{theme.stocks.length}종목</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
                {theme.stocks.map(stock => (
                    <button
                        key={stock}
                        onClick={() => onStockClick(stock)}
                        className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/20 transition-colors"
                    >
                        {stock}
                    </button>
                ))}
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{theme.reason}</p>
        </div>
    );
}

export default function MarketThemeCard() {
    const router = useRouter();
    const { data: analysis, isLoading, error } = useQuery({
        queryKey: ['marketThemes'],
        queryFn: fetchMarketThemes,
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });

    const handleStockClick = async (stockName: string) => {
        const results = await searchStocks(stockName);
        const exact = results.find((item) => item.stockName === stockName);
        if (exact) {
            router.push(`/stocks/${encodeURIComponent(exact.stockCode)}`);
        }
    };

    if (isLoading) return null;

    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[var(--accent-blue)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">오늘의 시장 테마</span>
                <span className="text-xs text-[var(--text-tertiary)]">AI 분석</span>
                {analysis?.analyzedAt && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                        {new Date(analysis.analyzedAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: 'Asia/Seoul',
                        })}
                    </span>
                )}
            </div>

            {analysis && analysis.themes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysis.themes.map((theme, i) => (
                        <ThemeChip key={i} theme={theme} onStockClick={handleStockClick} />
                    ))}
                </div>
            ) : (
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
                    <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                        AI 테마 분석 대기 중
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        장중 스케줄에 맞춰 분석이 저장되면 여기에 표시됩니다.
                        {error ? ' 현재는 분석 데이터를 불러오지 못했습니다.' : ''}
                    </p>
                </div>
            )}
        </div>
    );
}
