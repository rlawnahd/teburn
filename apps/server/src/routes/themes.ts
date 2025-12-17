import { Router, Request, Response } from 'express';
import themesData from '../data/themes.json';

const router = Router();

// 테마 데이터 타입
interface ThemeData {
    stocks: string[];
    keywords: string[];
}

interface ThemesJson {
    [themeName: string]: ThemeData;
}

const themes: ThemesJson = themesData as ThemesJson;

// 실시간 구독 중인 테마 목록 (kisWebSocket과 동일하게 유지)
const priorityThemes = [
    '반도체', '2차전지', '바이오', '자동차', '조선',
    '방산', 'AI', '게임', '엔터', '금융',
    '로봇', '원전', '클라우드', '화장품', '음식료',
    '건설', '철강', '정유/화학', '항공', '해운',
    '통신', '유틸리티', '증권', '신재생에너지'
];

// 모든 테마 목록 조회 (구독 중인 테마만, 순서 유지)
router.get('/', (_req: Request, res: Response) => {
    const themeList = priorityThemes
        .filter(name => themes[name]) // 존재하는 테마만
        .map(name => ({
            name,
            stockCount: themes[name].stocks.length,
            keywords: themes[name].keywords.slice(0, 5), // 상위 5개 키워드만
        }));

    res.json({
        success: true,
        data: themeList,
        total: themeList.length,
    });
});

// 특정 테마 상세 조회
router.get('/:themeName', (req: Request, res: Response) => {
    const { themeName } = req.params;
    const decodedName = decodeURIComponent(themeName);
    const theme = themes[decodedName];

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
            name: decodedName,
            stocks: theme.stocks,
            keywords: theme.keywords,
        },
    });
});

// 종목명으로 관련 테마 찾기
router.get('/stock/:stockName', (req: Request, res: Response) => {
    const { stockName } = req.params;
    const decodedStock = decodeURIComponent(stockName);

    const relatedThemes: string[] = [];

    Object.entries(themes).forEach(([themeName, data]) => {
        if (data.stocks.includes(decodedStock)) {
            relatedThemes.push(themeName);
        }
    });

    res.json({
        success: true,
        data: {
            stock: decodedStock,
            themes: relatedThemes,
        },
    });
});

// 키워드로 관련 테마 찾기
router.get('/keyword/:keyword', (req: Request, res: Response) => {
    const { keyword } = req.params;
    const decodedKeyword = decodeURIComponent(keyword).toLowerCase();

    const relatedThemes: string[] = [];

    Object.entries(themes).forEach(([themeName, data]) => {
        const hasKeyword = data.keywords.some(k =>
            k.toLowerCase().includes(decodedKeyword) ||
            decodedKeyword.includes(k.toLowerCase())
        );
        if (hasKeyword) {
            relatedThemes.push(themeName);
        }
    });

    res.json({
        success: true,
        data: {
            keyword: decodedKeyword,
            themes: relatedThemes,
        },
    });
});

export default router;
