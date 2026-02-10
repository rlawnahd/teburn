'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from 'lucide-react';
import { fetchCalendarData, CalendarDay } from '@/lib/api/leading';
import CalendarDetailModal from './CalendarDetailModal';

// 로컬 시간 기준 날짜 포맷 (YYYY-MM-DD)
function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 날짜 셀 컴포넌트
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
    const hasData = dayData && dayData.topThemes.length > 0;
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    return (
        <div
            onClick={hasData ? onClick : undefined}
            className={`relative min-h-[60px] md:min-h-[90px] p-1 md:p-2 border-r border-b border-[var(--border-color)] transition-all ${
                isCurrentMonth ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)]/50'
            } ${hasData ? 'cursor-pointer hover:bg-[var(--bg-tertiary)]' : ''}`}
        >
            {/* 날짜 */}
            <div
                className={`text-xs font-medium mb-1.5 ${
                    isToday
                        ? 'w-6 h-6 rounded-full bg-[var(--accent-blue)] text-white flex items-center justify-center'
                        : isCurrentMonth
                        ? isSunday
                            ? 'text-[var(--rise-color)]'
                            : isSaturday
                            ? 'text-[var(--accent-blue)]'
                            : 'text-[var(--text-primary)]'
                        : 'text-[var(--text-tertiary)]'
                }`}
            >
                {day}
            </div>

            {/* 주도 테마 TOP 3 */}
            {hasData && (
                <div className="space-y-0.5">
                    {dayData.topThemes.slice(0, 3).map((theme, i) => {
                        const isPositive = theme.avgChangeRate > 0;
                        return (
                            <div
                                key={theme.themeName}
                                className={`text-[7px] md:text-[9px] px-0.5 md:px-1 py-0.5 rounded truncate ${
                                    isPositive
                                        ? 'bg-[var(--rise-bg)] text-[var(--rise-color)]'
                                        : 'bg-[var(--fall-bg)] text-[var(--fall-color)]'
                                }`}
                            >
                                <span className="font-bold mr-0.5 opacity-50">{i + 1}</span>
                                {theme.themeName}
                                <span className="ml-0.5 opacity-60 hidden sm:inline">
                                    {isPositive ? '+' : ''}
                                    {theme.avgChangeRate.toFixed(1)}%
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

    // 달력 데이터를 날짜별로 매핑
    const dataByDate = useMemo(() => {
        const map = new Map<string, CalendarDay>();
        if (calendarData) {
            for (const day of calendarData) {
                map.set(day.date, day);
            }
        }
        return map;
    }, [calendarData]);

    // 달력 날짜 생성
    const calendarDates = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth - 1, 1);
        const lastDay = new Date(currentYear, currentMonth, 0);
        const startDay = firstDay.getDay(); // 0 = 일요일

        const dates: Date[] = [];

        // 이전 달 날짜 채우기
        for (let i = startDay - 1; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - 1, -i);
            dates.push(d);
        }

        // 현재 달 날짜
        for (let i = 1; i <= lastDay.getDate(); i++) {
            dates.push(new Date(currentYear, currentMonth - 1, i));
        }

        // 다음 달 날짜 채우기 (6주 = 42일)
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
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[var(--accent-blue)]/10 flex items-center justify-center flex-shrink-0">
                        <Calendar size={16} className="md:w-5 md:h-5 text-[var(--accent-blue)]" />
                    </div>
                    <div>
                        <h2 className="text-sm md:text-base font-bold text-[var(--text-primary)]">주도테마 캘린더</h2>
                        <p className="text-[10px] md:text-xs text-[var(--text-tertiary)]">날짜별 주도 테마 TOP 3</p>
                    </div>
                </div>

                {/* 월 네비게이션 */}
                <div className="flex items-center gap-1 md:gap-2">
                    <button
                        onClick={handleToday}
                        className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-all"
                    >
                        오늘
                    </button>
                    <div className="flex items-center gap-0.5 md:gap-1 p-0.5 md:p-1 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                        <button
                            onClick={handlePrevMonth}
                            className="w-6 h-6 md:w-7 md:h-7 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all"
                        >
                            <ChevronLeft size={14} className="md:w-4 md:h-4" />
                        </button>
                        <span className="px-1.5 md:px-3 text-xs md:text-sm font-bold text-[var(--text-primary)] whitespace-nowrap">
                            {currentYear}.{currentMonth}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="w-6 h-6 md:w-7 md:h-7 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all"
                        >
                            <ChevronRight size={14} className="md:w-4 md:h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 캘린더 */}
            <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                    {dayNames.map((name, i) => (
                        <div
                            key={name}
                            className={`text-center py-2 text-xs font-medium ${
                                i === 0
                                    ? 'text-[var(--rise-color)]'
                                    : i === 6
                                    ? 'text-[var(--accent-blue)]'
                                    : 'text-[var(--text-tertiary)]'
                            }`}
                        >
                            {name}
                        </div>
                    ))}
                </div>

                {/* 날짜 그리드 */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
                            <RefreshCw size={20} className="animate-spin text-[var(--accent-blue)]" />
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

            {/* 상세 모달 */}
            {selectedDate && (
                <CalendarDetailModal date={selectedDate} onClose={() => setSelectedDate(null)} />
            )}
        </div>
    );
}
