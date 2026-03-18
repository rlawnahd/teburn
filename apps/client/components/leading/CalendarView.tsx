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
            className={`relative min-h-[64px] md:min-h-[88px] p-1.5 md:p-2 border-r border-b border-[var(--border-color)] ${
                isCurrentMonth ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)]'
            } ${isToday ? 'ring-1 ring-inset ring-[var(--accent-blue)]' : ''} ${
                hasData ? 'cursor-pointer hover:bg-[var(--bg-tertiary)]' : ''
            }`}
        >
            <div
                className={`text-[12px] md:text-[13px] font-medium mb-1 ${
                    isToday
                        ? 'w-5 h-5 bg-[var(--accent-blue)] text-white rounded-full flex items-center justify-center'
                        : isCurrentMonth
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-disabled)]'
                }`}
            >
                {day}
            </div>

            {hasData && (
                <div className="space-y-0.5">
                    {dayData.topStocks.slice(0, 3).map((stock, idx) => {
                        const isPositive = stock.changeRate > 0;
                        const isTop = idx === 0;
                        const colorClass = isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]';
                        const themeTag = stock.themes?.[0] || null;

                        if (isTop) {
                            return (
                                <div key={`${stock.stockCode || stock.stockName}-${idx}`}>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-[11px] md:text-[12px] font-semibold truncate ${colorClass}`}>
                                            {stock.stockName}
                                        </span>
                                        <span className={`text-[10px] md:text-[11px] font-medium flex-shrink-0 ${colorClass}`}>
                                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(1)}%
                                        </span>
                                    </div>
                                    {themeTag && (
                                        <div className="text-[8px] md:text-[9px] text-[var(--text-tertiary)] truncate">
                                            {themeTag}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div
                                key={`${stock.stockCode || stock.stockName}-${idx}`}
                                className="flex items-baseline gap-1"
                            >
                                <span className={`text-[9px] md:text-[10px] truncate opacity-50 ${colorClass}`}>
                                    {stock.stockName}
                                </span>
                                {themeTag && (
                                    <span className="text-[7px] md:text-[8px] text-[var(--text-disabled)] truncate flex-shrink-0">
                                        {themeTag}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
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
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">캘린더</h2>
                    <span className="text-[11px] text-[var(--text-tertiary)]">일별 주도주</span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleToday}
                        className="px-2 py-1 text-[11px] font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                        오늘
                    </button>
                    <div className="flex items-center border border-[var(--border-color)]">
                        <button
                            onClick={handlePrevMonth}
                            className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] border-r border-[var(--border-color)]"
                        >
                            <ChevronLeft size={12} />
                        </button>
                        <span className="px-2 text-[13px] font-medium text-[var(--text-primary)] whitespace-nowrap">
                            {currentYear}.{String(currentMonth).padStart(2, '0')}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] border-l border-[var(--border-color)]"
                        >
                            <ChevronRight size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 캘린더 */}
            <div className="border border-[var(--border-color)] overflow-hidden">
                {/* 요일 헤더 */}
                <div className="grid grid-cols-5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                    {dayNames.map((name) => (
                        <div
                            key={name}
                            className="text-center py-1 text-[11px] font-medium text-[var(--text-tertiary)]"
                        >
                            {name}
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-5">
                        {Array.from({ length: 25 }).map((_, i) => (
                            <div key={i} className="min-h-[64px] md:min-h-[88px] p-1.5 md:p-2 border-r border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                                <Skeleton className="h-3 w-4 rounded-sm mb-2" />
                                <Skeleton className="h-3 w-full rounded-sm mb-1" />
                                <Skeleton className="h-2 w-2/3 rounded-sm" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-5">
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
