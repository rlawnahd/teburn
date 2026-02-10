'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAllNews, SimpleNewsItem } from '@/lib/api/news';

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
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function NewsItem({ news }: { news: SimpleNewsItem }) {
    return (
        <a
            href={news.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 px-3 py-2 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors group"
        >
            <div className="flex-1 min-w-0">
                <h3 className="text-[13px] text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors line-clamp-2">
                    {news.title}
                </h3>
                {news.summary && (
                    <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)] line-clamp-1">
                        {news.summary}
                    </p>
                )}
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
                    <span className="font-medium text-[var(--text-secondary)]">{news.press}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(news.createdAt)}</span>
                </div>
            </div>
            <ExternalLink size={12} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
    );
}

export default function NewsPage() {
    const [page, setPage] = useState(1);
    const limit = 30;

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['allNews', page],
        queryFn: () => fetchAllNews(page, limit),
        refetchInterval: 30 * 1000,
    });

    const news = data?.data || [];
    const pagination = data?.pagination;

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 페이지 헤더 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">증권 뉴스</span>
                        {pagination && (
                            <span className="text-[11px] text-[var(--text-tertiary)]">총 {pagination.total}건</span>
                        )}
                    </div>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* 뉴스 리스트 */}
            <main className="max-w-4xl mx-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
                            <RefreshCw size={14} className="animate-spin" />
                            <span>뉴스 로딩 중...</span>
                        </div>
                    </div>
                ) : news.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-[13px] text-[var(--text-tertiary)]">
                        뉴스가 없습니다
                    </div>
                ) : (
                    <div className="border-x border-[var(--border-color)] bg-[var(--bg-primary)]">
                        {news.map((item) => (
                            <NewsItem key={item.id} news={item} />
                        ))}
                    </div>
                )}

                {/* 페이지네이션 */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="w-6 h-6 flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft size={12} />
                        </button>
                        <span className="text-xs text-[var(--text-secondary)]">
                            {page} / {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                            className="w-6 h-6 flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight size={12} />
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
