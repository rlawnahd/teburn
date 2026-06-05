'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Activity } from 'lucide-react';
import { fetchHotStocks, HotStock } from '@/lib/api/leading';
import { formatTradingValue, formatDataDate } from '@/lib/utils/format';
import GradeBadge from '@/components/ui/GradeBadge';
import { SkeletonRow } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useOnPriceUpdate, useOnHotnessUpdate } from '@/hooks/useRealtimePrice';
import { useAuth } from '@/hooks/useAuth';
import { AnimatePresence, motion } from 'framer-motion';
import MarketThemeCard from './MarketThemeCard';
import HeroCard from './HeroCard';

type PriceFlash = 'rise' | 'fall' | null;
type RankChange = { delta: number; isNew: boolean };
type ScoreChange = { delta: number };

function StockRow({
    stock,
    rank,
    priceFlash,
    rankChange,
    scoreChange,
    staggerIndex,
    onStockClick,
    onThemeClick,
}: {
    stock: HotStock;
    rank: number;
    priceFlash: PriceFlash;
    rankChange: RankChange | null;
    scoreChange: ScoreChange | null;
    staggerIndex: number;
    onStockClick: (stockCode: string) => void;
    onThemeClick: (theme: string) => void;
}) {
    const isPositive = stock.changeRate > 0;
    const isLimitUp = stock.changeRate >= 29.9;
    const streakDays = stock.sStreak || 0;

    // 시그널 감지
    const isNewEntry = rankChange?.isNew === true;
    const rankJump = rankChange && !rankChange.isNew && rankChange.delta >= 5;
    const rankDrop = rankChange && !rankChange.isNew && rankChange.delta <= -5;
    const scoreJump = scoreChange && scoreChange.delta >= 20;
    const volumeExplosion = (stock.volumeSurgeRate || 0) >= 10;
    const isLongRunner = streakDays >= 5; // 진짜 대장주

    // 발광은 1가지만: 신규 진입 (최우선) > 장기 주도 (5일+)
    const glowClass = isNewEntry
        ? 'streak-glow-intense my-0.5'
        : isLongRunner
        ? 'streak-glow my-0.5'
        : 'border-b border-[var(--border-color)]';

    // 모바일: 가장 중요한 시그널 1개만, 데스크탑: 전부 표시
    const primarySignal: 'limitUp' | 'volume' | 'score' | 'streak' | null =
        isLimitUp ? 'limitUp'
        : volumeExplosion ? 'volume'
        : scoreJump ? 'score'
        : streakDays >= 3 ? 'streak'
        : null;

    return (
        <motion.button
            layout
            layoutId={stock.stockCode}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={() => onStockClick(stock.stockCode)}
            className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left ${glowClass}`}
        >
            {/* 순위 */}
            <div className="w-8 flex-shrink-0 text-center">
                <span className={`text-sm font-semibold ${rank <= 3 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'}`}>
                    {rank}
                </span>
                {isNewEntry ? (
                    <span className="text-[10px] font-bold text-amber-500 ml-0.5">N</span>
                ) : rankJump ? (
                    <span className="text-[11px] font-bold ml-0.5 text-[var(--rise-color)]">
                        ▲▲{Math.abs(rankChange.delta)}
                    </span>
                ) : rankDrop ? (
                    <span className="text-[11px] font-bold ml-0.5 text-[var(--fall-color)]">
                        ▼▼{Math.abs(rankChange.delta)}
                    </span>
                ) : rankChange && rankChange.delta !== 0 ? (
                    <span className={`text-[10px] font-semibold ml-0.5 ${rankChange.delta > 0 ? 'text-[var(--rise-color)]/70' : 'text-[var(--fall-color)]/70'}`}>
                        {rankChange.delta > 0 ? '▲' : '▼'}{Math.abs(rankChange.delta)}
                    </span>
                ) : null}
            </div>

            {/* 종목 정보 */}
            <div className="flex-1 min-w-0">
                {/* 1행: 종목명 + 등급 + 시그널 */}
                <div className="flex items-center gap-1.5">
                    <span className="text-base font-semibold text-[var(--text-primary)] truncate">{stock.stockName}</span>

                    {/* 모바일: 최우선 시그널 1개만 */}
                    <span className="sm:hidden flex-shrink-0">
                        {primarySignal === 'limitUp' && (
                            <span className="px-1.5 py-0.5 text-[11px] font-bold text-white bg-[var(--rise-color)] rounded-md">상한가</span>
                        )}
                        {primarySignal === 'volume' && (
                            <span className="text-[12px]" title={`거래량 ${stock.volumeSurgeRate}배`}>🔥</span>
                        )}
                        {primarySignal === 'score' && (
                            <span className="px-1 py-0.5 text-[11px] font-bold rounded-md text-[var(--rise-color)] bg-[var(--rise-color)]/15">+{scoreChange!.delta}점</span>
                        )}
                        {primarySignal === 'streak' && (
                            <span className={`px-1 py-0.5 text-[11px] font-bold rounded-md ${streakDays >= 5 ? 'text-red-500 bg-red-500/15' : 'text-amber-600 bg-amber-500/15'}`}>{streakDays}일</span>
                        )}
                    </span>

                    {/* 데스크탑: 시그널 전부 */}
                    <span className="hidden sm:contents">
                        {volumeExplosion && (
                            <span className="text-[12px] font-bold flex-shrink-0" title={`거래량 ${stock.volumeSurgeRate}배`}>🔥</span>
                        )}
                        {scoreJump && (
                            <span className="px-1.5 py-0.5 text-[11px] font-bold flex-shrink-0 rounded-md text-[var(--rise-color)] bg-[var(--rise-color)]/15">+{scoreChange!.delta}점</span>
                        )}
                        {streakDays >= 3 && (
                            <span className={`px-1.5 py-0.5 text-[11px] font-bold flex-shrink-0 rounded-md ${streakDays >= 5 ? 'text-red-500 bg-red-500/15' : 'text-amber-600 bg-amber-500/15'}`}>{streakDays}일 연속</span>
                        )}
                        {isLimitUp && (
                            <span className="px-2 py-0.5 text-[12px] font-bold text-white bg-[var(--rise-color)] flex-shrink-0 rounded-md">상한가</span>
                        )}
                    </span>
                </div>

                {/* 2행: 테마 (데스크탑만) + 이유 */}
                <div className="flex items-center gap-1.5 mt-0.5">
                    {stock.themes.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                            {stock.themes.slice(0, 2).map((theme) => (
                                <span
                                    key={theme}
                                    role="button"
                                    onClick={(e) => { e.stopPropagation(); onThemeClick(theme); }}
                                    className="text-sm text-[var(--accent-blue)] hover:underline truncate max-w-[80px] cursor-pointer"
                                >
                                    {theme}
                                </span>
                            ))}
                            {stock.themes.length > 2 && (
                                <span className="text-sm text-[var(--text-tertiary)]">+{stock.themes.length - 2}</span>
                            )}
                        </div>
                    )}
                    {stock.reason && (
                        <p className="text-[13px] text-[var(--text-secondary)] truncate font-medium min-w-0">
                            💡 {stock.reason}
                        </p>
                    )}
                </div>

                {/* 3행: 최신 뉴스 (데스크탑만) */}
                {stock.latestNews && (
                    <p className="hidden sm:block text-sm text-[var(--text-tertiary)] truncate mt-0.5">
                        {stock.latestNews}
                    </p>
                )}
            </div>

            {/* 가격 */}
            <div className="text-right flex-shrink-0">
                <div className={`text-base transition-colors duration-700 ${
                    priceFlash === 'rise' ? 'text-[var(--rise-color)] font-semibold'
                    : priceFlash === 'fall' ? 'text-[var(--fall-color)] font-semibold'
                    : 'text-[var(--text-primary)]'
                }`}>{stock.currentPrice.toLocaleString()}</div>
                {isLimitUp ? (
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--rise-color)] mt-0.5">
                        <span className="text-sm font-bold text-white">↑ {stock.changeRate.toFixed(2)}%</span>
                    </div>
                ) : (
                    <div className={`text-sm font-medium ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                        {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                    </div>
                )}
            </div>

            {/* 거래대금 (데스크탑) */}
            <div className="hidden sm:block w-12 text-right flex-shrink-0">
                <div className="text-sm font-medium text-[var(--text-secondary)]">{formatTradingValue(stock.tradingValue)}</div>
            </div>

            {/* 점수 (데스크탑) — 등급배지는 종목명 옆으로 이동했으므로 점수만 */}
            <div className="hidden sm:block w-10 text-right flex-shrink-0">
                <span className="text-base font-bold text-[var(--text-primary)]">{stock.totalScore}</span>
            </div>
        </motion.button>
    );
}

function MarketKpiStrip({ stocks }: { stocks: HotStock[] }) {
    const total = stocks.length;
    if (total === 0) return null;

    const marketTemp = Math.round(stocks.reduce((sum, s) => sum + s.totalScore, 0) / total);
    const sCount = stocks.filter(s => s.grade === 'S').length;
    const aCount = stocks.filter(s => s.grade === 'A').length;
    const limitUpCount = stocks.filter(s => s.changeRate >= 29.9).length;

    // Most common theme among S-grade stocks
    const sStocks = stocks.filter(s => s.grade === 'S');
    const themeMap = new Map<string, { count: number; totalChange: number }>();
    sStocks.forEach(s => {
        s.themes.forEach(theme => {
            const entry = themeMap.get(theme) ?? { count: 0, totalChange: 0 };
            themeMap.set(theme, { count: entry.count + 1, totalChange: entry.totalChange + s.changeRate });
        });
    });
    let topTheme: string | null = null;
    let topThemeCount = 0;
    let topThemeAvgChange = 0;
    themeMap.forEach((val, key) => {
        if (val.count > topThemeCount) {
            topThemeCount = val.count;
            topTheme = key;
            topThemeAvgChange = val.totalChange / val.count;
        }
    });

    const tempColor = marketTemp >= 60 ? 'var(--rise-color)' : marketTemp >= 40 ? 'var(--text-primary)' : 'var(--fall-color)';

    return (
        <div className="mb-4">
            {/* KPI 5-column grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[var(--border-color)] border border-[var(--border-color)] rounded-xl overflow-hidden mb-3">
                {/* 시장 온도 */}
                <div className="bg-[var(--bg-primary)] px-4 py-3 text-center">
                    <div className="text-lg font-bold" style={{ color: tempColor }}>{marketTemp}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">시장 온도</div>
                </div>
                {/* S등급 */}
                <div className="bg-[var(--bg-primary)] px-4 py-3 text-center">
                    <div className="text-lg font-bold" style={{ color: 'var(--grade-s)' }}>{sCount}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">S등급</div>
                </div>
                {/* A등급 */}
                <div className="bg-[var(--bg-primary)] px-4 py-3 text-center">
                    <div className="text-lg font-bold" style={{ color: 'var(--grade-a)' }}>{aCount}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">A등급</div>
                </div>
                {/* 상한가 */}
                <div className="bg-[var(--bg-primary)] px-4 py-3 text-center">
                    <div className="text-lg font-bold" style={{ color: limitUpCount > 0 ? 'var(--rise-color)' : 'var(--text-primary)' }}>{limitUpCount}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">상한가</div>
                </div>
                {/* 오늘의 테마 */}
                <div className="bg-[var(--bg-primary)] px-4 py-3 text-center col-span-2 sm:col-span-1">
                    {topTheme ? (
                        <>
                            <div className="text-sm font-bold text-[var(--text-primary)] truncate">{topTheme}</div>
                            <div className="text-xs" style={{ color: topThemeAvgChange >= 0 ? 'var(--rise-color)' : 'var(--fall-color)' }}>
                                {topThemeAvgChange >= 0 ? '+' : ''}{topThemeAvgChange.toFixed(1)}% avg
                            </div>
                            <div className="text-xs text-[var(--text-tertiary)]">오늘의 테마</div>
                        </>
                    ) : (
                        <>
                            <div className="text-lg font-bold text-[var(--text-tertiary)]">—</div>
                            <div className="text-xs text-[var(--text-tertiary)]">오늘의 테마</div>
                        </>
                    )}
                </div>
            </div>

        </div>
    );
}

// 이전 데이터와 비교하여 가격 플래시/순위 변동/점수 변동 계산
function usePriceFlashAndRank(stocks: HotStock[]) {
    const prevStocksRef = useRef<HotStock[]>([]);
    const [flashes, setFlashes] = useState<Record<string, PriceFlash>>({});
    const [rankChanges, setRankChanges] = useState<Record<string, RankChange>>({});
    const [scoreChanges, setScoreChanges] = useState<Record<string, ScoreChange>>({});

    useEffect(() => {
        const prev = prevStocksRef.current;
        if (prev.length === 0) {
            prevStocksRef.current = stocks;
            return;
        }

        const prevPriceMap = new Map(prev.map(s => [s.stockCode, s.currentPrice]));
        const prevRankMap = new Map(prev.map((s, i) => [s.stockCode, i]));
        const prevScoreMap = new Map(prev.map(s => [s.stockCode, s.totalScore]));

        const newFlashes: Record<string, PriceFlash> = {};
        const newRankChanges: Record<string, RankChange> = {};
        const newScoreChanges: Record<string, ScoreChange> = {};

        stocks.forEach((stock, i) => {
            const prevPrice = prevPriceMap.get(stock.stockCode);
            if (prevPrice !== undefined && prevPrice !== stock.currentPrice) {
                newFlashes[stock.stockCode] = stock.currentPrice > prevPrice ? 'rise' : 'fall';
            }

            const prevRank = prevRankMap.get(stock.stockCode);
            if (prevRank === undefined) {
                newRankChanges[stock.stockCode] = { delta: 0, isNew: true };
            } else {
                newRankChanges[stock.stockCode] = { delta: prevRank - i, isNew: false };
            }

            const prevScore = prevScoreMap.get(stock.stockCode);
            if (prevScore !== undefined) {
                newScoreChanges[stock.stockCode] = { delta: stock.totalScore - prevScore };
            }
        });

        setFlashes(newFlashes);
        setRankChanges(newRankChanges);
        setScoreChanges(newScoreChanges);
        prevStocksRef.current = stocks;

        // 1.5초 후 플래시 해제 (배지/스코어 변동은 유지)
        const timer = setTimeout(() => {
            setFlashes({});
        }, 1500);
        return () => clearTimeout(timer);
    }, [stocks]);

    return { flashes, rankChanges, scoreChanges };
}

export default function HotStocksView() {
    const router = useRouter();
    const { isLoggedIn } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['hotStocks'],
        queryFn: () => fetchHotStocks(20),
        refetchInterval: (query) => {
            const stocks = query.state.data?.stocks;
            if (!stocks || stocks.length === 0) return 5000;
            return isLoggedIn ? 5 * 60 * 1000 : 5 * 60 * 1000;
        },
        retry: 3,
        retryDelay: (attempt) => Math.min(attempt * 3000, 10000),
    });

    useOnPriceUpdate(useCallback((update) => {
        queryClient.setQueryData(['hotStocks'], (old: any) => {
            if (!old?.stocks) return old;
            return {
                ...old,
                stocks: old.stocks.map((s: any) =>
                    s.stockCode === update.stockCode
                        ? {
                            ...s,
                            currentPrice: update.price,
                            changeRate: update.changeRate,
                            tradingValue: s.tradingValue + (update.price * update.volume),
                        }
                        : s
                ),
            };
        });
    }, [queryClient]));

    useOnHotnessUpdate(useCallback((update) => {
        queryClient.setQueryData(['hotStocks'], (old: any) => {
            if (!old?.stocks) return old;
            const updated = old.stocks.map((s: any) =>
                s.stockCode === update.stockCode
                    ? { ...s, totalScore: update.totalScore, grade: update.grade }
                    : s
            );
            // 점수 변동 시 자동 재정렬
            updated.sort((a: any, b: any) => b.totalScore - a.totalScore);
            return { ...old, stocks: updated };
        });
    }, [queryClient]));

    const stocks = data?.stocks || [];
    const { flashes, rankChanges, scoreChanges } = usePriceFlashAndRank(stocks);

    const handleStockClick = (stockCode: string) => {
        router.push(`/stocks/${encodeURIComponent(stockCode)}`);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                </div>
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-xl overflow-hidden">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonRow key={i} cols={5} />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
                <p className="text-sm text-[var(--text-tertiary)]">데이터를 불러오는데 실패했습니다.</p>
                <button onClick={() => refetch()} className="text-[13px] text-[var(--accent-blue)] hover:underline">다시 시도</button>
            </div>
        );
    }

    const hotStocks = stocks.filter((s) => s.grade === 'S');
    const warmStocks = stocks.filter((s) => s.grade === 'A');
    const otherStocks = stocks.filter((s) => !['S', 'A'].includes(s.grade));

    const renderSection = (
        title: string,
        description: string,
        sectionStocks: HotStock[],
        startRank: number,
    ) => {
        if (sectionStocks.length === 0) return null;
        return (
            <section>
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-[var(--text-primary)]">{title}</span>
                        <span className="text-sm text-[var(--text-tertiary)]">{description}</span>
                    </div>
                    <span className="text-sm text-[var(--text-tertiary)]">{sectionStocks.length}종목</span>
                </div>
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-tertiary)]">
                        <span className="w-7 text-center">#</span>
                        <span className="flex-1">종목</span>
                        <span className="text-right">현재가</span>
                        <span className="hidden sm:block w-12 text-right">거래대금</span>
                        <span className="hidden sm:block w-10 text-right">점수</span>
                    </div>
                    <AnimatePresence mode="popLayout">
                        {sectionStocks.map((stock, i) => (
                            <StockRow
                                key={stock.stockCode}
                                stock={stock}
                                rank={startRank + i}
                                priceFlash={flashes[stock.stockCode] || null}
                                rankChange={rankChanges[stock.stockCode] || null}
                                scoreChange={scoreChanges[stock.stockCode] || null}
                                staggerIndex={i}
                                onStockClick={handleStockClick}
                                onThemeClick={(theme) => router.push(`/themes/${encodeURIComponent(theme)}`)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </section>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">주도주 분석</h2>
                    <span className="text-xs text-[var(--text-tertiary)]">시장 흐름 종합 평가</span>
                </div>
                {data?.lastUpdateTime && (
                    <span className="hidden sm:inline text-xs text-[var(--text-tertiary)]">
                        {formatDataDate(data.lastUpdateTime)}
                    </span>
                )}
            </div>

            <HeroCard />

            {/* MarketKpiStrip — MarketStatusBar(홈 상단)로 대체됨 */}

            <MarketThemeCard />

            {renderSection('S등급', '70점 이상', hotStocks, 1)}
            {renderSection('A등급', '50~69점', warmStocks, hotStocks.length + 1)}
            {renderSection('기타', '50점 미만', otherStocks, hotStocks.length + warmStocks.length + 1)}

            {stocks.length === 0 && (
                <EmptyState
                    icon={Activity}
                    title={!data?.lastUpdateTime ? '데이터 준비 중... (약 1분)' : '분석할 종목이 없습니다'}
                />
            )}
        </div>
    );
}
