'use client';

import { DollarSign, Percent, TrendingUp, Calendar, Building2 } from 'lucide-react';
import { ETFInfo } from '@/lib/api/etf';

interface ETFCardProps {
    etf: ETFInfo;
    onClick?: () => void;
}

export default function ETFCard({ etf, onClick }: ETFCardProps) {
    const daysUntilExDate = etf.nextExDate
        ? Math.ceil(
            (new Date(etf.nextExDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
        : null;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    return (
        <div
            onClick={onClick}
            className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5 hover:shadow-[var(--shadow-md)] hover:border-[var(--accent-blue)]/50 hover:scale-[1.02] transition-all cursor-pointer"
        >
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[var(--text-primary)]">{etf.symbol}</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-[var(--accent-blue-light)] text-[var(--accent-blue)] font-medium">
                            {etf.strategy}
                        </span>
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mt-0.5">{etf.korName}</div>
                </div>
                {daysUntilExDate !== null && daysUntilExDate >= 0 && (
                    <div
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                            daysUntilExDate <= 3
                                ? 'bg-[var(--rise-bg)] text-[var(--rise-color)]'
                                : daysUntilExDate <= 7
                                    ? 'bg-[var(--warning-bg)] text-[var(--warning-color)]'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                        }`}
                    >
                        D-{daysUntilExDate}
                    </div>
                )}
            </div>

            {/* 배당률 */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[var(--success-bg)] flex items-center justify-center">
                    <TrendingUp size={14} className="text-[var(--success-color)]" />
                </div>
                <span className="text-2xl font-bold text-[var(--success-color)]">{etf.yieldRate.toFixed(1)}%</span>
                <span className="text-xs text-[var(--text-tertiary)]">연간 배당률</span>
            </div>

            {/* 정보 그리드 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[var(--text-tertiary)]" />
                    <div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">다음 배당락</div>
                        <div className="font-medium text-[var(--text-primary)]">{formatDate(etf.nextExDate)}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-[var(--text-tertiary)]" />
                    <div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">예상 분배금</div>
                        <div className="font-medium text-[var(--text-primary)]">
                            {etf.nextAmount ? `$${etf.nextAmount.toFixed(4)}` : '-'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Percent size={14} className="text-[var(--text-tertiary)]" />
                    <div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">운용보수</div>
                        <div className="font-medium text-[var(--text-primary)]">{etf.expenseRatio.toFixed(2)}%</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-[var(--text-tertiary)]" />
                    <div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">운용사</div>
                        <div className="font-medium text-[var(--text-primary)] truncate">{etf.issuer}</div>
                    </div>
                </div>
            </div>

            {/* 하단 태그 */}
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                        {etf.underlying}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                        AUM ${etf.aum}B
                    </span>
                </div>
            </div>
        </div>
    );
}
