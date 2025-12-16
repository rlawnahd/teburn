'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalyzedNews, NewsItem, AnalysisResult } from '@/lib/api/news';
import { useRealtimeNews } from '@/hooks/useRealtimeNews';
import NewsTable from '@/components/news/NewsTable';
import NewsDetailPanel from '@/components/news/NewsDetailPanel';
import { Zap, Newspaper, TrendingUp, Wifi, WifiOff, Radio, Database, RefreshCw } from 'lucide-react';
import Link from 'next/link';

function Sidebar() {
    return (
        <aside className="w-56 bg-[#0B1120] border-r border-slate-800 hidden lg:flex flex-col fixed h-full z-20">
            <div className="h-14 flex items-center px-4 border-b border-slate-800">
                <Zap className="text-yellow-400 mr-2" size={18} fill="currentColor" />
                <span className="text-base font-bold text-white tracking-wide">StockLight</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
                <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500 transition-all text-sm font-medium"
                >
                    <Newspaper size={16} />
                    <span>뉴스 피드</span>
                </Link>
                <Link
                    href="/themes"
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all text-sm font-medium"
                >
                    <TrendingUp size={16} />
                    <span>테마 현황</span>
                </Link>
            </nav>
        </aside>
    );
}

type TabType = 'realtime' | 'analyzed';

export default function StockLightPro() {
    const [activeTab, setActiveTab] = useState<TabType>('realtime');
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
    const [analyzedCache, setAnalyzedCache] = useState<Record<string, AnalysisResult>>({});

    // WebSocket으로 실시간 뉴스 수신
    const { news: realtimeNews, isConnected } = useRealtimeNews([]);

    // DB에서 분석 완료된 뉴스 조회
    const { data: analyzedData, isLoading: isAnalyzedLoading, refetch } = useQuery({
        queryKey: ['analyzedNews'],
        queryFn: () => fetchAnalyzedNews(1, 50),
    });

    const analyzedNews = analyzedData?.data || [];

    // 현재 탭에 따른 뉴스 목록
    const currentNews = activeTab === 'realtime' ? realtimeNews : analyzedNews;

    // 분석 결과 캐시에 반영
    const handleAnalyzed = (link: string, result: AnalysisResult) => {
        setAnalyzedCache((prev) => ({ ...prev, [link]: result }));
        // 분석 완료 목록 새로고침
        refetch();
    };

    // 뉴스 목록에 캐시된 분석 결과 병합 + 시간순 정렬
    const mergedNews = currentNews
        .map((news) => {
            const cached = analyzedCache[news.link];
            if (cached) {
                return { ...news, ...cached };
            }
            return news;
        })
        .sort((a, b) => {
            // "2024.12.09 14:32" 형태를 비교 가능하게 변환
            const timeA = a.createdAt.replace(/\./g, '-').replace(' ', 'T');
            const timeB = b.createdAt.replace(/\./g, '-').replace(' ', 'T');
            return timeB.localeCompare(timeA); // 최신순
        });

    // 선택된 뉴스가 없으면 첫 번째 뉴스 사용
    const displayedNews = selectedNews || (mergedNews.length > 0 ? mergedNews[0] : null);

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-indigo-500/30">
            <Sidebar />

            <main className="flex-1 lg:ml-56">
                {/* 헤더 */}
                <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {/* 탭 */}
                        <div className="flex items-center bg-slate-900 rounded-lg p-0.5">
                            <button
                                onClick={() => setActiveTab('realtime')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    activeTab === 'realtime'
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                <Radio size={12} />
                                실시간
                                {isConnected && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('analyzed')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    activeTab === 'analyzed'
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                <Database size={12} />
                                분석완료
                                {analyzedNews.length > 0 && (
                                    <span className="text-indigo-400">{analyzedNews.length}</span>
                                )}
                            </button>
                        </div>

                        {/* 연결 상태 */}
                        {isConnected ? (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                                <Wifi size={12} />
                                연결됨
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                <WifiOff size={12} />
                                연결 끊김
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                            {mergedNews.length}개 뉴스
                        </span>
                        <button
                            onClick={() => refetch()}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </header>

                {/* 2단 레이아웃 */}
                <div className="flex h-[calc(100vh-56px)]">
                    {/* 왼쪽: 뉴스 테이블 */}
                    <div className="flex-1 min-w-0 p-4 border-r border-slate-800 overflow-hidden">
                        {isAnalyzedLoading && activeTab === 'analyzed' ? (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                <RefreshCw size={20} className="animate-spin mr-2" />
                                불러오는 중...
                            </div>
                        ) : mergedNews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <Radio size={32} className="mb-3 text-slate-700" />
                                <p className="text-sm">
                                    {activeTab === 'realtime'
                                        ? '실시간 뉴스를 기다리는 중...'
                                        : '분석된 뉴스가 없습니다'}
                                </p>
                            </div>
                        ) : (
                            <NewsTable
                                news={mergedNews}
                                selectedLink={selectedNews?.link || null}
                                onSelect={setSelectedNews}
                            />
                        )}
                    </div>

                    {/* 오른쪽: 상세 패널 */}
                    <div className="w-[400px] shrink-0 bg-slate-900/30">
                        <NewsDetailPanel
                            news={displayedNews}
                            onAnalyzed={handleAnalyzed}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
