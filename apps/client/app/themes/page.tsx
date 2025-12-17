'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Zap,
    Newspaper,
    TrendingUp,
    Search,
    X,
    RefreshCw,
    Clock,
    Wifi,
    WifiOff,
    LayoutGrid,
    Grid3X3,
    Flame,
    Snowflake,
    Sun,
    Moon,
    Sunset,
} from 'lucide-react';
import Link from 'next/link';
import { fetchThemes, fetchThemeDetail, ThemeListItem } from '@/lib/api/themes';
import { useRealtimeStockPrices, ThemeRealtimePrice, RealtimePrice, MarketStatusInfo } from '@/hooks/useRealtimeStockPrices';

type ViewMode = 'dashboard' | 'heatmap';

// 장 상태 표시 컴포넌트
function MarketStatusBadge({ marketStatus }: { marketStatus: MarketStatusInfo | null }) {
    if (!marketStatus) return null;

    const getStatusStyle = () => {
        switch (marketStatus.status) {
            case 'regular':
                return {
                    bg: 'bg-green-50',
                    text: 'text-green-600',
                    border: 'border-green-200',
                    icon: <Sun size={12} className="text-green-500" />,
                    pulse: true,
                };
            case 'pre_market':
                return {
                    bg: 'bg-amber-50',
                    text: 'text-amber-600',
                    border: 'border-amber-200',
                    icon: <Sunset size={12} className="text-amber-500" />,
                    pulse: true,
                };
            case 'post_market':
                return {
                    bg: 'bg-orange-50',
                    text: 'text-orange-600',
                    border: 'border-orange-200',
                    icon: <Sunset size={12} className="text-orange-500" />,
                    pulse: true,
                };
            case 'closed':
            default:
                return {
                    bg: 'bg-slate-100',
                    text: 'text-slate-500',
                    border: 'border-slate-200',
                    icon: <Moon size={12} className="text-slate-400" />,
                    pulse: false,
                };
        }
    };

    const style = getStatusStyle();

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
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

function Sidebar() {
    return (
        <aside className="w-56 bg-white border-r border-slate-200 hidden lg:flex flex-col fixed h-full z-20">
            <div className="h-14 flex items-center px-4 border-b border-slate-200">
                <Zap className="text-yellow-500 mr-2" size={18} fill="currentColor" />
                <span className="text-base font-bold text-slate-900 tracking-wide">StockLight</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
                <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-medium"
                >
                    <Newspaper size={16} />
                    <span>뉴스 피드</span>
                </Link>
                <Link
                    href="/themes"
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-50 text-indigo-600 border-indigo-500 transition-all text-sm font-medium"
                >
                    <TrendingUp size={16} />
                    <span>테마 현황</span>
                </Link>
            </nav>
        </aside>
    );
}

// 거래대금 포맷 함수 (억 단위)
function formatTradingValue(value: number): string {
    const billion = value / 100000000; // 억 단위
    if (billion >= 1000) {
        return `${(billion / 1000).toFixed(1)}조`;
    } else if (billion >= 1) {
        return `${billion.toFixed(0)}억`;
    } else {
        return `${(value / 10000).toFixed(0)}만`;
    }
}

// 종목 가격 표시 컴포넌트 (실시간)
function StockPriceTag({ price, rank }: { price: RealtimePrice; rank?: number }) {
    const isPositive = price.changeRate > 0;
    const isNegative = price.changeRate < 0;

    return (
        <div
            className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                isPositive
                    ? 'bg-red-50 border-red-200'
                    : isNegative
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
            }`}
        >
            <div className="flex items-center gap-2">
                {rank !== undefined && (
                    <span className={`text-xs font-bold w-5 ${
                        rank === 1 ? 'text-amber-500' : 'text-slate-400'
                    }`}>
                        {rank}
                    </span>
                )}
                <span className="text-sm font-medium text-slate-700">{price.stockName}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                    {formatTradingValue(price.tradingValue)}
                </span>
                <span className="text-sm font-mono text-slate-600">
                    {price.currentPrice.toLocaleString()}
                </span>
                <span
                    className={`text-xs font-bold min-w-[52px] text-right ${
                        isPositive ? 'text-red-500' : isNegative ? 'text-blue-500' : 'text-slate-500'
                    }`}
                >
                    {isPositive ? '+' : ''}
                    {price.changeRate.toFixed(2)}%
                </span>
            </div>
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
    // TOP 5 급등/급락 (실제 데이터가 있는 테마만 필터링)
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 급등 TOP 5 */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Flame size={18} className="text-red-500" />
                        <h3 className="font-bold text-slate-900">급등 테마 TOP 5</h3>
                    </div>
                    <div className="space-y-2">
                        {top5Gainers.length === 0 ? (
                            <div className="text-sm text-slate-400 py-4 text-center">상승 테마가 없습니다</div>
                        ) : (
                            top5Gainers.map((theme, i) => {
                                const rate = priceMap.get(theme.name)?.avgChangeRate ?? 0;
                                const prices = priceMap.get(theme.name)?.prices || [];
                                const topStock = [...prices].sort((a, b) => b.changeRate - a.changeRate)[0];
                                return (
                                    <div
                                        key={theme.name}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                        onClick={() => onThemeClick(theme.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-red-500 w-6">{i + 1}</span>
                                            <div>
                                                <span className="font-medium text-slate-900">{theme.name}</span>
                                                {topStock && (
                                                    <span className="text-xs text-slate-500 ml-2">
                                                        {topStock.stockName} +{topStock.changeRate.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-bold text-red-500">+{rate.toFixed(2)}%</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 급락 TOP 5 */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Snowflake size={18} className="text-blue-500" />
                        <h3 className="font-bold text-slate-900">급락 테마 TOP 5</h3>
                    </div>
                    <div className="space-y-2">
                        {top5Losers.length === 0 ? (
                            <div className="text-sm text-slate-400 py-4 text-center">하락 테마가 없습니다</div>
                        ) : (
                            top5Losers.map((theme, i) => {
                                const rate = priceMap.get(theme.name)?.avgChangeRate ?? 0;
                                const prices = priceMap.get(theme.name)?.prices || [];
                                const worstStock = [...prices].sort((a, b) => a.changeRate - b.changeRate)[0];
                                return (
                                    <div
                                        key={theme.name}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                        onClick={() => onThemeClick(theme.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-blue-500 w-6">{i + 1}</span>
                                            <div>
                                                <span className="font-medium text-slate-900">{theme.name}</span>
                                                {worstStock && (
                                                    <span className="text-xs text-slate-500 ml-2">
                                                        {worstStock.stockName} {worstStock.changeRate.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-bold text-blue-500">{rate.toFixed(2)}%</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* 미니 카드 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sortedThemes.map((theme) => {
                    const priceInfo = priceMap.get(theme.name);
                    const rate = priceInfo?.avgChangeRate ?? 0;
                    const hasData = priceInfo && priceInfo.prices.length > 0;
                    const isPositive = rate > 0;
                    const isNegative = rate < 0;
                    return (
                        <div
                            key={theme.name}
                            onClick={() => onThemeClick(theme.name)}
                            className="p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md bg-white border-slate-200 hover:border-slate-300"
                        >
                            <div className="text-sm font-bold text-slate-900 mb-1 truncate">{theme.name}</div>
                            {hasData ? (
                                <div
                                    className={`text-lg font-bold ${
                                        isPositive ? 'text-red-500' : isNegative ? 'text-blue-500' : 'text-slate-400'
                                    }`}
                                >
                                    {isPositive ? '+' : ''}{rate.toFixed(2)}%
                                </div>
                            ) : (
                                <div className="text-sm text-slate-300">데이터 없음</div>
                            )}
                            <div className="text-xs text-slate-500 mt-1">{theme.stockCount}종목</div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}

// 테마 상세 모달
function ThemeDetailModal({
    theme,
    priceInfo,
    onClose,
}: {
    theme: ThemeListItem;
    priceInfo?: ThemeRealtimePrice;
    onClose: () => void;
}) {
    const { data: detail, isLoading } = useQuery({
        queryKey: ['themeDetail', theme.name],
        queryFn: () => fetchThemeDetail(theme.name),
    });

    const avgRate = priceInfo?.avgChangeRate ?? 0;
    const isPositive = avgRate > 0;
    const isNegative = avgRate < 0;

    // 종목은 이미 서버에서 거래대금 기준으로 정렬됨
    const sortedPrices = priceInfo?.prices || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
                {/* 헤더 */}
                <div className={`px-6 py-4 border-b ${
                    isPositive ? 'bg-red-50 border-red-100' : isNegative ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900">{theme.name}</h2>
                            {priceInfo && priceInfo.prices.length > 0 && (
                                <span className="text-xs text-green-500 animate-pulse flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    LIVE
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-white/50 text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* 평균 등락률 */}
                    {priceInfo && priceInfo.prices.length > 0 && (
                        <div className="mt-2">
                            <span className={`text-3xl font-bold ${
                                isPositive ? 'text-red-500' : isNegative ? 'text-blue-500' : 'text-slate-500'
                            }`}>
                                {isPositive ? '+' : ''}{avgRate.toFixed(2)}%
                            </span>
                            <span className="text-sm text-slate-500 ml-2">평균 등락률</span>
                        </div>
                    )}
                </div>

                {/* 바디 */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <RefreshCw size={20} className="animate-spin mr-2" />
                            로딩 중...
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* 실시간 시세 (거래대금 순) */}
                            {sortedPrices.length > 0 && (
                                <div>
                                    <div className="text-sm font-semibold text-slate-700 mb-3">
                                        실시간 시세 <span className="text-slate-400 font-normal">(거래대금 순)</span>
                                    </div>
                                    <div className="space-y-2">
                                        {sortedPrices.map((price, i) => (
                                            <StockPriceTag key={i} price={price} rank={i + 1} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 관련 종목 */}
                            {detail && (
                                <div>
                                    <div className="text-sm font-semibold text-slate-700 mb-3">
                                        관련 종목 <span className="text-slate-400 font-normal">({detail.stocks.length}개)</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {detail.stocks.map((stock, i) => (
                                            <span
                                                key={i}
                                                className="text-sm px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                            >
                                                {stock}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 키워드 */}
                            <div>
                                <div className="text-sm font-semibold text-slate-700 mb-3">키워드</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {theme.keywords.map((keyword, i) => (
                                        <span
                                            key={i}
                                            className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100"
                                        >
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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
    // 실제 데이터가 있는 테마만 필터링
    const themesWithData = sortedThemes.filter((t) => {
        const priceInfo = priceMap.get(t.name);
        return priceInfo && priceInfo.prices.length > 0;
    });

    // 등락률 범위 계산
    const rates = themesWithData.map((t) => priceMap.get(t.name)?.avgChangeRate ?? 0);
    const maxRate = Math.max(...rates, 0.01);
    const minRate = Math.min(...rates, -0.01);

    const getColor = (rate: number, hasData: boolean) => {
        if (!hasData) return 'bg-slate-100 text-slate-400';

        if (rate > 0) {
            // 빨간색 계열 (상승)
            const intensity = Math.min(rate / maxRate, 1);
            if (intensity > 0.7) return 'bg-red-600 text-white';
            if (intensity > 0.4) return 'bg-red-500 text-white';
            if (intensity > 0.2) return 'bg-red-400 text-white';
            return 'bg-red-300 text-red-900';
        } else if (rate < 0) {
            // 파란색 계열 (하락)
            const intensity = Math.min(Math.abs(rate) / Math.abs(minRate), 1);
            if (intensity > 0.7) return 'bg-blue-600 text-white';
            if (intensity > 0.4) return 'bg-blue-500 text-white';
            if (intensity > 0.2) return 'bg-blue-400 text-white';
            return 'bg-blue-300 text-blue-900';
        }
        return 'bg-slate-200 text-slate-700';
    };

    return (
        <div className="space-y-4">
            {/* 범례 */}
            <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-blue-600">하락</span>
                <div className="flex">
                    <div className="w-6 h-4 bg-blue-600"></div>
                    <div className="w-6 h-4 bg-blue-500"></div>
                    <div className="w-6 h-4 bg-blue-400"></div>
                    <div className="w-6 h-4 bg-blue-300"></div>
                    <div className="w-6 h-4 bg-slate-200"></div>
                    <div className="w-6 h-4 bg-red-300"></div>
                    <div className="w-6 h-4 bg-red-400"></div>
                    <div className="w-6 h-4 bg-red-500"></div>
                    <div className="w-6 h-4 bg-red-600"></div>
                </div>
                <span className="text-red-600">상승</span>
            </div>

            {/* 히트맵 그리드 */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
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
                            className={`aspect-square p-2 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-lg flex flex-col justify-between ${colorClass}`}
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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

    // 테마 목록 조회
    const { data: themes, isLoading: themesLoading } = useQuery({
        queryKey: ['themes'],
        queryFn: fetchThemes,
    });

    // 실시간 주가 구독
    const { priceMap, isConnected, lastUpdate, marketStatus } = useRealtimeStockPrices();

    const openThemeModal = (themeName: string) => {
        setSelectedTheme(themeName);
    };

    const closeThemeModal = () => {
        setSelectedTheme(null);
    };

    // 검색 필터링
    const filteredThemes =
        themes?.filter(
            (theme) =>
                theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                theme.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
        ) || [];

    // 등락률 기준 정렬 (상승률 높은 순)
    const sortedThemes = [...filteredThemes].sort((a, b) => {
        const rateA = priceMap.get(a.name)?.avgChangeRate ?? 0;
        const rateB = priceMap.get(b.name)?.avgChangeRate ?? 0;
        return rateB - rateA;
    });

    // 마지막 업데이트 시간 포맷
    const formatUpdateTime = () => {
        if (!lastUpdate) return '';
        return `${lastUpdate.getHours().toString().padStart(2, '0')}:${lastUpdate.getMinutes().toString().padStart(2, '0')}:${lastUpdate.getSeconds().toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-700 font-sans">
            <Sidebar />

            <main className="flex-1 lg:ml-56">
                {/* 헤더 */}
                <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h1 className="text-base font-semibold text-slate-900">테마별 종목 현황</h1>
                        <span className="text-sm text-slate-500">총 {themes?.length || 0}개 테마</span>

                        {/* 장 상태 표시 */}
                        <MarketStatusBadge marketStatus={marketStatus} />

                        {/* 실시간 연결 상태 */}
                        {isConnected ? (
                            <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <Wifi size={12} />
                                실시간
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                <WifiOff size={12} />
                                연결 끊김
                            </span>
                        )}

                        {lastUpdate && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock size={12} />
                                {formatUpdateTime()}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* 뷰 모드 전환 */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('dashboard')}
                                className={`p-1.5 rounded-md transition-colors ${
                                    viewMode === 'dashboard'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                                title="대시보드"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('heatmap')}
                                className={`p-1.5 rounded-md transition-colors ${
                                    viewMode === 'heatmap'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                                title="히트맵"
                            >
                                <Grid3X3 size={18} />
                            </button>
                        </div>

                        {/* 검색 */}
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="테마 또는 키워드 검색"
                                className="w-64 pl-9 pr-4 py-2 text-sm bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-slate-300 transition-colors"
                            />
                        </div>
                    </div>
                </header>

                {/* 컨텐츠 */}
                <div className="p-6">
                    {themesLoading ? (
                        <div className="flex items-center justify-center h-64 text-slate-500">
                            <RefreshCw size={24} className="animate-spin mr-3" />
                            테마 데이터 로딩 중...
                        </div>
                    ) : filteredThemes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Search size={48} className="mb-4 text-slate-300" />
                            <p className="text-lg">
                                {searchQuery ? `"${searchQuery}"에 대한 결과가 없습니다` : '테마 데이터가 없습니다'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'dashboard' && (
                                <DashboardView
                                    sortedThemes={sortedThemes}
                                    priceMap={priceMap}
                                    onThemeClick={openThemeModal}
                                />
                            )}
                            {viewMode === 'heatmap' && (
                                <HeatmapView
                                    sortedThemes={sortedThemes}
                                    priceMap={priceMap}
                                    onThemeClick={openThemeModal}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* 테마 상세 모달 */}
            {selectedTheme && (() => {
                const theme = themes?.find((t) => t.name === selectedTheme);
                if (!theme) return null;
                return (
                    <ThemeDetailModal
                        theme={theme}
                        priceInfo={priceMap.get(selectedTheme)}
                        onClose={closeThemeModal}
                    />
                );
            })()}
        </div>
    );
}
