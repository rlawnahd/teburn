'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { fetchStockDetail } from '@/lib/api/stocks';

function formatTradingValue(value: number): string {
    const billion = value / 100000000;
    if (billion >= 10000) return `${(billion / 10000).toFixed(1)}조`;
    if (billion >= 1) return `${billion.toFixed(0)}억`;
    return `${(value / 10000).toFixed(0)}만`;
}

function formatVolume(value: number): string {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
    if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
    return value.toLocaleString();
}

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

function getGradeStyle(grade: string): { color: string; bg: string; label: string } {
    switch (grade) {
        case 'HOT':
            return { color: 'text-[var(--rise-color)]', bg: 'bg-[var(--rise-color)]', label: 'HOT' };
        case 'WARM':
            return { color: 'text-orange-500', bg: 'bg-orange-500', label: 'WARM' };
        case 'NORMAL':
            return { color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--text-tertiary)]', label: 'MID' };
        case 'COOL':
            return { color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]', label: 'LOW' };
        case 'COLD':
            return { color: 'text-[var(--fall-color)]', bg: 'bg-[var(--fall-color)]', label: 'COLD' };
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
    const percentage = Math.min((score / maxScore) * 100, 100);

    return (
        <div className="flex items-center gap-1.5">
            <div className="w-12 text-xs text-[var(--text-tertiary)]">{label}</div>
            <div className="flex-1 h-[3px] bg-[var(--bg-tertiary)] overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
            </div>
            <div className="w-6 text-right text-xs font-medium text-[var(--text-secondary)]">{score.toFixed(0)}</div>
            <div className="w-4 text-right text-[11px] text-[var(--text-tertiary)]">/{maxScore}</div>
            {detail && (
                <div className="w-14 text-right text-[11px] text-[var(--text-tertiary)]">{detail}</div>
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
                <main className="flex items-center justify-center h-[calc(100vh-2.5rem)]">
                    <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
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
                    <p className="text-[13px] text-[var(--text-tertiary)] mb-3">종목을 찾을 수 없습니다</p>
                    <Link href="/" className="text-[13px] text-[var(--accent-blue)] hover:underline">
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
            {/* 종목 헤더 바 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="flex items-center gap-3 px-3 py-2">
                    <button
                        onClick={() => router.back()}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                        <ArrowLeft size={14} />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                        <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{stock.stockName}</h1>
                        <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">{stock.stockCode}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                            {stock.currentPrice.toLocaleString()}
                        </span>
                        <span className={`text-[13px] font-bold ${
                            isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                        }`}>
                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                        </span>
                        <span className={`text-[11px] ${
                            isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                        }`}>
                            ({isPositive ? '+' : ''}{stock.changePrice.toLocaleString()})
                        </span>
                    </div>
                </div>
            </div>

            {/* 컨텐츠 */}
            <main className="p-3 space-y-3">
                {/* 요약 정보 — 테이블 스타일 */}
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--border-color)]">
                        <div className="bg-[var(--bg-primary)] px-3 py-2">
                            <div className="text-[11px] text-[var(--text-tertiary)] mb-0.5">거래대금</div>
                            <div className="text-[13px] font-semibold text-[var(--text-primary)]">{formatTradingValue(stock.tradingValue)}</div>
                        </div>
                        <div className="bg-[var(--bg-primary)] px-3 py-2">
                            <div className="text-[11px] text-[var(--text-tertiary)] mb-0.5">거래량</div>
                            <div className="text-[13px] font-semibold text-[var(--text-primary)]">{formatVolume(stock.volume)}</div>
                        </div>
                        <div className="bg-[var(--bg-primary)] px-3 py-2">
                            <div className="text-[11px] text-[var(--text-tertiary)] mb-0.5">관련 테마</div>
                            <div className="text-[13px] font-semibold text-[var(--text-primary)]">{stock.themes.length}개</div>
                        </div>
                        <div className="bg-[var(--bg-primary)] px-3 py-2">
                            <div className="text-[11px] text-[var(--text-tertiary)] mb-0.5">관련 뉴스</div>
                            <div className="text-[13px] font-semibold text-[var(--text-primary)]">{stock.news.length}건</div>
                        </div>
                    </div>
                </div>

                {/* 주도주 점수 */}
                {stock.hotness && (
                    <div className="border border-[var(--border-color)] bg-[var(--bg-primary)]">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-[var(--text-primary)]">주도주 점수</span>
                                <span className="text-[11px] text-[var(--text-tertiary)]">종목 관심도 분석</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${getGradeStyle(stock.hotness.grade).color}`}>
                                    {stock.hotness.totalScore.toFixed(0)}
                                </span>
                                <span className={`px-1 py-0.5 text-[9px] font-bold text-white ${getGradeStyle(stock.hotness.grade).bg}`}>
                                    {getGradeStyle(stock.hotness.grade).label}
                                </span>
                            </div>
                        </div>

                        <div className="px-3 py-2 space-y-1.5">
                            <ScoreBar
                                label="거래대금"
                                score={stock.hotness.tradingValueScore}
                                maxScore={25}
                                color="bg-amber-500"
                            />
                            <ScoreBar
                                label="검색량"
                                score={stock.hotness.searchScore}
                                maxScore={20}
                                detail={stock.hotness.searchSurgeRate ? `${stock.hotness.searchSurgeRate > 0 ? '+' : ''}${stock.hotness.searchSurgeRate.toFixed(0)}%` : '-'}
                                color="bg-[var(--accent-blue)]"
                            />
                            <ScoreBar
                                label="등락률"
                                score={stock.hotness.momentumScore}
                                maxScore={20}
                                detail={`${stock.changeRate > 0 ? '+' : ''}${stock.changeRate.toFixed(1)}%`}
                                color="bg-[var(--rise-color)]"
                            />
                            <ScoreBar
                                label="거래량"
                                score={stock.hotness.volumeScore}
                                maxScore={20}
                                detail={stock.hotness.volumeSurgeRate ? `${stock.hotness.volumeSurgeRate.toFixed(0)}%` : '-'}
                                color="bg-violet-500"
                            />
                            <ScoreBar
                                label="뉴스"
                                score={stock.hotness.newsScore}
                                maxScore={15}
                                detail={`${stock.hotness.newsCount}건`}
                                color="bg-emerald-500"
                            />
                        </div>
                    </div>
                )}

                {/* 관련 테마 */}
                {stock.themes.length > 0 && (
                    <div className="border border-[var(--border-color)] bg-[var(--bg-primary)]">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)]">
                            <span className="text-[13px] font-semibold text-[var(--text-primary)]">관련 테마</span>
                            <span className="text-[11px] text-[var(--text-tertiary)]">{stock.themes.length}개</span>
                        </div>
                        <div className="px-3 py-2 flex flex-wrap gap-1">
                            {stock.themes.map((theme) => (
                                <span
                                    key={theme}
                                    className="px-1.5 py-0.5 text-[11px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                >
                                    {theme}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 관련 뉴스 */}
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[var(--text-primary)]">관련 뉴스</span>
                            <span className="text-[11px] text-[var(--text-tertiary)]">{stock.news.length}건</span>
                        </div>
                    </div>

                    {stock.news.length === 0 ? (
                        <div className="py-8 text-center text-[13px] text-[var(--text-tertiary)]">
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
                                        <h3 className="text-[13px] text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent-blue)] transition-colors">
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-[11px] text-[var(--text-tertiary)]">{item.press}</span>
                                            <span className="text-[11px] text-[var(--text-tertiary)]">·</span>
                                            <span className="text-[11px] text-[var(--text-tertiary)]">
                                                {formatRelativeTime(item.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <ExternalLink
                                        size={12}
                                        className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
