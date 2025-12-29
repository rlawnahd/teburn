import { Router, Request, Response } from 'express';
import overseasThemesData from '../data/overseasThemes.json';
import { getOverseasStockPrice, OverseasStockPrice } from '../services/kisApi';

const router = Router();

// 해외 테마 데이터 타입
interface OverseasStock {
    symbol: string;
    name: string;
    exchange: string;
}

interface OverseasTheme {
    stocks: OverseasStock[];
    keywords: string[];
}

const overseasThemes = overseasThemesData as Record<string, OverseasTheme>;

// 테마별 시세 캐시 (메모리)
interface OverseasThemePrice {
    themeName: string;
    avgChangeRate: number;
    prices: (OverseasStockPrice & { korName: string })[];
    updatedAt: Date;
}

const themePriceCache: Map<string, OverseasThemePrice> = new Map();
const CACHE_TTL = 60 * 1000; // 1분 캐시

// 모든 해외 테마 목록 조회
router.get('/', (req: Request, res: Response) => {
    try {
        const themeList = Object.entries(overseasThemes).map(([name, theme]) => ({
            name,
            stockCount: theme.stocks.length,
            keywords: theme.keywords,
        }));

        res.json({
            success: true,
            data: themeList,
            total: themeList.length,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// 특정 해외 테마 상세 조회
router.get('/:themeName', (req: Request, res: Response) => {
    try {
        const { themeName } = req.params;
        const decodedName = decodeURIComponent(themeName);
        const theme = overseasThemes[decodedName];

        if (!theme) {
            res.status(404).json({
                success: false,
                message: '테마를 찾을 수 없습니다',
            });
            return;
        }

        res.json({
            success: true,
            data: {
                name: decodedName,
                stocks: theme.stocks,
                keywords: theme.keywords,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// 특정 해외 테마 실시간 시세 조회
router.get('/:themeName/prices', async (req: Request, res: Response) => {
    try {
        const { themeName } = req.params;
        const decodedName = decodeURIComponent(themeName);
        const theme = overseasThemes[decodedName];

        if (!theme) {
            res.status(404).json({
                success: false,
                message: '테마를 찾을 수 없습니다',
            });
            return;
        }

        // 캐시 확인
        const cached = themePriceCache.get(decodedName);
        if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL) {
            res.json({
                success: true,
                data: cached,
            });
            return;
        }

        // 시세 조회
        const prices: (OverseasStockPrice & { korName: string })[] = [];

        for (const stock of theme.stocks) {
            const price = await getOverseasStockPrice(stock.symbol, stock.exchange);
            if (price) {
                prices.push({
                    ...price,
                    korName: stock.name,
                });
            }
        }

        // 거래량 기준 정렬
        prices.sort((a, b) => b.volume - a.volume);

        // 평균 등락률 계산
        const avgChangeRate = prices.length > 0
            ? prices.reduce((sum, p) => sum + p.changeRate, 0) / prices.length
            : 0;

        const result: OverseasThemePrice = {
            themeName: decodedName,
            avgChangeRate,
            prices,
            updatedAt: new Date(),
        };

        // 캐시 저장
        themePriceCache.set(decodedName, result);

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

// 전체 해외 테마 등락률 조회
router.get('/all/rates', async (req: Request, res: Response) => {
    try {
        const results: { themeName: string; avgChangeRate: number; topStock: string; topStockRate: number }[] = [];

        for (const [themeName, theme] of Object.entries(overseasThemes)) {
            // 캐시 확인
            const cached = themePriceCache.get(themeName);
            if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL) {
                results.push({
                    themeName,
                    avgChangeRate: cached.avgChangeRate,
                    topStock: cached.prices[0]?.korName || '',
                    topStockRate: cached.prices[0]?.changeRate || 0,
                });
                continue;
            }

            // 시세 조회
            const prices: (OverseasStockPrice & { korName: string })[] = [];

            for (const stock of theme.stocks) {
                const price = await getOverseasStockPrice(stock.symbol, stock.exchange);
                if (price) {
                    prices.push({
                        ...price,
                        korName: stock.name,
                    });
                }
            }

            prices.sort((a, b) => b.volume - a.volume);

            const avgChangeRate = prices.length > 0
                ? prices.reduce((sum, p) => sum + p.changeRate, 0) / prices.length
                : 0;

            // 캐시 저장
            themePriceCache.set(themeName, {
                themeName,
                avgChangeRate,
                prices,
                updatedAt: new Date(),
            });

            results.push({
                themeName,
                avgChangeRate,
                topStock: prices[0]?.korName || '',
                topStockRate: prices[0]?.changeRate || 0,
            });
        }

        // 등락률 순 정렬
        results.sort((a, b) => b.avgChangeRate - a.avgChangeRate);

        res.json({
            success: true,
            data: results,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;
