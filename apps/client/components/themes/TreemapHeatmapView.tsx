'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
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
        topStockRate,
        size = 0,
        onThemeClick,
    } = props;

    const bgColor = getColorByChangeRate(avgChangeRate);
    const textColor = getTextColorByChangeRate(avgChangeRate);

    // 크기에 따른 표시 레벨
    const area = width * height;
    const isLarge = area > 15000;
    const isMedium = area > 6000;
    const isSmall = area > 2000;
    const isTiny = area > 800;

    // 폰트 크기 계산 (영역에 비례)
    const nameFontSize = isLarge ? 14 : isMedium ? 12 : isSmall ? 10 : 8;
    const rateFontSize = isLarge ? 16 : isMedium ? 14 : isSmall ? 11 : 9;
    const detailFontSize = isLarge ? 10 : 9;

    // 텍스트 truncate
    const maxNameLength = Math.floor(width / (nameFontSize * 0.6));
    const displayName = name.length > maxNameLength ? name.slice(0, maxNameLength - 1) + '…' : name;

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
                rx={6}
                ry={6}
                style={{ cursor: 'pointer' }}
                onClick={() => onThemeClick(name)}
            />
            {isTiny && (
                <>
                    {/* 테마명 */}
                    <text
                        x={x + width / 2}
                        y={y + (isMedium ? height / 2 - (isLarge ? 14 : 8) : height / 2 - 4)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textColor}
                        fontSize={nameFontSize}
                        fontWeight="600"
                        style={{ pointerEvents: 'none' }}
                    >
                        {displayName}
                    </text>

                    {/* 등락률 */}
                    {isSmall && (
                        <text
                            x={x + width / 2}
                            y={y + height / 2 + (isLarge ? 6 : isMedium ? 4 : 2)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor}
                            fontSize={rateFontSize}
                            fontWeight="bold"
                            style={{ pointerEvents: 'none' }}
                        >
                            {avgChangeRate > 0 ? '+' : ''}{avgChangeRate.toFixed(2)}%
                        </text>
                    )}

                    {/* 대장주 */}
                    {isLarge && topStock && (
                        <text
                            x={x + width / 2}
                            y={y + height / 2 + 24}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor}
                            fontSize={detailFontSize}
                            opacity={0.85}
                            style={{ pointerEvents: 'none' }}
                        >
                            {topStock.length > 8 ? topStock.slice(0, 7) + '…' : topStock}
                            {topStockRate !== undefined && ` ${topStockRate > 0 ? '+' : ''}${topStockRate.toFixed(1)}%`}
                        </text>
                    )}

                    {/* 종목수 + 거래대금 (좌상단) */}
                    {isMedium && (
                        <text
                            x={x + 6}
                            y={y + 14}
                            fill={textColor}
                            fontSize={9}
                            opacity={0.75}
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
            <div className="font-bold text-[var(--text-primary)] mb-3 text-base">{data.name}</div>
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
    const [containerHeight, setContainerHeight] = useState(600);

    // 테마 수에 따라 높이 조정
    useEffect(() => {
        const themeCount = sortedThemes.length;
        if (themeCount > 100) {
            setContainerHeight(800);
        } else if (themeCount > 50) {
            setContainerHeight(700);
        } else {
            setContainerHeight(600);
        }
    }, [sortedThemes.length]);

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

    // 필터 변경 시 레이아웃 재계산
    useEffect(() => {
        if (sortedThemes.length > 0) {
            const layoutMap = new Map<string, number>();
            currentData.forEach((item) => {
                layoutMap.set(item.name, item.size);
            });
            initialLayoutRef.current = layoutMap;
        }
    }, [sortedThemes.length, currentData]);

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

    // 데이터가 있는 테마만 표시
    const themesWithData = treemapData.filter(t => t.size > 0);
    const themesWithoutData = sortedThemes.length - themesWithData.length;

    if (themesWithData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-[var(--text-tertiary)]">
                <div className="text-lg mb-2">데이터를 기다리는 중...</div>
                <div className="text-sm">잠시 후 자동으로 업데이트됩니다</div>
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
                <div className="h-4 w-px bg-[var(--border-color)] mx-2"></div>
                <span className="text-[var(--text-tertiary)]">셀 크기: 거래대금</span>
                <span className="text-[var(--text-tertiary)]">|</span>
                <span className="text-[var(--text-secondary)]">{themesWithData.length}개 테마</span>
            </div>

            {/* 트리맵 */}
            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5 shadow-[var(--shadow-sm)]">
                <div style={{ height: containerHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={themesWithData}
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
            {themesWithoutData > 0 && (
                <div className="text-xs text-[var(--text-tertiary)] text-center">
                    * 가격 데이터가 없는 {themesWithoutData}개 테마는 표시되지 않습니다
                </div>
            )}
        </div>
    );
}
