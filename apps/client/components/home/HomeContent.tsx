'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Flame, TrendingUp, LayoutGrid, Calendar, BarChart2, Bot } from 'lucide-react';
import HotStocksView from '@/components/leading/HotStocksView';
import TopTradingView from '@/components/leading/TopTradingView';
import LeadingSectorView from '@/components/leading/LeadingSectorView';
import CalendarView from '@/components/leading/CalendarView';
import IndexView from '@/components/leading/IndexView';
import TradingView from '@/components/leading/TradingView';
import IndexWidget from '@/components/home/IndexWidget';

type TabType = 'hot' | 'stocks' | 'sectors' | 'calendar' | 'index' | 'trading';

const VALID_TABS: TabType[] = ['hot', 'stocks', 'sectors', 'calendar', 'index', 'trading'];

const TAB_CONFIG: { key: TabType; label: string; icon: typeof Flame }[] = [
    { key: 'hot', label: '주도주', icon: Flame },
    { key: 'stocks', label: '거래대금', icon: TrendingUp },
    { key: 'sectors', label: '섹터', icon: LayoutGrid },
    { key: 'calendar', label: '캘린더', icon: Calendar },
    { key: 'index', label: '지수', icon: BarChart2 },
    { key: 'trading', label: '매매일지', icon: Bot },
];

export default function HomeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tabParam = searchParams.get('tab') as TabType | null;
    const activeTab: TabType = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'hot';

    const handleTabChange = (tab: TabType) => {
        router.push(`/?tab=${tab}`, { scroll: false });
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 지수 위젯 + 탭 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="max-w-[1280px] mx-auto px-3 pt-2 pb-0">
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
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium transition-all rounded-md whitespace-nowrap ${
                                            isActive
                                                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
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
            <main className="max-w-[1280px] mx-auto p-3">
                <div key={activeTab} className="animate-contentFadeIn">
                    {activeTab === 'hot' && <HotStocksView />}
                    {activeTab === 'stocks' && <TopTradingView />}
                    {activeTab === 'sectors' && <LeadingSectorView />}
                    {activeTab === 'calendar' && <CalendarView />}
                    {activeTab === 'index' && <IndexView />}
                    {activeTab === 'trading' && <TradingView />}
                </div>
            </main>
        </div>
    );
}
