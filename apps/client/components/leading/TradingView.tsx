'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTradingDashboard } from '@/lib/api/trading';
import DailyPnlChart from '@/components/trading/DailyPnlChart';

export default function TradingView() {
    const { data, isLoading } = useQuery({
        queryKey: ['tradingDashboard'],
        queryFn: fetchTradingDashboard,
        refetchInterval: 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-[var(--bg-primary)] rounded border border-[var(--border-color)] p-4 animate-pulse">
                        <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3 mb-3" />
                        <div className="h-8 bg-[var(--bg-tertiary)] rounded w-1/2 mb-2" />
                    </div>
                ))}
            </div>
        );
    }

    if (!data?.account) {
        return (
            <div className="bg-[var(--bg-primary)] rounded border border-[var(--border-color)] p-6 text-center">
                <p className="text-[var(--text-tertiary)] text-sm">아직 매매 기록이 없습니다.</p>
            </div>
        );
    }

    const account = data.account;
    const stats = data.stats;
    const isProfit = account.totalPnl >= 0;
    const winRate = stats.totalTrades > 0 ? stats.winRate : 0;

    return (
        <div className="space-y-3">
            {/* 운용 현황 요약 */}
            <div className="bg-[var(--bg-primary)] rounded border border-[var(--border-color)] p-4">
                <p className="text-[var(--text-tertiary)] text-xs mb-1">실계좌 운용 수익률</p>
                <p className={`text-3xl font-bold ${isProfit ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                    {isProfit ? '+' : ''}{account.totalPnlRate.toFixed(2)}%
                </p>
                <p className={`text-sm mt-1 ${isProfit ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                    {isProfit ? '+' : ''}{account.totalPnl.toLocaleString()}원
                </p>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
                    <div>
                        <p className="text-[var(--text-tertiary)] text-xs">총 매매</p>
                        <p className="text-[var(--text-primary)] text-sm font-medium">{stats.totalTrades}회</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-tertiary)] text-xs">승률</p>
                        <p className="text-[var(--text-primary)] text-sm font-medium">
                            {winRate}%
                        </p>
                    </div>
                    <div>
                        <p className="text-[var(--text-tertiary)] text-xs">오늘 손익</p>
                        <p className={`text-sm font-medium ${account.dailyPnl >= 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                            {account.dailyPnl >= 0 ? '+' : ''}{account.dailyPnl.toLocaleString()}원
                        </p>
                    </div>
                </div>
            </div>

            {/* 일별 수익률 차트 */}
            <DailyPnlChart
                dailyHistory={data.dailyHistory}
                initialCapital={account.initialCapital || 1000000}
            />

            {/* 매매 통계 */}
            {stats.totalTrades > 0 && (
                <div className="bg-[var(--bg-primary)] rounded border border-[var(--border-color)] p-4">
                    <h3 className="text-[var(--text-primary)] text-sm font-medium mb-3">매매 통계</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[var(--text-tertiary)] text-xs">평균 손익</p>
                            <p className={`text-sm font-medium ${stats.avgPnl >= 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                {stats.avgPnl >= 0 ? '+' : ''}{stats.avgPnl.toLocaleString()}원
                            </p>
                        </div>
                        <div>
                            <p className="text-[var(--text-tertiary)] text-xs">승패</p>
                            <p className="text-[var(--text-primary)] text-sm font-medium">
                                {account.winCount}승 {account.loseCount}패
                            </p>
                        </div>
                        <div>
                            <p className="text-[var(--text-tertiary)] text-xs">최대 수익</p>
                            <p className="text-[var(--rise-color)] text-sm font-medium">
                                +{stats.maxWin.toLocaleString()}원
                            </p>
                        </div>
                        <div>
                            <p className="text-[var(--text-tertiary)] text-xs">최대 손실</p>
                            <p className="text-[var(--fall-color)] text-sm font-medium">
                                {stats.maxLoss.toLocaleString()}원
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-[var(--text-tertiary)] text-xs text-center py-2">
                실계좌 연동 · teburn 지표 기반 운용 · 과거 수익이 미래 수익을 보장하지 않습니다
            </p>
        </div>
    );
}
