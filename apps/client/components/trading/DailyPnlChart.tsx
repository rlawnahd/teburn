'use client';

import { DailyHistory } from '@/lib/api/trading';

interface Props {
    dailyHistory: DailyHistory[];
    initialCapital: number;
}

export default function DailyPnlChart({ dailyHistory, initialCapital }: Props) {
    if (dailyHistory.length === 0) {
        return (
            <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4">
                <h3 className="text-[var(--text-primary)] text-sm font-medium mb-2">일별 수익률</h3>
                <p className="text-[var(--text-tertiary)] text-sm">아직 매매 기록이 없습니다.</p>
            </div>
        );
    }

    const maxValue = Math.max(...dailyHistory.map(d => d.totalValue));
    const minValue = Math.min(...dailyHistory.map(d => d.totalValue));
    const range = maxValue - minValue || 1;

    return (
        <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4">
            <h3 className="text-[var(--text-primary)] text-sm font-medium mb-3">일별 자산 추이</h3>

            <div className="flex items-end gap-[2px] h-[120px]">
                {dailyHistory.map((day) => {
                    const height = ((day.totalValue - minValue) / range) * 100;
                    const isProfit = day.totalValue >= initialCapital;
                    return (
                        <div key={day.date} className="flex-1 flex flex-col items-center justify-end group relative">
                            <div
                                className={`w-full rounded-t-sm ${isProfit ? 'bg-[var(--rise-color)]' : 'bg-[var(--fall-color)]'} opacity-70 group-hover:opacity-100 transition-opacity`}
                                style={{ height: `${Math.max(height, 4)}%` }}
                            />
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                                <p className="text-[var(--text-primary)]">{day.date}</p>
                                <p className={isProfit ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}>
                                    {day.totalPnlRate >= 0 ? '+' : ''}{day.totalPnlRate}%
                                </p>
                                <p className="text-[var(--text-secondary)]">{day.totalValue.toLocaleString()}원</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between mt-1">
                <span className="text-xs text-[var(--text-tertiary)]">
                    {dailyHistory[0]?.date.slice(5)}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                    {dailyHistory[dailyHistory.length - 1]?.date.slice(5)}
                </span>
            </div>
        </div>
    );
}
