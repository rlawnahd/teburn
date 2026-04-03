'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';
import { fetchLeadingSectors, LeadingSector } from '@/lib/api/leading';
import { formatTradingValue, formatDataDate } from '@/lib/utils/format';
import { SkeletonCard } from '@/components/ui/Skeleton';
import ThemeTimeline from '@/components/leading/ThemeTimeline';

function getScoreGrade(score: number): { label: string; color: string; bg: string } {
    if (score >= 80) return { label: '급등', color: 'text-[var(--rise-color)]', bg: 'bg-[var(--rise-color)]' };
    if (score >= 60) return { label: '상승', color: 'text-orange-500', bg: 'bg-orange-500' };
    if (score >= 40) return { label: '보통', color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--text-tertiary)]' };
    if (score >= 20) return { label: '하락', color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]' };
    return { label: '급락', color: 'text-[var(--fall-color)]', bg: 'bg-[var(--fall-color)]' };
}

function getAccentColor(score: number): string {
    if (score >= 80) return 'var(--rise-color)';
    if (score >= 60) return '#f97316';
    if (score >= 40) return 'var(--text-tertiary)';
    if (score >= 20) return 'var(--accent-blue)';
    return 'var(--fall-color)';
}

function SectorCard({ sector, rank, onClick }: { sector: LeadingSector; rank: number; onClick: () => void }) {
    const isPositive = sector.avgChangeRate > 0;
    const grade = getScoreGrade(sector.leadingScore);
    const accentColor = getAccentColor(sector.leadingScore);

    return (
        <div
            onClick={onClick}
            className="border border-[var(--border-color)] bg-[var(--bg-primary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors rounded-xl overflow-hidden min-h-[140px] flex flex-col"
        >
            {/* 컬러 악센트 스트라이프 */}
            <div className="h-[3px]" style={{ background: accentColor }} />

            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-sm font-semibold flex-shrink-0 ${rank <= 3 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'}`}>
                        {rank}
                    </span>
                    <span className="text-base font-semibold text-[var(--text-primary)] truncate">{sector.themeName}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-1 py-0.5 text-[10px] font-bold text-white rounded-md ${grade.bg}`}>
                        {grade.label}
                    </span>
                    <span className={`text-base font-bold ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                        {isPositive ? '+' : ''}{sector.avgChangeRate.toFixed(2)}%
                    </span>
                </div>
            </div>

            <div className="px-4 py-2.5 flex-1 flex flex-col">
                <div className="flex items-center gap-3 text-sm mb-2">
                    <span className="text-[var(--text-tertiary)]">
                        종목 <span className="text-[var(--text-secondary)] font-medium">{sector.stockCount}</span>
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                        거래대금 <span className="text-[var(--text-secondary)] font-medium">{formatTradingValue(sector.totalTradingValue)}</span>
                    </span>
                </div>

                {/* 주도점수 바 — 그래디언트 */}
                <div className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-[var(--text-tertiary)]">주도점수</span>
                        <span className={`font-semibold ${grade.color}`}>{sector.leadingScore.toFixed(0)}</span>
                    </div>
                    <div className="h-[3px] bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${Math.min(sector.leadingScore, 100)}%`,
                                background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})`,
                            }}
                        />
                    </div>
                </div>

                {sector.topStock && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-color)] text-sm mt-auto">
                        <Crown size={10} className="text-amber-500 flex-shrink-0" />
                        <span className="text-[var(--text-secondary)] truncate flex-1">{sector.topStock.name}</span>
                        <span className={`font-medium flex-shrink-0 ${
                            sector.topStock.changeRate > 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'
                        }`}>
                            {sector.topStock.changeRate > 0 ? '+' : ''}{sector.topStock.changeRate.toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LeadingSectorView() {
    const router = useRouter();
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['leadingSectors'],
        queryFn: () => fetchLeadingSectors(20),
        refetchInterval: 5 * 60 * 1000,
    });

    const sectors = data?.sectors || [];
    const risingSectors = sectors.filter((s) => s.avgChangeRate > 0);
    const fallingSectors = sectors.filter((s) => s.avgChangeRate <= 0);


    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
                <p className="text-base text-[var(--text-tertiary)]">데이터를 불러오는데 실패했습니다.</p>
                <button onClick={() => refetch()} className="text-[12px] text-[var(--accent-blue)] hover:underline">다시 시도</button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 테마 흐름 타임라인 */}
            <ThemeTimeline />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">주도섹터</h2>
                    <span className="text-sm text-[var(--text-tertiary)]">거래대금 + 상승률 기반</span>
                </div>
                {data?.lastUpdateTime && (
                    <span className="hidden sm:inline text-sm text-[var(--text-tertiary)]">
                        {formatDataDate(data.lastUpdateTime)}
                    </span>
                )}
            </div>

            {risingSectors.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-0.5 h-3 bg-[var(--rise-color)] rounded-full" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">상승 섹터</span>
                        <span className="text-sm text-[var(--text-tertiary)]">{risingSectors.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {risingSectors.map((sector, index) => (
                            <div key={sector.themeName} className="animate-stagger" style={{ animationDelay: `${index * 40}ms` }}>
                                <SectorCard sector={sector} rank={index + 1} onClick={() => router.push(`/themes/${encodeURIComponent(sector.themeName)}`)} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {fallingSectors.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-0.5 h-3 bg-[var(--fall-color)] rounded-full" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">하락 섹터</span>
                        <span className="text-sm text-[var(--text-tertiary)]">{fallingSectors.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {fallingSectors.map((sector, index) => (
                            <div key={sector.themeName} className="animate-stagger" style={{ animationDelay: `${index * 40}ms` }}>
                                <SectorCard sector={sector} rank={risingSectors.length + index + 1} onClick={() => router.push(`/themes/${encodeURIComponent(sector.themeName)}`)} />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
