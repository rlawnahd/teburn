import { Router, Request, Response } from 'express';
import { getDailyReport, listRecentReports } from '../services/dailyReportService';

const router = Router();

// 최근 리포트 목록 (인덱스/사이트맵용) — :date보다 먼저 등록
router.get('/', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(String(req.query.limit)) || 30;
        const reports = await listRecentReports(limit);
        res.json({
            success: true,
            data: {
                reports: reports.map((r: any) => ({
                    date: r.date,
                    summaryPreview: (r.aiSummary || '').slice(0, 120),
                    themeCount: r.topThemes?.length ?? 0,
                    stockCount: r.topStocks?.length ?? 0,
                })),
            },
        });
    } catch (error: any) {
        console.error('일별 리포트 목록 조회 에러:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 단일 리포트
router.get('/:date', async (req: Request, res: Response) => {
    try {
        const report = await getDailyReport(req.params.date);
        res.json({ success: true, data: report ?? null });
    } catch (error: any) {
        console.error('일별 리포트 조회 에러:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
