'use client';

import { useQuery } from '@tanstack/react-query';
import { X, RefreshCw } from 'lucide-react';
import { fetchDayDetail } from '@/lib/api/leading';
import { useRouter } from 'next/navigation';
import { formatTradingValue } from '@/lib/utils/format';

interface CalendarDetailModalProps {
    date: string;
    onClose: () => void;
}

export default function CalendarDetailModal({ date, onClose }: CalendarDetailModalProps) {
    const router = useRouter();

    const { data: stocks, isLoading } = useQuery({
        queryKey: ['dayDetail', date],
        queryFn: () => fetchDayDetail(date),
        enabled: !!date,
    });

    const dateObj = new Date(date);
    const dateLabel = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[dateObj.getDay()];

    const handleStockClick = (stockCode: string) => {
        if (stockCode) {
            router.push(`/stocks/${encodeURIComponent(stockCode)}`);
            onClose();
        }
    };

    const handleThemeClick = (themeName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/themes/${encodeURIComponent(themeName)}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="relative w-full max-w-lg mx-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{dateLabel}</span>
                        <span className="text-xs text-[var(--text-tertiary)]">{dayName}요일</span>
                        <span className="text-xs text-[var(--text-tertiary)]">주도주</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* 테이블 헤더 */}
                <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[11px] text-[var(--text-tertiary)]">
                    <span className="w-5 text-center">#</span>
                    <span className="flex-1">종목</span>
                    <span className="w-14 text-right">거래대금</span>
                    <span className="w-16 text-right">등락률</span>
                </div>

                {/* 컨텐츠 */}
                <div className="max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                                <RefreshCw size={14} className="animate-spin" />
                                <span>로딩 중...</span>
                            </div>
                        </div>
                    ) : !stocks || stocks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                            <p className="text-sm">데이터가 없습니다</p>
                        </div>
                    ) : (
                        stocks.map((stock) => {
                            const isPositive = stock.changeRate > 0;
                            return (
                                <div
                                    key={`${stock.stockCode || stock.stockName}-${stock.rank}`}
                                    onClick={() => handleStockClick(stock.stockCode)}
                                    className={`px-3 py-2 border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors ${stock.stockCode ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-semibold w-5 text-center flex-shrink-0 ${
                                            stock.rank <= 3 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'
                                        }`}>
                                            {stock.rank}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{stock.stockName}</span>
                                                {stock.changeRate >= 29.9 && (
                                                    <span className="px-1 py-0.5 text-[10px] font-bold text-white bg-[var(--rise-color)] flex-shrink-0 rounded-sm">
                                                        상한가
                                                    </span>
                                                )}
                                            </div>
                                            {stock.themes.length > 0 && (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {stock.themes.slice(0, 2).map((theme) => (
                                                        <button
                                                            key={theme}
                                                            onClick={(e) => handleThemeClick(theme, e)}
                                                            className="text-[11px] text-[var(--accent-blue)] hover:underline truncate max-w-[80px]"
                                                        >
                                                            {theme}
                                                        </button>
                                                    ))}
                                                    {stock.themes.length > 2 && (
                                                        <span className="text-[11px] text-[var(--text-tertiary)]">+{stock.themes.length - 2}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-[var(--text-tertiary)] w-14 text-right flex-shrink-0">
                                            {formatTradingValue(stock.tradingValue)}
                                        </span>
                                        <span className={`text-base font-bold w-16 text-right flex-shrink-0 ${
                                            isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'
                                        }`}>
                                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
