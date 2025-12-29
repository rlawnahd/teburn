'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAnalyzedNews, NewsItem, AnalysisResult } from '@/lib/api/news';
import { useRealtimeNews } from '@/hooks/useRealtimeNews';
import NewsCard from '@/components/news/NewsCard';
import NewsModal from '@/components/news/NewsModal';
import Sidebar from '@/components/layout/Sidebar';
import { Wifi, WifiOff, Radio, Database, RefreshCw } from 'lucide-react';

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
        <div className="flex min-h-screen bg-[var(--bg-secondary)]">
            <Sidebar />

            <main className="flex-1 lg:ml-64">
                {/* 헤더 */}
                <header
                    className="
                        h-16 border-b border-[var(--border-color)]
                        flex items-center justify-between px-6
                        bg-[var(--bg-primary)] sticky top-0 z-10
                        transition-colors duration-200
                    "
                >
                    <div className="flex items-center gap-5">
                        {/* 탭 */}
                        <div className="flex items-center bg-[var(--bg-tertiary)] rounded-xl p-1">
                            <button
                                onClick={() => setActiveTab('realtime')}
                                className={`
                                    flex items-center gap-2 px-5 py-2.5 rounded-lg
                                    text-sm font-semibold transition-all duration-150
                                    ${activeTab === 'realtime'
                                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                    }
                                `}
                            >
                                <Radio size={16} />
                                실시간
                                {isConnected && (
                                    <span className="w-2 h-2 rounded-full bg-[var(--success-color)] animate-pulse-soft" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('analyzed')}
                                className={`
                                    flex items-center gap-2 px-5 py-2.5 rounded-lg
                                    text-sm font-semibold transition-all duration-150
                                    ${activeTab === 'analyzed'
                                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                    }
                                `}
                            >
                                <Database size={16} />
                                분석완료
                                {analyzedNews.length > 0 && (
                                    <span
                                        className="
                                            ml-1 px-2 py-0.5 text-xs font-bold rounded-full
                                            bg-[var(--accent-blue-light)] text-[var(--accent-blue)]
                                        "
                                    >
                                        {analyzedNews.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* 연결 상태 */}
                        <div
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                                ${isConnected
                                    ? 'bg-[var(--success-bg)] text-[var(--success-color)]'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                                }
                            `}
                        >
                            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                            {isConnected ? '연결됨' : '연결 끊김'}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-[var(--text-tertiary)] font-medium">
                            {mergedNews.length}개 뉴스
                        </span>
                        <button
                            onClick={() => refetch()}
                            className="
                                w-10 h-10 flex items-center justify-center
                                rounded-xl bg-[var(--bg-tertiary)]
                                text-[var(--text-secondary)]
                                hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]
                                transition-all duration-150
                            "
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </header>

                {/* 뉴스 카드 그리드 */}
                <div className="p-6">
                    {isAnalyzedLoading && activeTab === 'analyzed' ? (
                        <div className="flex flex-col items-center justify-center h-64 text-[var(--text-tertiary)]">
                            <RefreshCw size={32} className="animate-spin mb-4 text-[var(--accent-blue)]" />
                            <p className="text-base font-medium">불러오는 중...</p>
                        </div>
                    ) : mergedNews.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div
                                className="
                                    w-20 h-20 rounded-full mb-6
                                    bg-[var(--bg-tertiary)] flex items-center justify-center
                                "
                            >
                                <Radio size={32} className="text-[var(--text-tertiary)]" />
                            </div>
                            <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                {activeTab === 'realtime' ? '뉴스를 기다리는 중' : '분석된 뉴스가 없습니다'}
                            </p>
                            <p className="text-sm text-[var(--text-tertiary)]">
                                {activeTab === 'realtime' ? '새로운 뉴스가 곧 도착합니다' : '뉴스를 클릭하여 AI 분석을 시작하세요'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {mergedNews.map((news, idx) => (
                                <div
                                    key={`${news.link}-${idx}`}
                                    className="animate-fadeIn"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <NewsCard
                                        news={news}
                                        isSelected={selectedNews?.link === news.link}
                                        onClick={() => handleCardClick(news)}
                                    />
                                </div>
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
