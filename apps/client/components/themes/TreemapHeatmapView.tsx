'use client';

import { useMemo, useRef, useEffect } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { ThemeListItem } from '@/lib/api/themes';
import { ThemeRealtimePrice } from '@/hooks/useRealtimeStockPrices';
import {
    transformToTreemapData,
    getColorByChangeRate,
    getTextColorByChangeRate,
    formatTradingValueShort,
    TreemapDataItem,
} from '@/lib/utils/treemapUtils';

interface TreemapHeatmapViewProps {
    sortedThemes: ThemeListItem[];
    priceMap: Map<string, ThemeRealtimePrice>;
    onThemeClick: (name: string) => void;
}

interface CustomizedContentProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    changeRate?: number;
    avgChangeRate?: number;
    stockCount?: number;
    topStock?: string;
    topStockRate?: number;
    size?: number;
    onThemeClick: (name: string) => void;
}

function CustomizedContent(props: CustomizedContentProps) {
    const {
        x = 0,
        y = 0,
        width = 0,
        height = 0,
        name = '',
        avgChangeRate = 0,
        stockCount = 0,
        topStock,
        size = 0,
        onThemeClick,
    } = props;

    const bgColor = getColorByChangeRate(avgChangeRate);
    const textColor = getTextColorByChangeRate(avgChangeRate);

    const showContent = width > 60 && height > 40;
    const showDetails = width > 100 && height > 60;
    const showTopStock = width > 120 && height > 80;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={bgColor}
                stroke="var(--bg-primary)"
                strokeWidth={2}
                rx={8}
                ry={8}
                style={{ cursor: 'pointer' }}
                onClick={() => onThemeClick(name)}
            />
            {showContent && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - (showDetails ? 12 : 0)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textColor}
                        fontSize={Math.min(14, width / 6)}
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                    >
                        {name}
                    </text>

                    {showDetails && (
                        <text
                            x={x + width / 2}
                            y={y + height / 2 + 8}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor}
                            fontSize={Math.min(16, width / 5)}
                            fontWeight="bold"
                            style={{ pointerEvents: 'none' }}
                        >
                            {avgChangeRate > 0 ? '+' : ''}
                            {avgChangeRate.toFixed(2)}%
                        </text>
                    )}

                    {showTopStock && topStock && (
                        <text
                            x={x + width / 2}
                            y={y + height / 2 + 26}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor}
                            fontSize={10}
                            opacity={0.8}
                            style={{ pointerEvents: 'none' }}
                        >
                            {topStock}
                        </text>
                    )}

                    {showDetails && (
                        <text
                            x={x + 8}
                            y={y + 16}
                            fill={textColor}
                            fontSize={9}
                            opacity={0.7}
                            style={{ pointerEvents: 'none' }}
                        >
                            {stockCount}종목 · {formatTradingValueShort(size)}
                        </text>
                    )}
                </>
            )}
        </g>
    );
}

interface TooltipPayload {
    name: string;
    avgChangeRate: number;
    stockCount: number;
    topStock?: string;
    topStockRate?: number;
    size: number;
}

function CustomTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ payload: TooltipPayload }>;
}) {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    const rate = data.avgChangeRate;
    const isUp = rate > 0;
    const isDown = rate < 0;

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-[var(--shadow-xl)] p-4 text-sm min-w-[200px]">
            <div className="font-bold text-[var(--text-primary)] mb-3">{data.name}</div>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-[var(--text-tertiary)]">평균 등락률</span>
                    <span
                        className={`font-bold ${isUp ? 'text-[var(--rise-color)]' : isDown ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'}`}
                    >
                        {isUp ? '+' : ''}
                        {rate.toFixed(2)}%
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[var(--text-tertiary)]">종목수</span>
                    <span className="text-[var(--text-primary)]">{data.stockCount}개</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[var(--text-tertiary)]">거래대금</span>
                    <span className="text-[var(--text-primary)]">{formatTradingValueShort(data.size)}</span>
                </div>
                {data.topStock && (
                    <div className="flex justify-between pt-2 border-t border-[var(--border-color)]">
                        <span className="text-[var(--text-tertiary)]">대장주</span>
                        <span className="text-[var(--text-primary)]">
                            {data.topStock}{' '}
                            <span className={isUp ? 'text-[var(--rise-color)]' : isDown ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]'}>
                                ({data.topStockRate! > 0 ? '+' : ''}
                                {data.topStockRate?.toFixed(1)}%)
                            </span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function TreemapHeatmapView({
    sortedThemes,
    priceMap,
    onThemeClick,
}: TreemapHeatmapViewProps) {
    // 초기 레이아웃(size)을 고정하기 위한 ref
    const initialLayoutRef = useRef<Map<string, number> | null>(null);
    const isInitializedRef = useRef(false);

    // 현재 데이터 계산
    const currentData = useMemo(() => {
        const themeNames = sortedThemes.map((t) => t.name);
        return transformToTreemapData(priceMap, themeNames);
    }, [sortedThemes, priceMap]);

    // 초기 레이아웃 저장 (첫 데이터가 들어왔을 때 한 번만)
    useEffect(() => {
        if (!isInitializedRef.current && currentData.length > 0) {
            const layoutMap = new Map<string, number>();
            currentData.forEach((item) => {
                layoutMap.set(item.name, item.size);
            });
            initialLayoutRef.current = layoutMap;
            isInitializedRef.current = true;
        }
    }, [currentData]);

    // 레이아웃은 초기값 유지, 색상/등락률만 업데이트
    const treemapData = useMemo(() => {
        if (!initialLayoutRef.current || currentData.length === 0) {
            return currentData;
        }

        // 초기 레이아웃(size)은 유지하고 나머지 데이터만 업데이트
        return currentData.map((item) => ({
            ...item,
            size: initialLayoutRef.current!.get(item.name) || item.size,
        }));
    }, [currentData]);

    if (treemapData.length === 0) {
        return (
            <div className="flex items-center justify-center h-[500px] text-[var(--text-tertiary)]">
                실시간 데이터를 기다리는 중...
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* 범례 */}
            <div className="flex items-center justify-center gap-3 text-xs bg-[var(--bg-primary)] rounded-xl p-3 border border-[var(--border-color)]">
                <span className="text-[var(--fall-color)] font-medium">하락</span>
                <div className="flex rounded-lg overflow-hidden">
                    <div className="w-6 h-5 bg-[#2563eb]"></div>
                    <div className="w-6 h-5 bg-[#3b82f6]"></div>
                    <div className="w-6 h-5 bg-[#60a5fa]"></div>
                    <div className="w-6 h-5 bg-[#93c5fd]"></div>
                    <div className="w-6 h-5 bg-[var(--bg-tertiary)]"></div>
                    <div className="w-6 h-5 bg-[#fca5a5]"></div>
                    <div className="w-6 h-5 bg-[#f87171]"></div>
                    <div className="w-6 h-5 bg-[#ef4444]"></div>
                    <div className="w-6 h-5 bg-[#dc2626]"></div>
                </div>
                <span className="text-[var(--rise-color)] font-medium">상승</span>
                <span className="text-[var(--text-tertiary)] ml-4">| 셀 크기: 거래대금</span>
            </div>

            {/* 트리맵 */}
            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)]">
                <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={treemapData}
                            dataKey="size"
                            aspectRatio={4 / 3}
                            stroke="var(--bg-primary)"
                            isAnimationActive={false}
                            content={<CustomizedContent onThemeClick={onThemeClick} />}
                        >
                            <Tooltip content={<CustomTooltip />} />
                        </Treemap>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 데이터 없는 테마 표시 */}
            {sortedThemes.length > treemapData.length && (
                <div className="text-xs text-[var(--text-tertiary)] text-center">
                    * 실시간 데이터가 없는 {sortedThemes.length - treemapData.length}개 테마는 표시되지 않습니다
                </div>
            )}
        </div>
    );
}
