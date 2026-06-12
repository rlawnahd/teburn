'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { fetchMarketThemes, MarketTheme } from '@/lib/api/leading';

function ThemeChip({ theme }: { theme: MarketTheme }) {
    return (
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)] transition-colors">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">{theme.name}</span>
                <span className="text-xs text-[var(--text-tertiary)]">{theme.stocks.length}종목</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
                {theme.stocks.map(stock => (
                    <span
                        key={stock}
                        className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                    >
                        {stock}
                    </span>
                ))}
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{theme.reason}</p>
        </div>
    );
}

export default function MarketThemeCard() {
    const { data: analysis } = useQuery({
        queryKey: ['marketThemes'],
        queryFn: fetchMarketThemes,
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });

    if (!analysis || analysis.themes.length === 0) return null;

    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[var(--accent)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">오늘의 시장 테마</span>
                <span className="text-xs text-[var(--text-tertiary)]">AI 분석</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.themes.map((theme, i) => (
                    <ThemeChip key={i} theme={theme} />
                ))}
            </div>
        </div>
    );
}
