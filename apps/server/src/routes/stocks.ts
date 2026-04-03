import { Router, Request, Response } from 'express';
import { getStockPrice, getStockCode, StockPrice } from '../services/kisApi';
import { themePriceCache } from '../services/themePriceCache';
import { calculateBatchHotness } from '../services/hotnessService';
import { getDailyChart, getMinuteChart, getPeriodChart } from '../services/kisRestApi';
import Theme from '../models/Theme';
import News from '../models/News';
import HotnessHistory from '../models/HotnessHistory';

const router = Router();

// 종목 검색
router.get('/search', async (req: Request, res: Response) => {
    try {
        const q = (req.query.q as string || '').trim();
        if (!q) {
            res.json({ success: true, data: [] });
            return;
        }
        const results = themePriceCache.searchStocks(q, 10);
        res.json({ success: true, data: results });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

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

// 모든 테마 등락률 조회 (themePriceCache 사용)
router.get('/themes', async (req: Request, res: Response) => {
    try {
        const allData = themePriceCache.getAllThemePrices();
        res.json({
            success: true,
            data: allData.themes.map(t => ({
                themeName: t.themeName,
                avgChangeRate: t.avgChangeRate,
                stockCount: t.stockCount,
                totalStockCount: t.totalStockCount,
                totalTradingValue: t.totalTradingValue,
                leaderStock: t.leaderStock,
                stockPrices: t.allStocks,
                updatedAt: t.updatedAt,
            })),
            cached: true,
            lastUpdate: allData.lastUpdateTime,
        });
    } catch (error: any) {
        console.error('테마 가격 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '테마 가격 조회 중 오류가 발생했습니다.',
        });
    }
});

// 단일 테마 등락률 조회 (themePriceCache 사용)
router.get('/themes/:themeName', async (req: Request, res: Response) => {
    try {
        const { themeName } = req.params;
        const decodedName = decodeURIComponent(themeName);

        const cached = themePriceCache.getThemePrice(decodedName);

        if (!cached) {
            res.status(404).json({
                success: false,
                message: `테마 '${decodedName}'를 찾을 수 없습니다.`,
            });
            return;
        }

        const stocks = cached.allStocks;
        const sorted = [...stocks].sort((a, b) => b.changeRate - a.changeRate);

        res.json({
            success: true,
            data: {
                themeName: cached.themeName,
                avgChangeRate: cached.avgChangeRate,
                totalTradingValue: cached.totalTradingValue,
                leaderStock: cached.leaderStock ? {
                    stockName: cached.leaderStock.stockName,
                    stockCode: cached.leaderStock.stockCode,
                    currentPrice: cached.leaderStock.currentPrice,
                    changePrice: cached.leaderStock.changePrice,
                    changeRate: cached.leaderStock.changeRate,
                    volume: cached.leaderStock.volume,
                    tradingValue: cached.leaderStock.tradingValue,
                } : null,
                topGainer: sorted[0] || null,
                topLoser: sorted[sorted.length - 1] || null,
                stockPrices: stocks.map(s => ({
                    stockName: s.stockName,
                    stockCode: s.stockCode,
                    currentPrice: s.currentPrice,
                    changePrice: s.changePrice,
                    changeRate: s.changeRate,
                    volume: s.volume,
                    tradingValue: s.tradingValue,
                })),
                stockCount: cached.stockCount,
                totalStocks: cached.totalStockCount,
                updatedAt: cached.updatedAt,
            },
        });
    } catch (error: any) {
        console.error('테마 가격 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '테마 가격 조회 중 오류가 발생했습니다.',
        });
    }
});

// 종목 차트 데이터 (분봉/일봉/주봉/월봉)
router.get('/:stockCode/chart', async (req: Request, res: Response) => {
    try {
        const { stockCode } = req.params;
        const period = (req.query.period as string) || 'D';
        const days = Math.min(Number(req.query.days) || 60, 2000);

        let candles;
        if (period === '1' || period === '5' || period === '15' || period === '30' || period === '60') {
            candles = await getMinuteChart(stockCode, parseInt(period));
        } else if (period === 'W' || period === 'M') {
            candles = await getPeriodChart(stockCode, period, days);
        } else {
            candles = await getDailyChart(stockCode, days);
        }

        res.json({ success: true, data: candles });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 종목 주도주 점수 히스토리 조회
router.get('/:stockCode/hotness-history', async (req: Request, res: Response) => {
    try {
        const { stockCode } = req.params;
        const days = Math.min(Number(req.query.days) || 30, 90);

        const history = await HotnessHistory.find({ stockCode })
            .sort({ date: -1 })
            .limit(days)
            .lean();

        res.json({
            success: true,
            data: history.reverse().map(h => ({
                date: h.date,
                totalScore: h.totalScore,
                grade: h.grade,
                tradingValueScore: h.tradingValueScore,
                momentumScore: h.momentumScore,
                volumeScore: h.volumeScore,
                newsScore: h.newsScore,
                themeConcentrationScore: h.themeConcentrationScore,
            })),
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
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

        // 4. 주도주 점수 계산
        const hotnessScores = await calculateBatchHotness([{
            stockCode,
            stockName,
            themes: themeNames.slice(0, 3),
        }]);

        const hotness = hotnessScores[0] || null;

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
                // 주도주 점수
                hotness: hotness ? {
                    totalScore: hotness.totalScore,
                    grade: hotness.grade,
                    tradingValueScore: hotness.tradingValueScore,
                    momentumScore: hotness.momentumScore,
                    volumeScore: hotness.volumeScore,
                    newsScore: hotness.newsScore,
                    themeConcentrationScore: hotness.themeConcentrationScore,
                    volumeSurgeRate: hotness.volumeSurgeRate,
                    newsCount: hotness.newsCount,
                    themeConcentration: hotness.themeConcentration,
                } : null,
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
