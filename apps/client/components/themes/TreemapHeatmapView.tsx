'use client';

import { useMemo, useState } from 'react';
import { ResponsiveTreeMap } from '@nivo/treemap';
import { ThemeListItem } from '@/lib/api/themes';
import { Filter } from 'lucide-react';

// 테마 가격 데이터 타입
interface ThemePriceData {
    themeName: string;
    avgChangeRate: number;
    prices: Array<{
        stockCode: string;
        stockName: string;
        currentPrice: number;
        changePrice: number;
        changeRate: number;
        volume: number;
        tradingValue: number;
        tradeTime: string;
    }>;
    updatedAt: string;
}

interface TreemapHeatmapViewProps {
    sortedThemes: ThemeListItem[];
    priceMap: Map<string, ThemePriceData>;
    onThemeClick: (name: string) => void;
}

// 표시 개수 옵션
const DISPLAY_COUNT_OPTIONS = [
    { value: 20, label: 'TOP 20' },
    { value: 30, label: 'TOP 30' },
    { value: 50, label: 'TOP 50' },
    { value: 0, label: '전체' },
];

// 등락률에 따른 색상 (Finviz/TradingView 스타일 - 한국 빨파)
function getColorByChangeRate(rate: number): string {
    // 상승 (빨강 계열)
    if (rate >= 5) return '#b71c1c';   // 강한 상승
    if (rate >= 3) return '#c62828';
    if (rate >= 2) return '#d32f2f';
    if (rate >= 1) return '#e53935';
    if (rate > 0) return '#ef5350';    // 약한 상승
    // 보합
    if (rate === 0) return '#37474f';
    // 하락 (파랑 계열)
    if (rate > -1) return '#42a5f5';   // 약한 하락
    if (rate > -2) return '#1e88e5';
    if (rate > -3) return '#1976d2';
    if (rate > -5) return '#1565c0';
    return '#0d47a1';                  // 강한 하락
}

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

interface TreemapNode {
    name: string;
    value: number;
    changeRate: number;
    stockCount: number;
    topStock?: string;
    topStockRate?: number;
    color: string;
}

export default function TreemapHeatmapView({
    sortedThemes,
    priceMap,
    onThemeClick,
}: TreemapHeatmapViewProps) {
    const [displayCount, setDisplayCount] = useState(30);

    // 트리맵 데이터 생성
    const treemapData = useMemo(() => {
        const children: TreemapNode[] = [];

        for (const theme of sortedThemes) {
            const priceData = priceMap.get(theme.name);
            if (!priceData || priceData.prices.length === 0) continue;

            const totalTradingValue = priceData.prices.reduce((sum, p) => sum + p.tradingValue, 0);
            if (totalTradingValue <= 0) continue;

            // 대장주 찾기
            const sortedByRate = [...priceData.prices].sort((a, b) => b.changeRate - a.changeRate);
            const topStock = sortedByRate[0];

            children.push({
                name: theme.name,
                value: totalTradingValue,
                changeRate: priceData.avgChangeRate,
                stockCount: theme.stockCount,
                topStock: topStock?.stockName,
                topStockRate: topStock?.changeRate,
                color: getColorByChangeRate(priceData.avgChangeRate),
            });
        }

        // 거래대금 기준 정렬 후 필터링
        const sorted = children.sort((a, b) => b.value - a.value);
        const filtered = displayCount === 0 ? sorted : sorted.slice(0, displayCount);

        return {
            name: 'root',
            children: filtered,
        };
    }, [sortedThemes, priceMap, displayCount]);

    const totalThemes = treemapData.children.length;
    const hiddenCount = useMemo(() => {
        let total = 0;
        for (const theme of sortedThemes) {
            const priceData = priceMap.get(theme.name);
            if (priceData && priceData.prices.length > 0) {
                const totalTradingValue = priceData.prices.reduce((sum, p) => sum + p.tradingValue, 0);
                if (totalTradingValue > 0) total++;
            }
        }
        return displayCount > 0 ? Math.max(0, total - displayCount) : 0;
    }, [sortedThemes, priceMap, displayCount]);

    if (totalThemes === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-[var(--text-tertiary)]">
                <div className="text-lg mb-2">데이터를 기다리는 중...</div>
                <div className="text-sm">잠시 후 자동으로 업데이트됩니다</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 컨트롤 바 */}
            <div className="flex items-center justify-between gap-4 bg-[var(--bg-primary)] rounded-xl p-3 border border-[var(--border-color)]">
                {/* 범례 */}
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-[#0d47a1] font-medium">하락</span>
                    <div className="flex rounded overflow-hidden">
                        <div className="w-5 h-4" style={{ backgroundColor: '#0d47a1' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#1565c0' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#1976d2' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#1e88e5' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#42a5f5' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#37474f' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#ef5350' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#e53935' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#d32f2f' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#c62828' }}></div>
                        <div className="w-5 h-4" style={{ backgroundColor: '#b71c1c' }}></div>
                    </div>
                    <span className="text-[#b71c1c] font-medium">상승</span>
                    <div className="h-4 w-px bg-[var(--border-color)]"></div>
                    <span className="text-[var(--text-tertiary)]">크기=거래대금</span>
                </div>

                {/* 필터 */}
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-[var(--text-tertiary)]" />
                    <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-0.5">
                        {DISPLAY_COUNT_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setDisplayCount(opt.value)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                    displayCount === opt.value
                                        ? 'bg-[var(--accent-blue)] text-white shadow-sm'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] font-medium ml-2">
                        {totalThemes}개 표시
                    </span>
                </div>
            </div>

            {/* 트리맵 */}
            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)]">
                <div style={{ height: displayCount <= 20 ? 500 : displayCount <= 30 ? 550 : 650 }}>
                    <ResponsiveTreeMap
                        data={treemapData}
                        identity="name"
                        value="value"
                        valueFormat={v => formatTradingValue(v)}
                        tile="squarify"
                        leavesOnly={true}
                        innerPadding={3}
                        outerPadding={3}
                        borderWidth={0}
                        colors={(node) => (node.data as TreemapNode).color}
                        label={(node) => {
                            const data = node.data as TreemapNode;
                            return data.name;
                        }}
                        labelSkipSize={40}
                        labelTextColor="#000000"
                        parentLabelPosition="left"
                        parentLabelTextColor="#ffffff"
                        onClick={(node) => {
                            onThemeClick(node.id as string);
                        }}
                        tooltip={({ node }) => {
                            const data = node.data as TreemapNode;
                            const isUp = data.changeRate > 0;
                            const isDown = data.changeRate < 0;

                            return (
                                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-xl p-3 min-w-[180px]">
                                    <div className="font-bold text-[var(--text-primary)] mb-2 text-sm">
                                        {data.name}
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-tertiary)]">평균 등락률</span>
                                            <span className={`font-bold ${
                                                isUp ? 'text-[var(--rise-color)]' :
                                                isDown ? 'text-[var(--fall-color)]' :
                                                'text-[var(--text-tertiary)]'
                                            }`}>
                                                {isUp ? '+' : ''}{data.changeRate.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-tertiary)]">종목수</span>
                                            <span className="text-[var(--text-primary)]">{data.stockCount}개</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-tertiary)]">거래대금</span>
                                            <span className="text-[var(--text-primary)]">{formatTradingValue(data.value)}</span>
                                        </div>
                                        {data.topStock && (
                                            <div className="flex justify-between pt-1.5 border-t border-[var(--border-color)]">
                                                <span className="text-[var(--text-tertiary)]">대장주</span>
                                                <span className="text-[var(--text-primary)]">
                                                    {data.topStock}
                                                    {data.topStockRate !== undefined && (
                                                        <span className={
                                                            data.topStockRate > 0 ? 'text-[var(--rise-color)]' :
                                                            data.topStockRate < 0 ? 'text-[var(--fall-color)]' :
                                                            'text-[var(--text-tertiary)]'
                                                        }>
                                                            {' '}({data.topStockRate > 0 ? '+' : ''}{data.topStockRate.toFixed(1)}%)
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }}
                        theme={{
                            labels: {
                                text: {
                                    fontSize: 14,
                                    fontWeight: 600,
                                    fontFamily: 'inherit',
                                },
                            },
                        }}
                    />
                </div>
            </div>

            {/* 필터 정보 */}
            {hiddenCount > 0 && (
                <div className="text-xs text-[var(--text-tertiary)] text-center">
                    필터에 의해 {hiddenCount}개 테마 숨김
                </div>
            )}
        </div>
    );
}
