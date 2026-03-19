'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTradingDashboard } from '@/lib/api/trading';
import PerformanceCard from '@/components/trading/PerformanceCard';
import DailyPnlChart from '@/components/trading/DailyPnlChart';
import PortfolioSection from '@/components/trading/PortfolioSection';
import TradeHistory from '@/components/trading/TradeHistory';

export default function TradingView() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['tradingDashboard'],
        queryFn: fetchTradingDashboard,
        refetchInterval: 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4 animate-pulse">
                        <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3 mb-3" />
                        <div className="h-8 bg-[var(--bg-tertiary)] rounded w-1/2 mb-2" />
                        <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/4" />
                    </div>
                ))}
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-6 text-center">
                <p className="text-[var(--text-tertiary)] text-sm mb-2">데이터를 불러올 수 없습니다.</p>
                <p className="text-[var(--text-tertiary)] text-xs">자동매매 봇이 아직 활성화되지 않았을 수 있습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">모멘텀 브레이크아웃 전략</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                        data.marketStatus.isOpen
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)]'
                    }`}>
                        {data.marketStatus.isOpen ? '매매 활성' : '대기 중'}
                    </span>
                </div>
                <p className="text-[var(--text-tertiary)] text-xs">
                    Hotness S/A등급 + 거래량 3배+ + 상승률 5%+ · 손절 -2% · 익절 +5% · 15:00 청산
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PerformanceCard account={data.account} stats={data.stats} />
                <DailyPnlChart
                    dailyHistory={data.dailyHistory}
                    initialCapital={data.account?.initialCapital || 1000000}
                />
            </div>

            <PortfolioSection positions={data.account?.positions || []} />

            <TradeHistory trades={data.recentTrades} />

            <p className="text-[var(--text-tertiary)] text-xs text-center py-2">
                본 자동매매는 실험적 서비스이며, 과거 수익이 미래 수익을 보장하지 않습니다. 투자 판단의 책임은 투자자 본인에게 있습니다.
            </p>
        </div>
    );
}
