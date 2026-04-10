'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Flame, LayoutGrid, Calendar, BarChart2 } from 'lucide-react';
import HotStocksView from '@/components/leading/HotStocksView';
import LeadingSectorView from '@/components/leading/LeadingSectorView';
import CalendarView from '@/components/leading/CalendarView';
import IndexView from '@/components/leading/IndexView';
import IndexWidget from '@/components/home/IndexWidget';
import MarketStatusBar from '@/components/home/MarketStatusBar';
import TickerStrip from '@/components/home/TickerStrip';
import LandingPage from '@/components/landing/LandingPage';
import { useAuth } from '@/hooks/useAuth';

type TabType = 'hot' | 'sectors' | 'calendar' | 'index';

const VALID_TABS: TabType[] = ['hot', 'sectors', 'calendar', 'index'];

const TAB_CONFIG: { key: TabType; label: string; icon: typeof Flame }[] = [
    { key: 'hot', label: '주도주', icon: Flame },
    { key: 'sectors', label: '섹터', icon: LayoutGrid },
    { key: 'calendar', label: '캘린더', icon: Calendar },
    { key: 'index', label: '지수', icon: BarChart2 },
];

export default function HomeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isLoggedIn, isLoading } = useAuth();

    const tabParam = searchParams.get('tab') as TabType | null;
    const activeTab: TabType = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'hot';

    const handleTabChange = (tab: TabType) => {
        router.push(`/?tab=${tab}`, { scroll: false });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
                <div className="text-sm text-[var(--text-tertiary)]">로딩 중...</div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return <LandingPage />;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 티커 스트립 */}
            <TickerStrip />

            {/* 시장 상태 + KPI 한 줄 */}
            <MarketStatusBar />

            {/* 지수 위젯 + 탭 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="max-w-[1280px] mx-auto px-4 pt-3 pb-0">
                    <IndexWidget onTabChange={(tab) => handleTabChange(tab as TabType)} />

                    {/* 탭 — pill 스타일 */}
                    <div className="overflow-x-auto -mx-3 px-3 scrollbar-hide">
                        <div className="flex gap-1 min-w-max py-1">
                            {TAB_CONFIG.map((tab) => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => handleTabChange(tab.key)}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all rounded-lg whitespace-nowrap ${
                                            isActive
                                                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] tab-active'
                                                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                        }`}
                                    >
                                        <tab.icon size={13} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* 컨텐츠 */}
            <main className="max-w-[1280px] mx-auto p-4">
                <div key={activeTab} className="animate-contentFadeIn">
                    {activeTab === 'hot' && <HotStocksView />}
                    {activeTab === 'sectors' && <LeadingSectorView />}
                    {activeTab === 'calendar' && <CalendarView />}
                    {activeTab === 'index' && <IndexView />}
                </div>
            </main>
        </div>
    );
}
