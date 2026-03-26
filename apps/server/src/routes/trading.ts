import { Router, Request, Response, NextFunction } from 'express';
import { getDashboardData, getTodayAccount, syncWithKiwoomBalance } from '../services/tradingService';
import { getMarketStatus } from '../utils/marketStatus';
import Trade from '../models/Trade';

const router = Router();

const TRADING_PASSWORD = process.env.TRADING_PASSWORD || '';

// 비밀번호 인증 미들웨어 (상세 매매일지용)
function requirePassword(req: Request, res: Response, next: NextFunction) {
    const password = req.headers['x-trading-password'] as string || req.query.password as string;
    if (!TRADING_PASSWORD || password === TRADING_PASSWORD) {
        next();
    } else {
        res.status(401).json({ success: false, message: '비밀번호가 필요합니다.' });
    }
}

// === 공개 API (수익률/통계만) ===

// 대시보드 데이터 (수익률, 통계 — 종목 상세 제외)
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
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

// === 비밀번호 보호 API (상세 매매일지) ===

// 비밀번호 검증
router.post('/auth', (req: Request, res: Response) => {
    const { password } = req.body;
    if (!TRADING_PASSWORD || password === TRADING_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: '비밀번호가 틀렸습니다.' });
    }
});

// 현재 계좌 상태 (보유종목 포함)
router.get('/account', requirePassword, async (req: Request, res: Response) => {
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

// 매매 이력 상세 (페이지네이션)
router.get('/trades', requirePassword, async (req: Request, res: Response) => {
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
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 체결내역 (Kiwoom API 제거됨 — DB 기록만 반환)
router.get('/history', requirePassword, async (req: Request, res: Response) => {
    try {
        res.json({
            success: true,
            data: { trades: [], marketStatus: getMarketStatus() },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
