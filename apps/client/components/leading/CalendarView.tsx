'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchCalendarData, CalendarDay } from '@/lib/api/leading';
import CalendarDetailModal from './CalendarDetailModal';

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function DateCell({
    date,
    isToday,
    isCurrentMonth,
    dayData,
    onClick,
}: {
    date: Date;
    isToday: boolean;
    isCurrentMonth: boolean;
    dayData: CalendarDay | undefined;
    onClick: () => void;
}) {
    const day = date.getDate();
    const hasData = dayData && dayData.topStocks.length > 0;

    return (
        <div
            onClick={hasData ? onClick : undefined}
            onKeyDown={
                hasData
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onClick();
                          }
                      }
                    : undefined
            }
            role={hasData ? 'button' : undefined}
            tabIndex={hasData ? 0 : undefined}
            aria-label={hasData ? `${day}일 주도주 상세 보기` : undefined}
            className={`relative min-h-[90px] md:min-h-[110px] p-2 md:p-2.5 rounded-lg transition-colors ${
                isCurrentMonth ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)]/60'
            } ${isToday ? 'bg-[var(--accent)]/5 ring-1 ring-inset ring-[var(--accent)]/40' : ''} ${
                hasData ? 'cursor-pointer hover:bg-[var(--bg-tertiary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]' : ''
            }`}
        >
            {/* Data indicator dot */}
            {hasData && !isToday && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]/40" />
            )}

            <div
                className={`text-sm font-medium mb-1.5 ${
                    isToday
                        ? 'w-6 h-6 bg-[var(--accent)] text-white rounded-full flex items-center justify-center text-xs'
                        : isCurrentMonth
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-disabled)]'
                }`}
            >
                {day}
            </div>

            {hasData ? (
                <div className="space-y-1">
                    {dayData.topStocks.slice(0, 3).map((stock, idx) => {
                        const isPositive = stock.changeRate > 0;
                        const isTop = idx === 0;
                        const rateColor = isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]';
                        const themeTag = stock.themes?.[0] || null;

                        if (isTop) {
                            const aiReason = (stock as any).reason as string | undefined;
                            return (
                                <div key={`${stock.stockCode || stock.stockName}-${idx}`} className="mb-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[14px] font-bold truncate text-[var(--text-primary)]">
                                            {stock.stockName}
                                        </span>
                                        <span className={`text-[12px] font-semibold flex-shrink-0 ${rateColor}`}>
                                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(1)}%
                                        </span>
                                    </div>
                                    {themeTag && (
                                        <div className="text-[11px] font-medium text-[var(--accent)] truncate mt-0.5">
                                            #{themeTag}
                                        </div>
                                    )}
                                    {aiReason && (
                                        <div className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5 leading-tight">
                                            💡 {aiReason}
                                        </div>
                                    )}
                                    {/* 구분선 */}
                                    <div className="border-t border-[var(--border-color)]/40 mt-1" />
                                </div>
                            );
                        }

                        return (
                            <div
                                key={`${stock.stockCode || stock.stockName}-${idx}`}
                                className="flex items-baseline justify-between gap-1"
                            >
                                <div className="flex items-baseline gap-0.5 min-w-0">
                                    <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">
                                        {idx + 1}
                                    </span>
                                    <span className="text-xs text-[var(--text-secondary)] truncate">
                                        {stock.stockName}
                                    </span>
                                </div>
                                <span className={`text-[11px] font-medium flex-shrink-0 ${rateColor}`}>
                                    {isPositive ? '+' : ''}{stock.changeRate.toFixed(1)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : isCurrentMonth ? (
                <div className="flex-1 flex items-center justify-center pt-4">
                    <div className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
                </div>
            ) : null}
        </div>
    );
}

export default function CalendarView() {
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const { data: calendarData, isLoading } = useQuery({
        queryKey: ['calendarData', currentYear, currentMonth],
        queryFn: () => fetchCalendarData(currentYear, currentMonth),
    });

    const dataByDate = useMemo(() => {
        const map = new Map<string, CalendarDay>();
        if (calendarData) {
            for (const day of calendarData) {
                map.set(day.date, day);
            }
        }
        return map;
    }, [calendarData]);

    // 평일(월~금)만 생성
    const calendarDates = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth - 1, 1);
        const lastDay = new Date(currentYear, currentMonth, 0);

        // 월초가 포함된 주의 월요일 찾기
        const startDate = new Date(firstDay);
        const dow = startDate.getDay();
        if (dow === 0) {
            startDate.setDate(startDate.getDate() - 6); // 일요일 → 전주 월요일
        } else if (dow > 1) {
            startDate.setDate(startDate.getDate() - (dow - 1));
        }

        // 월말이 포함된 주의 금요일 찾기
        const endDate = new Date(lastDay);
        const endDow = endDate.getDay();
        if (endDow === 0) {
            endDate.setDate(endDate.getDate() - 2); // 일요일 → 전주 금요일
        } else if (endDow === 6) {
            endDate.setDate(endDate.getDate() - 1); // 토요일 → 금요일
        } else if (endDow < 5) {
            endDate.setDate(endDate.getDate() + (5 - endDow)); // 해당 주 금요일
        }

        const dates: Date[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const d = current.getDay();
            if (d >= 1 && d <= 5) {
                dates.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }, [currentYear, currentMonth]);

    const handlePrevMonth = () => {
        if (currentMonth === 1) {
            setCurrentYear(currentYear - 1);
            setCurrentMonth(12);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 12) {
            setCurrentYear(currentYear + 1);
            setCurrentMonth(1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleToday = () => {
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth() + 1);
    };

    const handleDateClick = (date: Date) => {
        const dateStr = formatLocalDate(date);
        setSelectedDate(dateStr);
    };

    const dayNames = ['월', '화', '수', '목', '금'];

    return (
        <div className="space-y-3">
            {/* 캘린더 카드 */}
            <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden">
                {/* 헤더 — 카드 내부 */}
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-primary)]">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">캘린더</h2>
                        <span className="text-sm text-[var(--text-tertiary)]">일별 주도주</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleToday}
                            className="px-3 py-1 text-xs font-medium rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            오늘
                        </button>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handlePrevMonth}
                                className="w-7 h-7 flex items-center justify-center rounded-xl text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="px-1 text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap tabular-nums">
                                {currentYear}.{String(currentMonth).padStart(2, '0')}
                            </span>
                            <button
                                onClick={handleNextMonth}
                                className="w-7 h-7 flex items-center justify-center rounded-xl text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-5 bg-[var(--bg-secondary)]">
                    {dayNames.map((name) => (
                        <div
                            key={name}
                            className="text-center py-2 text-xs font-medium text-[var(--text-tertiary)]"
                        >
                            {name}
                        </div>
                    ))}
                </div>

                {/* 날짜 그리드 */}
                {isLoading ? (
                    <div className="grid grid-cols-5 gap-px bg-[var(--border-color)]/30 p-1">
                        {Array.from({ length: 25 }).map((_, i) => (
                            <div key={i} className="min-h-[90px] md:min-h-[110px] p-2 md:p-2.5 rounded-lg bg-[var(--bg-primary)]">
                                <Skeleton className="h-3 w-4 rounded-sm mb-2" />
                                <Skeleton className="h-3 w-full rounded-sm mb-1" />
                                <Skeleton className="h-2 w-2/3 rounded-sm" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-px bg-[var(--border-color)]/20 p-0.5">
                        {calendarDates.map((date, i) => {
                            const dateStr = formatLocalDate(date);
                            const isToday =
                                date.getDate() === today.getDate() &&
                                date.getMonth() === today.getMonth() &&
                                date.getFullYear() === today.getFullYear();
                            const isCurrentMonth = date.getMonth() === currentMonth - 1;

                            return (
                                <DateCell
                                    key={i}
                                    date={date}
                                    isToday={isToday}
                                    isCurrentMonth={isCurrentMonth}
                                    dayData={dataByDate.get(dateStr)}
                                    onClick={() => handleDateClick(date)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedDate && (
                <CalendarDetailModal date={selectedDate} onClose={() => setSelectedDate(null)} />
            )}
        </div>
    );
}
