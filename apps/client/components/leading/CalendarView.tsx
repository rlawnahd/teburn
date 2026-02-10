'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
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
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    return (
        <div
            onClick={hasData ? onClick : undefined}
            className={`relative min-h-[56px] md:min-h-[80px] p-1 md:p-1.5 border-r border-b border-[var(--border-color)] ${
                isCurrentMonth ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)]'
            } ${hasData ? 'cursor-pointer hover:bg-[var(--bg-tertiary)]' : ''}`}
        >
            <div
                className={`text-[11px] md:text-[13px] font-medium mb-1 ${
                    isToday
                        ? 'w-5 h-5 bg-[var(--accent-blue)] text-white flex items-center justify-center'
                        : isCurrentMonth
                        ? isSunday
                            ? 'text-[var(--rise-color)]'
                            : isSaturday
                            ? 'text-[var(--accent-blue)]'
                            : 'text-[var(--text-primary)]'
                        : 'text-[var(--text-disabled)]'
                }`}
            >
                {day}
            </div>

            {hasData && (
                <div className="space-y-px">
                    {dayData.topStocks.slice(0, 3).map((stock, idx) => {
                        const isPositive = stock.changeRate > 0;
                        return (
                            <div
                                key={`${stock.stockCode || stock.stockName}-${idx}`}
                                className={`text-[9px] md:text-[9px] px-0.5 truncate ${
                                    isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'
                                }`}
                            >
                                {stock.stockName}
                                <span className="opacity-60 hidden sm:inline ml-0.5">
                                    {isPositive ? '+' : ''}{stock.changeRate.toFixed(1)}%
                                </span>
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

    const calendarDates = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth - 1, 1);
        const lastDay = new Date(currentYear, currentMonth, 0);
        const startDay = firstDay.getDay();

        const dates: Date[] = [];

        for (let i = startDay - 1; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - 1, -i);
            dates.push(d);
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            dates.push(new Date(currentYear, currentMonth - 1, i));
        }

        const remaining = 42 - dates.length;
        for (let i = 1; i <= remaining; i++) {
            dates.push(new Date(currentYear, currentMonth, i));
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

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

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
                <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                    {dayNames.map((name, i) => (
                        <div
                            key={name}
                            className={`text-center py-1 text-[11px] font-medium ${
                                i === 0 ? 'text-[var(--rise-color)]' : i === 6 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'
                            }`}
                        >
                            {name}
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
                            <RefreshCw size={14} className="animate-spin" />
                            <span>로딩 중...</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-7">
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
