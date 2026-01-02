'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Flame, RefreshCw, ExternalLink, Newspaper, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAllNews, SimpleNewsItem } from '@/lib/api/news';
import ThemeToggle from '@/components/ui/ThemeToggle';

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

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// 뉴스 아이템 컴포넌트
function NewsItem({ news }: { news: SimpleNewsItem }) {
    return (
        <a
            href={news.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--accent-blue)]/50 hover:shadow-[var(--shadow-md)] transition-all group"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors line-clamp-2">
                        {news.title}
                    </h3>
                    {news.summary && (
                        <p className="mt-1.5 text-sm text-[var(--text-tertiary)] line-clamp-2">
                            {news.summary}
                        </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        <span className="font-medium text-[var(--text-secondary)]">{news.press}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(news.createdAt)}</span>
                    </div>
                </div>
                <ExternalLink size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-blue)] flex-shrink-0 mt-1" />
            </div>
        </a>
    );
}

export default function NewsPage() {
    const [page, setPage] = useState(1);
    const limit = 30;

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['allNews', page],
        queryFn: () => fetchAllNews(page, limit),
        refetchInterval: 30 * 1000, // 30초마다 새로고침
    });

    const news = data?.data || [];
    const pagination = data?.pagination;

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 헤더 */}
            <header className="h-16 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-primary)] sticky top-0 z-10">
                <div className="flex items-center gap-5">
                    {/* 로고 */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 group-hover:shadow-red-500/40 group-hover:scale-105 transition-all duration-200">
                            <Flame size={20} className="text-white" fill="currentColor" />
                        </div>
                        <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                            TEBURN
                        </span>
                    </Link>

                    <div className="h-6 w-px bg-[var(--border-color)]" />

                    {/* 네비게이션 */}
                    <nav className="flex items-center gap-1">
                        <Link
                            href="/"
                            className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            테마
                        </Link>
                        <div className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--accent-blue)] bg-[var(--accent-blue)]/10">
                            뉴스
                        </div>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    {/* 새로고침 */}
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
                    </button>

                    {/* 다크모드 토글 */}
                    <ThemeToggle />
                </div>
            </header>

            {/* 컨텐츠 */}
            <main className="max-w-4xl mx-auto p-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue)]/10 flex items-center justify-center">
                            <Newspaper size={20} className="text-[var(--accent-blue)]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-[var(--text-primary)]">증권 뉴스</h1>
                            <p className="text-sm text-[var(--text-tertiary)]">
                                {pagination ? `총 ${pagination.total}개` : '로딩 중...'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 뉴스 리스트 */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-[var(--text-tertiary)]">
                        <RefreshCw size={24} className="animate-spin mr-3 text-[var(--accent-blue)]" />
                        뉴스 로딩 중...
                    </div>
                ) : news.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
                        <Newspaper size={48} className="mb-4 opacity-50" />
                        <p>뉴스가 없습니다</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {news.map((item) => (
                            <NewsItem key={item.id} news={item} />
                        ))}
                    </div>
                )}

                {/* 페이지네이션 */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                            {page} / {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
