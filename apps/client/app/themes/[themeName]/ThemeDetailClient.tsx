'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { fetchThemePrice, StockPrice } from '@/lib/api/stocks';
import { formatVolume } from '@/lib/utils/format';

function StockRow({ stock, rank, onClick }: { stock: StockPrice; rank: number; onClick: () => void }) {
    const isPositive = stock.changeRate > 0;
    const isNegative = stock.changeRate < 0;
    const isLimitUp = stock.changeRate >= 29.9;

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors text-left cursor-pointer"
        >
            <span className={`w-5 text-center text-xs font-semibold flex-shrink-0 ${rank <= 3 ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}>
                {rank}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-medium text-[var(--text-primary)] truncate">{stock.stockName}</span>
                    {isLimitUp && (
                        <span className="px-1 py-0.5 text-[10px] font-bold text-white bg-[var(--rise-color)] flex-shrink-0 rounded-sm">
                            상한가
                        </span>
                    )}
                </div>
                <span className="text-[12px] text-[var(--text-tertiary)]">{stock.stockCode}</span>
            </div>
            <div className="text-right flex-shrink-0">
                <div className="text-xs text-[var(--text-primary)]">{stock.currentPrice.toLocaleString()}</div>
                <div className={`text-[12px] font-medium ${isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'}`}>
                    {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                </div>
            </div>
            <div className="w-12 text-right flex-shrink-0 hidden sm:block">
                <div className="text-[12px] text-[var(--text-tertiary)]">{formatVolume(stock.volume)}</div>
            </div>
        </button>
    );
}

export default function ThemeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const themeName = decodeURIComponent(params.themeName as string);

    const { data: theme, isLoading, error } = useQuery({
        queryKey: ['themeDetail', themeName],
        queryFn: () => fetchThemePrice(themeName),
        enabled: !!themeName,
        refetchInterval: 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)]">
                <main className="flex items-center justify-center h-[calc(100vh-2.5rem)]">
                    <div className="flex items-center gap-2 text-[14px] text-[var(--text-tertiary)]">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>테마 정보 로딩 중...</span>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !theme) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)]">
                <main className="flex flex-col items-center justify-center h-[calc(100vh-2.5rem)]">
                    <p className="text-[14px] text-[var(--text-tertiary)] mb-3">테마를 찾을 수 없습니다</p>
                    <Link href="/" className="text-[14px] text-[var(--accent)] hover:underline">
                        홈으로 돌아가기
                    </Link>
                </main>
            </div>
        );
    }

    const isPositive = theme.avgChangeRate > 0;
    const isNegative = theme.avgChangeRate < 0;

    const risingStocks = theme.stockPrices.filter((s) => s.changeRate > 0).sort((a, b) => b.changeRate - a.changeRate);
    const fallingStocks = theme.stockPrices.filter((s) => s.changeRate <= 0).sort((a, b) => a.changeRate - b.changeRate);

    const handleStockClick = (stockCode: string) => {
        router.push(`/stocks/${encodeURIComponent(stockCode)}`);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 테마 헤더 바 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="max-w-[1280px] mx-auto flex items-center gap-3 px-3 py-2">
                    <button
                        onClick={() => router.back()}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={14} />
                    </button>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">{theme.themeName}</h1>
                        <span className="text-[12px] text-[var(--text-tertiary)] flex-shrink-0">{theme.stockCount}종목</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-sm font-bold ${isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'}`}>
                            {isPositive ? '+' : ''}{theme.avgChangeRate.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            <main className="max-w-[1280px] mx-auto p-3 space-y-3">
                {/* 히어로 섹션 */}
                <div
                    className="card py-4 text-center"
                >
                    <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">{theme.themeName}</div>
                    <div className={`text-2xl font-bold ${isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'}`}>
                        {isPositive ? '+' : ''}{theme.avgChangeRate.toFixed(2)}%
                    </div>
                    <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">평균 등락률</div>
                </div>

                {/* 요약 정보 */}
                <div className="card">
                    <div className="grid grid-cols-3 gap-px bg-[var(--border-color)]">
                        <div className="bg-[var(--bg-primary)] px-3 py-2">
                            <div className="text-[12px] text-[var(--text-tertiary)] mb-0.5">평균 등락률</div>
                            <div className={`text-[14px] font-semibold ${isPositive ? 'text-[var(--rise-color)]' : isNegative ? 'text-[var(--fall-color)]' : 'text-[var(--text-primary)]'}`}>
                                {isPositive ? '+' : ''}{theme.avgChangeRate.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-[var(--bg-primary)] px-3 py-2">
                            <div className="text-[12px] text-[var(--text-tertiary)] mb-0.5">종목 수</div>
                            <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                                {theme.stockCount} / {theme.totalStocks}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-primary)] px-3 py-2">
                            <div className="text-[12px] text-[var(--text-tertiary)] mb-0.5">상승/하락</div>
                            <div className="text-[14px] font-semibold">
                                <span className="text-[var(--rise-color)]">{risingStocks.length}</span>
                                <span className="text-[var(--text-tertiary)]"> / </span>
                                <span className="text-[var(--fall-color)]">{fallingStocks.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 상승 종목 */}
                {risingStocks.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-0.5 h-3 bg-[var(--rise-color)]" />
                            <span className="text-xs font-medium text-[var(--text-primary)]">상승</span>
                            <span className="text-[12px] text-[var(--text-tertiary)]">{risingStocks.length}</span>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[12px] text-[var(--text-tertiary)]">
                                <span className="w-5 text-center">#</span>
                                <span className="flex-1">종목</span>
                                <span className="text-right">현재가</span>
                                <span className="w-12 text-right hidden sm:block">거래량</span>
                            </div>
                            {risingStocks.map((stock, i) => (
                                <div key={stock.stockCode} className="animate-stagger" style={{ animationDelay: `${i * 25}ms` }}>
                                    <StockRow stock={stock} rank={i + 1} onClick={() => handleStockClick(stock.stockCode)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 하락 종목 */}
                {fallingStocks.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-0.5 h-3 bg-[var(--fall-color)]" />
                            <span className="text-xs font-medium text-[var(--text-primary)]">하락</span>
                            <span className="text-[12px] text-[var(--text-tertiary)]">{fallingStocks.length}</span>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[12px] text-[var(--text-tertiary)]">
                                <span className="w-5 text-center">#</span>
                                <span className="flex-1">종목</span>
                                <span className="text-right">현재가</span>
                                <span className="w-12 text-right hidden sm:block">거래량</span>
                            </div>
                            {fallingStocks.map((stock, i) => (
                                <div key={stock.stockCode} className="animate-stagger" style={{ animationDelay: `${i * 25}ms` }}>
                                    <StockRow stock={stock} rank={i + 1} onClick={() => handleStockClick(stock.stockCode)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
