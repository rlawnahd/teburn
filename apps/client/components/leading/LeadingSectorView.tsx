'use client';

import { useQuery } from '@tanstack/react-query';
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
    if (score >= 80) return { label: '급등', color: 'text-[var(--rise-color)]', bg: 'bg-[var(--rise-color)]' };
    if (score >= 60) return { label: '상승', color: 'text-orange-500', bg: 'bg-orange-500' };
    if (score >= 40) return { label: '보통', color: 'text-[var(--text-tertiary)]', bg: 'bg-[var(--text-tertiary)]' };
    if (score >= 20) return { label: '하락', color: 'text-[var(--accent-blue)]', bg: 'bg-[var(--accent-blue)]' };
    return { label: '급락', color: 'text-[var(--fall-color)]', bg: 'bg-[var(--fall-color)]' };
}

// 섹터 카드 컴포넌트
function SectorCard({
    sector,
    rank,
}: {
    sector: LeadingSector;
    rank: number;
}) {
    const isPositive = sector.avgChangeRate > 0;
    const grade = getScoreGrade(sector.leadingScore);

    return (
        <div className="relative overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
            {/* 배경 그라데이션 (상승 시) */}
            {isPositive && (
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--rise-color)]/5 to-transparent pointer-events-none" />
            )}

            <div className="relative p-3 md:p-4">
                {/* 헤더: 테마명 + 등급 */}
                <div className="flex items-start justify-between mb-2 md:mb-3">
                    <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <span className={`w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center text-[10px] md:text-xs font-bold text-white flex-shrink-0 ${
                            rank === 1 ? 'bg-amber-500' : rank === 2 ? 'bg-zinc-400' : rank === 3 ? 'bg-amber-700' : 'bg-[var(--text-tertiary)]'
                        }`}>
                            {rank}
                        </span>
                        <h3 className="text-sm md:text-base font-bold text-[var(--text-primary)] truncate">
                            {sector.themeName}
                        </h3>
                    </div>
                    <span className={`text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded text-white flex-shrink-0 ${grade.bg}`}>
                        {grade.label}
                    </span>
                </div>

                {/* 평균 등락률 */}
                <div className="flex items-baseline gap-1.5 md:gap-2 mb-2 md:mb-3">
                    <span className={`text-xl md:text-2xl font-bold ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                        {isPositive ? '+' : ''}{sector.avgChangeRate.toFixed(2)}%
                    </span>
                    <span className="text-[10px] md:text-xs text-[var(--text-tertiary)]">평균</span>
                </div>

                {/* 정보 그리드 */}
                <div className="grid grid-cols-2 gap-1.5 md:gap-2 mb-2 md:mb-3 text-[11px] md:text-xs">
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
    const { data, isLoading, error } = useQuery({
        queryKey: ['leadingSectors'],
        queryFn: () => fetchLeadingSectors(20),
        refetchInterval: 60 * 1000,
    });

    const sectors = data?.sectors || [];
    const risingSectors = sectors.filter((s) => s.avgChangeRate > 0);
    const fallingSectors = sectors.filter((s) => s.avgChangeRate <= 0);

    // 테마 페이지 제거로 클릭 기능 비활성화

    // 날짜 포맷
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
        <div className="space-y-6 md:space-y-8">
            {/* 헤더 + 기준 시점 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[var(--rise-bg)] flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={16} className="md:w-5 md:h-5 text-[var(--rise-color)]" />
                    </div>
                    <div>
                        <h2 className="text-sm md:text-base font-bold text-[var(--text-primary)]">주도섹터</h2>
                        <p className="text-[10px] md:text-xs text-[var(--text-tertiary)]">거래대금 + 상승률 기반</p>
                    </div>
                </div>
                {data?.lastUpdateTime && (
                    <div className="hidden sm:block px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                        <span className="text-xs text-[var(--text-tertiary)]">
                            {formatDataDate(data.lastUpdateTime)} 기준
                        </span>
                    </div>
                )}
            </div>

            {/* 상승 섹터 */}
            {risingSectors.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 rounded-full bg-[var(--rise-color)]" />
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">상승 섹터</h3>
                        <span className="text-xs text-[var(--text-tertiary)]">{risingSectors.length}개</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {risingSectors.map((sector, index) => (
                            <SectorCard
                                key={sector.themeName}
                                sector={sector}
                                rank={index + 1}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* 하락 섹터 */}
            {fallingSectors.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 rounded-full bg-[var(--fall-color)]" />
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">하락 섹터</h3>
                        <span className="text-xs text-[var(--text-tertiary)]">{fallingSectors.length}개</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {fallingSectors.map((sector, index) => (
                            <SectorCard
                                key={sector.themeName}
                                sector={sector}
                                rank={risingSectors.length + index + 1}
                            />
                        ))}
                    </div>
                </section>
            )}

        </div>
    );
}
