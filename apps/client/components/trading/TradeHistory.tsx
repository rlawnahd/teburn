'use client';

import { TradeRecord } from '@/lib/api/trading';

interface Props {
    trades: TradeRecord[];
}

const SELL_REASON_LABELS: Record<string, string> = {
    take_profit: '익절',
    stop_loss: '손절',
    time_exit: '시간청산',
    grade_drop: '등급하락',
    daily_limit: '일일한도',
    manual: '수동',
};

export default function TradeHistory({ trades }: Props) {
    return (
        <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4">
            <h3 className="text-[var(--text-primary)] text-sm font-medium mb-3">매매 이력</h3>

            {trades.length === 0 ? (
                <p className="text-[var(--text-tertiary)] text-sm">매매 기록이 없습니다.</p>
            ) : (
                <div className="space-y-1">
                    {trades.map((trade) => {
                        const isBuy = trade.type === 'buy';
                        const hasPnl = trade.pnl !== null;
                        const isProfit = (trade.pnl || 0) >= 0;
                        const dateStr = new Date(trade.filledAt).toLocaleDateString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                        });

                        return (
                            <div key={trade._id} className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
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
                                        <p className="text-[var(--text-tertiary)] text-xs">
                                            {dateStr}
                                            {trade.sellReason && ` · ${SELL_REASON_LABELS[trade.sellReason] || trade.sellReason}`}
                                            {trade.signal && ` · ${trade.signal.hotnessGrade}등급`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[var(--text-primary)] text-sm">
                                        {trade.filledPrice.toLocaleString()}원 × {trade.quantity}주
                                    </p>
                                    {hasPnl && (
                                        <p className={`text-xs font-medium ${isProfit ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                            {isProfit ? '+' : ''}{trade.pnl!.toLocaleString()}원 ({isProfit ? '+' : ''}{trade.pnlRate!.toFixed(2)}%)
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
