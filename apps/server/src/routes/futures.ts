import { Router, Request, Response } from 'express';
import { getAllFuturesData, getNasdaqFuturesData, getKospiFuturesPrice } from '../services/futuresService';

const router = Router();

// 전체 선물 데이터 조회
router.get('/', async (req: Request, res: Response) => {
    try {
        const data = await getAllFuturesData();
        res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('선물 데이터 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '선물 데이터 조회 중 오류가 발생했습니다.',
        });
    }
});

// NASDAQ 100 선물 개별 조회
router.get('/nasdaq', async (req: Request, res: Response) => {
    try {
        const data = await getNasdaqFuturesData();
        res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('NASDAQ 선물 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'NASDAQ 선물 조회 중 오류가 발생했습니다.',
        });
    }
});

// KOSPI 200 야간선물 개별 조회
router.get('/kospi', async (req: Request, res: Response) => {
    try {
        const data = await getKospiFuturesPrice();
        res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('KOSPI 야간선물 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'KOSPI 야간선물 조회 중 오류가 발생했습니다.',
        });
    }
});

export default router;
