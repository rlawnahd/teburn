'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { fetchMarketThemes, MarketTheme } from '@/lib/api/leading';

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
    const { data: analysis } = useQuery({
        queryKey: ['marketThemes'],
        queryFn: fetchMarketThemes,
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });

    if (!analysis || analysis.themes.length === 0) return null;

    const handleStockClick = (stockName: string) => {
        // 종목명으로 검색 페이지로 이동하거나 직접 라우팅
        // 현재는 종목코드가 없으므로 이름만 표시
    };

    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[var(--accent-blue)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">오늘의 시장 테마</span>
                <span className="text-xs text-[var(--text-tertiary)]">AI 분석</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.themes.map((theme, i) => (
                    <ThemeChip key={i} theme={theme} onStockClick={handleStockClick} />
                ))}
            </div>
        </div>
    );
}
