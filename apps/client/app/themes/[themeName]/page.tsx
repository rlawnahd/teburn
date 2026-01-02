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
} from 'lucide-react';
import { fetchThemes, fetchThemeDetail, fetchThemeHistory } from '@/lib/api/themes';
import { fetchNewsByTheme } from '@/lib/api/news';
import { useRealtimeStockPrices, RealtimePrice } from '@/hooks/useRealtimeStockPrices';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Sidebar from '@/components/layout/Sidebar';

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
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6">
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
                <div className="h-48 flex items-center justify-center text-[var(--text-tertiary)]">
                    <RefreshCw size={16} className="animate-spin mr-2 text-[var(--accent-blue)]" />
                    차트 로딩 중...
                </div>
            ) : chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
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

export default function ThemeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const themeName = decodeURIComponent(params.themeName as string);

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

    const { data: relatedNews, isLoading: newsLoading } = useQuery({
        queryKey: ['themeNews', themeName],
        queryFn: () => fetchNewsByTheme(themeName, 10),
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
            <div className="flex min-h-screen bg-[var(--bg-secondary)]">
                <Sidebar />
                <main className="flex-1 lg:ml-64 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-[var(--text-tertiary)] mb-4">테마를 찾을 수 없습니다</p>
                        <Link
                            href="/"
                            className="text-[var(--accent-blue)] hover:underline"
                        >
                            홈으로 돌아가기
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[var(--bg-secondary)]">
            <Sidebar />

            <main className="flex-1 lg:ml-64">
                {/* 헤더 */}
                <header className={`border-b border-[var(--border-color)] sticky top-0 z-10 transition-colors duration-200 ${
                    isPositive ? 'bg-[var(--rise-bg)]' : isNegative ? 'bg-[var(--fall-bg)]' : 'bg-[var(--bg-primary)]'
                }`}>
                    <div className="px-6 py-5">
                        <div className="flex items-center gap-4 mb-3">
                            <button
                                onClick={() => router.back()}
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-primary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-[var(--text-primary)]">{themeName}</h1>
                                {priceInfo && priceInfo.prices.length > 0 && (
                                    <span className="text-xs text-[var(--success-color)] animate-pulse flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-color)]"></span>
                                        LIVE
                                    </span>
                                )}
                            </div>
                        </div>

                        {priceInfo && priceInfo.prices.length > 0 && (
                            <div className="ml-13">
                                <span className={`text-3xl font-bold ${
                                    isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                                }`}>
                                    {isPositive ? '+' : ''}{avgRate.toFixed(2)}%
                                </span>
                                <span className="text-sm text-[var(--text-secondary)] ml-2">평균 등락률</span>
                            </div>
                        )}
                    </div>
                </header>

                {/* 컨텐츠 */}
                <div className="p-6">
                    {detailLoading ? (
                        <div className="flex items-center justify-center py-12 text-[var(--text-tertiary)]">
                            <RefreshCw size={20} className="animate-spin mr-2 text-[var(--accent-blue)]" />
                            로딩 중...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* 왼쪽: 차트 + 실시간 시세 */}
                            <div className="lg:col-span-2 space-y-6">
                                <ThemeHistoryChart themeName={themeName} />

                                {sortedPrices.length > 0 && (
                                    <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6">
                                        <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">
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
                                    <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6">
                                        <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">
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
                            </div>

                            {/* 오른쪽: 키워드 + 뉴스 */}
                            <div className="space-y-6">
                                {theme && (
                                    <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6">
                                        <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">키워드</div>
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
                                )}

                                <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] mb-4">
                                        <Newspaper size={16} className="text-[var(--accent-blue)]" />
                                        관련 뉴스
                                    </div>
                                    {newsLoading ? (
                                        <div className="text-sm text-[var(--text-tertiary)] py-4 text-center">
                                            뉴스 로딩 중...
                                        </div>
                                    ) : relatedNews && relatedNews.length > 0 ? (
                                        <div className="space-y-3">
                                            {relatedNews.map((news) => (
                                                <a
                                                    key={news.link}
                                                    href={news.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] transition-colors group"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent-blue)] transition-colors">
                                                                {news.title}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <span className="text-xs text-[var(--text-tertiary)]">{news.press}</span>
                                                            </div>
                                                        </div>
                                                        <ExternalLink size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] flex-shrink-0 mt-1" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-[var(--text-tertiary)] py-4 text-center bg-[var(--bg-tertiary)] rounded-xl">
                                            관련 뉴스가 없습니다
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
