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
    Search,
    Activity,
    Flame,
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

// 핫함 등급별 스타일
function getGradeStyle(grade: string): { color: string; bg: string; label: string } {
    switch (grade) {
        case 'HOT':
            return { color: 'text-[var(--rise-color)]', bg: 'bg-[var(--rise-color)]', label: '🔥 HOT' };
        case 'WARM':
            return { color: 'text-orange-500', bg: 'bg-orange-500', label: '🌡️ WARM' };
        case 'NORMAL':
            return { color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--text-tertiary)]', label: '➖ NORMAL' };
        case 'COOL':
            return { color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]', label: '❄️ COOL' };
        case 'COLD':
            return { color: 'text-[var(--fall-color)]', bg: 'bg-[var(--fall-color)]', label: '🥶 COLD' };
        default:
            return { color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--text-tertiary)]', label: grade };
    }
}

// 점수 게이지 컴포넌트
function ScoreGauge({
    label,
    score,
    maxScore,
    icon,
    subText,
}: {
    label: string;
    score: number;
    maxScore: number;
    icon: React.ReactNode;
    subText?: string;
}) {
    const percentage = Math.min((score / maxScore) * 100, 100);
    const getBarColor = () => {
        if (percentage >= 80) return 'bg-[var(--rise-color)]';
        if (percentage >= 60) return 'bg-orange-500';
        if (percentage >= 40) return 'bg-amber-500';
        if (percentage >= 20) return 'bg-[var(--accent-blue)]';
        return 'bg-[var(--text-tertiary)]';
    };

    return (
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{score.toFixed(0)}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">/{maxScore}</span>
                    </div>
                </div>
                <div className="relative h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                        className={`absolute left-0 top-0 h-full ${getBarColor()} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                {subText && (
                    <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 block">{subText}</span>
                )}
            </div>
        </div>
    );
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

                {/* 핫함 점수 */}
                {stock.hotness && (
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <Flame size={20} className="text-orange-500" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-[var(--text-primary)]">핫함 점수</h2>
                                    <p className="text-xs text-[var(--text-tertiary)]">종목 관심도 분석</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-2xl font-bold ${getGradeStyle(stock.hotness.grade).color}`}>
                                    {stock.hotness.totalScore.toFixed(0)}
                                </span>
                                <span className={`text-xs font-bold px-2 py-1 rounded text-white ${getGradeStyle(stock.hotness.grade).bg}`}>
                                    {getGradeStyle(stock.hotness.grade).label}
                                </span>
                            </div>
                        </div>

                        {/* 점수 상세 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ScoreGauge
                                label="거래대금"
                                score={stock.hotness.tradingValueScore}
                                maxScore={25}
                                icon={<DollarSign size={14} className="text-amber-500" />}
                            />
                            <ScoreGauge
                                label="검색량"
                                score={stock.hotness.searchScore}
                                maxScore={20}
                                icon={<Search size={14} className="text-[var(--accent-blue)]" />}
                                subText={stock.hotness.searchSurgeRate ? `급증률 ${stock.hotness.searchSurgeRate.toFixed(0)}%` : undefined}
                            />
                            <ScoreGauge
                                label="등락률"
                                score={stock.hotness.momentumScore}
                                maxScore={20}
                                icon={<Activity size={14} className="text-[var(--rise-color)]" />}
                            />
                            <ScoreGauge
                                label="거래량"
                                score={stock.hotness.volumeScore}
                                maxScore={20}
                                icon={<BarChart3 size={14} className="text-violet-500" />}
                                subText={stock.hotness.volumeSurgeRate ? `급증률 ${stock.hotness.volumeSurgeRate.toFixed(0)}%` : undefined}
                            />
                            <ScoreGauge
                                label="뉴스"
                                score={stock.hotness.newsScore}
                                maxScore={15}
                                icon={<Newspaper size={14} className="text-emerald-500" />}
                                subText={`${stock.hotness.newsCount}건`}
                            />
                        </div>
                    </div>
                )}

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
