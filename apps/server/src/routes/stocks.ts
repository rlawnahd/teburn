import { Router, Request, Response } from 'express';
import { getStockPrice, getStockCode, StockPrice } from '../services/kisApi';
import { getAllThemePrices, calculateThemePrice, getCachedThemePrices, isCacheValid, getLastUpdateTime } from '../services/themePrice';
import { kisWebSocket } from '../services/kisWebSocket';

const router = Router();

// 단일 종목 현재가 조회
router.get('/price/:stockName', async (req: Request, res: Response) => {
    try {
        const { stockName } = req.params;
        const decodedName = decodeURIComponent(stockName);
        const stockCode = getStockCode(decodedName);

        if (!stockCode) {
            res.status(404).json({
                success: false,
                message: `종목 '${decodedName}'의 종목코드를 찾을 수 없습니다.`,
            });
            return;
        }

        const price = await getStockPrice(stockCode);

        if (!price) {
            res.status(500).json({
                success: false,
                message: '주가 조회에 실패했습니다.',
            });
            return;
        }

        price.stockName = decodedName;

        res.json({
            success: true,
            data: price,
        });
    } catch (error: any) {
        console.error('주가 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '주가 조회 중 오류가 발생했습니다.',
        });
    }
});

// 모든 테마 등락률 조회
router.get('/themes', async (req: Request, res: Response) => {
    try {
        const forceRefresh = req.query.refresh === 'true';

        // 캐시가 유효하고 강제 새로고침이 아니면 캐시 반환
        if (!forceRefresh && isCacheValid()) {
            const cached = getCachedThemePrices();
            res.json({
                success: true,
                data: cached,
                cached: true,
                lastUpdate: getLastUpdateTime(),
            });
            return;
        }

        const themePrices = await getAllThemePrices(forceRefresh);

        res.json({
            success: true,
            data: themePrices,
            cached: false,
            lastUpdate: getLastUpdateTime(),
        });
    } catch (error: any) {
        console.error('테마 가격 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '테마 가격 조회 중 오류가 발생했습니다.',
        });
    }
});

// 단일 테마 등락률 조회
router.get('/themes/:themeName', async (req: Request, res: Response) => {
    try {
        const { themeName } = req.params;
        const decodedName = decodeURIComponent(themeName);

        const themePrice = await calculateThemePrice(decodedName);

        if (!themePrice) {
            res.status(404).json({
                success: false,
                message: `테마 '${decodedName}'를 찾을 수 없습니다.`,
            });
            return;
        }

        res.json({
            success: true,
            data: themePrice,
        });
    } catch (error: any) {
        console.error('테마 가격 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '테마 가격 조회 중 오류가 발생했습니다.',
        });
    }
});

// 실시간 WebSocket 디버그 정보
router.get('/debug/realtime', (_req: Request, res: Response) => {
    try {
        const allPrices = kisWebSocket.getAllCachedPrices();
        const priceArray = Array.from(allPrices.values());

        // 하락 종목만 필터
        const decliningStocks = priceArray.filter(p => p.changeRate < 0);
        // 상승 종목만 필터
        const risingStocks = priceArray.filter(p => p.changeRate > 0);
        // 보합 종목
        const flatStocks = priceArray.filter(p => p.changeRate === 0);

        res.json({
            success: true,
            connected: kisWebSocket.connected,
            totalStocks: priceArray.length,
            stats: {
                rising: risingStocks.length,
                declining: decliningStocks.length,
                flat: flatStocks.length,
            },
            decliningStocks: decliningStocks.map(p => ({
                name: p.stockName,
                code: p.stockCode,
                rate: p.changeRate,
            })),
            risingStocks: risingStocks.slice(0, 10).map(p => ({
                name: p.stockName,
                code: p.stockCode,
                rate: p.changeRate,
            })),
            allPrices: priceArray.map(p => ({
                name: p.stockName,
                code: p.stockCode,
                price: p.currentPrice,
                changeRate: p.changeRate,
                changePrice: p.changePrice,
            })),
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;
