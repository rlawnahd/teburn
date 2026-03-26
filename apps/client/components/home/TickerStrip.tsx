'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { fetchHotStocks } from '@/lib/api/leading';
import { useOnPriceUpdate } from '@/hooks/useRealtimePrice';
import { useAuth } from '@/hooks/useAuth';

export default function TickerStrip() {
    const router = useRouter();
    const { isLoggedIn } = useAuth();
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ['hotStocks'],
        queryFn: () => fetchHotStocks(30),
        refetchInterval: isLoggedIn ? 5 * 60 * 1000 : 60 * 1000,
        staleTime: 30 * 1000,
    });

    useOnPriceUpdate(useCallback((update) => {
        queryClient.setQueryData(['hotStocks'], (old: any) => {
            if (!old?.stocks) return old;
            return {
                ...old,
                stocks: old.stocks.map((s: any) =>
                    s.stockCode === update.stockCode
                        ? { ...s, currentPrice: update.price, changeRate: update.changeRate }
                        : s
                ),
            };
        });
    }, [queryClient]));

    const stocks = data?.stocks || [];
    if (stocks.length === 0) return null;

    // S등급 + 상한가 우선, 나머지는 점수순 (이미 정렬됨)
    const topStocks = stocks.slice(0, 15);

    // 무한 스크롤을 위해 배열 2번 반복
    const items = [...topStocks, ...topStocks];

    return (
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden">
            <div className="ticker-scroll flex items-center gap-6 py-1.5 whitespace-nowrap">
                {items.map((stock, i) => {
                    const isPositive = stock.changeRate > 0;
                    const isLimitUp = stock.changeRate >= 29.9;
                    return (
                        <button
                            key={`${stock.stockCode}-${i}`}
                            onClick={() => router.push(`/stocks/${encodeURIComponent(stock.stockCode)}`)}
                            className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity"
                        >
                            {stock.grade === 'S' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--rise-color)] flex-shrink-0" />
                            )}
                            <span className="text-[12px] font-medium text-[var(--text-primary)]">
                                {stock.stockName}
                            </span>
                            {isLimitUp && (
                                <span className="text-[9px] font-bold text-white bg-[var(--rise-color)] px-1 rounded-sm">
                                    상한
                                </span>
                            )}
                            <span className={`text-[12px] font-semibold ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                {isPositive ? '+' : ''}{stock.changeRate.toFixed(1)}%
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)]">
                                {stock.currentPrice.toLocaleString()}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
