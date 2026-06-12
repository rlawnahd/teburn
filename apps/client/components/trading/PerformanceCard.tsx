'use client';

import { TradingAccountData, TradingStats } from '@/lib/api/trading';

interface Props {
    account: TradingAccountData | null;
    stats: TradingStats;
}

export default function PerformanceCard({ account, stats }: Props) {
    if (!account) {
        return (
            <div className="card p-4">
                <p className="text-[var(--text-tertiary)] text-base">매매 데이터가 없습니다.</p>
            </div>
        );
    }

    const isProfit = account.totalPnl >= 0;
    const winRate = stats.totalTrades > 0 ? stats.winRate : 0;

    return (
        <div className="card p-4">
            <div className="mb-4">
                <p className="text-[var(--text-tertiary)] text-sm mb-1">총 수익률</p>
                <p className={`text-2xl font-bold ${isProfit ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                    {isProfit ? '+' : ''}{account.totalPnlRate.toFixed(2)}%
                </p>
                <p className={`text-base ${isProfit ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                    {isProfit ? '+' : ''}{account.totalPnl.toLocaleString()}원
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <p className="text-[var(--text-tertiary)] text-sm">총 평가금액</p>
                    <p className="text-[var(--text-primary)] text-base font-medium">
                        {account.totalValue.toLocaleString()}원
                    </p>
                </div>
                <div>
                    <p className="text-[var(--text-tertiary)] text-sm">현금</p>
                    <p className="text-[var(--text-primary)] text-base font-medium">
                        {account.cash.toLocaleString()}원
                    </p>
                </div>
                <div>
                    <p className="text-[var(--text-tertiary)] text-sm">승률</p>
                    <p className="text-[var(--text-primary)] text-base font-medium">
                        {winRate}% ({account.winCount}승 {account.loseCount}패)
                    </p>
                </div>
                <div>
                    <p className="text-[var(--text-tertiary)] text-sm">오늘 손익</p>
                    <p className={`text-base font-medium ${account.dailyPnl >= 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                        {account.dailyPnl >= 0 ? '+' : ''}{account.dailyPnl.toLocaleString()}원
                    </p>
                </div>
                <div>
                    <p className="text-[var(--text-tertiary)] text-sm">최대 수익</p>
                    <p className="text-[var(--rise-color)] text-base font-medium">
                        +{stats.maxWin.toLocaleString()}원
                    </p>
                </div>
                <div>
                    <p className="text-[var(--text-tertiary)] text-sm">최대 손실</p>
                    <p className="text-[var(--fall-color)] text-base font-medium">
                        {stats.maxLoss.toLocaleString()}원
                    </p>
                </div>
            </div>
        </div>
    );
}
