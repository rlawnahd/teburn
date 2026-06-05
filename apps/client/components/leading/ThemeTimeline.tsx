'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchThemeTimeline, ThemeTimelineItem } from '@/lib/api/themes';
import { Skeleton } from '@/components/ui/Skeleton';

const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];

function getHeatColor(rate: number): string {
    if (rate >= 5) return 'rgba(242, 54, 69, 0.9)';
    if (rate >= 3) return 'rgba(242, 54, 69, 0.65)';
    if (rate >= 1) return 'rgba(242, 54, 69, 0.4)';
    if (rate >= 0) return 'rgba(242, 54, 69, 0.15)';
    if (rate >= -1) return 'rgba(41, 98, 255, 0.15)';
    if (rate >= -3) return 'rgba(41, 98, 255, 0.4)';
    if (rate >= -5) return 'rgba(41, 98, 255, 0.65)';
    return 'rgba(41, 98, 255, 0.9)';
}

function TimelineRow({ theme }: { theme: ThemeTimelineItem }) {
    const slotMap = new Map(theme.slots.map(s => [s.time, s]));
    const isPositive = theme.currentRate >= 0;

    return (
        <div className="flex items-center gap-0 group">
            <div className="w-20 sm:w-24 flex-shrink-0 pr-2 text-right">
                <span className="text-xs text-[var(--text-secondary)] truncate block">{theme.themeName}</span>
            </div>
            <div className="flex-1 flex gap-[1px]">
                {TIME_SLOTS.map(time => {
                    const slot = slotMap.get(time);
                    return (
                        <div
                            key={time}
                            className="flex-1 h-5 rounded-[2px] relative group/cell transition-all hover:scale-y-125"
                            style={{ background: slot ? getHeatColor(slot.avgChangeRate) : 'var(--bg-tertiary)' }}
                        >
                            {slot && (
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/cell:block bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded px-2 py-1 text-sm whitespace-nowrap z-20 shadow-md">
                                    <p className="text-[var(--text-primary)] font-medium">{theme.themeName}</p>
                                    <p className="text-[var(--text-tertiary)]">{time}</p>
                                    <p className={slot.avgChangeRate >= 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}>
                                        {slot.avgChangeRate >= 0 ? '+' : ''}{slot.avgChangeRate.toFixed(2)}%
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="w-14 flex-shrink-0 text-right pl-2">
                <span className={`text-xs font-semibold ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                    {isPositive ? '+' : ''}{theme.currentRate.toFixed(1)}%
                </span>
            </div>
        </div>
    );
}

export default function ThemeTimeline() {
    const { data, isLoading } = useQuery({
        queryKey: ['themeTimeline'],
        queryFn: fetchThemeTimeline,
        refetchInterval: 5 * 60 * 1000,
        staleTime: 2 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] rounded p-4">
                <Skeleton className="h-4 w-32 rounded-sm mb-3" />
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-5 w-full rounded-sm" />
                    ))}
                </div>
            </div>
        );
    }

    const timeline = data?.timeline || [];

    if (timeline.length === 0 || timeline.every(t => t.slots.length === 0)) {
        return (
            <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] rounded p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">테마 흐름</h3>
                <p className="text-[13px] text-[var(--text-tertiary)] text-center py-4">
                    장 운영 시간에 데이터가 수집됩니다
                </p>
            </div>
        );
    }

    // 상승 테마 먼저, 그 다음 하락 테마
    const sorted = [...timeline].sort((a, b) => b.currentRate - a.currentRate);

    return (
        <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] rounded overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">테마 흐름</span>
                    <span className="text-xs text-[var(--text-tertiary)]">장중 시간대별 등락률</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(242, 54, 69, 0.6)' }} />
                        상승
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(41, 98, 255, 0.6)' }} />
                        하락
                    </span>
                </div>
            </div>

            <div className="px-3 py-2">
                {/* 시간 축 */}
                <div className="flex items-center gap-0 mb-1">
                    <div className="w-20 sm:w-24 flex-shrink-0" />
                    <div className="flex-1 flex gap-[1px]">
                        {TIME_SLOTS.map((time, i) => (
                            <div key={time} className="flex-1 text-center">
                                {i % 2 === 0 && (
                                    <span className="text-[10px] text-[var(--text-disabled)]">{time.slice(0, 2)}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="w-14 flex-shrink-0" />
                </div>

                {/* 테마 행 */}
                <div className="space-y-[2px]">
                    {sorted.map((theme, i) => (
                        <div key={theme.themeName} className="animate-stagger" style={{ animationDelay: `${i * 30}ms` }}>
                            <TimelineRow theme={theme} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
