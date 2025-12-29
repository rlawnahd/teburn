'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    X,
    RefreshCw,
    LayoutGrid,
    Grid3X3,
    Flame,
    Snowflake,
    Sun,
    Moon,
    Sunset,
    BarChart3,
    Globe,
    Flag,
} from 'lucide-react';
import { fetchThemes, fetchThemeDetail, ThemeListItem, fetchThemeHistory } from '@/lib/api/themes';
import { fetchOverseasThemes, fetchOverseasThemePrices } from '@/lib/api/overseasThemes';
import { useRealtimeStockPrices, ThemeRealtimePrice, RealtimePrice, MarketStatusInfo } from '@/hooks/useRealtimeStockPrices';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import TreemapHeatmapView from '@/components/themes/TreemapHeatmapView';
import Sidebar from '@/components/layout/Sidebar';

type ViewMode = 'dashboard' | 'heatmap';
type MarketTab = 'domestic' | 'overseas';

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

// 거래대금 포맷 함수 (억 단위)
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

// 종목 가격 표시 컴포넌트 (실시간)
function StockPriceTag({ price, rank }: { price: RealtimePrice; rank?: number }) {
    const isPositive = price.changeRate > 0;
    const isNegative = price.changeRate < 0;

    return (
        <div
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                isPositive
                    ? 'bg-[var(--rise-bg)] border-[var(--rise-color)]/20'
                    : isNegative
                      ? 'bg-[var(--fall-bg)] border-[var(--fall-color)]/20'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'
            }`}
        >
            <div className="flex items-center gap-3">
                {rank !== undefined && (
                    <span className={`text-xs font-bold w-5 ${
                        rank === 1 ? 'text-[var(--warning-color)]' : 'text-[var(--text-tertiary)]'
                    }`}>
                        {rank}
                    </span>
                )}
                <span className="text-sm font-medium text-[var(--text-primary)]">{price.stockName}</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-xs text-[var(--text-tertiary)]">
                    {formatTradingValue(price.tradingValue)}
                </span>
                <span className="text-sm font-mono text-[var(--text-secondary)]">
                    {price.currentPrice.toLocaleString()}
                </span>
                <span
                    className={`text-xs font-bold min-w-[52px] text-right ${
                        isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
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

            {/* 미니 카드 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                            className="p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-[var(--shadow-md)] hover:scale-[1.02] bg-[var(--bg-primary)] border-[var(--border-color)]"
                        >
                            <div className="text-sm font-bold text-[var(--text-primary)] mb-1 truncate">{theme.name}</div>
                            {hasData ? (
                                <div
                                    className={`text-xl font-bold ${
                                        isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                                    }`}
                                >
                                    {isPositive ? '+' : ''}{rate.toFixed(2)}%
                                </div>
                            ) : (
                                <div className="text-sm text-[var(--text-tertiary)]">데이터 없음</div>
                            )}
                            <div className="text-xs text-[var(--text-tertiary)] mt-1">{theme.stockCount}종목</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// 등락률 추이 차트 컴포넌트
function ThemeHistoryChart({ themeName }: { themeName: string }) {
    const [period, setPeriod] = useState<'today' | '1d' | '7d' | '30d'>('today');

    const { data: history, isLoading } = useQuery({
        queryKey: ['themeHistory', themeName, period],
        queryFn: () => fetchThemeHistory(themeName, period),
        refetchInterval: period === 'today' ? 10000 : false,
    });

    const periodLabels = {
        today: '오늘',
        '1d': '1일',
        '7d': '7일',
        '30d': '30일',
    };

    const chartData = (history || []).map((item) => {
        const date = new Date(item.timestamp);
        let label: string;
        if (period === 'today' || period === '1d') {
            label = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        } else {
            label = `${date.getMonth() + 1}/${date.getDate()}`;
        }
        return {
            time: label,
            rate: item.avgChangeRate,
            topStock: item.topStock,
            topStockRate: item.topStockRate,
        };
    });

    const rates = chartData.map((d) => d.rate);
    const maxRate = Math.max(...rates, 1);
    const minRate = Math.min(...rates, -1);
    const absMax = Math.max(Math.abs(maxRate), Math.abs(minRate));
    const yDomain = [-Math.ceil(absMax), Math.ceil(absMax)];

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <BarChart3 size={16} className="text-[var(--accent-blue)]" />
                    등락률 추이
                </div>
                <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-xl">
                    {(Object.keys(periodLabels) as Array<keyof typeof periodLabels>).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                period === p
                                    ? 'bg-[var(--bg-primary)] text-[var(--accent-blue)] font-medium shadow-[var(--shadow-sm)]'
                                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                            {periodLabels[p]}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="h-40 flex items-center justify-center text-[var(--text-tertiary)]">
                    <RefreshCw size={16} className="animate-spin mr-2 text-[var(--accent-blue)]" />
                    차트 로딩 중...
                </div>
            ) : chartData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
                    해당 기간에 데이터가 없습니다
                </div>
            ) : (
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                                axisLine={{ stroke: 'var(--border-color)' }}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                domain={yDomain}
                                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${v}%`}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload || !payload[0]) return null;
                                    const data = payload[0].payload;
                                    const rate = data.rate;
                                    const isUp = rate > 0;
                                    return (
                                        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] p-3 text-xs">
                                            <div className="text-[var(--text-tertiary)] mb-1">{data.time}</div>
                                            <div className={`font-bold ${isUp ? 'text-[var(--rise-color)]' : rate < 0 ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'}`}>
                                                {isUp ? '+' : ''}{rate.toFixed(2)}%
                                            </div>
                                            {data.topStock && (
                                                <div className="text-[var(--text-tertiary)] mt-1">
                                                    대장주: {data.topStock} ({data.topStockRate > 0 ? '+' : ''}{data.topStockRate.toFixed(1)}%)
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                            <ReferenceLine y={0} stroke="var(--border-color)" strokeDasharray="3 3" />
                            <Line
                                type="monotone"
                                dataKey="rate"
                                stroke="var(--accent-blue)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: 'var(--accent-blue)' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
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
    const sortedPrices = priceInfo?.prices || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-[var(--bg-primary)] rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-lg max-h-[80vh] overflow-hidden">
                {/* 헤더 */}
                <div className={`px-6 py-5 border-b border-[var(--border-color)] ${
                    isPositive ? 'bg-[var(--rise-bg)]' : isNegative ? 'bg-[var(--fall-bg)]' : 'bg-[var(--bg-tertiary)]'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">{theme.name}</h2>
                            {priceInfo && priceInfo.prices.length > 0 && (
                                <span className="text-xs text-[var(--success-color)] animate-pulse flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-color)]"></span>
                                    LIVE
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-primary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {priceInfo && priceInfo.prices.length > 0 && (
                        <div className="mt-3">
                            <span className={`text-3xl font-bold ${
                                isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                            }`}>
                                {isPositive ? '+' : ''}{avgRate.toFixed(2)}%
                            </span>
                            <span className="text-sm text-[var(--text-secondary)] ml-2">평균 등락률</span>
                        </div>
                    )}
                </div>

                {/* 바디 */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-[var(--text-tertiary)]">
                            <RefreshCw size={20} className="animate-spin mr-2 text-[var(--accent-blue)]" />
                            로딩 중...
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <ThemeHistoryChart themeName={theme.name} />

                            {sortedPrices.length > 0 && (
                                <div>
                                    <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                                        실시간 시세 <span className="text-[var(--text-tertiary)] font-normal">(거래대금 순)</span>
                                    </div>
                                    <div className="space-y-2">
                                        {sortedPrices.map((price, i) => (
                                            <StockPriceTag key={i} price={price} rank={i + 1} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {detail && (
                                <div>
                                    <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                                        관련 종목 <span className="text-[var(--text-tertiary)] font-normal">({detail.stocks.length}개)</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {detail.stocks.map((stock, i) => (
                                            <span
                                                key={i}
                                                className="text-sm px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors"
                                            >
                                                {stock}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">키워드</div>
                                <div className="flex flex-wrap gap-2">
                                    {theme.keywords.map((keyword, i) => (
                                        <span
                                            key={i}
                                            className="text-xs px-3 py-1.5 rounded-full bg-[var(--accent-blue-light)] text-[var(--accent-blue)] font-medium"
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

// ========== 해외 테마 뷰 ==========
function OverseasThemeView({
    searchQuery,
    onThemeClick,
}: {
    searchQuery: string;
    onThemeClick: (themeName: string) => void;
}) {
    const { data: themes, isLoading } = useQuery({
        queryKey: ['overseasThemes'],
        queryFn: fetchOverseasThemes,
    });

    const filteredThemes = themes?.filter(
        (theme) =>
            theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            theme.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)]">
                <RefreshCw size={24} className="animate-spin mr-3 text-[var(--accent-blue)]" />
                해외 테마 로딩 중...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 안내 문구 */}
            <div className="bg-[var(--warning-bg)] border border-[var(--warning-color)]/30 rounded-xl p-4 text-sm text-[var(--warning-color)]">
                <Globe size={16} className="inline mr-2" />
                해외 주식은 미국 시간 기준으로 장 마감 후 데이터가 표시됩니다. 테마를 클릭하면 실시간 시세를 조회합니다.
            </div>

            {/* 테마 카드 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredThemes.map((theme) => (
                    <div
                        key={theme.name}
                        onClick={() => onThemeClick(theme.name)}
                        className="p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-[var(--shadow-md)] hover:scale-[1.02] bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[var(--accent-blue)]/50"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Globe size={14} className="text-[var(--accent-blue)]" />
                            <span className="text-sm font-bold text-[var(--text-primary)] truncate">{theme.name}</span>
                        </div>
                        <div className="text-sm text-[var(--text-tertiary)]">클릭하여 조회</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">{theme.stockCount}종목</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {theme.keywords.slice(0, 2).map((kw, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] rounded-lg">
                                    {kw}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// 해외 테마 상세 모달
function OverseasThemeDetailModal({
    themeName,
    onClose,
}: {
    themeName: string;
    onClose: () => void;
}) {
    const { data: priceInfo, isLoading } = useQuery({
        queryKey: ['overseasThemePrices', themeName],
        queryFn: () => fetchOverseasThemePrices(themeName),
    });

    const avgRate = priceInfo?.avgChangeRate ?? 0;
    const isPositive = avgRate > 0;
    const isNegative = avgRate < 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[var(--bg-primary)] rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-lg max-h-[80vh] overflow-hidden">
                {/* 헤더 */}
                <div className={`px-6 py-5 border-b border-[var(--border-color)] ${
                    isPositive ? 'bg-[var(--rise-bg)]' : isNegative ? 'bg-[var(--fall-bg)]' : 'bg-[var(--bg-tertiary)]'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Globe size={20} className="text-[var(--accent-blue)]" />
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">{themeName}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-primary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    {priceInfo && (
                        <div className="mt-3">
                            <span className={`text-3xl font-bold ${
                                isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                            }`}>
                                {isPositive ? '+' : ''}{avgRate.toFixed(2)}%
                            </span>
                            <span className="text-sm text-[var(--text-secondary)] ml-2">평균 등락률</span>
                        </div>
                    )}
                </div>

                {/* 바디 */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-[var(--text-tertiary)]">
                            <RefreshCw size={20} className="animate-spin mr-2 text-[var(--accent-blue)]" />
                            시세 조회 중...
                        </div>
                    ) : priceInfo ? (
                        <div className="space-y-3">
                            {priceInfo.prices.map((price, i) => {
                                const isUp = price.changeRate > 0;
                                const isDown = price.changeRate < 0;
                                return (
                                    <div
                                        key={price.symbol}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                                            isUp ? 'bg-[var(--rise-bg)] border-[var(--rise-color)]/20' : isDown ? 'bg-[var(--fall-bg)] border-[var(--fall-color)]/20' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-bold w-5 ${i === 0 ? 'text-[var(--warning-color)]' : 'text-[var(--text-tertiary)]'}`}>
                                                {i + 1}
                                            </span>
                                            <div>
                                                <div className="font-medium text-[var(--text-primary)]">{price.symbol}</div>
                                                <div className="text-xs text-[var(--text-tertiary)]">{price.korName}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-[var(--text-secondary)]">${price.currentPrice.toFixed(2)}</div>
                                            <div className={`text-sm font-bold ${
                                                isUp ? 'text-[var(--rise-color)]' : isDown ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                                            }`}>
                                                {isUp ? '+' : ''}{price.changeRate.toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-[var(--text-tertiary)] py-8">데이터를 불러올 수 없습니다</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ========== 메인 페이지 ==========
export default function ThemesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
    const [selectedOverseasTheme, setSelectedOverseasTheme] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [marketTab, setMarketTab] = useState<MarketTab>('domestic');

    const { data: themes, isLoading: themesLoading } = useQuery({
        queryKey: ['themes'],
        queryFn: fetchThemes,
    });

    const { priceMap, marketStatus } = useRealtimeStockPrices();

    const openThemeModal = (themeName: string) => {
        setSelectedTheme(themeName);
    };

    const closeThemeModal = () => {
        setSelectedTheme(null);
    };

    const openOverseasThemeModal = (themeName: string) => {
        setSelectedOverseasTheme(themeName);
    };

    const closeOverseasThemeModal = () => {
        setSelectedOverseasTheme(null);
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
                        {/* 국내/해외 탭 */}
                        <div className="flex items-center bg-[var(--bg-tertiary)] rounded-xl p-1">
                            <button
                                onClick={() => setMarketTab('domestic')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    marketTab === 'domestic'
                                        ? 'bg-[var(--bg-primary)] text-[var(--accent-blue)] shadow-[var(--shadow-sm)]'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                            >
                                <Flag size={14} />
                                국내
                            </button>
                            <button
                                onClick={() => setMarketTab('overseas')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    marketTab === 'overseas'
                                        ? 'bg-[var(--bg-primary)] text-[var(--accent-blue)] shadow-[var(--shadow-sm)]'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                            >
                                <Globe size={14} />
                                해외
                            </button>
                        </div>

                        {marketTab === 'domestic' && (
                            <MarketStatusBadge marketStatus={marketStatus} />
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* 뷰 모드 전환 (국내만) */}
                        {marketTab === 'domestic' && (
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
                        )}

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
                    {marketTab === 'domestic' ? (
                        themesLoading ? (
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
                                        onThemeClick={openThemeModal}
                                    />
                                )}
                                {viewMode === 'heatmap' && (
                                    <TreemapHeatmapView
                                        sortedThemes={sortedThemes}
                                        priceMap={priceMap}
                                        onThemeClick={openThemeModal}
                                    />
                                )}
                            </>
                        )
                    ) : (
                        <OverseasThemeView
                            searchQuery={searchQuery}
                            onThemeClick={openOverseasThemeModal}
                        />
                    )}
                </div>
            </main>

            {/* 국내 테마 상세 모달 */}
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

            {/* 해외 테마 상세 모달 */}
            {selectedOverseasTheme && (
                <OverseasThemeDetailModal
                    themeName={selectedOverseasTheme}
                    onClose={closeOverseasThemeModal}
                />
            )}
        </div>
    );
}
