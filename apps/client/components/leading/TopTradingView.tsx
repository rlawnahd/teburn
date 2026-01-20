'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { RefreshCw, TrendingUp, Filter, ArrowUpRight } from 'lucide-react';
import { fetchLeadingStocks, LeadingStock } from '@/lib/api/leading';
import { useState } from 'react';

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

// 등락률에 따른 배경
function getChangeRateBg(rate: number): string {
    if (rate >= 15) return 'bg-[var(--rise-color)]/15';
    if (rate >= 10) return 'bg-[var(--rise-color)]/10';
    if (rate >= 6) return 'bg-[var(--rise-color)]/5';
    return '';
}

// 종목 행 컴포넌트
function StockRow({
    stock,
    rank,
    maxTradingValue,
    onThemeClick,
}: {
    stock: LeadingStock;
    rank: number;
    maxTradingValue: number;
    onThemeClick: (theme: string) => void;
}) {
    const progressWidth = (stock.tradingValue / maxTradingValue) * 100;
    const isLimitUp = stock.changeRate >= 29.9;

    return (
        <div className={`relative group rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-blue)]/30 transition-all ${getChangeRateBg(stock.changeRate)}`}>
            {/* 거래대금 프로그레스 바 (배경) */}
            <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div
                    className="absolute left-0 top-0 h-full bg-[var(--accent-blue)]/5 transition-all"
                    style={{ width: `${progressWidth}%` }}
                />
            </div>

            <div className="relative flex items-center p-3 gap-4">
                {/* 순위 */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    rank <= 3
                        ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
                }`}>
                    {rank}
                </div>

                {/* 종목명 + 테마 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)] truncate">{stock.stockName}</span>
                        {isLimitUp && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold text-white bg-[var(--rise-color)] rounded">
                                상한가
                            </span>
                        )}
                    </div>
                    {stock.themes.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                            {stock.themes.slice(0, 2).map((theme) => (
                                <button
                                    key={theme}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onThemeClick(theme);
                                    }}
                                    className="text-[10px] text-[var(--accent-blue)] hover:underline transition-colors"
                                >
                                    #{theme}
                                </button>
                            ))}
                            {stock.themes.length > 2 && (
                                <span className="text-[10px] text-[var(--text-tertiary)]">+{stock.themes.length - 2}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* 현재가 */}
                <div className="text-right">
                    <span className="text-sm text-[var(--text-secondary)]">{stock.currentPrice.toLocaleString()}원</span>
                </div>

                {/* 등락률 */}
                <div className="w-20 text-right">
                    <span className="flex items-center justify-end gap-0.5 font-bold text-[var(--rise-color)]">
                        <ArrowUpRight size={14} />
                        +{stock.changeRate.toFixed(2)}%
                    </span>
                </div>

                {/* 거래대금 */}
                <div className="w-20 text-right">
                    <span className="font-medium text-[var(--text-secondary)]">{formatTradingValue(stock.tradingValue)}</span>
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
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--rise-bg)] flex items-center justify-center">
                        <TrendingUp size={20} className="text-[var(--rise-color)]" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">
                            거래대금 상위
                        </h2>
                        <p className="text-xs text-[var(--text-tertiary)]">
                            {minRate > 0 ? `${minRate}% 이상 상승 · ` : ''}{stocks.length}개 종목
                        </p>
                    </div>
                </div>

                {/* 필터 */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                    {[0, 4, 6, 10].map((rate) => (
                        <button
                            key={rate}
                            onClick={() => setMinRate(rate)}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                                minRate === rate
                                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                            {rate === 0 ? '전체' : `${rate}%↑`}
                        </button>
                    ))}
                </div>
            </div>

            {/* 테이블 헤더 */}
            <div className="flex items-center px-3 py-2 text-[11px] text-[var(--text-tertiary)] border-b border-[var(--border-color)]">
                <div className="w-8 mr-4">#</div>
                <div className="flex-1">종목명</div>
                <div className="w-24 text-right">현재가</div>
                <div className="w-20 text-right">등락률</div>
                <div className="w-20 text-right">거래대금</div>
            </div>

            {/* 종목 리스트 */}
            {stocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-tertiary)]">
                    <Filter size={48} className="mb-4 opacity-30" />
                    <p className="text-lg font-medium">조건에 맞는 종목이 없습니다</p>
                    <p className="text-sm mt-1">필터 조건을 변경해보세요</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {stocks.map((stock, index) => (
                        <StockRow
                            key={stock.stockCode}
                            stock={stock}
                            rank={index + 1}
                            maxTradingValue={maxTradingValue}
                            onThemeClick={handleThemeClick}
                        />
                    ))}
                </div>
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
