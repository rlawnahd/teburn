import { Router, Request, Response } from 'express';
import {
    getLeadingStocks,
    getLeadingSectors,
    getCalendarData,
    getDayDetail,
    getLeadingData,
} from '../services/leadingStockService';
import { getMarketStatus } from '../utils/marketStatus';
import { themePriceCache } from '../services/themePriceCache';
import { getTopHotStocks, getThemeHotness } from '../services/hotnessService';
import HotnessHistory from '../models/HotnessHistory';
import DailyLeadingTheme from '../models/DailyLeadingTheme';

const router = Router();

// 전체 데이터 조회 (대금상위 + 주도섹터)
router.get('/', async (req: Request, res: Response) => {
    try {
        const data = getLeadingData();
        res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('주도주 데이터 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '주도주 데이터 조회 중 오류가 발생했습니다.',
        });
    }
});

// 거래대금 상위 종목 조회 (4% 이상 상승)
router.get('/stocks', async (req: Request, res: Response) => {
    try {
        const minRate = parseFloat(req.query.minRate as string) || 4;
        const limit = parseInt(req.query.limit as string) || 30;

        const stocks = getLeadingStocks(minRate, limit);
        const stats = themePriceCache.getStats();

        res.json({
            success: true,
            data: {
                stocks,
                marketStatus: getMarketStatus(),
                lastUpdateTime: stats.lastUpdateTime,
                total: stocks.length,
            },
        });
    } catch (error: any) {
        console.error('대금상위 종목 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '대금상위 종목 조회 중 오류가 발생했습니다.',
        });
    }
});

// 주도섹터 목록 조회
router.get('/sectors', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;

        const sectors = getLeadingSectors(limit);
        const stats = themePriceCache.getStats();

        res.json({
            success: true,
            data: {
                sectors,
                marketStatus: getMarketStatus(),
                lastUpdateTime: stats.lastUpdateTime,
                total: sectors.length,
            },
        });
    } catch (error: any) {
        console.error('주도섹터 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '주도섹터 조회 중 오류가 발생했습니다.',
        });
    }
});

// 캘린더 데이터 조회 (월별)
router.get('/calendar', async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const year = parseInt(req.query.year as string) || now.getFullYear();
        const month = parseInt(req.query.month as string) || now.getMonth() + 1;

        const calendarData = await getCalendarData(year, month);

        res.json({
            success: true,
            data: {
                year,
                month,
                days: calendarData,
            },
        });
    } catch (error: any) {
        console.error('캘린더 데이터 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '캘린더 데이터 조회 중 오류가 발생했습니다.',
        });
    }
});

// 특정 날짜 상세 조회
router.get('/calendar/:date', async (req: Request, res: Response) => {
    try {
        const { date } = req.params;

        const detail = await getDayDetail(date);

        if (!detail) {
            res.status(404).json({
                success: false,
                message: `${date}에 대한 데이터가 없습니다.`,
            });
            return;
        }

        res.json({
            success: true,
            data: {
                date,
                topStocks: detail,
            },
        });
    } catch (error: any) {
        console.error('날짜 상세 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '날짜 상세 조회 중 오류가 발생했습니다.',
        });
    }
});

// 주도주 점수 TOP 종목 조회
router.get('/hot', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 30;

        const hotStocks = await getTopHotStocks(limit);
        const stats = themePriceCache.getStats();

        // 연속 주도주 일수 계산 (DailyLeadingTheme 기반 실제 영업일)
        const allStockCodes = hotStocks.map(s => s.stockCode);
        const streakMap = new Map<string, number>();

        if (allStockCodes.length > 0) {
            // 최근 장 운영일 조회
            const recentDays = await DailyLeadingTheme.find()
                .sort({ date: -1 })
                .limit(4)
                .select('date')
                .lean();

            const kstOffset = 9 * 60 * 60 * 1000;
            const kstToday = new Date(Date.now() + kstOffset).toISOString().split('T')[0];

            // DailyLeadingTheme의 date는 UTC로 저장되어 있어서 KST로 변환 필요
            const tradingDates = recentDays
                .map(d => new Date(new Date(d.date).getTime() + kstOffset).toISOString().split('T')[0])
                .filter(d => d !== kstToday)
                .slice(0, 3);

            if (tradingDates.length > 0) {
                const histories = await HotnessHistory.find({
                    date: { $in: tradingDates },
                    stockCode: { $in: allStockCodes },
                }).select('stockCode date').lean();

                const stockDates = new Map<string, Set<string>>();
                for (const h of histories) {
                    if (!stockDates.has(h.stockCode)) stockDates.set(h.stockCode, new Set());
                    stockDates.get(h.stockCode)!.add(h.date);
                }

                for (const code of allStockCodes) {
                    const dates = stockDates.get(code);
                    if (!dates) continue;
                    let streak = 0;
                    for (const td of tradingDates) {
                        if (dates.has(td)) streak++;
                        else break;
                    }
                    if (streak > 0) streakMap.set(code, streak);
                }
            }
        }

        const stocksWithStreak = hotStocks.map(s => ({
            ...s,
            sStreak: streakMap.get(s.stockCode) || 0,
        }));

        res.json({
            success: true,
            data: {
                stocks: stocksWithStreak,
                marketStatus: getMarketStatus(),
                lastUpdateTime: stats.lastUpdateTime,
                total: hotStocks.length,
            },
        });
    } catch (error: any) {
        console.error('주도주 점수 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '주도주 점수 조회 중 오류가 발생했습니다.',
        });
    }
});

// 특정 테마의 주도주 점수 조회
router.get('/hot/theme/:themeName', async (req: Request, res: Response) => {
    try {
        const { themeName } = req.params;
        const decodedName = decodeURIComponent(themeName);

        const themeHotness = await getThemeHotness(decodedName);

        res.json({
            success: true,
            data: themeHotness,
        });
    } catch (error: any) {
        console.error('테마 주도주 점수 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '테마 주도주 점수 조회 중 오류가 발생했습니다.',
        });
    }
});

export default router;
