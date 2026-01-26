// apps/server/src/services/leadingStockService.ts
import { themePriceCache, CachedStockPrice, CachedThemePrice } from './themePriceCache';
import DailyLeadingTheme, { ITopTheme } from '../models/DailyLeadingTheme';
import { getMarketStatus, MarketStatusInfo } from '../utils/marketStatus';

// 대금상위 종목 (테마 정보 포함)
export interface LeadingStock {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
    themes: string[];
}

// 주도섹터 정보
export interface LeadingSector {
    themeName: string;
    avgChangeRate: number;
    totalTradingValue: number;
    leadingScore: number; // 거래대금 + 상승률 가중치
    topStock: {
        name: string;
        changeRate: number;
        tradingValue: number;
    } | null;
    stockCount: number;
}

// 캘린더 데이터
export interface CalendarDay {
    date: string;
    topThemes: Array<{
        rank: number;
        themeName: string;
        avgChangeRate: number;
        totalTradingValue: number;
    }>;
}

/**
 * 거래대금 상위 + 상승 종목 조회
 * @param minChangeRate 최소 등락률 (기본 4%)
 * @param limit 최대 개수 (기본 30)
 */
export function getLeadingStocks(minChangeRate: number = 4, limit: number = 30): LeadingStock[] {
    const allThemePrices = themePriceCache.getAllThemePrices();

    // 종목별로 소속 테마 매핑
    const stockThemesMap = new Map<string, Set<string>>();
    const stockDataMap = new Map<string, CachedStockPrice>();

    for (const theme of allThemePrices.themes) {
        for (const stock of theme.topStocks) {
            // 기존 데이터보다 거래대금이 높은 경우에만 업데이트
            const existing = stockDataMap.get(stock.stockCode);
            if (!existing || stock.tradingValue > existing.tradingValue) {
                stockDataMap.set(stock.stockCode, stock);
            }

            // 테마 목록 추가
            if (!stockThemesMap.has(stock.stockCode)) {
                stockThemesMap.set(stock.stockCode, new Set());
            }
            stockThemesMap.get(stock.stockCode)!.add(theme.themeName);
        }
    }

    // 필터링: 상승률 조건
    const filteredStocks: LeadingStock[] = [];

    for (const [stockCode, stock] of stockDataMap) {
        if (stock.changeRate >= minChangeRate) {
            filteredStocks.push({
                stockCode,
                stockName: stock.stockName,
                currentPrice: stock.currentPrice,
                changeRate: stock.changeRate,
                tradingValue: stock.tradingValue,
                themes: Array.from(stockThemesMap.get(stockCode) || []).slice(0, 3),
            });
        }
    }

    // 거래대금 순 정렬
    filteredStocks.sort((a, b) => b.tradingValue - a.tradingValue);

    return filteredStocks.slice(0, limit);
}

/**
 * 주도섹터 목록 조회
 * 주도섹터 = 거래대금 높고 + 상승률도 좋은 테마
 */
export function getLeadingSectors(limit: number = 20): LeadingSector[] {
    const allThemePrices = themePriceCache.getAllThemePrices();

    const sectors: LeadingSector[] = [];

    // 거래대금 최대값 (정규화용)
    let maxTradingValue = 0;
    for (const theme of allThemePrices.themes) {
        const totalTradingValue = theme.topStocks.reduce((sum, s) => sum + s.tradingValue, 0);
        if (totalTradingValue > maxTradingValue) {
            maxTradingValue = totalTradingValue;
        }
    }

    for (const theme of allThemePrices.themes) {
        const totalTradingValue = theme.topStocks.reduce((sum, s) => sum + s.tradingValue, 0);

        // 대장주 (거래대금 1위)
        const topStock = theme.topStocks[0];

        // 주도섹터 점수 계산
        // 상승률 50% + 거래대금 50% (정규화)
        const changeRateScore = Math.max(0, theme.avgChangeRate) * 10; // 상승률이 높을수록
        const tradingValueScore = maxTradingValue > 0
            ? (totalTradingValue / maxTradingValue) * 100
            : 0;
        const leadingScore = changeRateScore * 0.5 + tradingValueScore * 0.5;

        sectors.push({
            themeName: theme.themeName,
            avgChangeRate: theme.avgChangeRate,
            totalTradingValue,
            leadingScore: Math.round(leadingScore * 100) / 100,
            topStock: topStock ? {
                name: topStock.stockName,
                changeRate: topStock.changeRate,
                tradingValue: topStock.tradingValue,
            } : null,
            stockCount: theme.stockCount,
        });
    }

    // 주도섹터 점수 순 정렬 (상승 테마만)
    sectors.sort((a, b) => {
        // 상승 테마 우선
        if (a.avgChangeRate > 0 && b.avgChangeRate <= 0) return -1;
        if (a.avgChangeRate <= 0 && b.avgChangeRate > 0) return 1;
        // 점수 순
        return b.leadingScore - a.leadingScore;
    });

    return sectors.slice(0, limit);
}

/**
 * 캘린더 데이터 조회 (월별)
 */
export async function getCalendarData(year: number, month: number): Promise<CalendarDay[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const dailyData = await DailyLeadingTheme.find({
        date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 }).lean();

    return dailyData.map(d => {
        // 한국 시간 기준으로 날짜 포맷 (UTC+9)
        const localDate = new Date(d.date.getTime() + 9 * 60 * 60 * 1000);
        const dateStr = localDate.toISOString().split('T')[0];

        return {
            date: dateStr,
            topThemes: d.topThemes.slice(0, 3).map(t => ({
                rank: t.rank,
                themeName: t.themeName,
                avgChangeRate: t.avgChangeRate,
                totalTradingValue: t.totalTradingValue,
            })),
        };
    });
}

/**
 * 한국 시간 기준 오늘 날짜 (YYYY-MM-DD)
 */
function getKoreanToday(): string {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return koreaTime.toISOString().split('T')[0];
}

/**
 * 한국 시간 기준 날짜를 UTC Date 객체로 변환 (DB 저장용)
 */
function koreanDateToUTC(dateStr: string): Date {
    // dateStr: "2026-01-21"
    // 한국 시간 00:00은 UTC 전날 15:00
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 9 * 60 * 60 * 1000);
}

/**
 * 특정 날짜 상세 조회
 */
export async function getDayDetail(dateStr: string): Promise<ITopTheme[] | null> {
    // dateStr은 한국 날짜 기준 (YYYY-MM-DD)
    const targetDate = koreanDateToUTC(dateStr);

    // 해당 날짜 범위로 검색 (하루 범위)
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    const daily = await DailyLeadingTheme.findOne({
        date: { $gte: targetDate, $lt: nextDay },
    }).lean();

    if (daily) {
        return daily.topThemes;
    }

    // 오늘 날짜인 경우 실시간 데이터로 생성
    const todayStr = getKoreanToday();

    if (dateStr === todayStr) {
        const sectors = getLeadingSectors(10);
        if (sectors.length === 0) return null;

        return sectors.map((sector, index) => ({
            rank: index + 1,
            themeName: sector.themeName,
            avgChangeRate: sector.avgChangeRate,
            totalTradingValue: sector.totalTradingValue,
            topStock: sector.topStock?.name || '',
            topStockRate: sector.topStock?.changeRate || 0,
        }));
    }

    return null;
}

/**
 * 오늘의 주도테마 저장 (장 마감 후 호출)
 */
export async function saveDailyLeadingThemes(): Promise<void> {
    // 한국 시간 기준 오늘 날짜로 저장
    const todayStr = getKoreanToday();
    const todayDate = koreanDateToUTC(todayStr);
    const nextDay = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);

    // 이미 오늘 데이터가 있으면 업데이트
    const existing = await DailyLeadingTheme.findOne({
        date: { $gte: todayDate, $lt: nextDay },
    });

    // 현재 주도섹터 데이터로 TOP 10 저장
    const sectors = getLeadingSectors(10);

    const topThemes: ITopTheme[] = sectors.map((sector, index) => ({
        rank: index + 1,
        themeName: sector.themeName,
        avgChangeRate: sector.avgChangeRate,
        totalTradingValue: sector.totalTradingValue,
        topStock: sector.topStock?.name || '',
        topStockRate: sector.topStock?.changeRate || 0,
    }));

    if (existing) {
        await DailyLeadingTheme.updateOne(
            { _id: existing._id },
            { $set: { topThemes } }
        );
        console.log(`📅 오늘(${todayStr}) 주도테마 업데이트 완료: ${topThemes.length}개`);
    } else {
        await DailyLeadingTheme.create({
            date: todayDate,
            topThemes,
        });
        console.log(`📅 오늘(${todayStr}) 주도테마 저장 완료: ${topThemes.length}개`);
    }
}

/**
 * 전체 응답 데이터
 */
export function getLeadingData(): {
    stocks: LeadingStock[];
    sectors: LeadingSector[];
    marketStatus: MarketStatusInfo;
    lastUpdateTime: Date | null;
} {
    return {
        stocks: getLeadingStocks(),
        sectors: getLeadingSectors(),
        marketStatus: getMarketStatus(),
        lastUpdateTime: themePriceCache.getStats().lastUpdateTime,
    };
}
