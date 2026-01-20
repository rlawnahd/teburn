'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    Newspaper,
    Search,
    Users,
    BarChart3,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
} from 'lucide-react';
import { fetchHotStocks, HotStock } from '@/lib/api/leading';

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

// 수급 금액 포맷
function formatSupplyAmount(amount: number | null): string {
    if (amount === null) return '-';
    const billion = amount / 100000000;
    const prefix = billion >= 0 ? '+' : '';
    if (Math.abs(billion) >= 1000) {
        return `${prefix}${(billion / 1000).toFixed(1)}조`;
    }
    return `${prefix}${Math.round(billion)}억`;
}

// 등급별 스타일
function getGradeStyle(grade: HotStock['grade']): { bg: string; text: string } {
    switch (grade) {
        case 'HOT':
            return { bg: 'bg-[var(--rise-color)]', text: 'text-white' };
        case 'WARM':
            return { bg: 'bg-orange-500', text: 'text-white' };
        case 'NORMAL':
            return { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-secondary)]' };
        case 'COOL':
            return { bg: 'bg-[var(--accent-blue)]/20', text: 'text-[var(--accent-blue)]' };
        case 'COLD':
            return { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-tertiary)]' };
    }
}

// 점수 게이지 컴포넌트
function ScoreGauge({
    label,
    score,
    maxScore,
    icon,
    detail,
    color,
}: {
    label: string;
    score: number;
    maxScore: number;
    icon: React.ReactNode;
    detail?: string;
    color: string;
}) {
    const percentage = (score / maxScore) * 100;

    return (
        <div className="flex items-center gap-2">
            <div className="w-14 flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                {icon}
                <span>{label}</span>
            </div>
            <div className="flex-1 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="w-6 text-right text-[11px] font-medium text-[var(--text-secondary)]">
                {score}
            </div>
            {detail && (
                <div className="w-14 text-right text-[10px] text-[var(--text-tertiary)]">{detail}</div>
            )}
        </div>
    );
}

// 종목 카드 컴포넌트
function StockCard({
    stock,
    rank,
    onThemeClick,
}: {
    stock: HotStock;
    rank: number;
    onThemeClick: (theme: string) => void;
}) {
    const gradeStyle = getGradeStyle(stock.grade);
    const isPositive = stock.changeRate > 0;

    return (
        <div className="relative overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] transition-all">
            {/* 순위 & 등급 */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className={`text-lg font-bold ${rank <= 3 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'}`}>
                    #{rank}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${gradeStyle.bg} ${gradeStyle.text}`}>
                    {stock.grade}
                </span>
            </div>

            {/* 총점 */}
            <div className="absolute top-3 right-3 text-right">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stock.totalScore}</div>
                <div className="text-[10px] text-[var(--text-tertiary)]">점</div>
            </div>

            <div className="pt-12 p-4">
                {/* 종목 정보 */}
                <div className="mb-3">
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{stock.stockName}</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--text-secondary)]">{stock.currentPrice.toLocaleString()}원</span>
                        <span className={`flex items-center gap-0.5 text-sm font-medium ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                        </span>
                    </div>
                </div>

                {/* 테마 태그 */}
                {stock.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                        {stock.themes.map((theme) => (
                            <button
                                key={theme}
                                onClick={() => onThemeClick(theme)}
                                className="px-2 py-0.5 text-[11px] rounded bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/20 transition-colors"
                            >
                                {theme}
                            </button>
                        ))}
                    </div>
                )}

                {/* 점수 상세 */}
                <div className="space-y-1.5 mb-4">
                    <ScoreGauge
                        label="거래량"
                        score={stock.volumeScore}
                        maxScore={25}
                        icon={<BarChart3 size={10} />}
                        detail={stock.volumeSurgeRate ? `${stock.volumeSurgeRate.toFixed(1)}배` : '-'}
                        color="bg-violet-500"
                    />
                    <ScoreGauge
                        label="검색량"
                        score={stock.searchScore}
                        maxScore={25}
                        icon={<Search size={10} />}
                        detail={
                            stock.searchSurgeRate
                                ? `${stock.searchSurgeRate > 0 ? '+' : ''}${stock.searchSurgeRate.toFixed(0)}%`
                                : '-'
                        }
                        color="bg-[var(--accent-blue)]"
                    />
                    <ScoreGauge
                        label="뉴스"
                        score={stock.newsScore}
                        maxScore={20}
                        icon={<Newspaper size={10} />}
                        detail={`${stock.newsCount}건`}
                        color="bg-emerald-500"
                    />
                    <ScoreGauge
                        label="수급"
                        score={stock.supplyScore}
                        maxScore={20}
                        icon={<Users size={10} />}
                        detail={formatSupplyAmount(
                            stock.foreignNet !== null && stock.instNet !== null
                                ? stock.foreignNet + stock.instNet
                                : null
                        )}
                        color="bg-orange-500"
                    />
                    <ScoreGauge
                        label="모멘텀"
                        score={stock.momentumScore}
                        maxScore={10}
                        icon={<Zap size={10} />}
                        color="bg-[var(--rise-color)]"
                    />
                </div>

                {/* 거래대금 */}
                <div className="flex items-center justify-between text-sm pt-3 border-t border-[var(--border-color)]">
                    <span className="text-[var(--text-tertiary)]">거래대금</span>
                    <span className="font-bold text-[var(--text-secondary)]">
                        {formatTradingValue(stock.tradingValue)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// 섹션 헤더
function SectionHeader({
    title,
    description,
    count,
    color,
}: {
    title: string;
    description: string;
    count: number;
    color: string;
}) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full ${color}`} />
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
                    <p className="text-xs text-[var(--text-tertiary)]">{description}</p>
                </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-full">
                {count}개
            </span>
        </div>
    );
}

export default function HotStocksView() {
    const router = useRouter();

    const { data, isLoading, error } = useQuery({
        queryKey: ['hotStocks'],
        queryFn: () => fetchHotStocks(30),
        refetchInterval: 60 * 1000,
    });

    const stocks = data?.stocks || [];

    const handleThemeClick = (theme: string) => {
        router.push(`/themes/${encodeURIComponent(theme)}`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
                    <RefreshCw size={20} className="animate-spin text-[var(--accent-blue)]" />
                    <span>주도주 분석 중...</span>
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

    // 등급별 분류
    const hotStocks = stocks.filter((s) => s.grade === 'HOT');
    const warmStocks = stocks.filter((s) => s.grade === 'WARM');
    const otherStocks = stocks.filter((s) => !['HOT', 'WARM'].includes(s.grade));

    return (
        <div className="space-y-8">
            {/* 설명 */}
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center flex-shrink-0">
                        <Activity size={20} className="text-[var(--accent-blue)]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">주도주 분석이란?</h3>
                        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                            거래량 급증, 검색량, 뉴스 노출, 외국인/기관 수급, 등락률을 종합 분석하여
                            시장에서 <span className="text-[var(--accent-blue)]">돈과 관심이 집중</span>되는 종목을 찾습니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* HOT 종목 */}
            {hotStocks.length > 0 && (
                <section>
                    <SectionHeader
                        title="HOT"
                        description="70점 이상 · 강력한 주도주"
                        count={hotStocks.length}
                        color="bg-[var(--rise-color)]"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {hotStocks.map((stock, i) => (
                            <StockCard
                                key={stock.stockCode}
                                stock={stock}
                                rank={i + 1}
                                onThemeClick={handleThemeClick}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* WARM 종목 */}
            {warmStocks.length > 0 && (
                <section>
                    <SectionHeader
                        title="WARM"
                        description="50~69점 · 관심 종목"
                        count={warmStocks.length}
                        color="bg-orange-500"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {warmStocks.map((stock, i) => (
                            <StockCard
                                key={stock.stockCode}
                                stock={stock}
                                rank={hotStocks.length + i + 1}
                                onThemeClick={handleThemeClick}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* 기타 종목 */}
            {otherStocks.length > 0 && (
                <section>
                    <SectionHeader
                        title="기타"
                        description="50점 미만"
                        count={otherStocks.length}
                        color="bg-[var(--text-tertiary)]"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherStocks.map((stock, i) => (
                            <StockCard
                                key={stock.stockCode}
                                stock={stock}
                                rank={hotStocks.length + warmStocks.length + i + 1}
                                onThemeClick={handleThemeClick}
                            />
                        ))}
                    </div>
                </section>
            )}

            {stocks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-tertiary)]">
                    <Activity size={48} className="mb-4 opacity-30" />
                    <p className="text-lg font-medium">분석할 종목이 없습니다</p>
                    <p className="text-sm mt-1">장중에 다시 확인해보세요</p>
                </div>
            )}

            {/* 마지막 업데이트 */}
            {data?.lastUpdateTime && (
                <div className="text-center text-xs text-[var(--text-tertiary)]">
                    마지막 업데이트: {new Date(data.lastUpdateTime).toLocaleTimeString('ko-KR')}
                </div>
            )}
        </div>
    );
}
