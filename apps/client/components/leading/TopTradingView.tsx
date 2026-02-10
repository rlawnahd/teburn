'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { RefreshCw, Filter } from 'lucide-react';
import { fetchLeadingStocks, LeadingStock } from '@/lib/api/leading';
import { useState } from 'react';

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

function StockRow({
    stock,
    rank,
    maxTradingValue,
    onThemeClick,
    onStockClick,
}: {
    stock: LeadingStock;
    rank: number;
    maxTradingValue: number;
    onThemeClick: (theme: string) => void;
    onStockClick: () => void;
}) {
    const progressWidth = (stock.tradingValue / maxTradingValue) * 100;
    const isLimitUp = stock.changeRate >= 29.9;

    return (
        <div onClick={onStockClick} className="relative group border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer">
            {/* 거래대금 프로그레스 바 */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-[var(--accent-blue)]/[0.04] transition-all"
                    style={{ width: `${progressWidth}%` }}
                />
            </div>

            <div className="relative flex items-center py-1.5 px-2 md:px-3 gap-2 md:gap-3">
                {/* 순위 */}
                <div className={`w-5 text-right text-[13px] font-medium flex-shrink-0 ${
                    rank <= 3 ? 'text-[var(--accent-blue)] font-semibold' : 'text-[var(--text-tertiary)]'
                }`}>
                    {rank}
                </div>

                {/* 종목명 + 테마 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{stock.stockName}</span>
                        {isLimitUp && (
                            <span className="px-1 py-0.5 text-[9px] font-bold text-white bg-[var(--rise-color)] flex-shrink-0">
                                상한가
                            </span>
                        )}
                    </div>
                    {stock.themes.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                            {stock.themes.slice(0, 2).map((theme) => (
                                <button
                                    key={theme}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onThemeClick(theme);
                                    }}
                                    className="text-[11px] text-[var(--accent-blue)] hover:underline truncate max-w-[80px]"
                                >
                                    {theme}
                                </button>
                            ))}
                            {stock.themes.length > 2 && (
                                <span className="text-[11px] text-[var(--text-tertiary)]">+{stock.themes.length - 2}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* 현재가 */}
                <div className="text-right hidden sm:block w-20">
                    <span className="text-[13px] text-[var(--text-secondary)]">{stock.currentPrice.toLocaleString()}</span>
                </div>

                {/* 등락률 */}
                <div className="w-16 md:w-18 text-right flex-shrink-0">
                    <span className="text-[13px] font-semibold text-[var(--rise-color)]">
                        +{stock.changeRate.toFixed(2)}%
                    </span>
                </div>

                {/* 거래대금 */}
                <div className="w-14 md:w-16 text-right flex-shrink-0">
                    <span className="text-xs text-[var(--text-secondary)]">{formatTradingValue(stock.tradingValue)}</span>
                </div>
            </div>
        </div>
    );
}

export default function TopTradingView() {
    const router = useRouter();
    const [minRate, setMinRate] = useState(4);

    const { data, isLoading, error } = useQuery({
        queryKey: ['leadingStocks', minRate],
        queryFn: () => fetchLeadingStocks(minRate, 30),
        refetchInterval: 60 * 1000,
    });

    const stocks = data?.stocks || [];
    const maxTradingValue = stocks.length > 0 ? Math.max(...stocks.map((s) => s.tradingValue)) : 1;

    const handleThemeClick = (theme: string) => {
        router.push(`/themes/${encodeURIComponent(theme)}`);
    };

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
        <div className="space-y-3">
            {/* 설명 */}
            <div className="px-2 py-1.5 border-l-2 border-[var(--accent-blue)] bg-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                    <span className="text-[var(--text-secondary)] font-medium">테마주</span> 중 거래대금 상위.
                    대형주 제외, <span className="text-[var(--rise-color)]">오늘 돈이 몰리는 테마</span>에 집중.
                </p>
            </div>

            {/* 헤더 + 필터 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">거래대금 TOP</h2>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                        {stocks.length}종목
                    </span>
                    {data?.lastUpdateTime && (
                        <span className="hidden sm:inline text-[11px] text-[var(--text-tertiary)]">
                            · {formatDataDate(data.lastUpdateTime)}
                        </span>
                    )}
                </div>

                <div className="flex items-center border border-[var(--border-color)]">
                    {[0, 4, 6, 10].map((rate) => (
                        <button
                            key={rate}
                            onClick={() => setMinRate(rate)}
                            className={`px-2 py-1 text-[11px] font-medium transition-colors border-r border-[var(--border-color)] last:border-r-0 ${
                                minRate === rate
                                    ? 'bg-[var(--accent-blue)] text-white'
                                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                        >
                            {rate === 0 ? '전체' : `${rate}%+`}
                        </button>
                    ))}
                </div>
            </div>

            {/* 테이블 */}
            <div className="border border-[var(--border-color)] bg-[var(--bg-primary)]">
                {/* 테이블 헤더 */}
                <div className="flex items-center py-1 px-2 md:px-3 text-[11px] text-[var(--text-tertiary)] border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                    <div className="w-5 text-right">#</div>
                    <div className="flex-1 ml-2 md:ml-3">종목</div>
                    <div className="w-20 text-right hidden sm:block">현재가</div>
                    <div className="w-16 md:w-18 text-right">등락률</div>
                    <div className="w-14 md:w-16 text-right">거래대금</div>
                </div>

                {/* 종목 리스트 */}
                {stocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-[var(--text-tertiary)]">
                        <Filter size={24} className="mb-2 opacity-30" />
                        <p className="text-[13px]">조건에 맞는 종목이 없습니다</p>
                    </div>
                ) : (
                    stocks.map((stock, index) => (
                        <StockRow
                            key={stock.stockCode}
                            stock={stock}
                            rank={index + 1}
                            maxTradingValue={maxTradingValue}
                            onThemeClick={handleThemeClick}
                            onStockClick={() => router.push(`/stocks/${encodeURIComponent(stock.stockCode)}`)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
