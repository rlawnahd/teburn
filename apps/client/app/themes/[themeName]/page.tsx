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
    Crown,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Tag,
    Activity,
} from 'lucide-react';
import { fetchThemesWithMeta, fetchThemeDetail, fetchThemeHistory, StockWithPrice } from '@/lib/api/themes';
import { fetchNewsByTheme } from '@/lib/api/news';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import ThemeToggle from '@/components/ui/ThemeToggle';

// 종목 가격 정보 타입
interface StockPrice {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    tradingValue: number;
}

// 캐시된 가격을 StockPrice 형식으로 변환
function convertToStockPrice(stock: StockWithPrice): StockPrice | null {
    if (stock.currentPrice === null || stock.changeRate === null) return null;
    return {
        stockCode: stock.code,
        stockName: stock.name,
        currentPrice: stock.currentPrice,
        changePrice: stock.changePrice || 0,
        changeRate: stock.changeRate,
        volume: stock.volume || 0,
        tradingValue: (stock.currentPrice || 0) * (stock.volume || 0),
    };
}

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
    if (billion >= 10000) {
        return `${(billion / 10000).toFixed(1)}조`;
    } else if (billion >= 1) {
        return `${billion.toFixed(0)}억`;
    } else {
        return `${(value / 10000).toFixed(0)}만`;
    }
}

// 등락률에 따른 배경
function getChangeRateBg(rate: number): string {
    if (rate >= 15) return 'bg-[var(--rise-color)]/15';
    if (rate >= 10) return 'bg-[var(--rise-color)]/10';
    if (rate >= 6) return 'bg-[var(--rise-color)]/5';
    return '';
}

// 종목 행 컴포넌트
function StockRow({
    stock,
    rank,
    maxTradingValue,
}: {
    stock: StockPrice;
    rank: number;
    maxTradingValue: number;
}) {
    const progressWidth = maxTradingValue > 0 ? (stock.tradingValue / maxTradingValue) * 100 : 0;
    const isPositive = stock.changeRate > 0;
    const isNegative = stock.changeRate < 0;
    const isLimitUp = stock.changeRate >= 29.9;

    return (
        <div className={`relative group rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-blue)]/30 transition-all ${getChangeRateBg(stock.changeRate)}`}>
            {/* 거래대금 프로그레스 바 (배경) */}
            <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div
                    className="absolute left-0 top-0 h-full bg-[var(--accent-blue)]/5 transition-all"
                    style={{ width: `${progressWidth}%` }}
                />
            </div>

            <div className="relative flex items-center p-3 gap-4">
                {/* 순위 */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    rank <= 3
                        ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                }`}>
                    {rank}
                </div>

                {/* 종목명 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)] truncate">{stock.stockName}</span>
                        {isLimitUp && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-[var(--rise-color)] rounded">
                                상한가
                            </span>
                        )}
                    </div>
                    <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                        {stock.stockCode}
                    </div>
                </div>

                {/* 현재가 */}
                <div className="text-right">
                    <span className="text-sm text-[var(--text-secondary)]">{stock.currentPrice.toLocaleString()}원</span>
                </div>

                {/* 등락률 */}
                <div className="w-20 text-right">
                    <span className={`flex items-center justify-end gap-0.5 font-bold ${
                        isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                    }`}>
                        {isPositive ? <ArrowUpRight size={14} /> : isNegative ? <ArrowDownRight size={14} /> : null}
                        {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                    </span>
                </div>

                {/* 거래대금 */}
                <div className="w-20 text-right">
                    <span className="font-medium text-[var(--text-secondary)]">{formatTradingValue(stock.tradingValue)}</span>
                </div>
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
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center">
                        <BarChart3 size={16} className="text-[var(--accent-blue)]" />
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">등락률 추이</span>
                </div>
                <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-color)]">
                    {(Object.keys(periodLabels) as Array<keyof typeof periodLabels>).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 text-xs rounded transition-colors ${
                                period === p
                                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium shadow-sm'
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
                <div className="min-w-0">
                    <ResponsiveContainer width="100%" height={192}>
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
                                        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg p-3 text-xs">
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
    sortedPrices: StockPrice[];
}) {
    const maxTradingValue = sortedPrices.length > 0 ? Math.max(...sortedPrices.map((s) => s.tradingValue)) : 1;
    const topStock = sortedPrices[0];
    const totalTradingValue = sortedPrices.reduce((sum, s) => sum + s.tradingValue, 0);

    return (
        <div className="space-y-4">
            {/* 요약 정보 카드 */}
            {sortedPrices.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 대장주 */}
                    {topStock && (
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Crown size={14} className="text-amber-500" />
                                <span className="text-xs text-[var(--text-tertiary)]">대장주</span>
                            </div>
                            <div className="font-bold text-[var(--text-primary)] truncate">{topStock.stockName}</div>
                            <div className={`text-sm font-medium mt-1 ${
                                topStock.changeRate > 0 ? 'text-[var(--rise-color)]' : topStock.changeRate < 0 ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                            }`}>
                                {topStock.changeRate > 0 ? '+' : ''}{topStock.changeRate.toFixed(2)}%
                            </div>
                        </div>
                    )}

                    {/* 총 거래대금 */}
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign size={14} className="text-[var(--accent-blue)]" />
                            <span className="text-xs text-[var(--text-tertiary)]">총 거래대금</span>
                        </div>
                        <div className="font-bold text-[var(--text-primary)]">{formatTradingValue(totalTradingValue)}</div>
                    </div>

                    {/* 종목 수 */}
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity size={14} className="text-emerald-500" />
                            <span className="text-xs text-[var(--text-tertiary)]">종목 수</span>
                        </div>
                        <div className="font-bold text-[var(--text-primary)]">{sortedPrices.length}개</div>
                    </div>

                    {/* 키워드 수 */}
                    {theme && theme.keywords.length > 0 && (
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Tag size={14} className="text-violet-500" />
                                <span className="text-xs text-[var(--text-tertiary)]">키워드</span>
                            </div>
                            <div className="font-bold text-[var(--text-primary)]">{theme.keywords.length}개</div>
                        </div>
                    )}
                </div>
            )}

            {/* 등락률 차트 */}
            <ThemeHistoryChart themeName={themeName} />

            {/* 종목 시세 */}
            {sortedPrices.length > 0 && (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--rise-bg)] flex items-center justify-center">
                                <TrendingUp size={16} className="text-[var(--rise-color)]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">종목 시세</h3>
                                <p className="text-[10px] text-[var(--text-tertiary)]">거래대금 순 정렬</p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-full">
                            {sortedPrices.length}개
                        </span>
                    </div>

                    {/* 테이블 헤더 */}
                    <div className="flex items-center px-3 py-2 text-[11px] text-[var(--text-tertiary)] border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                        <div className="w-8 mr-4">#</div>
                        <div className="flex-1">종목명</div>
                        <div className="w-24 text-right">현재가</div>
                        <div className="w-20 text-right">등락률</div>
                        <div className="w-20 text-right">거래대금</div>
                    </div>

                    <div className="p-2 space-y-1">
                        {sortedPrices.map((stock, index) => (
                            <StockRow
                                key={stock.stockCode}
                                stock={stock}
                                rank={index + 1}
                                maxTradingValue={maxTradingValue}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 키워드 */}
            {theme && theme.keywords.length > 0 && (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Tag size={16} className="text-violet-500" />
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)]">관련 키워드</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {theme.keywords.map((keyword, i) => (
                            <span
                                key={i}
                                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-medium"
                            >
                                {keyword}
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
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Newspaper size={16} className="text-emerald-500" />
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">관련 뉴스</span>
                </div>
                {news.length > 0 && (
                    <span className="px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-full">
                        {news.length}건
                    </span>
                )}
            </div>

            {/* 뉴스 리스트 */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12 text-[var(--text-tertiary)]">
                    <RefreshCw size={20} className="animate-spin mr-2 text-[var(--accent-blue)]" />
                    뉴스 로딩 중...
                </div>
            ) : news.length === 0 ? (
                <div className="py-12 text-center text-[var(--text-tertiary)]">
                    관련 뉴스가 없습니다
                </div>
            ) : (
                <div className="divide-y divide-[var(--border-color)]">
                    {news.map((item) => (
                        <a
                            key={item.link}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--bg-tertiary)] transition-colors group"
                        >
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent-blue)] transition-colors">
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-[var(--text-tertiary)]">{item.press}</span>
                                    <span className="text-xs text-[var(--text-tertiary)]">·</span>
                                    <span className="text-xs text-[var(--text-tertiary)]">
                                        {formatRelativeTime(item.createdAt)}
                                    </span>
                                </div>
                            </div>
                            <ExternalLink
                                size={16}
                                className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                        </a>
                    ))}
                </div>
            )}

            {/* 더보기 버튼 */}
            {hasMore && !isLoading && (
                <div className="px-5 py-4 border-t border-[var(--border-color)]">
                    <button
                        onClick={loadMore}
                        disabled={isFetching}
                        className="w-full py-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
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

    const { data: themesData } = useQuery({
        queryKey: ['themes'],
        queryFn: fetchThemesWithMeta,
    });

    const theme = themesData?.themes?.find((t) => t.name === themeName);

    const { data: detail, isLoading: detailLoading } = useQuery({
        queryKey: ['themeDetail', themeName],
        queryFn: () => fetchThemeDetail(themeName),
        enabled: !!themeName,
    });

    // 캐시된 가격 데이터를 StockPrice 형식으로 변환
    const sortedPrices: StockPrice[] = (detail?.stocksWithPrice || [])
        .map(convertToStockPrice)
        .filter((p): p is StockPrice => p !== null)
        .sort((a, b) => b.tradingValue - a.tradingValue);

    const avgRate = detail?.avgChangeRate ?? 0;
    const isPositive = avgRate > 0;
    const isNegative = avgRate < 0;

    if (!theme && !detailLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)]">
                <header className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-primary)] sticky top-0 z-10">
                    <Link href="/leading" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-blue)]/10">
                            <TrendingUp size={16} className="text-[var(--accent-blue)]" />
                        </div>
                        <span className="text-base font-bold text-[var(--text-primary)]">
                            주도주 탐색기
                        </span>
                    </Link>
                    <ThemeToggle />
                </header>
                <main className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
                    <div className="text-center">
                        <p className="text-[var(--text-tertiary)] mb-4">테마를 찾을 수 없습니다</p>
                        <Link href="/leading" className="text-[var(--accent-blue)] hover:underline">
                            주도주 탐색기로 돌아가기
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 상단 네비게이션 */}
            <nav className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-primary)] sticky top-0 z-20">
                <Link href="/leading" className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--accent-blue)]/10">
                        <TrendingUp size={16} className="text-[var(--accent-blue)]" />
                    </div>
                    <span className="text-base font-bold text-[var(--text-primary)]">
                        주도주 탐색기
                    </span>
                </Link>
                <ThemeToggle />
            </nav>

            {/* 테마 헤더 */}
            <header className={`border-b border-[var(--border-color)] sticky top-14 z-10 transition-colors duration-200 ${
                isPositive ? 'bg-[var(--rise-bg)]' : isNegative ? 'bg-[var(--fall-bg)]' : 'bg-[var(--bg-primary)]'
            }`}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-4 mb-3">
                        <button
                            onClick={() => router.back()}
                            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-[var(--text-primary)]">{themeName}</h1>
                        </div>
                    </div>

                    {sortedPrices.length > 0 && (
                        <div className="ml-13 flex items-baseline gap-3">
                            <span className={`text-3xl font-bold flex items-center gap-1 ${
                                isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                            }`}>
                                {isPositive ? <ArrowUpRight size={24} /> : isNegative ? <ArrowDownRight size={24} /> : null}
                                {isPositive ? '+' : ''}{avgRate.toFixed(2)}%
                            </span>
                            <span className="text-sm text-[var(--text-tertiary)]">평균 등락률</span>
                        </div>
                    )}
                </div>

                {/* 탭 */}
                <div className="px-6 flex gap-1 bg-[var(--bg-primary)]/50">
                    <button
                        onClick={() => setActiveTab('price')}
                        className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'price'
                                ? 'text-[var(--accent-blue)] border-[var(--accent-blue)]'
                                : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
                        }`}
                    >
                        <TrendingUp size={16} className="inline mr-2" />
                        시세
                    </button>
                    <button
                        onClick={() => setActiveTab('news')}
                        className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'news'
                                ? 'text-[var(--accent-blue)] border-[var(--accent-blue)]'
                                : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
                        }`}
                    >
                        <Newspaper size={16} className="inline mr-2" />
                        뉴스
                    </button>
                </div>
            </header>

            {/* 컨텐츠 */}
            <main className="p-4">
                {detailLoading ? (
                    <div className="flex items-center justify-center py-12 text-[var(--text-tertiary)]">
                        <RefreshCw size={20} className="animate-spin mr-2 text-[var(--accent-blue)]" />
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
            </main>
        </div>
    );
}
