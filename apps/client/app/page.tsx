'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    Search,
    RefreshCw,
    LayoutGrid,
    Grid3X3,
    Flame,
    Snowflake,
    Sun,
    Moon,
    Sunset,
} from 'lucide-react';
import { fetchThemes, ThemeListItem } from '@/lib/api/themes';
import { useRealtimeStockPrices, ThemeRealtimePrice, MarketStatusInfo } from '@/hooks/useRealtimeStockPrices';
import TreemapHeatmapView from '@/components/themes/TreemapHeatmapView';
import Sidebar from '@/components/layout/Sidebar';

import { TrendingUp, TrendingDown, DollarSign, Crown } from 'lucide-react';

type ViewMode = 'dashboard' | 'heatmap';

// 거래대금 포맷 함수
function formatTradingValue(value: number): string {
    const billion = value / 100000000;
    if (billion >= 1000) {
        return `${(billion / 1000).toFixed(1)}조`;
    } else if (billion >= 1) {
        return `${billion.toFixed(0)}억`;
    } else {
        return `${(value / 10000).toFixed(0)}만`;
    }
}

// 플립 카드 컴포넌트
function ThemeFlipCard({
    theme,
    priceInfo,
    onClick,
}: {
    theme: { name: string; stockCount: number; keywords: string[] };
    priceInfo?: { avgChangeRate: number; prices: Array<{ stockName: string; changeRate: number; tradingValue: number; currentPrice: number }> };
    onClick: () => void;
}) {
    const rate = priceInfo?.avgChangeRate ?? 0;
    const hasData = priceInfo && priceInfo.prices.length > 0;
    const isPositive = rate > 0;
    const isNegative = rate < 0;
    const prices = priceInfo?.prices || [];

    // 대장주 (등락률 기준)
    const leaderStock = [...prices].sort((a, b) => b.changeRate - a.changeRate)[0];
    // 총 거래대금
    const totalTradingValue = prices.reduce((sum, p) => sum + p.tradingValue, 0);
    // 상위 3종목 (거래대금 기준 - 이미 정렬되어 있음)
    const top3Stocks = prices.slice(0, 3);

    return (
        <div
            onClick={onClick}
            className="group cursor-pointer h-[140px]"
            style={{ perspective: '1000px' }}
        >
            <div
                className="relative w-full h-full transition-transform duration-500 ease-out group-hover:[transform:rotateY(180deg)]"
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* 앞면 */}
                <div
                    className={`absolute inset-0 p-4 rounded-2xl border
                        bg-[var(--bg-primary)] border-[var(--border-color)]
                        ${hasData ? 'shadow-[var(--shadow-sm)]' : ''}
                    `}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">{theme.name}</div>
                            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{theme.stockCount}종목</div>
                        </div>
                        {hasData ? (
                            <div className="flex items-end justify-between">
                                <div
                                    className={`text-2xl font-bold tracking-tight ${
                                        isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                                    }`}
                                >
                                    {isPositive ? '+' : ''}{rate.toFixed(2)}%
                                </div>
                                {isPositive ? (
                                    <TrendingUp size={20} className="text-[var(--rise-color)] opacity-50" />
                                ) : isNegative ? (
                                    <TrendingDown size={20} className="text-[var(--fall-color)] opacity-50" />
                                ) : null}
                            </div>
                        ) : (
                            <div className="text-sm text-[var(--text-tertiary)]">데이터 없음</div>
                        )}
                    </div>
                </div>

                {/* 뒷면 */}
                <div
                    className={`absolute inset-0 p-3 rounded-2xl border
                        ${isPositive ? 'bg-gradient-to-br from-[var(--rise-bg)] to-[var(--bg-primary)] border-[var(--rise-color)]/30'
                            : isNegative ? 'bg-gradient-to-br from-[var(--fall-bg)] to-[var(--bg-primary)] border-[var(--fall-color)]/30'
                            : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}
                        shadow-[var(--shadow-lg)]
                    `}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    {hasData ? (
                        <div className="flex flex-col h-full text-xs">
                            {/* 대장주 */}
                            {leaderStock && (
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Crown size={12} className="text-amber-500 flex-shrink-0" />
                                    <span className="text-[var(--text-secondary)] font-medium truncate flex-1">{leaderStock.stockName}</span>
                                    <span className={`font-bold flex-shrink-0 ${leaderStock.changeRate > 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                        {leaderStock.changeRate > 0 ? '+' : ''}{leaderStock.changeRate.toFixed(1)}%
                                    </span>
                                </div>
                            )}

                            {/* 거래대금 */}
                            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[var(--border-color)]/50">
                                <DollarSign size={12} className="text-[var(--accent-blue)] flex-shrink-0" />
                                <span className="text-[var(--text-tertiary)]">거래대금</span>
                                <span className="font-bold text-[var(--text-primary)] ml-auto">{formatTradingValue(totalTradingValue)}</span>
                            </div>

                            {/* 상위 종목 */}
                            <div className="flex-1 space-y-1 overflow-hidden">
                                {top3Stocks.map((stock, i) => (
                                    <div key={i} className="flex items-center justify-between text-[10px]">
                                        <span className="text-[var(--text-tertiary)] truncate flex-1 mr-2">{stock.stockName}</span>
                                        <span className={`font-medium flex-shrink-0 ${stock.changeRate > 0 ? 'text-[var(--rise-color)]' : stock.changeRate < 0 ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'}`}>
                                            {stock.changeRate > 0 ? '+' : ''}{stock.changeRate.toFixed(1)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-[var(--text-tertiary)]">
                            데이터 없음
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 장 상태 표시 컴포넌트
function MarketStatusBadge({ marketStatus }: { marketStatus: MarketStatusInfo | null }) {
    if (!marketStatus) return null;

    const getStatusStyle = () => {
        switch (marketStatus.status) {
            case 'regular':
                return {
                    bg: 'bg-[var(--success-bg)]',
                    text: 'text-[var(--success-color)]',
                    border: 'border-[var(--success-color)]/30',
                    icon: <Sun size={12} className="text-[var(--success-color)]" />,
                    pulse: true,
                };
            case 'pre_market':
                return {
                    bg: 'bg-[var(--warning-bg)]',
                    text: 'text-[var(--warning-color)]',
                    border: 'border-[var(--warning-color)]/30',
                    icon: <Sunset size={12} className="text-[var(--warning-color)]" />,
                    pulse: true,
                };
            case 'post_market':
                return {
                    bg: 'bg-[var(--warning-bg)]',
                    text: 'text-[var(--warning-color)]',
                    border: 'border-[var(--warning-color)]/30',
                    icon: <Sunset size={12} className="text-[var(--warning-color)]" />,
                    pulse: true,
                };
            case 'closed':
            default:
                return {
                    bg: 'bg-[var(--bg-tertiary)]',
                    text: 'text-[var(--text-tertiary)]',
                    border: 'border-[var(--border-color)]',
                    icon: <Moon size={12} className="text-[var(--text-tertiary)]" />,
                    pulse: false,
                };
        }
    };

    const style = getStatusStyle();

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
            {style.icon}
            <span>{marketStatus.statusText}</span>
            {style.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>}
            {marketStatus.closeTime && marketStatus.isOpen && (
                <span className="text-[10px] opacity-70">~{marketStatus.closeTime}</span>
            )}
            {marketStatus.nextOpenTime && !marketStatus.isOpen && (
                <span className="text-[10px] opacity-70">{marketStatus.nextOpenTime}</span>
            )}
        </div>
    );
}

// ========== 1. 대시보드 뷰 ==========
function DashboardView({
    sortedThemes,
    priceMap,
    onThemeClick,
}: {
    sortedThemes: ThemeListItem[];
    priceMap: Map<string, ThemeRealtimePrice>;
    onThemeClick: (name: string) => void;
}) {
    const themesWithData = sortedThemes.filter((t) => {
        const priceInfo = priceMap.get(t.name);
        return priceInfo && priceInfo.prices.length > 0;
    });

    const top5Gainers = themesWithData
        .filter((t) => (priceMap.get(t.name)?.avgChangeRate ?? 0) > 0)
        .slice(0, 5);

    const top5Losers = [...themesWithData]
        .filter((t) => (priceMap.get(t.name)?.avgChangeRate ?? 0) < 0)
        .sort((a, b) => {
            const rateA = priceMap.get(a.name)?.avgChangeRate ?? 0;
            const rateB = priceMap.get(b.name)?.avgChangeRate ?? 0;
            return rateA - rateB;
        })
        .slice(0, 5);

    return (
        <div className="space-y-6">
            {/* TOP 5 요약 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 급등 TOP 5 */}
                <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)]">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-[var(--rise-bg)] flex items-center justify-center">
                            <Flame size={16} className="text-[var(--rise-color)]" />
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)]">급등 테마 TOP 5</h3>
                    </div>
                    <div className="space-y-2">
                        {top5Gainers.length === 0 ? (
                            <div className="text-sm text-[var(--text-tertiary)] py-6 text-center">상승 테마가 없습니다</div>
                        ) : (
                            top5Gainers.map((theme, i) => {
                                const rate = priceMap.get(theme.name)?.avgChangeRate ?? 0;
                                const prices = priceMap.get(theme.name)?.prices || [];
                                const topStock = [...prices].sort((a, b) => b.changeRate - a.changeRate)[0];
                                return (
                                    <div
                                        key={theme.name}
                                        className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-[var(--rise-bg)] transition-colors cursor-pointer"
                                        onClick={() => onThemeClick(theme.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-[var(--rise-color)] w-6">{i + 1}</span>
                                            <div>
                                                <span className="font-medium text-[var(--text-primary)]">{theme.name}</span>
                                                {topStock && (
                                                    <span className="text-xs text-[var(--text-tertiary)] ml-2">
                                                        {topStock.stockName} +{topStock.changeRate.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-bold text-[var(--rise-color)]">+{rate.toFixed(2)}%</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 급락 TOP 5 */}
                <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)]">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-[var(--fall-bg)] flex items-center justify-center">
                            <Snowflake size={16} className="text-[var(--fall-color)]" />
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)]">급락 테마 TOP 5</h3>
                    </div>
                    <div className="space-y-2">
                        {top5Losers.length === 0 ? (
                            <div className="text-sm text-[var(--text-tertiary)] py-6 text-center">하락 테마가 없습니다</div>
                        ) : (
                            top5Losers.map((theme, i) => {
                                const rate = priceMap.get(theme.name)?.avgChangeRate ?? 0;
                                const prices = priceMap.get(theme.name)?.prices || [];
                                const worstStock = [...prices].sort((a, b) => a.changeRate - b.changeRate)[0];
                                return (
                                    <div
                                        key={theme.name}
                                        className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-[var(--fall-bg)] transition-colors cursor-pointer"
                                        onClick={() => onThemeClick(theme.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-[var(--fall-color)] w-6">{i + 1}</span>
                                            <div>
                                                <span className="font-medium text-[var(--text-primary)]">{theme.name}</span>
                                                {worstStock && (
                                                    <span className="text-xs text-[var(--text-tertiary)] ml-2">
                                                        {worstStock.stockName} {worstStock.changeRate.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-bold text-[var(--fall-color)]">{rate.toFixed(2)}%</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* 플립 카드 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sortedThemes.map((theme) => (
                    <ThemeFlipCard
                        key={theme.name}
                        theme={theme}
                        priceInfo={priceMap.get(theme.name)}
                        onClick={() => onThemeClick(theme.name)}
                    />
                ))}
            </div>
        </div>
    );
}

// ========== 2. 히트맵 뷰 ==========
function HeatmapView({
    sortedThemes,
    priceMap,
    onThemeClick,
}: {
    sortedThemes: ThemeListItem[];
    priceMap: Map<string, ThemeRealtimePrice>;
    onThemeClick: (name: string) => void;
}) {
    const themesWithData = sortedThemes.filter((t) => {
        const priceInfo = priceMap.get(t.name);
        return priceInfo && priceInfo.prices.length > 0;
    });

    const rates = themesWithData.map((t) => priceMap.get(t.name)?.avgChangeRate ?? 0);
    const maxRate = Math.max(...rates, 0.01);
    const minRate = Math.min(...rates, -0.01);

    const getColor = (rate: number, hasData: boolean) => {
        if (!hasData) return 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]';

        if (rate > 0) {
            const intensity = Math.min(rate / maxRate, 1);
            if (intensity > 0.7) return 'bg-[#dc2626] text-white';
            if (intensity > 0.4) return 'bg-[#ef4444] text-white';
            if (intensity > 0.2) return 'bg-[#f87171] text-white';
            return 'bg-[#fca5a5] text-[#991b1b]';
        } else if (rate < 0) {
            const intensity = Math.min(Math.abs(rate) / Math.abs(minRate), 1);
            if (intensity > 0.7) return 'bg-[#2563eb] text-white';
            if (intensity > 0.4) return 'bg-[#3b82f6] text-white';
            if (intensity > 0.2) return 'bg-[#60a5fa] text-white';
            return 'bg-[#93c5fd] text-[#1e40af]';
        }
        return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
    };

    return (
        <div className="space-y-5">
            {/* 범례 */}
            <div className="flex items-center justify-center gap-3 text-xs bg-[var(--bg-primary)] rounded-xl p-3 border border-[var(--border-color)]">
                <span className="text-[var(--fall-color)] font-medium">하락</span>
                <div className="flex rounded-lg overflow-hidden">
                    <div className="w-6 h-5 bg-[#2563eb]"></div>
                    <div className="w-6 h-5 bg-[#3b82f6]"></div>
                    <div className="w-6 h-5 bg-[#60a5fa]"></div>
                    <div className="w-6 h-5 bg-[#93c5fd]"></div>
                    <div className="w-6 h-5 bg-[var(--bg-tertiary)]"></div>
                    <div className="w-6 h-5 bg-[#fca5a5]"></div>
                    <div className="w-6 h-5 bg-[#f87171]"></div>
                    <div className="w-6 h-5 bg-[#ef4444]"></div>
                    <div className="w-6 h-5 bg-[#dc2626]"></div>
                </div>
                <span className="text-[var(--rise-color)] font-medium">상승</span>
            </div>

            {/* 히트맵 그리드 */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {sortedThemes.map((theme) => {
                    const priceInfo = priceMap.get(theme.name);
                    const rate = priceInfo?.avgChangeRate ?? 0;
                    const hasData = !!(priceInfo && priceInfo.prices.length > 0);
                    const colorClass = getColor(rate, hasData);
                    const topStock = priceInfo?.prices[0];

                    return (
                        <div
                            key={theme.name}
                            onClick={() => onThemeClick(theme.name)}
                            className={`aspect-square p-3 rounded-2xl cursor-pointer transition-all hover:scale-105 hover:shadow-[var(--shadow-lg)] flex flex-col justify-between ${colorClass}`}
                        >
                            <div>
                                <div className="font-bold text-sm truncate">{theme.name}</div>
                                <div className="text-xs opacity-80">{theme.stockCount}종목</div>
                            </div>
                            <div>
                                {hasData ? (
                                    <>
                                        <div className="text-lg font-bold">
                                            {rate > 0 ? '+' : ''}{rate.toFixed(2)}%
                                        </div>
                                        {topStock && (
                                            <div className="text-xs opacity-80 truncate">
                                                {topStock.stockName}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-xs">데이터 없음</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ========== 메인 페이지 ==========
export default function ThemesPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

    const { data: themes, isLoading: themesLoading } = useQuery({
        queryKey: ['themes'],
        queryFn: fetchThemes,
    });

    const { priceMap, marketStatus } = useRealtimeStockPrices();

    const handleThemeClick = (themeName: string) => {
        router.push(`/themes/${encodeURIComponent(themeName)}`);
    };

    const filteredThemes =
        themes?.filter(
            (theme) =>
                theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                theme.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
        ) || [];

    const sortedThemes = [...filteredThemes].sort((a, b) => {
        const rateA = priceMap.get(a.name)?.avgChangeRate ?? 0;
        const rateB = priceMap.get(b.name)?.avgChangeRate ?? 0;
        return rateB - rateA;
    });

    return (
        <div className="flex min-h-screen bg-[var(--bg-secondary)]">
            <Sidebar />

            <main className="flex-1 lg:ml-64">
                {/* 헤더 */}
                <header className="h-16 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-primary)] sticky top-0 z-10 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-bold text-[var(--text-primary)]">국내 테마</h1>
                        <MarketStatusBadge marketStatus={marketStatus} />
                    </div>

                    <div className="flex items-center gap-4">
                        {/* 뷰 모드 전환 */}
                        <div className="flex items-center bg-[var(--bg-tertiary)] rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'dashboard'
                                        ? 'bg-[var(--bg-primary)] text-[var(--accent-blue)] shadow-[var(--shadow-sm)]'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                                title="대시보드"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('heatmap')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'heatmap'
                                        ? 'bg-[var(--bg-primary)] text-[var(--accent-blue)] shadow-[var(--shadow-sm)]'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                                title="히트맵"
                            >
                                <Grid3X3 size={18} />
                            </button>
                        </div>

                        {/* 검색 */}
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="테마 또는 키워드 검색"
                                className="w-64 pl-10 pr-4 py-2.5 text-sm bg-[var(--bg-tertiary)] border border-transparent rounded-xl focus:outline-none focus:bg-[var(--bg-primary)] focus:border-[var(--accent-blue)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all"
                            />
                        </div>
                    </div>
                </header>

                {/* 컨텐츠 */}
                <div className="p-6">
                    {themesLoading ? (
                        <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)]">
                            <RefreshCw size={24} className="animate-spin mr-3 text-[var(--accent-blue)]" />
                            테마 데이터 로딩 중...
                        </div>
                    ) : filteredThemes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-[var(--text-tertiary)]">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                                <Search size={32} className="text-[var(--text-tertiary)]" />
                            </div>
                            <p className="text-lg font-medium text-[var(--text-primary)]">
                                {searchQuery ? `"${searchQuery}"에 대한 결과가 없습니다` : '테마 데이터가 없습니다'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'dashboard' && (
                                <DashboardView
                                    sortedThemes={sortedThemes}
                                    priceMap={priceMap}
                                    onThemeClick={handleThemeClick}
                                />
                            )}
                            {viewMode === 'heatmap' && (
                                <TreemapHeatmapView
                                    sortedThemes={sortedThemes}
                                    priceMap={priceMap}
                                    onThemeClick={handleThemeClick}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
