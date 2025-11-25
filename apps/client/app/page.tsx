'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query'; // 👈 React Query 훅
import { fetchNews } from '@/lib/api/news';
import NewsRow from '@/components/news/NewsRow';
import { Zap, Loader2, Filter, Newspaper, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// (사이드바 같은 건 나중에 layout.tsx나 별도 컴포넌트로 더 뺄 수 있음)
function Sidebar() {
    return (
        <aside className="w-64 bg-[#0B1120] border-r border-slate-800 hidden md:flex flex-col fixed h-full z-20">
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <Zap className="text-yellow-400 mr-2" size={20} fill="currentColor" />
                <span className="text-lg font-bold text-white tracking-wide">StockLight</span>
            </div>
            <nav className="flex-1 px-3 py-6 space-y-1">
                <Link
                    href="/"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-md bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500 transition-all text-sm font-medium"
                >
                    <Newspaper size={18} />
                    <span>뉴스 피드</span>
                </Link>
                <Link
                    href="/themes"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all text-sm font-medium"
                >
                    <TrendingUp size={18} />
                    <span>테마 현황</span>
                </Link>
            </nav>
        </aside>
    );
}

export default function StockLightPro() {
    // 🔥 TanStack Query 사용! (isLoading, data, error, refetch를 다 줌)
    const {
        data: newsList,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['news'], // 이 쿼리의 고유 키 (캐싱용)
        queryFn: fetchNews, // 실행할 함수
    });

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-indigo-500/30">
            <Sidebar />

            <main className="flex-1 md:ml-64 p-0">
                <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
                    <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                        실시간 마켓 워치
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    </h1>
                    {/* (검색창 등은 나중에 Header 컴포넌트로 분리 가능) */}
                </header>

                <div className="p-6 max-w-[1600px] mx-auto space-y-8">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Zap size={18} className="text-yellow-400" fill="currentColor" />
                                AI News Feed
                            </h2>
                            <button
                                onClick={() => refetch()} // React Query 재요청 함수
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
                            >
                                <Filter size={14} /> 새로고침
                            </button>
                        </div>

                        {/* Loading / Error */}
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
                                <p>실시간 뉴스를 분석하고 있습니다...</p>
                            </div>
                        ) : isError ? (
                            <div className="text-center py-20 text-red-400">뉴스를 불러오는 데 실패했습니다.</div>
                        ) : (
                            <>
                                {/* 상세 분석 뉴스 (상위 5개) - 카드 형태 */}
                                <div className="mb-8">
                                    {newsList?.filter(news => news.isDetailed).map((news, idx) => (
                                        <NewsRow key={`detailed-${idx}`} data={news} />
                                    ))}
                                </div>

                                {/* 최신 뉴스 (나머지) - 리스트 형태 */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                                        최신 뉴스
                                    </h3>
                                    <div className="border border-slate-800 rounded-lg overflow-hidden">
                                        {newsList?.filter(news => !news.isDetailed).map((news, idx) => (
                                            <NewsRow key={`list-${idx}`} data={news} />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
