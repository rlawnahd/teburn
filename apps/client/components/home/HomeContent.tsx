'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { BarChart3, Calendar, Activity, Settings, Globe, TrendingUp } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import HotStocksView from '@/components/leading/HotStocksView';
import TopTradingView from '@/components/leading/TopTradingView';
import LeadingSectorView from '@/components/leading/LeadingSectorView';
import CalendarView from '@/components/leading/CalendarView';
import FuturesView from '@/components/leading/FuturesView';
import FuturesWidget from '@/components/home/FuturesWidget';

type TabType = 'hot' | 'stocks' | 'sectors' | 'calendar' | 'futures';

const VALID_TABS: TabType[] = ['hot', 'stocks', 'sectors', 'calendar', 'futures'];

export default function HomeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // URL에서 탭 파라미터 읽기 (기본값: hot)
    const tabParam = searchParams.get('tab') as TabType | null;
    const activeTab: TabType = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'hot';

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: 'hot', label: '주도주 분석', icon: <Activity size={16} /> },
        { key: 'stocks', label: '테마주 거래대금', icon: <TrendingUp size={16} /> },
        { key: 'sectors', label: '주도섹터', icon: <BarChart3 size={16} /> },
        { key: 'calendar', label: '일별 기록', icon: <Calendar size={16} /> },
        { key: 'futures', label: '선물지수', icon: <Globe size={16} /> },
    ];

    const handleTabChange = (tab: TabType) => {
        // URL 파라미터 업데이트 (shallow routing)
        router.push(`/?tab=${tab}`, { scroll: false });
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 헤더 */}
            <header className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-5 bg-[var(--bg-primary)] sticky top-0 z-50">
                <div className="flex items-center gap-5">
                    {/* 로고 */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <Image
                            src="/teburn-text-logo.svg"
                            alt="TEBURN"
                            width={120}
                            height={32}
                            priority
                        />
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        실시간
                    </div>
                    <ThemeToggle />
                    <Link
                        href="/admin"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        title="어드민"
                    >
                        <Settings size={18} />
                    </Link>
                </div>
            </header>

            {/* 페이지 타이틀 + 탭 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="px-5 pt-5 pb-0">
                    {/* 타이틀 */}
                    <div className="flex items-center gap-2 mb-4">
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">주도주 탐색기</h1>
                        <span className="px-2 py-0.5 text-[10px] font-medium text-cyan-500 bg-cyan-500/10 rounded">BETA</span>
                    </div>

                    {/* 선물지수 미니 위젯 */}
                    <FuturesWidget onTabChange={(tab) => handleTabChange(tab as TabType)} />

                    {/* 탭 */}
                    <div className="flex gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                                    activeTab === tab.key
                                        ? 'text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50'
                                }`}
                            >
                                <span className={activeTab === tab.key ? 'text-cyan-500' : ''}>{tab.icon}</span>
                                <span>{tab.label}</span>
                                {activeTab === tab.key && (
                                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 컨텐츠 */}
            <main className="p-5">
                {activeTab === 'hot' && <HotStocksView />}
                {activeTab === 'stocks' && <TopTradingView />}
                {activeTab === 'sectors' && <LeadingSectorView />}
                {activeTab === 'calendar' && <CalendarView />}
                {activeTab === 'futures' && <FuturesView />}
            </main>
        </div>
    );
}
