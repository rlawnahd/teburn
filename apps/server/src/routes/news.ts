// apps/server/src/routes/news.ts
import { Router } from 'express';
import { crawlNaverFinanceNews } from '../services/crawler';
import { analyzeNews } from '../services/aiAnalyzer';
import News from '../models/News';
import Theme from '../models/Theme';

const router = Router();

router.get('/', async (req, res) => {
    try {
        // 1. 네이버 금융 증권 뉴스 크롤링
        const crawledNews = await crawlNaverFinanceNews();

        // 2. 각 뉴스에 대해 DB 확인 + AI 분석
        const processedNews = await Promise.all(
            crawledNews.map(async (item, index) => {
                const isDetailed = index < 5; // 상위 5개만 상세 분석

                // DB에서 이미 분석된 뉴스인지 확인 (link 기준)
                const existingNews = await News.findOne({ link: item.link });

                if (existingNews && existingNews.analyzedAt) {
                    // 이미 분석된 뉴스 → DB 데이터 사용
                    console.log(`📦 캐시 사용: ${item.title.substring(0, 30)}...`);
                    return {
                        id: index,
                        title: existingNews.title,
                        link: existingNews.link,
                        press: existingNews.press,
                        summary: existingNews.summary,
                        createdAt: existingNews.publishedAt,
                        isDetailed,
                        sentiment: existingNews.sentiment,
                        aiReason: existingNews.aiReason,
                        stocks: existingNews.stocks,
                        themes: existingNews.themes,
                        score: existingNews.score,
                    };
                }

                // 상위 5개만 AI 분석 (비용 절감)
                if (isDetailed) {
                    console.log(`🤖 AI 분석 중: ${item.title.substring(0, 30)}...`);
                    const analysis = await analyzeNews(item.title, item.summary);

                    // DB에 저장 (upsert)
                    await News.findOneAndUpdate(
                        { link: item.link },
                        {
                            title: item.title,
                            link: item.link,
                            press: item.press,
                            summary: item.summary,
                            publishedAt: item.createdAt,
                            sentiment: analysis.sentiment,
                            aiReason: analysis.reason,
                            stocks: analysis.stocks,
                            themes: analysis.themes,
                            score: analysis.score,
                            analyzedAt: new Date(),
                        },
                        { upsert: true, new: true }
                    );

                    return {
                        id: index,
                        ...item,
                        isDetailed,
                        sentiment: analysis.sentiment,
                        aiReason: analysis.reason,
                        stocks: analysis.stocks,
                        themes: analysis.themes,
                        score: analysis.score,
                    };
                }

                // 상세 분석 대상이 아닌 뉴스 → 임시 데이터
                return {
                    id: index,
                    ...item,
                    isDetailed,
                    sentiment: 'neutral' as const,
                    aiReason: '',
                    stocks: [],
                    themes: [],
                    score: 50,
                };
            })
        );

        res.json({
            message: 'Success',
            data: processedNews,
        });
    } catch (error) {
        console.error('❌ News API Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 전체 뉴스 조회 (AI 분석 없이)
router.get('/all', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        // 모든 뉴스 조회 (최신순)
        const allNews = await News.find()
            .sort({ createdAt: -1 })
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
            createdAt: news.publishedAt || news.createdAt,
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

// DB에 저장된 분석 완료 뉴스 조회
router.get('/analyzed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const page = parseInt(req.query.page as string) || 1;
        const skip = (page - 1) * limit;

        // 분석 완료된 뉴스만 조회 (최신순)
        const analyzedNews = await News.find({ analyzedAt: { $exists: true } })
            .sort({ analyzedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await News.countDocuments({ analyzedAt: { $exists: true } });

        const formattedNews = analyzedNews.map((news, index) => ({
            id: skip + index,
            title: news.title,
            link: news.link,
            press: news.press,
            summary: news.summary,
            createdAt: news.publishedAt,
            isDetailed: true,
            sentiment: news.sentiment,
            aiReason: news.aiReason,
            stocks: news.stocks,
            negativeStocks: news.negativeStocks || [],
            themes: news.themes,
            score: news.score,
            analyzedAt: news.analyzedAt,
        }));

        res.json({
            message: 'Success',
            data: formattedNews,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('❌ Analyzed News API Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 개별 뉴스 AI 분석 요청 (클릭 시 호출)
router.post('/analyze', async (req, res) => {
    try {
        const { title, summary, link, press, createdAt } = req.body;

        if (!title || !link) {
            return res.status(400).json({ message: 'title과 link는 필수입니다.' });
        }

        // 이미 분석된 뉴스인지 확인
        const existingNews = await News.findOne({ link });
        if (existingNews && existingNews.analyzedAt) {
            console.log(`📦 이미 분석됨: ${title.substring(0, 30)}...`);
            return res.json({
                message: 'Already analyzed',
                data: {
                    sentiment: existingNews.sentiment,
                    aiReason: existingNews.aiReason,
                    stocks: existingNews.stocks,
                    negativeStocks: existingNews.negativeStocks || [],
                    themes: existingNews.themes,
                    score: existingNews.score,
                },
            });
        }

        console.log(`🤖 AI 분석 요청: ${title.substring(0, 30)}...`);
        const analysis = await analyzeNews(title, summary || '');

        // DB에 저장
        await News.findOneAndUpdate(
            { link },
            {
                title,
                link,
                press: press || '',
                summary: summary || '',
                publishedAt: createdAt || '',
                sentiment: analysis.sentiment,
                aiReason: analysis.reason,
                stocks: analysis.stocks,
                negativeStocks: analysis.negativeStocks,
                themes: analysis.themes,
                score: analysis.score,
                analyzedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        res.json({
            message: 'Analysis complete',
            data: {
                sentiment: analysis.sentiment,
                aiReason: analysis.reason,
                stocks: analysis.stocks,
                negativeStocks: analysis.negativeStocks,
                themes: analysis.themes,
                score: analysis.score,
            },
        });
    } catch (error) {
        console.error('❌ AI 분석 API 에러:', error);
        res.status(500).json({ message: 'AI 분석 실패' });
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
            sentiment: news.sentiment,
            score: news.score,
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
