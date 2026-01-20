'use client';

import { useQuery } from '@tanstack/react-query';
import { X, RefreshCw, Crown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fetchDayDetail, DayDetailTheme } from '@/lib/api/leading';
import { useRouter } from 'next/navigation';

// 거래대금 포맷
function formatTradingValue(value: number): string {
    const billion = value / 100000000;
    if (billion >= 10000) {
        return `${(billion / 10000).toFixed(1)}조`;
    } else if (billion >= 1) {
        return `${billion.toFixed(0)}억`;
    } else {
        return `${(value / 10000).toFixed(0)}만`;
    }
}

interface CalendarDetailModalProps {
    date: string;
    onClose: () => void;
}

export default function CalendarDetailModal({ date, onClose }: CalendarDetailModalProps) {
    const router = useRouter();

    const { data: themes, isLoading } = useQuery({
        queryKey: ['dayDetail', date],
        queryFn: () => fetchDayDetail(date),
        enabled: !!date,
    });

    const dateObj = new Date(date);
    const dateLabel = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[dateObj.getDay()];

    const handleThemeClick = (themeName: string) => {
        router.push(`/themes/${encodeURIComponent(themeName)}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 백드롭 */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* 모달 */}
            <div className="relative w-full max-w-lg mx-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] shadow-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">{dateLabel}</h2>
                        <span className="text-xs text-[var(--text-tertiary)]">{dayName}요일 주도테마</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 컨텐츠 */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
                                <RefreshCw size={20} className="animate-spin text-[var(--accent-blue)]" />
                                <span>로딩 중...</span>
                            </div>
                        </div>
                    ) : !themes || themes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                            <p className="text-base font-medium">데이터가 없습니다</p>
                            <p className="text-sm mt-1">이 날짜에는 기록된 데이터가 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {themes.map((theme) => {
                                const isPositive = theme.avgChangeRate > 0;
                                return (
                                    <div
                                        key={theme.themeName}
                                        onClick={() => handleThemeClick(theme.themeName)}
                                        className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] cursor-pointer transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`text-sm font-bold w-7 h-7 rounded-md flex items-center justify-center text-white ${
                                                        theme.rank === 1
                                                            ? 'bg-amber-500'
                                                            : theme.rank === 2
                                                            ? 'bg-zinc-400'
                                                            : theme.rank === 3
                                                            ? 'bg-amber-700'
                                                            : 'bg-[var(--text-tertiary)]'
                                                    }`}
                                                >
                                                    {theme.rank}
                                                </span>
                                                <div>
                                                    <h3 className="font-bold text-[var(--text-primary)] text-sm">
                                                        {theme.themeName}
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                                                        <DollarSign size={10} />
                                                        {formatTradingValue(theme.totalTradingValue)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-lg font-bold flex items-center gap-0.5 ${
                                                    isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'
                                                }`}>
                                                    {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                    {isPositive ? '+' : ''}
                                                    {theme.avgChangeRate.toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* 대장주 */}
                                        {theme.topStock && (
                                            <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex items-center gap-2 text-xs">
                                                <Crown size={11} className="text-amber-500" />
                                                <span className="text-[var(--text-secondary)]">{theme.topStock}</span>
                                                <span className={`ml-auto font-medium ${
                                                    theme.topStockRate > 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'
                                                }`}>
                                                    {theme.topStockRate > 0 ? '+' : ''}
                                                    {theme.topStockRate.toFixed(1)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
