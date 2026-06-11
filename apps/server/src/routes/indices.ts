import { Router, Request, Response } from 'express';
import { getAllIndexData, getNasdaqIndexData, getKospiFuturesPrice, getKospiIndexData, getKosdaqIndexData, debugKisFutures } from '../services/indexService';

const router = Router();

// [임시 진단] KIS 국내선물 시세 원시 응답 확인 — ?symbol=101W09. 확인 후 제거.
router.get('/debug-futures', async (req: Request, res: Response) => {
    const symbol = String(req.query.symbol || '101W09');
    const result = await debugKisFutures(symbol);
    res.json(result);
});

// 전체 지수 데이터 조회
router.get('/', async (req: Request, res: Response) => {
    try {
        const data = await getAllIndexData();
        res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('지수 데이터 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '지수 데이터 조회 중 오류가 발생했습니다.',
        });
    }
});

// NASDAQ 100 선물지수 개별 조회
router.get('/nasdaq', async (req: Request, res: Response) => {
    try {
        const data = await getNasdaqIndexData();
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

// KOSPI 지수 개별 조회
router.get('/kospi-index', async (req: Request, res: Response) => {
    try {
        const data = await getKospiIndexData();
        res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('KOSPI 지수 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'KOSPI 지수 조회 중 오류가 발생했습니다.',
        });
    }
});

// KOSDAQ 지수 개별 조회
router.get('/kosdaq-index', async (req: Request, res: Response) => {
    try {
        const data = await getKosdaqIndexData();
        res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('KOSDAQ 지수 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'KOSDAQ 지수 조회 중 오류가 발생했습니다.',
        });
    }
});

export default router;
