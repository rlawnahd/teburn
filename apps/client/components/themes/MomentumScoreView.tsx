'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Flame, Snowflake, Minus, ArrowUp, ArrowDown } from 'lucide-react';

interface ThemeData {
    name: string;
    stockCount: number;
    keywords: string[];
    avgChangeRate: number;
    prices: Array<{
        stockName: string;
        changeRate: number;
        tradingValue: number;
        currentPrice: number;
    }>;
    category: string;
}

interface MomentumScoreViewProps {
    themes: ThemeData[];
    onThemeClick: (name: string) => void;
}

// 거래량 레벨 계산 (전체 테마 대비 상대적 거래대금)
function getVolumeLevel(totalTradingValue: number, allTradingValues: number[]): {
    level: number;
    icon: React.ReactNode;
} {
    if (allTradingValues.length === 0) return { level: 0, icon: <Minus size={14} className="text-[var(--text-tertiary)]" /> };

    const sorted = [...allTradingValues].sort((a, b) => b - a);
    const rank = sorted.indexOf(totalTradingValue);
    const percentile = (sorted.length - rank) / sorted.length;

    if (percentile >= 0.9) {
        return { level: 3, icon: <><ArrowUp size={12} /><ArrowUp size={12} /><ArrowUp size={12} /></> };
    } else if (percentile >= 0.7) {
        return { level: 2, icon: <><ArrowUp size={12} /><ArrowUp size={12} /></> };
    } else if (percentile >= 0.5) {
        return { level: 1, icon: <ArrowUp size={12} /> };
    } else if (percentile >= 0.3) {
        return { level: 0, icon: <Minus size={12} /> };
    } else if (percentile >= 0.1) {
        return { level: -1, icon: <ArrowDown size={12} /> };
    } else {
        return { level: -2, icon: <><ArrowDown size={12} /><ArrowDown size={12} /></> };
    }
}

// 모멘텀 스코어 계산 (등락률 + 거래량 종합)
function getMomentumScore(changeRate: number, volumeLevel: number): {
    score: number;
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
} {
    // 점수 계산: 등락률 가중치 70% + 거래량 가중치 30%
    const rateScore = Math.min(Math.max(changeRate * 10, -50), 50); // -50 ~ 50
    const volumeScore = volumeLevel * 10; // -20 ~ 30
    const totalScore = rateScore + volumeScore;

    if (totalScore >= 40) {
        return { score: totalScore, label: 'HOT', emoji: '🔥', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
    } else if (totalScore >= 20) {
        return { score: totalScore, label: 'WARM', emoji: '☀️', color: 'text-amber-500', bgColor: 'bg-amber-500/10' };
    } else if (totalScore >= 0) {
        return { score: totalScore, label: '보통', emoji: '😐', color: 'text-[var(--text-tertiary)]', bgColor: 'bg-[var(--bg-tertiary)]' };
    } else if (totalScore >= -20) {
        return { score: totalScore, label: 'COOL', emoji: '🌙', color: 'text-blue-400', bgColor: 'bg-blue-400/10' };
    } else {
        return { score: totalScore, label: 'COLD', emoji: '🥶', color: 'text-blue-600', bgColor: 'bg-blue-600/10' };
    }
}

// 거래대금 포맷
function formatTradingValue(value: number): string {
    const billion = value / 100000000;
    if (billion >= 1000) {
        return `${(billion / 1000).toFixed(1)}조`;
    } else if (billion >= 1) {
        return `${billion.toFixed(0)}억`;
    } else {
        return `${(value / 10000).toFixed(0)}만`;
    }
}

export default function MomentumScoreView({ themes, onThemeClick }: MomentumScoreViewProps) {
    // 모든 테마의 거래대금 계산
    const themesWithMetrics = useMemo(() => {
        const allTradingValues = themes.map(theme =>
            theme.prices.reduce((sum, p) => sum + p.tradingValue, 0)
        );

        return themes
            .filter(t => t.prices.length > 0)
            .map(theme => {
                const totalTradingValue = theme.prices.reduce((sum, p) => sum + p.tradingValue, 0);
                const volumeInfo = getVolumeLevel(totalTradingValue, allTradingValues);
                const momentum = getMomentumScore(theme.avgChangeRate, volumeInfo.level);
                const leaderStock = [...theme.prices].sort((a, b) => b.changeRate - a.changeRate)[0];

                return {
                    ...theme,
                    totalTradingValue,
                    volumeInfo,
                    momentum,
                    leaderStock,
                };
            })
            .sort((a, b) => b.momentum.score - a.momentum.score);
    }, [themes]);

    const hotThemes = themesWithMetrics.filter(t => t.momentum.label === 'HOT');
    const warmThemes = themesWithMetrics.filter(t => t.momentum.label === 'WARM');
    const normalThemes = themesWithMetrics.filter(t => t.momentum.label === '보통');
    const coolThemes = themesWithMetrics.filter(t => t.momentum.label === 'COOL');
    const coldThemes = themesWithMetrics.filter(t => t.momentum.label === 'COLD');

    if (themesWithMetrics.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] text-[var(--text-tertiary)]">
                <div className="text-lg mb-2">데이터를 기다리는 중...</div>
                <div className="text-sm">잠시 후 자동으로 업데이트됩니다</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-1">🔥</div>
                    <div className="text-xl font-bold text-orange-500">{hotThemes.length}</div>
                    <div className="text-xs text-orange-500/70">HOT 테마</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-1">☀️</div>
                    <div className="text-xl font-bold text-amber-500">{warmThemes.length}</div>
                    <div className="text-xs text-amber-500/70">WARM 테마</div>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-1">😐</div>
                    <div className="text-xl font-bold text-[var(--text-secondary)]">{normalThemes.length}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">보통</div>
                </div>
                <div className="bg-blue-400/10 border border-blue-400/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-1">🌙</div>
                    <div className="text-xl font-bold text-blue-400">{coolThemes.length}</div>
                    <div className="text-xs text-blue-400/70">COOL 테마</div>
                </div>
                <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-1">🥶</div>
                    <div className="text-xl font-bold text-blue-600">{coldThemes.length}</div>
                    <div className="text-xs text-blue-600/70">COLD 테마</div>
                </div>
            </div>

            {/* 테이블 */}
            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
                {/* 헤더 */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-tertiary)]">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3">테마명</div>
                    <div className="col-span-2 text-right">등락률</div>
                    <div className="col-span-2 text-center">거래량</div>
                    <div className="col-span-2 text-center">모멘텀</div>
                    <div className="col-span-2">대장주</div>
                </div>

                {/* 바디 */}
                <div className="divide-y divide-[var(--border-color)]">
                    {themesWithMetrics.map((theme, index) => {
                        const isPositive = theme.avgChangeRate > 0;
                        const isNegative = theme.avgChangeRate < 0;

                        return (
                            <div
                                key={theme.name}
                                onClick={() => onThemeClick(theme.name)}
                                className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors items-center"
                            >
                                {/* 순위 */}
                                <div className="col-span-1 text-center">
                                    <span className={`text-sm font-bold ${
                                        index < 3 ? 'text-orange-500' :
                                        index < 10 ? 'text-[var(--text-secondary)]' :
                                        'text-[var(--text-tertiary)]'
                                    }`}>
                                        {index + 1}
                                    </span>
                                </div>

                                {/* 테마명 */}
                                <div className="col-span-3">
                                    <div className="font-medium text-[var(--text-primary)] truncate">
                                        {theme.name}
                                    </div>
                                    <div className="text-xs text-[var(--text-tertiary)]">
                                        {theme.stockCount}종목 · {formatTradingValue(theme.totalTradingValue)}
                                    </div>
                                </div>

                                {/* 등락률 */}
                                <div className="col-span-2 text-right">
                                    <div className={`text-sm font-bold flex items-center justify-end gap-1 ${
                                        isPositive ? 'text-[var(--rise-color)]' :
                                        isNegative ? 'text-[var(--fall-color)]' :
                                        'text-[var(--text-tertiary)]'
                                    }`}>
                                        {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : null}
                                        {isPositive ? '+' : ''}{theme.avgChangeRate.toFixed(2)}%
                                    </div>
                                </div>

                                {/* 거래량 */}
                                <div className="col-span-2 flex justify-center">
                                    <div className={`flex items-center gap-0.5 ${
                                        theme.volumeInfo.level >= 2 ? 'text-[var(--rise-color)]' :
                                        theme.volumeInfo.level >= 1 ? 'text-amber-500' :
                                        theme.volumeInfo.level <= -1 ? 'text-[var(--fall-color)]' :
                                        'text-[var(--text-tertiary)]'
                                    }`}>
                                        {theme.volumeInfo.icon}
                                    </div>
                                </div>

                                {/* 모멘텀 */}
                                <div className="col-span-2 flex justify-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${theme.momentum.bgColor} ${theme.momentum.color}`}>
                                        {theme.momentum.emoji} {theme.momentum.label}
                                    </span>
                                </div>

                                {/* 대장주 */}
                                <div className="col-span-2">
                                    {theme.leaderStock && (
                                        <div className="text-xs">
                                            <span className="text-[var(--text-secondary)] truncate block">
                                                {theme.leaderStock.stockName}
                                            </span>
                                            <span className={
                                                theme.leaderStock.changeRate > 0 ? 'text-[var(--rise-color)]' :
                                                theme.leaderStock.changeRate < 0 ? 'text-[var(--fall-color)]' :
                                                'text-[var(--text-tertiary)]'
                                            }>
                                                {theme.leaderStock.changeRate > 0 ? '+' : ''}
                                                {theme.leaderStock.changeRate.toFixed(1)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
