'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { fetchStockDetail } from '@/lib/api/stocks';
import { formatTradingValue, formatVolume, formatRelativeTime } from '@/lib/utils/format';
import GradeBadge from '@/components/ui/GradeBadge';
import StockChart from '@/components/stock/TradingViewChart';
import HotnessHistoryChart from '@/components/stock/HotnessHistoryChart';
import { useStockSubscription, useOnPriceUpdate } from '@/hooks/useRealtimePrice';
import { useAuth } from '@/hooks/useAuth';

function getGradeStyle(grade: string): { color: string; bg: string; label: string } {
    switch (grade) {
        case 'S':
            return { color: 'text-[var(--rise-color)]', bg: 'bg-[var(--rise-color)]', label: 'S' };
        case 'A':
            return { color: 'text-orange-500', bg: 'bg-orange-500', label: 'A' };
        case 'B':
            return { color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--text-tertiary)]', label: 'B' };
        case 'C':
            return { color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]', label: 'C' };
        case 'D':
            return { color: 'text-[var(--fall-color)]', bg: 'bg-[var(--fall-color)]', label: 'D' };
        default:
            return { color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--text-tertiary)]', label: grade };
    }
}

function ScoreBar({
    label,
    score,
    maxScore,
    detail,
    color,
}: {
    label: string;
    score: number;
    maxScore: number;
    detail?: string;
    color: string;
}) {
    const safeScore = score ?? 0;
    const percentage = Math.min((safeScore / maxScore) * 100, 100);

    return (
        <div className="flex items-center gap-1.5">
            <div className="w-14 text-xs text-[var(--text-tertiary)]">{label}</div>
            <div className="flex-1 h-[4px] bg-[var(--bg-tertiary)] overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
            </div>
            <div className="w-6 text-right text-xs font-medium text-[var(--text-secondary)]">{(score ?? 0).toFixed(0)}</div>
            <div className="w-4 text-right text-[12px] text-[var(--text-tertiary)]">/{maxScore}</div>
            {detail && (
                <div className="w-14 text-right text-[12px] text-[var(--text-tertiary)]">{detail}</div>
            )}
        </div>
    );
}

export default function StockDetailPage() {
    const params = useParams();
    const router = useRouter();
    const stockCode = params.stockCode as string;
    const { isLoggedIn } = useAuth();
    const queryClient = useQueryClient();

    useStockSubscription(stockCode);

    const { data: stock, isLoading, error } = useQuery({
        queryKey: ['stockDetail', stockCode],
        queryFn: () => fetchStockDetail(stockCode),
        enabled: !!stockCode,
        refetchInterval: isLoggedIn ? 5 * 60 * 1000 : 60 * 1000,
    });

    useOnPriceUpdate(useCallback((update) => {
        if (update.stockCode !== stockCode) return;
        queryClient.setQueryData(['stockDetail', stockCode], (old: any) => {
            if (!old) return old;
            return {
                ...old,
                currentPrice: update.price,
                changeRate: update.changeRate,
                tradingValue: (old.tradingValue || 0) + (update.price * update.volume),
            };
        });
    }, [stockCode, queryClient]));

    const originalTitle = useRef<string>('');
    useEffect(() => {
        originalTitle.current = document.title;
        return () => { document.title = originalTitle.current; };
    }, []);

    useEffect(() => {
        if (!stock) return;
        const sign = stock.changeRate > 0 ? '+' : '';
        document.title = `${stock.stockName} ${stock.currentPrice.toLocaleString()} (${sign}${stock.changeRate.toFixed(2)}%)`;
    }, [stock]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)]">
                <main className="flex items-center justify-center h-[calc(100vh-2.5rem)]">
                    <div className="flex items-center gap-2 text-[14px] text-[var(--text-tertiary)]">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>종목 정보 로딩 중...</span>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !stock) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)]">
                <main className="flex flex-col items-center justify-center h-[calc(100vh-2.5rem)]">
                    <p className="text-[14px] text-[var(--text-tertiary)] mb-3">종목을 찾을 수 없습니다</p>
                    <Link href="/" className="text-[14px] text-[var(--accent)] hover:underline">
                        홈으로 돌아가기
                    </Link>
                </main>
            </div>
        );
    }

    const isPositive = stock.changeRate > 0;
    const isNegative = stock.changeRate < 0;
    const isLimitUp = stock.changeRate >= 29.9;

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 종목 헤더 바 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="max-w-[1280px] mx-auto flex items-center gap-3 px-3 py-2">
                    <button
                        onClick={() => router.back()}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                        <ArrowLeft size={14} />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{stock.stockName}</h1>
                        <span className="text-[12px] text-[var(--text-tertiary)] flex-shrink-0">{stock.stockCode}</span>
                        {isLimitUp && (
                            <span className="px-1 py-0.5 text-[10px] font-bold text-white bg-[var(--rise-color)] flex-shrink-0 rounded-sm">
                                상한가
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                            {stock.currentPrice.toLocaleString()}
                        </span>
                        <span className={`text-[14px] font-bold ${
                            isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                        }`}>
                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                        </span>
                        <span className={`text-[12px] ${
                            isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                        }`}>
                            ({isPositive ? '+' : ''}{stock.changePrice.toLocaleString()})
                        </span>
                    </div>
                </div>
            </div>

            {/* 컨텐츠: 데스크탑 2단 (차트 좌 / 판단 우), 모바일 1단 (판단 먼저) */}
            <main className="max-w-[1280px] mx-auto p-3 space-y-3">
                <div className="flex flex-col lg:flex-row lg:gap-3">
                    {/* 좌: 차트 (데스크탑 60%) */}
                    <div className="lg:flex-[6] lg:min-w-0 order-2 lg:order-1 space-y-3">
                        <StockChart stockCode={stockCode} />

                        {/* 점수 히스토리 (데스크탑에선 차트 아래) */}
                        {stock.hotness && (
                            <div className="card hidden lg:block">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
                                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">점수 추이</span>
                                </div>
                                <div className="px-3 py-2">
                                    <HotnessHistoryChart stockCode={stockCode} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 우: 판단 패널 (데스크탑 40%) */}
                    <div className="lg:flex-[4] lg:min-w-0 order-1 lg:order-2 space-y-3 mb-3 lg:mb-0">
                        {/* 판단 요약 카드 */}
                        {stock.hotness && (
                            <div className="card">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-semibold text-[var(--text-primary)]">주도주 점수</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-lg font-bold ${getGradeStyle(stock.hotness.grade).color}`}>
                                            {stock.hotness.totalScore.toFixed(0)}
                                        </span>
                                        <GradeBadge grade={stock.hotness.grade} />
                                    </div>
                                </div>

                                <div className="px-3 py-2 space-y-1.5">
                                    {[
                                        { label: '거래대금', score: stock.hotness.tradingValueScore, maxScore: 25, color: 'bg-amber-500', detail: undefined },
                                        { label: '등락률', score: stock.hotness.momentumScore, maxScore: 10, color: 'bg-[var(--rise-color)]', detail: `${stock.changeRate > 0 ? '+' : ''}${stock.changeRate.toFixed(1)}%` },
                                        { label: '거래량', score: stock.hotness.volumeScore, maxScore: 15, color: 'bg-violet-500', detail: stock.hotness.volumeSurgeRate ? `${stock.hotness.volumeSurgeRate.toFixed(0)}%` : '-' },
                                        { label: '뉴스', score: stock.hotness.newsScore, maxScore: 5, color: 'bg-emerald-500', detail: `${stock.hotness.newsCount}건` },
                                        { label: '대장주', score: stock.hotness.themeConcentrationScore, maxScore: 15, color: 'bg-sky-500', detail: `${stock.hotness.themeConcentration}%` },
                                        { label: '연속성', score: stock.hotness.streakScore ?? 0, maxScore: 30, color: 'bg-orange-500', detail: (stock.hotness.streakDays ?? 0) > 0 ? `🔥${stock.hotness.streakDays}일` : '-' },
                                    ].map((bar, i) => (
                                        <div key={bar.label} className="animate-stagger" style={{ animationDelay: `${i * 50}ms` }}>
                                            <ScoreBar label={bar.label} score={bar.score} maxScore={bar.maxScore} color={bar.color} detail={bar.detail} />
                                        </div>
                                    ))}
                                </div>

                                {/* 모바일에서만 점수 히스토리 */}
                                <div className="lg:hidden px-3 py-2 border-t border-[var(--border-color)]">
                                    <HotnessHistoryChart stockCode={stockCode} />
                                </div>
                            </div>
                        )}

                        {/* KPI 요약 */}
                        <div className="card">
                            <div className="grid grid-cols-2 gap-px bg-[var(--border-color)]">
                                <div className="bg-[var(--bg-primary)] px-3 py-2">
                                    <div className="text-[12px] text-[var(--text-tertiary)] mb-0.5">거래대금</div>
                                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">{formatTradingValue(stock.tradingValue)}</div>
                                </div>
                                <div className="bg-[var(--bg-primary)] px-3 py-2">
                                    <div className="text-[12px] text-[var(--text-tertiary)] mb-0.5">거래량</div>
                                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">{formatVolume(stock.volume)}</div>
                                </div>
                                <div className="bg-[var(--bg-primary)] px-3 py-2">
                                    <div className="text-[12px] text-[var(--text-tertiary)] mb-0.5">관련 테마</div>
                                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">{stock.themes.length}개</div>
                                </div>
                                <div className="bg-[var(--bg-primary)] px-3 py-2">
                                    <div className="text-[12px] text-[var(--text-tertiary)] mb-0.5">관련 뉴스</div>
                                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">{stock.news.length}건</div>
                                </div>
                            </div>
                        </div>

                        {/* 관련 테마 (판단 패널 안에) */}
                        {stock.themes.length > 0 && (
                            <div className="card">
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)]">
                                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">관련 테마</span>
                                    <span className="text-[12px] text-[var(--text-tertiary)]">{stock.themes.length}개</span>
                                </div>
                                <div className="px-3 py-2 flex flex-wrap gap-1">
                                    {stock.themes.map((theme) => (
                                        <button
                                            key={theme}
                                            onClick={() => router.push(`/themes/${encodeURIComponent(theme)}`)}
                                            className="px-1.5 py-0.5 text-[12px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors cursor-pointer rounded-sm"
                                        >
                                            {theme}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 관련 뉴스 */}
                <div className="card overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-[var(--text-primary)]">관련 뉴스</span>
                            <span className="text-[12px] text-[var(--text-tertiary)]">{stock.news.length}건</span>
                        </div>
                    </div>

                    {stock.news.length === 0 ? (
                        <div className="py-8 text-center text-[14px] text-[var(--text-tertiary)]">
                            관련 뉴스가 없습니다
                        </div>
                    ) : (
                        <div>
                            {stock.news.map((item, index) => (
                                <a
                                    key={index}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-3 px-3 py-2 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[14px] text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-[12px] text-[var(--text-tertiary)]">{item.press}</span>
                                            <span className="text-[12px] text-[var(--text-tertiary)]">·</span>
                                            <span className="text-[12px] text-[var(--text-tertiary)]">
                                                {formatRelativeTime(item.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <ExternalLink
                                        size={12}
                                        className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] shrink-0 mt-0.5 opacity-30 group-hover:opacity-100 transition-opacity"
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
