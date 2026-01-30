import { Router, Request, Response } from 'express';
import { getStockPrice, getStockCode, StockPrice } from '../services/kisApi';
import { getAllThemePrices, calculateThemePrice, getCachedThemePrices, isCacheValid, getLastUpdateTime } from '../services/themePrice';
import { themePriceCache } from '../services/themePriceCache';
import Theme from '../models/Theme';
import News from '../models/News';

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

// 종목 상세 조회 (종목코드로)
router.get('/:stockCode', async (req: Request, res: Response) => {
    try {
        const { stockCode } = req.params;

        // 1. 캐시에서 종목 정보 조회
        const cachedPrice = themePriceCache.getStockPrice(stockCode);

        if (!cachedPrice) {
            res.status(404).json({
                success: false,
                message: `종목코드 '${stockCode}'를 찾을 수 없습니다.`,
            });
            return;
        }

        // 2. 해당 종목이 속한 테마 조회
        const themes = await Theme.find({
            isActive: true,
            'stocks.code': stockCode,
        }).select('name').lean();

        const themeNames = themes.map(t => t.name);

        // 3. 관련 뉴스 조회 (종목명으로 검색)
        const stockName = cachedPrice.stockName;
        const relatedNews = await News.find({
            $or: [
                { title: { $regex: stockName, $options: 'i' } },
                { summary: { $regex: stockName, $options: 'i' } },
            ],
        })
            .sort({ crawledAt: -1 })
            .limit(10)
            .lean();

        const formattedNews = relatedNews.map(news => ({
            title: news.title,
            link: news.link,
            press: news.press,
            summary: news.summary,
            createdAt: news.publishedAt || news.crawledAt,
        }));

        res.json({
            success: true,
            data: {
                stockCode: cachedPrice.stockCode,
                stockName: cachedPrice.stockName,
                currentPrice: cachedPrice.currentPrice,
                changePrice: cachedPrice.changePrice,
                changeRate: cachedPrice.changeRate,
                volume: cachedPrice.volume,
                tradingValue: cachedPrice.tradingValue,
                updatedAt: cachedPrice.updatedAt,
                themes: themeNames,
                news: formattedNews,
            },
        });
    } catch (error: any) {
        console.error('종목 상세 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '종목 상세 조회 중 오류가 발생했습니다.',
        });
    }
});

export default router;
