import { Router, Request, Response } from 'express';
import GradePerformance from '../models/GradePerformance';
import { summarizePerformance, addDays, PerfRecordLike } from '../services/performanceCalc';

const router = Router();

function kstTodayStr(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// 단일 객체 캐시 (Map 누적 금지 — 메모리 누수 방지)
let summaryCache: { data: any; ts: number } | null = null;
const SUMMARY_TTL = 60 * 60 * 1000; // 1시간

export function invalidateSummaryCache(): void {
    summaryCache = null;
}

// 윈도우별(7/30/90일) 등급 성적 요약
router.get('/summary', async (req: Request, res: Response) => {
    try {
        if (summaryCache && Date.now() - summaryCache.ts < SUMMARY_TTL) {
            return res.json({ success: true, data: summaryCache.data });
        }

        const today = kstTodayStr();
        const records = await GradePerformance.find({
            date: { $gte: addDays(today, -90) },
        }).lean() as unknown as PerfRecordLike[];

        const data = {
            windows: [7, 30, 90].map(days => ({
                days,
                ...summarizePerformance(records, days, today),
            })),
            updatedAt: new Date().toISOString(),
        };

        summaryCache = { data, ts: Date.now() };
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('성적표 요약 조회 에러:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 날짜별 종목 성적 리스트 (최근 N일, 최대 90)
router.get('/daily', async (req: Request, res: Response) => {
    try {
        const days = Math.min(parseInt(String(req.query.days)) || 30, 90);
        const today = kstTodayStr();
        const records = await GradePerformance.find({
            date: { $gte: addDays(today, -days) },
        })
            .sort({ date: -1, returnD1: -1 })
            .lean();

        // 날짜별 그룹핑
        const byDate = new Map<string, any[]>();
        for (const r of records) {
            if (!byDate.has(r.date)) byDate.set(r.date, []);
            byDate.get(r.date)!.push({
                stockCode: r.stockCode,
                stockName: r.stockName,
                grade: r.grade,
                totalScore: r.totalScore,
                returnD1: r.returnD1,
                returnD5: r.returnD5,
                status: r.status,
            });
        }

        res.json({
            success: true,
            data: {
                days: Array.from(byDate.entries()).map(([date, stocks]) => ({ date, stocks })),
            },
        });
    } catch (error: any) {
        console.error('성적표 일별 조회 에러:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
