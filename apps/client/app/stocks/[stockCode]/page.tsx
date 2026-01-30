'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    BarChart3,
    Tag,
    Newspaper,
    ExternalLink,
} from 'lucide-react';
import { fetchStockDetail } from '@/lib/api/stocks';
import ThemeToggle from '@/components/ui/ThemeToggle';

// 거래대금 포맷
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

// 거래량 포맷
function formatVolume(value: number): string {
    if (value >= 100000000) {
        return `${(value / 100000000).toFixed(1)}억`;
    } else if (value >= 10000) {
        return `${(value / 10000).toFixed(0)}만`;
    } else {
        return value.toLocaleString();
    }
}

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

// 요약 카드 컴포넌트
function SummaryCard({
    icon,
    iconBg,
    iconColor,
    label,
    value,
    subValue,
}: {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
    subValue?: string;
}) {
    return (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
                    <span className={iconColor}>{icon}</span>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
            </div>
            <div className="font-bold text-[var(--text-primary)]">{value}</div>
            {subValue && (
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{subValue}</div>
            )}
        </div>
    );
}

export default function StockDetailPage() {
    const params = useParams();
    const router = useRouter();
    const stockCode = params.stockCode as string;

    const { data: stock, isLoading, error } = useQuery({
        queryKey: ['stockDetail', stockCode],
        queryFn: () => fetchStockDetail(stockCode),
        enabled: !!stockCode,
        refetchInterval: 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)]">
                <header className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-5 bg-[var(--bg-primary)] sticky top-0 z-50">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
                            <TrendingUp size={18} className="text-white" />
                        </div>
                        <span className="text-base font-bold text-[var(--text-primary)]">TEBURN</span>
                    </Link>
                    <ThemeToggle />
                </header>
                <main className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
                    <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
                        <RefreshCw size={20} className="animate-spin text-[var(--accent-blue)]" />
                        <span>종목 정보 로딩 중...</span>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !stock) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)]">
                <header className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-5 bg-[var(--bg-primary)] sticky top-0 z-50">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
                            <TrendingUp size={18} className="text-white" />
                        </div>
                        <span className="text-base font-bold text-[var(--text-primary)]">TEBURN</span>
                    </Link>
                    <ThemeToggle />
                </header>
                <main className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)]">
                    <p className="text-[var(--text-tertiary)] mb-4">종목을 찾을 수 없습니다</p>
                    <Link href="/" className="text-[var(--accent-blue)] hover:underline">
                        홈으로 돌아가기
                    </Link>
                </main>
            </div>
        );
    }

    const isPositive = stock.changeRate > 0;
    const isNegative = stock.changeRate < 0;

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 헤더 */}
            <header className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-5 bg-[var(--bg-primary)] sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
                        <TrendingUp size={18} className="text-white" />
                    </div>
                    <span className="text-base font-bold text-[var(--text-primary)]">TEBURN</span>
                </Link>
                <ThemeToggle />
            </header>

            {/* 종목 헤더 */}
            <div className={`border-b border-[var(--border-color)] ${
                isPositive ? 'bg-[var(--rise-bg)]' : isNegative ? 'bg-[var(--fall-bg)]' : 'bg-[var(--bg-primary)]'
            }`}>
                <div className="px-5 py-5">
                    {/* 뒤로가기 + 종목명 */}
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            onClick={() => router.back()}
                            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-[var(--text-primary)]">{stock.stockName}</h1>
                            <span className="text-xs text-[var(--text-tertiary)]">{stock.stockCode}</span>
                        </div>
                    </div>

                    {/* 현재가 + 등락률 */}
                    <div className="ml-12 flex items-baseline gap-4">
                        <span className="text-3xl font-bold text-[var(--text-primary)]">
                            {stock.currentPrice.toLocaleString()}원
                        </span>
                        <span className={`flex items-center gap-1 text-xl font-bold ${
                            isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                        }`}>
                            {isPositive ? <ArrowUpRight size={20} /> : isNegative ? <ArrowDownRight size={20} /> : null}
                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                        </span>
                        <span className={`text-sm ${
                            isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                        }`}>
                            ({isPositive ? '+' : ''}{stock.changePrice.toLocaleString()}원)
                        </span>
                    </div>
                </div>
            </div>

            {/* 컨텐츠 */}
            <main className="p-5 space-y-5">
                {/* 요약 카드 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <SummaryCard
                        icon={<DollarSign size={16} />}
                        iconBg="bg-amber-500/10"
                        iconColor="text-amber-500"
                        label="거래대금"
                        value={formatTradingValue(stock.tradingValue)}
                    />
                    <SummaryCard
                        icon={<BarChart3 size={16} />}
                        iconBg="bg-violet-500/10"
                        iconColor="text-violet-500"
                        label="거래량"
                        value={formatVolume(stock.volume)}
                    />
                    <SummaryCard
                        icon={<Tag size={16} />}
                        iconBg="bg-[var(--accent-blue)]/10"
                        iconColor="text-[var(--accent-blue)]"
                        label="관련 테마"
                        value={`${stock.themes.length}개`}
                    />
                    <SummaryCard
                        icon={<Newspaper size={16} />}
                        iconBg="bg-emerald-500/10"
                        iconColor="text-emerald-500"
                        label="관련 뉴스"
                        value={`${stock.news.length}건`}
                    />
                </div>

                {/* 관련 테마 */}
                {stock.themes.length > 0 && (
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue)]/10 flex items-center justify-center">
                                <Tag size={20} className="text-[var(--accent-blue)]" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[var(--text-primary)]">관련 테마</h2>
                                <p className="text-xs text-[var(--text-tertiary)]">이 종목이 속한 테마들</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {stock.themes.map((theme) => (
                                <span
                                    key={theme}
                                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-medium"
                                >
                                    {theme}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 관련 뉴스 */}
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Newspaper size={20} className="text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-[var(--text-primary)]">관련 뉴스</h2>
                                <p className="text-xs text-[var(--text-tertiary)]">최근 뉴스 {stock.news.length}건</p>
                            </div>
                        </div>
                    </div>

                    {stock.news.length === 0 ? (
                        <div className="py-12 text-center text-[var(--text-tertiary)]">
                            관련 뉴스가 없습니다
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border-color)]">
                            {stock.news.map((item, index) => (
                                <a
                                    key={index}
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
                </div>
            </main>
        </div>
    );
}
