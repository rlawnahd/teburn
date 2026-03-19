import { Router, Request, Response } from 'express';
import { getDashboardData, getTodayAccount, syncWithKiwoomBalance } from '../services/tradingService';
import { getMarketStatus } from '../utils/marketStatus';
import Trade from '../models/Trade';

const router = Router();

// 대시보드 데이터 (수익률, 포트폴리오, 통계)
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        // 대시보드 조회 시 키움 실잔고 동기화
        await syncWithKiwoomBalance();
        const data = await getDashboardData();
        res.json({
            success: true,
            data: {
                ...data,
                marketStatus: getMarketStatus(),
            },
        });
    } catch (error: any) {
        console.error('트레이딩 대시보드 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '대시보드 데이터 조회 실패',
        });
    }
});

// 매매 이력 (페이지네이션)
router.get('/trades', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = req.query.type as string;

        const filter: any = { status: 'filled' };
        if (type === 'buy' || type === 'sell') filter.type = type;

        const total = await Trade.countDocuments(filter);
        const trades = await Trade.find(filter)
            .sort({ filledAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        res.json({
            success: true,
            data: {
                trades,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 현재 계좌 상태
router.get('/account', async (req: Request, res: Response) => {
    try {
        const account = await getTodayAccount();
        res.json({
            success: true,
            data: { account, marketStatus: getMarketStatus() },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
