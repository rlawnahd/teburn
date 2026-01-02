import { Router, Request, Response } from 'express';
import Theme from '../models/Theme';
import { getThemeHistory } from '../services/themeHistoryService';
import { updateAllThemes, migrateFromJson } from '../services/themeCrawler';

const router = Router();

// 모든 테마 목록 조회 (활성화된 테마만)
router.get('/', async (_req: Request, res: Response) => {
    try {
        const themes = await Theme.find({ isActive: true })
            .select('name stocks keywords')
            .lean();

        const themeList = themes.map(theme => ({
            name: theme.name,
            stockCount: theme.stocks.length,
            keywords: theme.keywords.slice(0, 5),
        }));

        res.json({
            success: true,
            data: themeList,
            total: themeList.length,
        });
    } catch (error) {
        console.error('테마 목록 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '테마 목록 조회 중 오류가 발생했습니다.',
        });
    }
});

// 특정 테마 상세 조회
router.get('/:themeName', async (req: Request, res: Response) => {
    try {
        const { themeName } = req.params;
        const decodedName = decodeURIComponent(themeName);

        const theme = await Theme.findOne({ name: decodedName, isActive: true }).lean();

        if (!theme) {
            res.status(404).json({
                success: false,
                message: `테마 '${decodedName}'를 찾을 수 없습니다.`,
            });
            return;
        }

        res.json({
            success: true,
            data: {
                name: theme.name,
                stocks: theme.stocks.map(s => s.name),
                stocksWithCode: theme.stocks,
                keywords: theme.keywords,
                isCustom: theme.isCustom,
                lastCrawledAt: theme.lastCrawledAt,
            },
        });
    } catch (error) {
        console.error('테마 상세 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '테마 상세 조회 중 오류가 발생했습니다.',
        });
    }
});

// 종목명으로 관련 테마 찾기
router.get('/stock/:stockName', async (req: Request, res: Response) => {
    try {
        const { stockName } = req.params;
        const decodedStock = decodeURIComponent(stockName);

        const themes = await Theme.find({
            isActive: true,
            'stocks.name': decodedStock,
        }).select('name').lean();

        res.json({
            success: true,
            data: {
                stock: decodedStock,
                themes: themes.map(t => t.name),
            },
        });
    } catch (error) {
        console.error('종목별 테마 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '종목별 테마 조회 중 오류가 발생했습니다.',
        });
    }
});

// 키워드로 관련 테마 찾기
router.get('/keyword/:keyword', async (req: Request, res: Response) => {
    try {
        const { keyword } = req.params;
        const decodedKeyword = decodeURIComponent(keyword);

        const themes = await Theme.find({
            isActive: true,
            keywords: { $regex: decodedKeyword, $options: 'i' },
        }).select('name').lean();

        res.json({
            success: true,
            data: {
                keyword: decodedKeyword,
                themes: themes.map(t => t.name),
            },
        });
    } catch (error) {
        console.error('키워드별 테마 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: '키워드별 테마 조회 중 오류가 발생했습니다.',
        });
    }
});

// 테마별 등락률 히스토리 조회
router.get('/:themeName/history', async (req: Request, res: Response) => {
    try {
        const { themeName } = req.params;
        const { period = 'today' } = req.query;
        const decodedName = decodeURIComponent(themeName);

        const validPeriods = ['today', '1d', '7d', '30d'];
        const selectedPeriod = validPeriods.includes(period as string)
            ? (period as 'today' | '1d' | '7d' | '30d')
            : 'today';

        const history = await getThemeHistory(decodedName, selectedPeriod);

        res.json({
            success: true,
            data: {
                themeName: decodedName,
                period: selectedPeriod,
                history,
            },
        });
    } catch (error: any) {
        console.error('테마 히스토리 조회 에러:', error);
        res.status(500).json({
            success: false,
            message: error.message || '테마 히스토리 조회 중 오류가 발생했습니다.',
        });
    }
});

// 커스텀 키워드 추가
router.post('/:themeName/keywords', async (req: Request, res: Response) => {
    try {
        const { themeName } = req.params;
        const { keywords } = req.body;
        const decodedName = decodeURIComponent(themeName);

        if (!Array.isArray(keywords)) {
            res.status(400).json({
                success: false,
                message: 'keywords는 배열이어야 합니다.',
            });
            return;
        }

        const theme = await Theme.findOneAndUpdate(
            { name: decodedName },
            { $addToSet: { keywords: { $each: keywords } } },
            { new: true }
        );

        if (!theme) {
            res.status(404).json({
                success: false,
                message: `테마 '${decodedName}'를 찾을 수 없습니다.`,
            });
            return;
        }

        res.json({
            success: true,
            data: {
                name: theme.name,
                keywords: theme.keywords,
            },
        });
    } catch (error) {
        console.error('키워드 추가 에러:', error);
        res.status(500).json({
            success: false,
            message: '키워드 추가 중 오류가 발생했습니다.',
        });
    }
});

// 테마 데이터 수동 업데이트 (관리자용)
router.post('/admin/update', async (_req: Request, res: Response) => {
    try {
        await updateAllThemes();
        res.json({
            success: true,
            message: '테마 데이터 업데이트가 완료되었습니다.',
        });
    } catch (error) {
        console.error('테마 업데이트 에러:', error);
        res.status(500).json({
            success: false,
            message: '테마 업데이트 중 오류가 발생했습니다.',
        });
    }
});

// JSON 데이터 마이그레이션 (최초 1회)
router.post('/admin/migrate', async (_req: Request, res: Response) => {
    try {
        await migrateFromJson();
        res.json({
            success: true,
            message: 'JSON 데이터 마이그레이션이 완료되었습니다.',
        });
    } catch (error) {
        console.error('마이그레이션 에러:', error);
        res.status(500).json({
            success: false,
            message: '마이그레이션 중 오류가 발생했습니다.',
        });
    }
});

export default router;
