'use client';

import { useState, useMemo } from 'react';
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
    Filter,
    X,
} from 'lucide-react';
import { fetchThemes, ThemeListItem, CachedStockPrice } from '@/lib/api/themes';
import { useRealtimeStockPrices, ThemeRealtimePrice, MarketStatusInfo } from '@/hooks/useRealtimeStockPrices';
import TreemapHeatmapView from '@/components/themes/TreemapHeatmapView';
import Sidebar from '@/components/layout/Sidebar';

import { TrendingUp, TrendingDown, DollarSign, Crown } from 'lucide-react';

type ViewMode = 'dashboard' | 'heatmap';

// 테마 카테고리 정의
const THEME_CATEGORIES: Record<string, { label: string; keywords: string[] }> = {
    all: { label: '전체', keywords: [] },
    tech: { label: '기술', keywords: ['반도체', 'AI', '클라우드', '소프트웨어', '데이터센터', '사이버보안', 'IT', '5G', '6G', '메타버스', '블록체인', 'NFT', '빅데이터'] },
    battery: { label: '2차전지', keywords: ['2차전지', '배터리', '리튬', '전고체', '양극재', '음극재', '전해액', '분리막', '폐배터리'] },
    bio: { label: '바이오', keywords: ['바이오', '제약', '신약', '의료', '헬스케어', '셀트리온', '삼바', 'mRNA', '줄기세포', '치매', '비만치료제'] },
    auto: { label: '자동차', keywords: ['자동차', '전기차', '수소차', '자율주행', '모빌리티', '타이어'] },
    energy: { label: '에너지', keywords: ['원전', '신재생', '태양광', '풍력', '수소', '전력기기', 'SMR', '에너지저장', 'ESS'] },
    defense: { label: '방산', keywords: ['방산', '항공', '우주', 'K-방산', '드론', 'UAM'] },
    shipbuild: { label: '조선/해운', keywords: ['조선', '해운', 'LNG', '친환경선박'] },
    finance: { label: '금융', keywords: ['금융', '은행', '증권', '보험', '핀테크'] },
    consumer: { label: '소비재', keywords: ['화장품', '음식료', '패션', '면세점', '여행', '항공', '호텔', '카지노', '엔터', '게임', 'K-뷰티', 'K-푸드'] },
    materials: { label: '소재', keywords: ['철강', '화학', '정유', '비철금속', '희토류'] },
    infra: { label: '인프라', keywords: ['건설', '건자재', '시멘트', '통신', '유틸리티', '가스'] },
    robot: { label: '로봇', keywords: ['로봇', '자동화', '스마트팩토리', '협동로봇'] },
};

// 테마가 어떤 카테고리에 속하는지 판단
function getThemeCategory(themeName: string, keywords: string[]): string {
    const allText = [themeName, ...keywords].join(' ').toLowerCase();

    for (const [category, { keywords: categoryKeywords }] of Object.entries(THEME_CATEGORIES)) {
        if (category === 'all') continue;
        for (const keyword of categoryKeywords) {
            if (allText.includes(keyword.toLowerCase())) {
                return category;
            }
        }
    }
    return 'other';
}

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

// 통합 테마 데이터 (실시간 + 캐시)
interface MergedThemeData {
    name: string;
    stockCount: number;
    keywords: string[];
    avgChangeRate: number;
    prices: Array<{
        stockName: string;
        changeRate: number;
        tradingValue: number;
        currentPrice: number;
    }>;
    hasRealtimeData: boolean;
    category: string;
}

// 플립 카드 컴포넌트
function ThemeFlipCard({
    theme,
    onClick,
}: {
    theme: MergedThemeData;
    onClick: () => void;
}) {
    const rate = theme.avgChangeRate;
    const hasData = theme.prices.length > 0;
    const isPositive = rate > 0;
    const isNegative = rate < 0;
    const prices = theme.prices;

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
                            <div className="flex items-center gap-1.5">
                                <div className="text-sm font-bold text-[var(--text-primary)] truncate flex-1">{theme.name}</div>
                                {theme.hasRealtimeData && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" title="실시간" />
                                )}
                            </div>
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
                            <div className="text-sm text-[var(--text-tertiary)]">데이터 로딩 중...</div>
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
                            데이터 로딩 중...
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

// 카테고리 필터 탭
function CategoryTabs({
    selectedCategory,
    onCategoryChange,
    themeCounts,
}: {
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
    themeCounts: Record<string, number>;
}) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {Object.entries(THEME_CATEGORIES).map(([key, { label }]) => {
                const count = themeCounts[key] || 0;
                const isSelected = selectedCategory === key;

                if (key !== 'all' && count === 0) return null;

                return (
                    <button
                        key={key}
                        onClick={() => onCategoryChange(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                            ${isSelected
                                ? 'bg-[var(--accent-blue)] text-white shadow-md'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {label}
                        <span className={`${isSelected ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>
                            {count}
                        </span>
                    </button>
                );
            })}
            {(themeCounts['other'] || 0) > 0 && (
                <button
                    onClick={() => onCategoryChange('other')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
                        ${selectedCategory === 'other'
                            ? 'bg-[var(--accent-blue)] text-white shadow-md'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    기타
                    <span className={`${selectedCategory === 'other' ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>
                        {themeCounts['other']}
                    </span>
                </button>
            )}
        </div>
    );
}

// ========== 1. 대시보드 뷰 ==========
function DashboardView({
    themes,
    onThemeClick,
}: {
    themes: MergedThemeData[];
    onThemeClick: (name: string) => void;
}) {
    const themesWithData = themes.filter((t) => t.prices.length > 0);

    const top5Gainers = themesWithData
        .filter((t) => t.avgChangeRate > 0)
        .sort((a, b) => b.avgChangeRate - a.avgChangeRate)
        .slice(0, 5);

    const top5Losers = themesWithData
        .filter((t) => t.avgChangeRate < 0)
        .sort((a, b) => a.avgChangeRate - b.avgChangeRate)
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
                                const topStock = [...theme.prices].sort((a, b) => b.changeRate - a.changeRate)[0];
                                return (
                                    <div
                                        key={theme.name}
                                        className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-[var(--rise-bg)] transition-colors cursor-pointer"
                                        onClick={() => onThemeClick(theme.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-[var(--rise-color)] w-6">{i + 1}</span>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium text-[var(--text-primary)]">{theme.name}</span>
                                                    {theme.hasRealtimeData && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    )}
                                                </div>
                                                {topStock && (
                                                    <span className="text-xs text-[var(--text-tertiary)]">
                                                        {topStock.stockName} +{topStock.changeRate.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-bold text-[var(--rise-color)]">+{theme.avgChangeRate.toFixed(2)}%</span>
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
                                const worstStock = [...theme.prices].sort((a, b) => a.changeRate - b.changeRate)[0];
                                return (
                                    <div
                                        key={theme.name}
                                        className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-[var(--fall-bg)] transition-colors cursor-pointer"
                                        onClick={() => onThemeClick(theme.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-[var(--fall-color)] w-6">{i + 1}</span>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium text-[var(--text-primary)]">{theme.name}</span>
                                                    {theme.hasRealtimeData && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    )}
                                                </div>
                                                {worstStock && (
                                                    <span className="text-xs text-[var(--text-tertiary)]">
                                                        {worstStock.stockName} {worstStock.changeRate.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-bold text-[var(--fall-color)]">{theme.avgChangeRate.toFixed(2)}%</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* 플립 카드 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {themes.map((theme) => (
                    <ThemeFlipCard
                        key={theme.name}
                        theme={theme}
                        onClick={() => onThemeClick(theme.name)}
                    />
                ))}
            </div>
        </div>
    );
}

// ========== 메인 페이지 ==========
export default function ThemesPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const { data: themes, isLoading: themesLoading } = useQuery({
        queryKey: ['themes'],
        queryFn: fetchThemes,
        refetchInterval: 5 * 60 * 1000, // 5분마다 새로고침
    });

    const { priceMap: realtimePriceMap, marketStatus } = useRealtimeStockPrices();

    const handleThemeClick = (themeName: string) => {
        router.push(`/themes/${encodeURIComponent(themeName)}`);
    };

    // 실시간 + 캐시 데이터 병합
    const mergedThemes: MergedThemeData[] = useMemo(() => {
        if (!themes) return [];

        return themes.map((theme) => {
            const realtimeData = realtimePriceMap.get(theme.name);
            const hasRealtimeData = !!(realtimeData && realtimeData.prices.length > 0);

            // 실시간 데이터가 있으면 실시간 사용, 없으면 캐시 사용
            let avgChangeRate = 0;
            let prices: MergedThemeData['prices'] = [];

            if (hasRealtimeData && realtimeData) {
                avgChangeRate = realtimeData.avgChangeRate;
                prices = realtimeData.prices.map((p) => ({
                    stockName: p.stockName,
                    changeRate: p.changeRate,
                    tradingValue: p.tradingValue,
                    currentPrice: p.currentPrice,
                }));
            } else if (theme.avgChangeRate !== null && theme.topStocks.length > 0) {
                avgChangeRate = theme.avgChangeRate;
                prices = theme.topStocks.map((s) => ({
                    stockName: s.stockName,
                    changeRate: s.changeRate,
                    tradingValue: s.tradingValue,
                    currentPrice: s.currentPrice,
                }));
            }

            const category = getThemeCategory(theme.name, theme.keywords);

            return {
                name: theme.name,
                stockCount: theme.stockCount,
                keywords: theme.keywords,
                avgChangeRate,
                prices,
                hasRealtimeData,
                category,
            };
        });
    }, [themes, realtimePriceMap]);

    // 카테고리별 테마 수 계산
    const themeCounts = useMemo(() => {
        const counts: Record<string, number> = { all: mergedThemes.length };
        for (const theme of mergedThemes) {
            counts[theme.category] = (counts[theme.category] || 0) + 1;
        }
        return counts;
    }, [mergedThemes]);

    // 필터링 및 정렬
    const filteredThemes = useMemo(() => {
        let result = mergedThemes;

        // 카테고리 필터
        if (selectedCategory !== 'all') {
            result = result.filter((t) => t.category === selectedCategory);
        }

        // 검색 필터
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (theme) =>
                    theme.name.toLowerCase().includes(query) ||
                    theme.keywords.some((k) => k.toLowerCase().includes(query))
            );
        }

        // 등락률 기준 정렬
        return result.sort((a, b) => b.avgChangeRate - a.avgChangeRate);
    }, [mergedThemes, selectedCategory, searchQuery]);

    // 히트맵용 priceMap 생성 (실시간 + 캐시 병합)
    const mergedPriceMap = useMemo(() => {
        const map = new Map<string, ThemeRealtimePrice>();
        for (const theme of mergedThemes) {
            map.set(theme.name, {
                themeName: theme.name,
                avgChangeRate: theme.avgChangeRate,
                prices: theme.prices.map((p) => ({
                    stockCode: '',
                    stockName: p.stockName,
                    currentPrice: p.currentPrice,
                    changePrice: 0,
                    changeRate: p.changeRate,
                    volume: 0,
                    tradingValue: p.tradingValue,
                    tradeTime: '',
                })),
                updatedAt: new Date().toISOString(),
            });
        }
        return map;
    }, [mergedThemes]);

    return (
        <div className="flex min-h-screen bg-[var(--bg-secondary)]">
            <Sidebar />

            <main className="flex-1 lg:ml-64">
                {/* 헤더 */}
                <header className="h-16 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-primary)] sticky top-0 z-10 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-bold text-[var(--text-primary)]">국내 테마</h1>
                        <MarketStatusBadge marketStatus={marketStatus} />
                        {mergedThemes.length > 0 && (
                            <span className="text-xs text-[var(--text-tertiary)]">
                                총 {mergedThemes.length}개
                            </span>
                        )}
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
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* 카테고리 필터 */}
                <div className="px-6 py-3 bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                    <CategoryTabs
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        themeCounts={themeCounts}
                    />
                </div>

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
                            {selectedCategory !== 'all' && (
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className="mt-3 text-sm text-[var(--accent-blue)] hover:underline"
                                >
                                    전체 테마 보기
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {viewMode === 'dashboard' && (
                                <DashboardView
                                    themes={filteredThemes}
                                    onThemeClick={handleThemeClick}
                                />
                            )}
                            {viewMode === 'heatmap' && (
                                <TreemapHeatmapView
                                    sortedThemes={filteredThemes.map(t => ({
                                        name: t.name,
                                        stockCount: t.stockCount,
                                        keywords: t.keywords,
                                        avgChangeRate: t.avgChangeRate,
                                        topStocks: [],
                                        priceUpdatedAt: null,
                                    }))}
                                    priceMap={mergedPriceMap}
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
