'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent } from '@/lib/api/etf';

interface DividendCalendarProps {
    events: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
}

export default function DividendCalendar({ events, onEventClick }: DividendCalendarProps) {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const monthEvents = useMemo(() => {
        const yearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        return events.filter((e) => e.date.startsWith(yearMonth));
    }, [events, currentMonth, currentYear]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const event of monthEvents) {
            if (!map[event.date]) {
                map[event.date] = [];
            }
            map[event.date].push(event);
        }
        return map;
    }, [monthEvents]);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const startDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const days: Array<{ date: number | null; dateStr: string }> = [];

        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ date: null, dateStr: '' });
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({ date: d, dateStr });
        }

        return days;
    }, [currentMonth, currentYear]);

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const goToToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    };

    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const monthNames = [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월',
    ];

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                <div className="flex items-center gap-2">
                    <CalendarIcon size={18} className="text-[var(--accent-blue)]" />
                    <span className="font-bold text-[var(--text-primary)]">
                        {currentYear}년 {monthNames[currentMonth]}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-xs font-medium text-[var(--accent-blue)] bg-[var(--accent-blue-light)] hover:bg-[var(--accent-blue)]/20 rounded-lg transition-colors"
                    >
                        오늘
                    </button>
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-[var(--border-color)] rounded-xl transition-colors"
                    >
                        <ChevronLeft size={18} className="text-[var(--text-secondary)]" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-[var(--border-color)] rounded-xl transition-colors"
                    >
                        <ChevronRight size={18} className="text-[var(--text-secondary)]" />
                    </button>
                </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b border-[var(--border-color)]">
                {weekDays.map((day, i) => (
                    <div
                        key={day}
                        className={`py-3 text-center text-xs font-medium ${
                            i === 0 ? 'text-[var(--rise-color)]' : i === 6 ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'
                        }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* 달력 그리드 */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                    const dayEvents = day.dateStr ? eventsByDate[day.dateStr] || [] : [];
                    const isToday = day.dateStr === todayStr;
                    const dayOfWeek = index % 7;
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;

                    const exDateEvents = dayEvents.filter((e) => e.type === 'exDate');
                    const payDateEvents = dayEvents.filter((e) => e.type === 'payDate');

                    return (
                        <div
                            key={index}
                            className={`min-h-[90px] border-b border-r border-[var(--border-color)] p-2 ${
                                day.date === null ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-secondary)]'
                            } ${isToday ? 'bg-[var(--accent-blue-light)]' : ''}`}
                        >
                            {day.date !== null && (
                                <>
                                    <div
                                        className={`text-xs font-semibold mb-1.5 ${
                                            isToday
                                                ? 'text-[var(--accent-blue)]'
                                                : isSunday
                                                    ? 'text-[var(--rise-color)]'
                                                    : isSaturday
                                                        ? 'text-[var(--fall-color)]'
                                                        : 'text-[var(--text-secondary)]'
                                        }`}
                                    >
                                        {day.date}
                                    </div>

                                    {/* 배당락일 이벤트 */}
                                    {exDateEvents.map((event, i) => (
                                        <div
                                            key={`ex-${i}`}
                                            onClick={() => onEventClick?.(event)}
                                            className="text-[10px] px-2 py-1 mb-1 rounded-lg bg-[var(--rise-bg)] text-[var(--rise-color)] truncate cursor-pointer hover:opacity-80 transition-opacity font-medium"
                                            title={`${event.symbol} 배당락일 - $${event.amount.toFixed(4)}`}
                                        >
                                            <span>{event.symbol}</span>
                                            <span className="opacity-70 ml-0.5">락</span>
                                        </div>
                                    ))}

                                    {/* 지급일 이벤트 */}
                                    {payDateEvents.map((event, i) => (
                                        <div
                                            key={`pay-${i}`}
                                            onClick={() => onEventClick?.(event)}
                                            className="text-[10px] px-2 py-1 mb-1 rounded-lg bg-[var(--success-bg)] text-[var(--success-color)] truncate cursor-pointer hover:opacity-80 transition-opacity font-medium"
                                            title={`${event.symbol} 지급일 - $${event.amount.toFixed(4)}`}
                                        >
                                            <span>{event.symbol}</span>
                                            <span className="opacity-70 ml-0.5">지급</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-center gap-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-[var(--rise-bg)] border border-[var(--rise-color)]/30"></div>
                    <span className="text-[var(--text-secondary)]">배당락일 (Ex-Date)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-[var(--success-bg)] border border-[var(--success-color)]/30"></div>
                    <span className="text-[var(--text-secondary)]">지급일 (Pay Date)</span>
                </div>
            </div>
        </div>
    );
}
