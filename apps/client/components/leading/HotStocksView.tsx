'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { RefreshCw, Activity } from 'lucide-react';
import { fetchHotStocks, HotStock } from '@/lib/api/leading';

function formatTradingValue(value: number): string {
    const billion = value / 100000000;
    if (billion >= 10000) return `${(billion / 10000).toFixed(1)}조`;
    if (billion >= 1) return `${billion.toFixed(0)}억`;
    return `${(value / 10000).toFixed(0)}만`;
}

function getGradeStyle(grade: HotStock['grade']): { bg: string; text: string; label: string } {
    switch (grade) {
        case 'HOT':
            return { bg: 'bg-[var(--rise-color)]', text: 'text-white', label: 'HOT' };
        case 'WARM':
            return { bg: 'bg-orange-500', text: 'text-white', label: 'WARM' };
        case 'NORMAL':
            return { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-secondary)]', label: 'MID' };
        case 'COOL':
            return { bg: 'bg-[var(--accent-blue)]/20', text: 'text-[var(--accent-blue)]', label: 'LOW' };
        case 'COLD':
            return { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-tertiary)]', label: 'COLD' };
    }
}

function StockRow({
    stock,
    rank,
    onStockClick,
}: {
    stock: HotStock;
    rank: number;
    onStockClick: (stockCode: string) => void;
}) {
    const gradeStyle = getGradeStyle(stock.grade);
    const isPositive = stock.changeRate > 0;

    return (
        <button
            onClick={() => onStockClick(stock.stockCode)}
            className="w-full flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
        >
            {/* 순위 */}
            <span className={`w-5 text-center text-xs font-semibold flex-shrink-0 ${rank <= 3 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'}`}>
                {rank}
            </span>

            {/* 종목명 + 테마 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{stock.stockName}</span>
                    <span className={`px-1 py-0.5 text-[9px] font-bold ${gradeStyle.bg} ${gradeStyle.text} flex-shrink-0`}>
                        {gradeStyle.label}
                    </span>
                </div>
                {stock.themes.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                        {stock.themes.slice(0, 2).map((theme) => (
                            <span key={theme} className="text-[11px] text-[var(--text-tertiary)] truncate max-w-[60px]">
                                {theme}
                            </span>
                        ))}
                        {stock.themes.length > 2 && (
                            <span className="text-[11px] text-[var(--text-tertiary)]">+{stock.themes.length - 2}</span>
                        )}
                    </div>
                )}
            </div>

            {/* 가격 + 등락률 */}
            <div className="text-right flex-shrink-0">
                <div className="text-xs text-[var(--text-primary)]">{stock.currentPrice.toLocaleString()}</div>
                <div className={`text-[11px] font-medium ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                    {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                </div>
            </div>

            {/* 거래대금 */}
            <div className="w-12 text-right flex-shrink-0">
                <div className="text-[11px] text-[var(--text-tertiary)]">{formatTradingValue(stock.tradingValue)}</div>
            </div>

            {/* 점수 */}
            <div className="w-8 text-right flex-shrink-0">
                <span className="text-[13px] font-bold text-[var(--text-primary)]">{stock.totalScore}</span>
            </div>
        </button>
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

    const handleStockClick = (stockCode: string) => {
        router.push(`/stocks/${encodeURIComponent(stockCode)}`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>주도주 분석 중...</span>
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

    const hotStocks = stocks.filter((s) => s.grade === 'HOT');
    const warmStocks = stocks.filter((s) => s.grade === 'WARM');
    const otherStocks = stocks.filter((s) => !['HOT', 'WARM'].includes(s.grade));

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

    const renderSection = (title: string, description: string, sectionStocks: HotStock[], startRank: number) => {
        if (sectionStocks.length === 0) return null;
        return (
            <section>
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{description}</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)]">{sectionStocks.length}종목</span>
                </div>
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)]">
                    {/* 테이블 헤더 */}
                    <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-[11px] text-[var(--text-tertiary)]">
                        <span className="w-5 text-center">#</span>
                        <span className="flex-1">종목</span>
                        <span className="text-right">현재가</span>
                        <span className="w-12 text-right">거래대금</span>
                        <span className="w-8 text-right">점수</span>
                    </div>
                    {sectionStocks.map((stock, i) => (
                        <StockRow
                            key={stock.stockCode}
                            stock={stock}
                            rank={startRank + i}
                            onStockClick={handleStockClick}
                        />
                    ))}
                </div>
            </section>
        );
    };

    return (
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">주도주 분석</h2>
                    <span className="text-[11px] text-[var(--text-tertiary)]">거래대금 + 검색량 + 뉴스 종합</span>
                </div>
                {data?.lastUpdateTime && (
                    <span className="hidden sm:inline text-[11px] text-[var(--text-tertiary)]">
                        {formatDataDate(data.lastUpdateTime)}
                    </span>
                )}
            </div>

            {renderSection('HOT', '60점 이상', hotStocks, 1)}
            {renderSection('WARM', '45~59점', warmStocks, hotStocks.length + 1)}
            {renderSection('기타', '45점 미만', otherStocks, hotStocks.length + warmStocks.length + 1)}

            {stocks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-[var(--text-tertiary)]">
                    {!data?.lastUpdateTime ? (
                        <>
                            <RefreshCw size={24} className="mb-2 opacity-50 animate-spin" />
                            <p className="text-[13px]">데이터 준비 중... (약 1분)</p>
                        </>
                    ) : (
                        <>
                            <Activity size={24} className="mb-2 opacity-30" />
                            <p className="text-[13px]">분석할 종목이 없습니다</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
