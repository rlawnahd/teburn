// apps/server/src/routes/news.ts
import { Router } from 'express';
import { crawlNaverFinanceNews } from '../services/crawler';
import News from '../models/News';
import Theme from '../models/Theme';

const router = Router();

// 최신 뉴스 조회 (AI 분석 없음)
router.get('/', async (req, res) => {
    try {
        // 네이버 금융 증권 뉴스 크롤링
        const crawledNews = await crawlNaverFinanceNews();

        const processedNews = crawledNews.map((item, index) => ({
            id: index,
            title: item.title,
            link: item.link,
            press: item.press,
            summary: item.summary,
            createdAt: item.createdAt,
        }));

        res.json({
            message: 'Success',
            data: processedNews,
        });
    } catch (error) {
        console.error('❌ News API Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 전체 뉴스 조회
router.get('/all', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        const allNews = await News.find()
            .sort({ crawledAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await News.countDocuments();

        const formattedNews = allNews.map((news, index) => ({
            id: skip + index,
            title: news.title,
            link: news.link,
            press: news.press,
            summary: news.summary,
            createdAt: news.publishedAt || news.crawledAt,
        }));

        res.json({
            success: true,
            data: formattedNews,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('❌ All News API Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// 테마/키워드별 관련 뉴스 조회
router.get('/by-theme/:themeName', async (req, res) => {
    try {
        const { themeName } = req.params;
        const decodedName = decodeURIComponent(themeName);
        const limit = parseInt(req.query.limit as string) || 10;

        // DB에서 테마 데이터 조회
        const themeInfo = await Theme.findOne({ name: decodedName, isActive: true }).lean();
        const searchTerms: string[] = [decodedName];

        if (themeInfo) {
            // 종목명 추가 (상위 5개)
            const stockNames = themeInfo.stocks.slice(0, 5).map(s => s.name);
            searchTerms.push(...stockNames);
            // 키워드 추가
            searchTerms.push(...themeInfo.keywords);
        }

        // 각 검색어에 대해 title 또는 summary에 포함되는지 검색
        const orConditions: object[] = [];
        for (const term of searchTerms) {
            orConditions.push({ title: { $regex: term, $options: 'i' } });
            orConditions.push({ summary: { $regex: term, $options: 'i' } });
        }

        // 테마명 또는 관련 키워드/종목이 포함된 뉴스 검색 (최신순)
        const relatedNews = await News.find({ $or: orConditions })
            .sort({ publishedAt: -1, crawledAt: -1 })
            .limit(limit)
            .lean();

        const formattedNews = relatedNews.map((news, index) => ({
            id: index,
            title: news.title,
            link: news.link,
            press: news.press,
            summary: news.summary,
            createdAt: news.publishedAt,
        }));

        res.json({
            message: 'Success',
            data: formattedNews,
        });
    } catch (error) {
        console.error('❌ Theme News API Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
