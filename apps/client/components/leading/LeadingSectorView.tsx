'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { RefreshCw, Crown } from 'lucide-react';
import { fetchLeadingSectors, LeadingSector } from '@/lib/api/leading';

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

function getScoreGrade(score: number): { label: string; color: string; bg: string } {
    if (score >= 80) return { label: '급등', color: 'text-[var(--rise-color)]', bg: 'bg-[var(--rise-color)]' };
    if (score >= 60) return { label: '상승', color: 'text-orange-500', bg: 'bg-orange-500' };
    if (score >= 40) return { label: '보통', color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--text-tertiary)]' };
    if (score >= 20) return { label: '하락', color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]' };
    return { label: '급락', color: 'text-[var(--fall-color)]', bg: 'bg-[var(--fall-color)]' };
}

function SectorCard({ sector, rank, onClick }: { sector: LeadingSector; rank: number; onClick: () => void }) {
    const isPositive = sector.avgChangeRate > 0;
    const grade = getScoreGrade(sector.leadingScore);

    return (
        <div onClick={onClick} className="border border-[var(--border-color)] bg-[var(--bg-primary)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[11px] font-semibold flex-shrink-0 ${rank <= 3 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'}`}>
                        {rank}
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{sector.themeName}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-1 py-0.5 text-[9px] font-bold text-white ${grade.bg}`}>
                        {grade.label}
                    </span>
                    <span className={`text-sm font-bold ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                        {isPositive ? '+' : ''}{sector.avgChangeRate.toFixed(2)}%
                    </span>
                </div>
            </div>

            <div className="px-3 py-2">
                {/* 정보 */}
                <div className="flex items-center gap-3 text-xs mb-2">
                    <span className="text-[var(--text-tertiary)]">
                        종목 <span className="text-[var(--text-secondary)] font-medium">{sector.stockCount}</span>
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                        거래대금 <span className="text-[var(--text-secondary)] font-medium">{formatTradingValue(sector.totalTradingValue)}</span>
                    </span>
                </div>

                {/* 주도점수 바 */}
                <div className="mb-2">
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="text-[var(--text-tertiary)]">주도점수</span>
                        <span className={`font-semibold ${grade.color}`}>{sector.leadingScore.toFixed(0)}</span>
                    </div>
                    <div className="h-[3px] bg-[var(--bg-tertiary)] overflow-hidden">
                        <div
                            className={`h-full ${grade.bg} transition-all`}
                            style={{ width: `${Math.min(sector.leadingScore, 100)}%` }}
                        />
                    </div>
                </div>

                {/* 대장주 */}
                {sector.topStock && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-color)] text-xs">
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
    const { data, isLoading, error } = useQuery({
        queryKey: ['leadingSectors'],
        queryFn: () => fetchLeadingSectors(20),
        refetchInterval: 60 * 1000,
    });

    const sectors = data?.sectors || [];
    const risingSectors = sectors.filter((s) => s.avgChangeRate > 0);
    const fallingSectors = sectors.filter((s) => s.avgChangeRate <= 0);

    const formatDataDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
        })} ${date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
        })}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>로딩 중...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-[13px] text-[var(--text-tertiary)]">
                데이터를 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">주도섹터</h2>
                    <span className="text-[11px] text-[var(--text-tertiary)]">거래대금 + 상승률 기반</span>
                </div>
                {data?.lastUpdateTime && (
                    <span className="hidden sm:inline text-[11px] text-[var(--text-tertiary)]">
                        {formatDataDate(data.lastUpdateTime)}
                    </span>
                )}
            </div>

            {/* 상승 섹터 */}
            {risingSectors.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-0.5 h-3 bg-[var(--rise-color)]" />
                        <span className="text-xs font-medium text-[var(--text-primary)]">상승 섹터</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{risingSectors.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {risingSectors.map((sector, index) => (
                            <SectorCard key={sector.themeName} sector={sector} rank={index + 1} onClick={() => router.push(`/themes/${encodeURIComponent(sector.themeName)}`)} />
                        ))}
                    </div>
                </section>
            )}

            {/* 하락 섹터 */}
            {fallingSectors.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-0.5 h-3 bg-[var(--fall-color)]" />
                        <span className="text-xs font-medium text-[var(--text-primary)]">하락 섹터</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{fallingSectors.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {fallingSectors.map((sector, index) => (
                            <SectorCard key={sector.themeName} sector={sector} rank={risingSectors.length + index + 1} onClick={() => router.push(`/themes/${encodeURIComponent(sector.themeName)}`)} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
