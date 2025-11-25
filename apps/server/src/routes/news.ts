// apps/server/src/routes/news.ts
import { Router } from 'express';
import { crawlNaverFinanceNews } from '../services/crawler';

const router = Router();

router.get('/', async (req, res) => {
    try {
        // 네이버 금융 증권 뉴스 크롤링
        const newsData = await crawlNaverFinanceNews();

        // 임시 AI 데이터 병합 (UI 깨짐 방지용)
        const enhancedData = newsData.map((item, index) => ({
            id: index,
            ...item,
            isDetailed: index < 5, // 상위 5개는 상세 분석 뉴스
            sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)],
            aiReason: 'AI 분석 대기 중...',
            stocks: [],
            score: Math.floor(Math.random() * 30) + 70,
        }));

        res.json({
            message: 'Success',
            data: enhancedData,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
