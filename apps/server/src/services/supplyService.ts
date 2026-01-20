// 수급 데이터 서비스
// Python 스크립트(pykrx)로 수집된 데이터를 읽어와서 점수화
import StockSupplyHistory from '../models/StockSupplyHistory';

interface SupplyInfo {
    stockCode: string;
    stockName: string;
    foreignNet: number;  // 외국인 순매수 (원)
    instNet: number;     // 기관 순매수 (원)
    retailNet: number;   // 개인 순매수 (원)
    totalBigNet: number; // 외국인 + 기관 순매수
}

// 캐시 (1시간)
const supplyCache = new Map<string, { data: SupplyInfo; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

/**
 * 특정 종목의 오늘 수급 데이터 조회
 */
export async function getTodaySupply(stockCode: string): Promise<SupplyInfo | null> {
    // 캐시 확인
    const cached = supplyCache.get(stockCode);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    // 오늘 또는 가장 최근 데이터 조회
    const supply = await StockSupplyHistory.findOne({ stockCode })
        .sort({ date: -1 })
        .lean();

    if (!supply) {
        return null;
    }

    const result: SupplyInfo = {
        stockCode: supply.stockCode,
        stockName: supply.stockName,
        foreignNet: supply.foreignNet,
        instNet: supply.instNet,
        retailNet: supply.retailNet,
        totalBigNet: supply.foreignNet + supply.instNet,
    };

    // 캐시 저장
    supplyCache.set(stockCode, { data: result, timestamp: Date.now() });

    return result;
}

/**
 * 여러 종목의 수급 데이터 일괄 조회
 */
export async function getBatchSupply(
    stockCodes: string[]
): Promise<Map<string, SupplyInfo>> {
    const result = new Map<string, SupplyInfo>();

    // 가장 최근 날짜의 데이터만 조회
    const latestDate = await StockSupplyHistory.findOne()
        .sort({ date: -1 })
        .select('date')
        .lean();

    if (!latestDate) {
        return result;
    }

    const supplies = await StockSupplyHistory.find({
        stockCode: { $in: stockCodes },
        date: latestDate.date,
    }).lean();

    for (const supply of supplies) {
        result.set(supply.stockCode, {
            stockCode: supply.stockCode,
            stockName: supply.stockName,
            foreignNet: supply.foreignNet,
            instNet: supply.instNet,
            retailNet: supply.retailNet,
            totalBigNet: supply.foreignNet + supply.instNet,
        });
    }

    return result;
}

/**
 * 수급 점수 계산 (0~20점)
 * 외국인 + 기관 순매수가 많을수록 높은 점수
 */
export function calculateSupplyScore(supply: SupplyInfo | null): number {
    if (!supply) return 0;

    const bigNet = supply.totalBigNet;

    // 순매수 금액 기준 (억 단위)
    const netBillion = bigNet / 100000000;

    // 100억+ = 20점, 50억 = 15점, 10억 = 10점, 0~10억 = 5점, 순매도 = 0점
    if (netBillion >= 100) return 20;
    if (netBillion >= 50) return 15;
    if (netBillion >= 10) return 10;
    if (netBillion >= 0) return 5;
    return 0;
}

/**
 * 수급 점수 상세 계산 (외국인/기관 개별)
 */
export function calculateDetailedSupplyScore(supply: SupplyInfo | null): {
    foreignScore: number;
    instScore: number;
    total: number;
} {
    if (!supply) {
        return { foreignScore: 0, instScore: 0, total: 0 };
    }

    // 외국인 점수 (0~10점)
    const foreignBillion = supply.foreignNet / 100000000;
    let foreignScore = 0;
    if (foreignBillion >= 50) foreignScore = 10;
    else if (foreignBillion >= 20) foreignScore = 8;
    else if (foreignBillion >= 5) foreignScore = 6;
    else if (foreignBillion >= 0) foreignScore = 3;

    // 기관 점수 (0~10점)
    const instBillion = supply.instNet / 100000000;
    let instScore = 0;
    if (instBillion >= 50) instScore = 10;
    else if (instBillion >= 20) instScore = 8;
    else if (instBillion >= 5) instScore = 6;
    else if (instBillion >= 0) instScore = 3;

    return {
        foreignScore,
        instScore,
        total: foreignScore + instScore,
    };
}

/**
 * 금액 포맷 (억 단위)
 */
export function formatSupplyAmount(amount: number): string {
    const billion = amount / 100000000;
    if (Math.abs(billion) >= 1000) {
        return `${(billion / 1000).toFixed(1)}조`;
    }
    return `${Math.round(billion)}억`;
}

/**
 * 캐시 클리어
 */
export function clearSupplyCache(): void {
    supplyCache.clear();
    console.log('🗑️ 수급 캐시 클리어');
}
