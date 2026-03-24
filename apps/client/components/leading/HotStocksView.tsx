'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { fetchHotStocks, HotStock } from '@/lib/api/leading';
import { formatTradingValue, formatDataDate } from '@/lib/utils/format';
import GradeBadge from '@/components/ui/GradeBadge';
import { SkeletonRow } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

function ScoreMiniGauge({ score }: { score: number }) {
    return (
        <div className="w-8 flex items-center gap-1">
            <div className="flex-1 h-[3px] bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{
                        width: `${Math.min(score, 100)}%`,
                        background: score >= 70
                            ? 'var(--grade-s)'
                            : score >= 50
                            ? 'var(--grade-a)'
                            : 'var(--text-tertiary)',
                    }}
                />
            </div>
        </div>
    );
}

type PriceFlash = 'rise' | 'fall' | null;
type RankChange = { delta: number; isNew: boolean };

function StockRow({
    stock,
    rank,
    priceFlash,
    rankChange,
    staggerIndex,
    onStockClick,
    onThemeClick,
}: {
    stock: HotStock;
    rank: number;
    priceFlash: PriceFlash;
    rankChange: RankChange | null;
    staggerIndex: number;
    onStockClick: (stockCode: string) => void;
    onThemeClick: (theme: string) => void;
}) {
    const isPositive = stock.changeRate > 0;
    const isLimitUp = stock.changeRate >= 29.9;

    const flashClass = priceFlash === 'rise'
        ? 'animate-flash-rise'
        : priceFlash === 'fall'
        ? 'animate-flash-fall'
        : '';

    return (
        <button
            onClick={() => onStockClick(stock.stockCode)}
            className={`w-full flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors text-left ${flashClass} ${rankChange?.isNew ? 'animate-slideInLeft' : ''}`}
            style={{ animationDelay: `${staggerIndex * 30}ms` }}
        >
            <span className={`w-5 text-center text-xs font-semibold flex-shrink-0 ${rank <= 3 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'}`}>
                {rank}
            </span>

            {/* 순위 변동 뱃지 */}
            <div className="w-6 flex-shrink-0 text-center">
                {rankChange?.isNew ? (
                    <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded-sm">NEW</span>
                ) : rankChange && rankChange.delta !== 0 ? (
                    <span className={`text-[10px] font-semibold ${rankChange.delta > 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                        {rankChange.delta > 0 ? '▲' : '▼'}{Math.abs(rankChange.delta)}
                    </span>
                ) : (
                    <span className="text-[10px] text-[var(--text-disabled)]">—</span>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{stock.stockName}</span>
                    <GradeBadge grade={stock.grade} />
                    {isLimitUp && (
                        <span className="px-1 py-0.5 text-[9px] font-bold text-white bg-[var(--rise-color)] flex-shrink-0 rounded-sm">
                            상한가
                        </span>
                    )}
                </div>
                {stock.themes.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                        {stock.themes.slice(0, 2).map((theme) => (
                            <span
                                key={theme}
                                role="button"
                                onClick={(e) => { e.stopPropagation(); onThemeClick(theme); }}
                                className="text-[11px] text-[var(--accent-blue)] hover:underline truncate max-w-[80px] cursor-pointer"
                            >
                                {theme}
                            </span>
                        ))}
                        {stock.themes.length > 2 && (
                            <span className="text-[11px] text-[var(--text-tertiary)]">+{stock.themes.length - 2}</span>
                        )}
                    </div>
                )}
                {stock.latestNews && (
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                        {stock.latestNews}
                    </p>
                )}
            </div>

            <div className="text-right flex-shrink-0">
                <div className="text-xs text-[var(--text-primary)]">{stock.currentPrice.toLocaleString()}</div>
                <div className={`text-[11px] font-medium ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                    {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                </div>
            </div>

            <div className="w-12 text-right flex-shrink-0">
                <div className="text-[11px] text-[var(--text-tertiary)]">{formatTradingValue(stock.tradingValue)}</div>
            </div>

            <div className="w-10 flex items-center gap-1 flex-shrink-0 justify-end">
                <span className="text-[13px] font-bold text-[var(--text-primary)]">{stock.totalScore}</span>
                <ScoreMiniGauge score={stock.totalScore} />
            </div>
        </button>
    );
}

// 이전 데이터와 비교하여 가격 플래시/순위 변동 계산
function usePriceFlashAndRank(stocks: HotStock[]) {
    const prevStocksRef = useRef<HotStock[]>([]);
    const [flashes, setFlashes] = useState<Record<string, PriceFlash>>({});
    const [rankChanges, setRankChanges] = useState<Record<string, RankChange>>({});

    useEffect(() => {
        const prev = prevStocksRef.current;
        if (prev.length === 0) {
            prevStocksRef.current = stocks;
            return;
        }

        const prevPriceMap = new Map(prev.map(s => [s.stockCode, s.currentPrice]));
        const prevRankMap = new Map(prev.map((s, i) => [s.stockCode, i]));

        const newFlashes: Record<string, PriceFlash> = {};
        const newRankChanges: Record<string, RankChange> = {};

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
        });

        setFlashes(newFlashes);
        setRankChanges(newRankChanges);
        prevStocksRef.current = stocks;

        // 1.5초 후 플래시 해제
        const timer = setTimeout(() => setFlashes({}), 1500);
        return () => clearTimeout(timer);
    }, [stocks]);

    return { flashes, rankChanges };
}

export default function HotStocksView() {
    const router = useRouter();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['hotStocks'],
        queryFn: () => fetchHotStocks(30),
        refetchInterval: (query) => {
            const stocks = query.state.data?.stocks;
            return (!stocks || stocks.length === 0) ? 5000 : 60 * 1000;
        },
        retry: 3,
        retryDelay: (attempt) => Math.min(attempt * 3000, 10000),
    });

    const stocks = data?.stocks || [];
    const { flashes, rankChanges } = usePriceFlashAndRank(stocks);

    const handleStockClick = (stockCode: string) => {
        router.push(`/stocks/${encodeURIComponent(stockCode)}`);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-20 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                </div>
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] rounded overflow-hidden">
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
                <p className="text-[13px] text-[var(--text-tertiary)]">데이터를 불러오는데 실패했습니다.</p>
                <button onClick={() => refetch()} className="text-[12px] text-[var(--accent-blue)] hover:underline">다시 시도</button>
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
        borderColor: string,
    ) => {
        if (sectionStocks.length === 0) return null;
        return (
            <section>
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-[3px] h-3.5 rounded-full`} style={{ background: borderColor }} />
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{description}</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)]">{sectionStocks.length}종목</span>
                </div>
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] rounded overflow-hidden" style={{ borderLeftColor: borderColor, borderLeftWidth: '3px' }}>
                    <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[11px] text-[var(--text-tertiary)]">
                        <span className="w-5 text-center">#</span>
                        <span className="w-6 text-center">변동</span>
                        <span className="flex-1">종목</span>
                        <span className="text-right">현재가</span>
                        <span className="w-12 text-right">거래대금</span>
                        <span className="w-10 text-right">점수</span>
                    </div>
                    {sectionStocks.map((stock, i) => (
                        <StockRow
                            key={stock.stockCode}
                            stock={stock}
                            rank={startRank + i}
                            priceFlash={flashes[stock.stockCode] || null}
                            rankChange={rankChanges[stock.stockCode] || null}
                            staggerIndex={i}
                            onStockClick={handleStockClick}
                            onThemeClick={(theme) => router.push(`/themes/${encodeURIComponent(theme)}`)}
                        />
                    ))}
                </div>
            </section>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">주도주 분석</h2>
                    <span className="text-[11px] text-[var(--text-tertiary)]">거래대금 + 등락률 + 거래량 + 뉴스 + 대장주집중도</span>
                </div>
                {data?.lastUpdateTime && (
                    <span className="hidden sm:inline text-[11px] text-[var(--text-tertiary)]">
                        {formatDataDate(data.lastUpdateTime)}
                    </span>
                )}
            </div>

            {renderSection('S등급', '70점 이상', hotStocks, 1, 'var(--grade-s)')}
            {renderSection('A등급', '50~69점', warmStocks, hotStocks.length + 1, 'var(--grade-a)')}
            {renderSection('기타', '50점 미만', otherStocks, hotStocks.length + warmStocks.length + 1, 'var(--text-tertiary)')}

            {stocks.length === 0 && (
                <EmptyState
                    icon={Activity}
                    title={!data?.lastUpdateTime ? '데이터 준비 중... (약 1분)' : '분석할 종목이 없습니다'}
                />
            )}
        </div>
    );
}
