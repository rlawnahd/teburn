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

// Recharts Treemap에 사용할 데이터 구조
export interface TreemapDataItem {
  [key: string]: string | number | undefined;
  name: string;
  size: number;        // 거래대금 (크기 기준)
  changeRate: number;  // 등락률 (색상 기준)
  stockCount: number;
  avgChangeRate: number;
  topStock?: string;
  topStockRate?: number;
}

// ThemePriceData[] -> TreemapDataItem[] 변환
export function transformToTreemapData(
  priceMap: Map<string, ThemePriceData>,
  themeNames: string[]
): TreemapDataItem[] {
  const items: TreemapDataItem[] = [];

  for (const themeName of themeNames) {
    const priceInfo = priceMap.get(themeName);
    if (!priceInfo || priceInfo.prices.length === 0) {
      continue;
    }

    // 테마 내 총 거래대금 계산
    const totalTradingValue = priceInfo.prices.reduce(
      (sum, p) => sum + p.tradingValue,
      0
    );

    // 등락률 기준 상위 종목
    const sortedByRate = [...priceInfo.prices].sort(
      (a, b) => b.changeRate - a.changeRate
    );
    const topRateStock = sortedByRate[0];

    items.push({
      name: themeName,
      size: totalTradingValue,
      changeRate: priceInfo.avgChangeRate,
      stockCount: priceInfo.prices.length,
      avgChangeRate: priceInfo.avgChangeRate,
      topStock: topRateStock?.stockName,
      topStockRate: topRateStock?.changeRate,
    });
  }

  // 거래대금 순 정렬
  return items.sort((a, b) => b.size - a.size);
}

// 등락률에 따른 색상 반환 (Finviz 스타일 - 더 선명하게)
export function getColorByChangeRate(rate: number): string {
  // 등락률 범위: -3% ~ +3% 기준으로 축소 (더 민감하게)
  const maxRange = 3;
  const normalized = Math.max(-maxRange, Math.min(maxRange, rate)) / maxRange;

  if (rate > 0) {
    // 상승: 빨간색 계열 (더 진하게)
    const intensity = normalized;
    if (intensity > 0.8) return '#b91c1c'; // red-700
    if (intensity > 0.6) return '#dc2626'; // red-600
    if (intensity > 0.4) return '#ef4444'; // red-500
    if (intensity > 0.2) return '#f87171'; // red-400
    return '#fca5a5'; // red-300
  } else if (rate < 0) {
    // 하락: 파란색 계열 (더 진하게)
    const intensity = Math.abs(normalized);
    if (intensity > 0.8) return '#1d4ed8'; // blue-700
    if (intensity > 0.6) return '#2563eb'; // blue-600
    if (intensity > 0.4) return '#3b82f6'; // blue-500
    if (intensity > 0.2) return '#60a5fa'; // blue-400
    return '#93c5fd'; // blue-300
  }
  return '#64748b'; // slate-500 (보합 - 더 진하게)
}

// 색상에 따른 텍스트 색상 반환 (항상 흰색 + 그림자로 가독성 확보)
export function getTextColorByChangeRate(rate: number): string {
  // 모든 배경에서 흰색 텍스트 사용 (그림자로 가독성 확보)
  return '#ffffff';
}

// Re-export for backwards compatibility
export { formatTradingValue as formatTradingValueShort } from './format';
