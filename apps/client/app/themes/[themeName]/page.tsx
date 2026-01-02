'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
    ArrowLeft,
    RefreshCw,
    BarChart3,
    Newspaper,
    ExternalLink,
    TrendingUp,
    ChevronDown,
} from 'lucide-react';
import { fetchThemes, fetchThemeDetail, fetchThemeHistory } from '@/lib/api/themes';
import { fetchNewsByTheme } from '@/lib/api/news';
import { useRealtimeStockPrices, RealtimePrice } from '@/hooks/useRealtimeStockPrices';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Sidebar from '@/components/layout/Sidebar';

type TabType = 'price' | 'news';

// 상대 시간 포맷
function formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
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

// 종목 가격 표시 컴포넌트
function StockPriceTag({ price, rank }: { price: RealtimePrice; rank?: number }) {
    const isPositive = price.changeRate > 0;
    const isNegative = price.changeRate < 0;

    return (
        <div
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                isPositive
                    ? 'bg-(--rise-bg) border-(--rise-color)/20'
                    : isNegative
                      ? 'bg-(--fall-bg) border-(--fall-color)/20'
                      : 'bg-(--bg-tertiary) border-(--border-color)'
            }`}
        >
            <div className="flex items-center gap-3">
                {rank !== undefined && (
                    <span className={`text-xs font-bold w-5 ${
                        rank === 1 ? 'text-(--warning-color)' : 'text-(--text-tertiary)'
                    }`}>
                        {rank}
                    </span>
                )}
                <span className="text-sm font-medium text-foreground">{price.stockName}</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-xs text-(--text-tertiary)">
                    {formatTradingValue(price.tradingValue)}
                </span>
                <span className="text-sm font-mono text-(--text-secondary)">
                    {price.currentPrice.toLocaleString()}
                </span>
                <span
                    className={`text-xs font-bold min-w-[52px] text-right ${
                        isPositive ? 'text-(--rise-color)' : isNegative ? 'text-(--fall-color)' : 'text-(--text-tertiary)'
                    }`}
                >
                    {isPositive ? '+' : ''}
                    {price.changeRate.toFixed(2)}%
                </span>
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
        <div className="bg-background rounded-2xl border border-(--border-color) p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 size={16} className="text-(--accent-blue)" />
                    등락률 추이
                </div>
                <div className="flex gap-1 bg-(--bg-tertiary) p-1 rounded-xl">
                    {(Object.keys(periodLabels) as Array<keyof typeof periodLabels>).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                period === p
                                    ? 'bg-background text-(--accent-blue) font-medium shadow-(--shadow-sm)'
                                    : 'text-(--text-tertiary) hover:text-(--text-secondary)'
                            }`}
                        >
                            {periodLabels[p]}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="h-48 flex items-center justify-center text-(--text-tertiary)">
                    <RefreshCw size={16} className="animate-spin mr-2 text-(--accent-blue)" />
                    차트 로딩 중...
                </div>
            ) : chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-(--text-tertiary) text-sm">
                    해당 기간에 데이터가 없습니다
                </div>
            ) : (
                <div className="h-48">
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
                                        <div className="bg-background border border-(--border-color) rounded-xl shadow-(--shadow-lg) p-3 text-xs">
                                            <div className="text-(--text-tertiary) mb-1">{data.time}</div>
                                            <div className={`font-bold ${isUp ? 'text-(--rise-color)' : rate < 0 ? 'text-(--fall-color)' : 'text-(--text-tertiary)'}`}>
                                                {isUp ? '+' : ''}{rate.toFixed(2)}%
                                            </div>
                                            {data.topStock && (
                                                <div className="text-(--text-tertiary) mt-1">
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

// 시세 탭 컨텐츠
function PriceTabContent({
    themeName,
    theme,
    detail,
    sortedPrices,
}: {
    themeName: string;
    theme: { keywords: string[] } | undefined;
    detail: { stocks: string[] } | undefined;
    sortedPrices: RealtimePrice[];
}) {
    return (
        <div className="space-y-6">
            <ThemeHistoryChart themeName={themeName} />

            {sortedPrices.length > 0 && (
                <div className="bg-background rounded-2xl border border-(--border-color) p-6">
                    <div className="text-sm font-semibold text-foreground mb-4">
                        실시간 시세 <span className="text-(--text-tertiary) font-normal">(거래대금 순)</span>
                    </div>
                    <div className="space-y-2">
                        {sortedPrices.map((price, i) => (
                            <StockPriceTag key={i} price={price} rank={i + 1} />
                        ))}
                    </div>
                </div>
            )}

            {theme && (
                <div className="bg-background rounded-2xl border border-(--border-color) p-6">
                    <div className="text-sm font-semibold text-foreground mb-4">키워드</div>
                    <div className="flex flex-wrap gap-2">
                        {theme.keywords.map((keyword, i) => (
                            <span
                                key={i}
                                className="text-xs px-3 py-1.5 rounded-full bg-(--accent-blue-light) text-(--accent-blue) font-medium"
                            >
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {detail && (
                <div className="bg-background rounded-2xl border border-(--border-color) p-6">
                    <div className="text-sm font-semibold text-foreground mb-4">
                        관련 종목 <span className="text-(--text-tertiary) font-normal">({detail.stocks.length}개)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {detail.stocks.map((stock, i) => (
                            <span
                                key={i}
                                className="text-sm px-3 py-1.5 rounded-xl bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--border-color) transition-colors"
                            >
                                {stock}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// 뉴스 탭 컨텐츠
function NewsTabContent({ themeName }: { themeName: string }) {
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['themeNews', themeName, page],
        queryFn: () => fetchNewsByTheme(themeName, page * pageSize),
    });

    const news = data || [];
    const hasMore = news.length === page * pageSize;

    const loadMore = () => {
        setPage((prev) => prev + 1);
    };

    return (
        <div className="bg-background rounded-2xl border border-(--border-color)">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)">
                <div className="flex items-center gap-2">
                    <Newspaper size={18} className="text-(--accent-blue)" />
                    <span className="font-semibold text-foreground">관련 뉴스</span>
                    {news.length > 0 && (
                        <span className="text-xs text-(--text-tertiary) bg-(--bg-tertiary) px-2 py-0.5 rounded-full">
                            {news.length}건
                        </span>
                    )}
                </div>
            </div>

            {/* 뉴스 리스트 */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12 text-(--text-tertiary)">
                    <RefreshCw size={20} className="animate-spin mr-2 text-(--accent-blue)" />
                    뉴스 로딩 중...
                </div>
            ) : news.length === 0 ? (
                <div className="py-12 text-center text-(--text-tertiary)">
                    관련 뉴스가 없습니다
                </div>
            ) : (
                <div className="divide-y divide-(--border-color)">
                    {news.map((item) => (
                        <a
                            key={item.link}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-4 px-6 py-4 hover:bg-(--bg-tertiary) transition-colors group"
                        >
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-(--accent-blue) transition-colors">
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-(--text-tertiary)">{item.press}</span>
                                    <span className="text-xs text-(--text-tertiary)">·</span>
                                    <span className="text-xs text-(--text-tertiary)">
                                        {formatRelativeTime(item.createdAt)}
                                    </span>
                                </div>
                            </div>
                            <ExternalLink
                                size={16}
                                className="text-(--text-tertiary) group-hover:text-(--accent-blue) shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                        </a>
                    ))}
                </div>
            )}

            {/* 더보기 버튼 */}
            {hasMore && !isLoading && (
                <div className="px-6 py-4 border-t border-(--border-color)">
                    <button
                        onClick={loadMore}
                        disabled={isFetching}
                        className="w-full py-3 rounded-xl bg-(--bg-tertiary) text-(--text-secondary) hover:bg-(--border-color) transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                        {isFetching ? (
                            <>
                                <RefreshCw size={14} className="animate-spin" />
                                로딩 중...
                            </>
                        ) : (
                            <>
                                <ChevronDown size={16} />
                                더보기
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ThemeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const themeName = decodeURIComponent(params.themeName as string);
    const [activeTab, setActiveTab] = useState<TabType>('price');

    const { data: themes } = useQuery({
        queryKey: ['themes'],
        queryFn: fetchThemes,
    });

    const theme = themes?.find((t) => t.name === themeName);

    const { data: detail, isLoading: detailLoading } = useQuery({
        queryKey: ['themeDetail', themeName],
        queryFn: () => fetchThemeDetail(themeName),
        enabled: !!themeName,
    });

    const { priceMap } = useRealtimeStockPrices();
    const priceInfo = priceMap.get(themeName);
    const avgRate = priceInfo?.avgChangeRate ?? 0;
    const isPositive = avgRate > 0;
    const isNegative = avgRate < 0;
    const sortedPrices = priceInfo?.prices || [];

    if (!theme && !detailLoading) {
        return (
            <div className="flex min-h-screen bg-(--bg-secondary)">
                <Sidebar />
                <main className="flex-1 lg:ml-64 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-(--text-tertiary) mb-4">테마를 찾을 수 없습니다</p>
                        <Link
                            href="/"
                            className="text-(--accent-blue) hover:underline"
                        >
                            홈으로 돌아가기
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-(--bg-secondary)">
            <Sidebar />

            <main className="flex-1 lg:ml-64">
                {/* 헤더 */}
                <header className={`border-b border-(--border-color) sticky top-0 z-10 transition-colors duration-200 ${
                    isPositive ? 'bg-(--rise-bg)' : isNegative ? 'bg-(--fall-bg)' : 'bg-background'
                }`}>
                    <div className="px-6 py-5">
                        <div className="flex items-center gap-4 mb-3">
                            <button
                                onClick={() => router.back()}
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-background/50 text-(--text-secondary) hover:text-foreground transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-foreground">{themeName}</h1>
                                {priceInfo && priceInfo.prices.length > 0 && (
                                    <span className="text-xs text-(--success-color) animate-pulse flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-(--success-color)"></span>
                                        LIVE
                                    </span>
                                )}
                            </div>
                        </div>

                        {priceInfo && priceInfo.prices.length > 0 && (
                            <div className="ml-13">
                                <span className={`text-3xl font-bold ${
                                    isPositive ? 'text-(--rise-color)' : isNegative ? 'text-(--fall-color)' : 'text-(--text-tertiary)'
                                }`}>
                                    {isPositive ? '+' : ''}{avgRate.toFixed(2)}%
                                </span>
                                <span className="text-sm text-(--text-secondary) ml-2">평균 등락률</span>
                            </div>
                        )}
                    </div>

                    {/* 탭 */}
                    <div className="px-6 flex gap-1">
                        <button
                            onClick={() => setActiveTab('price')}
                            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'price'
                                    ? 'text-(--accent-blue) border-(--accent-blue)'
                                    : 'text-(--text-tertiary) border-transparent hover:text-(--text-secondary)'
                            }`}
                        >
                            <TrendingUp size={16} className="inline mr-2" />
                            시세
                        </button>
                        <button
                            onClick={() => setActiveTab('news')}
                            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'news'
                                    ? 'text-(--accent-blue) border-(--accent-blue)'
                                    : 'text-(--text-tertiary) border-transparent hover:text-(--text-secondary)'
                            }`}
                        >
                            <Newspaper size={16} className="inline mr-2" />
                            뉴스
                        </button>
                    </div>
                </header>

                {/* 컨텐츠 */}
                <div className="p-6">
                    {detailLoading ? (
                        <div className="flex items-center justify-center py-12 text-(--text-tertiary)">
                            <RefreshCw size={20} className="animate-spin mr-2 text-(--accent-blue)" />
                            로딩 중...
                        </div>
                    ) : (
                        <>
                            {activeTab === 'price' && (
                                <PriceTabContent
                                    themeName={themeName}
                                    theme={theme}
                                    detail={detail}
                                    sortedPrices={sortedPrices}
                                />
                            )}
                            {activeTab === 'news' && (
                                <NewsTabContent themeName={themeName} />
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
