'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalyzedNews, NewsItem, AnalysisResult } from '@/lib/api/news';
import { useRealtimeNews } from '@/hooks/useRealtimeNews';
import NewsCard from '@/components/news/NewsCard';
import NewsModal from '@/components/news/NewsModal';
import { Zap, Newspaper, TrendingUp, Wifi, WifiOff, Radio, Database, RefreshCw } from 'lucide-react';
import Link from 'next/link';

function Sidebar() {
    return (
        <aside className="w-56 bg-white border-r border-slate-200 hidden lg:flex flex-col fixed h-full z-20">
            <div className="h-14 flex items-center px-4 border-b border-slate-200">
                <Zap className="text-yellow-500 mr-2" size={18} fill="currentColor" />
                <span className="text-base font-bold text-slate-900 tracking-wide">StockLight</span>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
                <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-50 text-indigo-600  border-indigo-500 transition-all text-sm font-medium"
                >
                    <Newspaper size={16} />
                    <span>뉴스 피드</span>
                </Link>
                <Link
                    href="/themes"
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-medium"
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [analyzedCache, setAnalyzedCache] = useState<Record<string, AnalysisResult>>({});

    // WebSocket으로 실시간 뉴스 수신
    const { news: realtimeNews, isConnected } = useRealtimeNews([]);

    // DB에서 분석 완료된 뉴스 조회
    const {
        data: analyzedData,
        isLoading: isAnalyzedLoading,
        refetch,
    } = useQuery({
        queryKey: ['analyzedNews'],
        queryFn: () => fetchAnalyzedNews(1, 50),
    });

    const analyzedNews = analyzedData?.data || [];

    // 현재 탭에 따른 뉴스 목록
    const currentNews = activeTab === 'realtime' ? realtimeNews : analyzedNews;

    // 분석 결과 캐시에 반영
    const handleAnalyzed = (link: string, result: AnalysisResult) => {
        setAnalyzedCache((prev) => ({ ...prev, [link]: result }));
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
            const timeA = a.createdAt.replace(/\./g, '-').replace(' ', 'T');
            const timeB = b.createdAt.replace(/\./g, '-').replace(' ', 'T');
            return timeB.localeCompare(timeA);
        });

    const handleCardClick = (news: NewsItem) => {
        setSelectedNews(news);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-700 font-sans">
            <Sidebar />

            <main className="flex-1 lg:ml-56">
                {/* 헤더 */}
                <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {/* 탭 */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('realtime')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'realtime'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Radio size={14} />
                                실시간
                                {isConnected && (
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('analyzed')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    activeTab === 'analyzed'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Database size={14} />
                                분석완료
                                {analyzedNews.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-600 rounded-full font-bold">
                                        {analyzedNews.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* 연결 상태 */}
                        {isConnected ? (
                            <span className="flex items-center gap-1.5 text-sm text-green-600">
                                <Wifi size={14} />
                                연결됨
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-sm text-slate-400">
                                <WifiOff size={14} />
                                연결 끊김
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">{mergedNews.length}개 뉴스</span>
                        <button
                            onClick={() => refetch()}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </header>

                {/* 뉴스 카드 그리드 */}
                <div className="p-6">
                    {isAnalyzedLoading && activeTab === 'analyzed' ? (
                        <div className="flex items-center justify-center h-64 text-slate-500">
                            <RefreshCw size={24} className="animate-spin mr-3" />
                            불러오는 중...
                        </div>
                    ) : mergedNews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Radio size={48} className="mb-4 text-slate-300" />
                            <p className="text-lg">
                                {activeTab === 'realtime' ? '실시간 뉴스를 기다리는 중...' : '분석된 뉴스가 없습니다'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {mergedNews.map((news, idx) => (
                                <NewsCard
                                    key={`${news.link}-${idx}`}
                                    news={news}
                                    isSelected={selectedNews?.link === news.link}
                                    onClick={() => handleCardClick(news)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* 모달 */}
            <NewsModal
                news={selectedNews}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onAnalyzed={handleAnalyzed}
            />
        </div>
    );
}
