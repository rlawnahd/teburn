'use client';

import { Position } from '@/lib/api/trading';

interface Props {
    positions: Position[];
}

export default function PortfolioSection({ positions }: Props) {
    return (
        <div className="card p-4">
            <h3 className="text-[var(--text-primary)] text-base font-medium mb-3">현재 포트폴리오</h3>

            {positions.length === 0 ? (
                <p className="text-[var(--text-tertiary)] text-base">보유 종목이 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {positions.map((pos) => {
                        const isProfit = pos.pnl >= 0;
                        return (
                            <div key={pos.stockCode} className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
                                <div>
                                    <p className="text-[var(--text-primary)] text-base font-medium">{pos.stockName}</p>
                                    <p className="text-[var(--text-tertiary)] text-sm">
                                        {pos.quantity}주 · 평단 {pos.avgBuyPrice.toLocaleString()}원
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[var(--text-primary)] text-base">
                                        {pos.currentPrice.toLocaleString()}원
                                    </p>
                                    <p className={`text-sm font-medium ${isProfit ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                        {isProfit ? '+' : ''}{pos.pnlRate.toFixed(2)}% ({isProfit ? '+' : ''}{pos.pnl.toLocaleString()}원)
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
