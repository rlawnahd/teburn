'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTradingDashboard, fetchTradeHistory, KiwoomTrade } from '@/lib/api/trading';
import PerformanceCard from '@/components/trading/PerformanceCard';
import DailyPnlChart from '@/components/trading/DailyPnlChart';
import PortfolioSection from '@/components/trading/PortfolioSection';

export default function TradingView() {
    const { data: dashboard, isLoading } = useQuery({
        queryKey: ['tradingDashboard'],
        queryFn: fetchTradingDashboard,
        refetchInterval: 60 * 1000,
    });

    const { data: historyData } = useQuery({
        queryKey: ['tradeHistory'],
        queryFn: () => fetchTradeHistory(),
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

    if (!dashboard) {
        return (
            <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-6 text-center">
                <p className="text-[var(--text-tertiary)] text-sm">키움증권 계좌가 연동되지 않았습니다.</p>
            </div>
        );
    }

    const trades = historyData?.trades || [];

    return (
        <div className="space-y-3">
            {/* 계좌 현황 + 차트 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <PerformanceCard account={dashboard.account} stats={dashboard.stats} />
                <DailyPnlChart
                    dailyHistory={dashboard.dailyHistory}
                    initialCapital={dashboard.account?.initialCapital || 1000000}
                />
            </div>

            {/* 보유 종목 */}
            <PortfolioSection positions={dashboard.account?.positions || []} />

            {/* 오늘의 체결 내역 (키움 실데이터) */}
            <RealTradeHistory trades={trades} />

            <p className="text-[var(--text-tertiary)] text-xs text-center py-2">
                키움증권 계좌 실시간 연동 · 과거 수익이 미래 수익을 보장하지 않습니다
            </p>
        </div>
    );
}

function RealTradeHistory({ trades }: { trades: KiwoomTrade[] }) {
    return (
        <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4">
            <h3 className="text-[var(--text-primary)] text-sm font-medium mb-3">오늘의 체결 내역</h3>

            {trades.length === 0 ? (
                <p className="text-[var(--text-tertiary)] text-sm">오늘 체결 내역이 없습니다.</p>
            ) : (
                <div className="space-y-1">
                    {trades.map((trade) => {
                        const isBuy = trade.ioBuySell.includes('매수');
                        const time = trade.orderTime
                            ? `${trade.orderTime.slice(0, 2)}:${trade.orderTime.slice(2, 4)}:${trade.orderTime.slice(4, 6)}`
                            : '';

                        return (
                            <div key={trade.orderNo} className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                        isBuy
                                            ? 'bg-[var(--rise-color)]/10 text-[var(--rise-color)]'
                                            : 'bg-[var(--fall-color)]/10 text-[var(--fall-color)]'
                                    }`}>
                                        {isBuy ? '매수' : '매도'}
                                    </span>
                                    <div>
                                        <p className="text-[var(--text-primary)] text-sm">{trade.stockName}</p>
                                        <p className="text-[var(--text-tertiary)] text-xs">{time}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[var(--text-primary)] text-sm">
                                        {trade.filledPrice.toLocaleString()}원
                                    </p>
                                    <p className="text-[var(--text-tertiary)] text-xs">
                                        {trade.filledQty.toLocaleString()}주 · {(trade.filledPrice * trade.filledQty).toLocaleString()}원
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
