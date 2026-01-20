'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { RefreshCw, Crown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fetchLeadingSectors, LeadingSector } from '@/lib/api/leading';

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

// 주도섹터 점수에 따른 등급
function getScoreGrade(score: number): { label: string; color: string; bg: string } {
    if (score >= 80) return { label: 'HOT', color: 'text-[var(--rise-color)]', bg: 'bg-[var(--rise-color)]' };
    if (score >= 60) return { label: 'WARM', color: 'text-orange-500', bg: 'bg-orange-500' };
    if (score >= 40) return { label: '보통', color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--text-tertiary)]' };
    if (score >= 20) return { label: 'COOL', color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]' };
    return { label: 'COLD', color: 'text-[var(--fall-color)]', bg: 'bg-[var(--fall-color)]' };
}

// 섹터 카드 컴포넌트
function SectorCard({
    sector,
    rank,
    onClick,
}: {
    sector: LeadingSector;
    rank: number;
    onClick: () => void;
}) {
    const isPositive = sector.avgChangeRate > 0;
    const grade = getScoreGrade(sector.leadingScore);

    return (
        <div
            onClick={onClick}
            className="relative overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-all"
        >
            {/* 배경 그라데이션 (상승 시) */}
            {isPositive && (
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--rise-color)]/5 to-transparent pointer-events-none" />
            )}

            <div className="relative p-4">
                {/* 헤더: 테마명 + 등급 */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white ${
                            rank === 1 ? 'bg-amber-500' : rank === 2 ? 'bg-zinc-400' : rank === 3 ? 'bg-amber-700' : 'bg-[var(--text-tertiary)]'
                        }`}>
                            {rank}
                        </span>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                            {sector.themeName}
                        </h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${grade.bg}`}>
                        {grade.label}
                    </span>
                </div>

                {/* 평균 등락률 */}
                <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-2xl font-bold ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                        {isPositive ? '+' : ''}{sector.avgChangeRate.toFixed(2)}%
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">평균</span>
                </div>

                {/* 정보 그리드 */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]">
                        <span className="text-[var(--text-tertiary)]">종목수</span>
                        <span className="font-medium text-[var(--text-secondary)]">{sector.stockCount}개</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-tertiary)]">
                        <span className="text-[var(--text-tertiary)]">거래대금</span>
                        <span className="font-medium text-[var(--text-secondary)]">{formatTradingValue(sector.totalTradingValue)}</span>
                    </div>
                </div>

                {/* 대장주 */}
                {sector.topStock && (
                    <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-color)]">
                        <Crown size={12} className="text-amber-500" />
                        <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{sector.topStock.name}</span>
                        <span className={`text-xs font-bold flex items-center gap-0.5 ${
                            sector.topStock.changeRate > 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'
                        }`}>
                            {sector.topStock.changeRate > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {sector.topStock.changeRate > 0 ? '+' : ''}{sector.topStock.changeRate.toFixed(1)}%
                        </span>
                    </div>
                )}

                {/* 주도점수 바 */}
                <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-[var(--text-tertiary)]">주도점수</span>
                        <span className={`font-bold ${grade.color}`}>{sector.leadingScore.toFixed(0)}</span>
                    </div>
                    <div className="relative h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                            className={`absolute left-0 top-0 h-full ${grade.bg} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(sector.leadingScore, 100)}%` }}
                        />
                    </div>
                </div>
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

    const handleSectorClick = (themeName: string) => {
        router.push(`/themes/${encodeURIComponent(themeName)}`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
                    <RefreshCw size={20} className="animate-spin text-[var(--accent-blue)]" />
                    <span>데이터 로딩 중...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)]">
                데이터를 불러오는데 실패했습니다.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* 상승 섹터 */}
            {risingSectors.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--rise-bg)] flex items-center justify-center">
                            <TrendingUp size={20} className="text-[var(--rise-color)]" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)]">상승 주도섹터</h2>
                            <p className="text-xs text-[var(--text-tertiary)]">{risingSectors.length}개 섹터 · 주도점수 순</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {risingSectors.map((sector, index) => (
                            <SectorCard
                                key={sector.themeName}
                                sector={sector}
                                rank={index + 1}
                                onClick={() => handleSectorClick(sector.themeName)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* 하락 섹터 */}
            {fallingSectors.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--fall-bg)] flex items-center justify-center">
                            <TrendingDown size={20} className="text-[var(--fall-color)]" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[var(--text-primary)]">하락 섹터</h2>
                            <p className="text-xs text-[var(--text-tertiary)]">{fallingSectors.length}개 섹터</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {fallingSectors.map((sector, index) => (
                            <SectorCard
                                key={sector.themeName}
                                sector={sector}
                                rank={risingSectors.length + index + 1}
                                onClick={() => handleSectorClick(sector.themeName)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* 마지막 업데이트 */}
            {data?.lastUpdateTime && (
                <div className="text-center text-xs text-[var(--text-tertiary)] pt-4">
                    마지막 업데이트: {new Date(data.lastUpdateTime).toLocaleTimeString('ko-KR')}
                </div>
            )}
        </div>
    );
}
