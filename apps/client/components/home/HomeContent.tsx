'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import HotStocksView from '@/components/leading/HotStocksView';
import TopTradingView from '@/components/leading/TopTradingView';
import LeadingSectorView from '@/components/leading/LeadingSectorView';
import CalendarView from '@/components/leading/CalendarView';
import IndexView from '@/components/leading/IndexView';
import IndexWidget from '@/components/home/IndexWidget';

type TabType = 'hot' | 'stocks' | 'sectors' | 'calendar' | 'index';

const VALID_TABS: TabType[] = ['hot', 'stocks', 'sectors', 'calendar', 'index'];

export default function HomeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tabParam = searchParams.get('tab') as TabType | null;
    const activeTab: TabType = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'hot';

    const tabs: { key: TabType; label: string }[] = [
        { key: 'hot', label: '주도주' },
        { key: 'stocks', label: '거래대금' },
        { key: 'sectors', label: '섹터' },
        { key: 'calendar', label: '캘린더' },
        { key: 'index', label: '지수' },
    ];

    const handleTabChange = (tab: TabType) => {
        router.push(`/?tab=${tab}`, { scroll: false });
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 지수 위젯 + 탭 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="px-3 pt-2 pb-0">
                    {/* 지수 미니 위젯 */}
                    <IndexWidget onTabChange={(tab) => handleTabChange(tab as TabType)} />

                    {/* 탭 — 밑줄 스타일 */}
                    <div className="overflow-x-auto -mx-3 px-3 scrollbar-hide">
                        <div className="flex min-w-max border-b border-transparent">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => handleTabChange(tab.key)}
                                    className={`relative px-3 py-2 text-[13px] font-medium transition-colors whitespace-nowrap ${
                                        activeTab === tab.key
                                            ? 'text-[var(--text-primary)]'
                                            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                    }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.key && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent-blue)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 컨텐츠 */}
            <main className="p-3">
                {activeTab === 'hot' && <HotStocksView />}
                {activeTab === 'stocks' && <TopTradingView />}
                {activeTab === 'sectors' && <LeadingSectorView />}
                {activeTab === 'calendar' && <CalendarView />}
                {activeTab === 'index' && <IndexView />}
            </main>
        </div>
    );
}
