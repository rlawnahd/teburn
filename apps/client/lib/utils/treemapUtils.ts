import { ThemeRealtimePrice } from '@/hooks/useRealtimeStockPrices';

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

// ThemeRealtimePrice[] -> TreemapDataItem[] 변환
export function transformToTreemapData(
  priceMap: Map<string, ThemeRealtimePrice>,
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

// 등락률에 따른 색상 반환 (Finviz 스타일)
export function getColorByChangeRate(rate: number): string {
  // 등락률 범위: -5% ~ +5% 기준 정규화
  const maxRange = 5;
  const normalized = Math.max(-maxRange, Math.min(maxRange, rate)) / maxRange;

  if (rate > 0) {
    // 상승: 빨간색 계열
    const intensity = normalized;
    if (intensity > 0.8) return '#dc2626'; // red-600
    if (intensity > 0.6) return '#ef4444'; // red-500
    if (intensity > 0.4) return '#f87171'; // red-400
    if (intensity > 0.2) return '#fca5a5'; // red-300
    return '#fecaca'; // red-200
  } else if (rate < 0) {
    // 하락: 파란색 계열
    const intensity = Math.abs(normalized);
    if (intensity > 0.8) return '#2563eb'; // blue-600
    if (intensity > 0.6) return '#3b82f6'; // blue-500
    if (intensity > 0.4) return '#60a5fa'; // blue-400
    if (intensity > 0.2) return '#93c5fd'; // blue-300
    return '#bfdbfe'; // blue-200
  }
  return '#e2e8f0'; // slate-200 (보합)
}

// 색상에 따른 텍스트 색상 반환
export function getTextColorByChangeRate(rate: number): string {
  const absRate = Math.abs(rate);
  if (absRate > 2) return '#ffffff'; // 진한 배경에는 흰색
  if (absRate > 1) return rate > 0 ? '#7f1d1d' : '#1e3a5f'; // 중간 배경에는 어두운 색
  return rate > 0 ? '#991b1b' : '#1e40af'; // 연한 배경에는 진한 색
}

// 거래대금 포맷 (억 단위)
export function formatTradingValueShort(value: number): string {
  const billion = value / 100000000; // 억 단위
  if (billion >= 1000) {
    return `${(billion / 1000).toFixed(1)}조`;
  } else if (billion >= 1) {
    return `${billion.toFixed(0)}억`;
  }
  return `${(value / 10000).toFixed(0)}만`;
}
