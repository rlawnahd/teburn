import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import newsRoutes from './routes/news';
import themesRoutes from './routes/themes';
import stocksRoutes from './routes/stocks';
import leadingRoutes from './routes/leading';
import { crawlNaverFinanceNews } from './services/crawler';
import { startHistoryCollection } from './services/themeHistoryService';
import { startThemeUpdateScheduler } from './services/themeCrawler';
import Theme from './models/Theme';
import { themePriceCache } from './services/themePriceCache';
import { saveDailyLeadingThemes } from './services/leadingStockService';
import News from './models/News';

// 1. 환경 변수 로드
dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || '';

// 크롤링 주기 (10초)
const CRAWL_INTERVAL = 10 * 1000;

// 2. 미들웨어 설정
app.use(express.json());
app.use(cors());

// 3. MongoDB 연결 함수
const connectDB = async () => {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_URI가 .env 파일에 정의되지 않았습니다.');
        }
        const conn = await mongoose.connect(MONGO_URI);
        console.log('----------------------------------------');
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📂 Target DB: ${conn.connection.name}`);
        console.log('----------------------------------------');
    } catch (error) {
        console.error('❌ MongoDB Connection Failed:', error);
        process.exit(1);
    }
};

// 4. 백그라운드 크롤링 (AI 분석 없이 DB 저장)
let lastNewsLinks: Set<string> = new Set();

const backgroundCrawl = async () => {
    try {
        console.log('🔄 백그라운드 크롤링 시작...');
        const crawledNews = await crawlNaverFinanceNews();

        // 새로운 뉴스 찾기
        const newNews = crawledNews.filter((news) => !lastNewsLinks.has(news.link));

        if (newNews.length > 0) {
            console.log(`📰 새 뉴스 ${newNews.length}개 발견! DB 저장 중...`);

            // DB에 바로 저장 (AI 분석 없이)
            for (const news of newNews) {
                try {
                    await News.findOneAndUpdate(
                        { link: news.link },
                        {
                            title: news.title,
                            link: news.link,
                            press: news.press,
                            summary: news.summary,
                            publishedAt: news.createdAt,
                            crawledAt: new Date(),
                        },
                        { upsert: true, new: true }
                    );
                } catch (err) {
                    console.error(`❌ 뉴스 저장 실패: ${news.title}`, err);
                }
            }
            console.log(`✅ ${newNews.length}개 뉴스 DB 저장 완료`);
        }

        // 링크 목록 업데이트
        lastNewsLinks = new Set(crawledNews.map((n) => n.link));
    } catch (error) {
        console.error('❌ 백그라운드 크롤링 에러:', error);
    }
};

// 5. API 라우트
app.use('/api/news', newsRoutes);
app.use('/api/themes', themesRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/leading', leadingRoutes);

app.get('/', (req, res) => {
    res.send('NewsPick Backend API is Running!');
});

// 6. 서버 실행
connectDB().then(async () => {
    // 레거시 테마(JSON 마이그레이션) 삭제 - 네이버 크롤링 테마만 사용
    const deleted = await Theme.deleteMany({ isCustom: true });
    if (deleted.deletedCount > 0) {
        console.log(`🗑️ 레거시 테마 ${deleted.deletedCount}개 삭제됨`);
    }

    app.listen(PORT, () => {
        console.log(`🚀 Server is running at http://localhost:${PORT}`);

        // 테마 자동 업데이트 스케줄러 시작 (1일 1회)
        startThemeUpdateScheduler();

        // 초기 크롤링
        backgroundCrawl();

        // 주기적 크롤링 시작
        setInterval(backgroundCrawl, CRAWL_INTERVAL);
        console.log(`⏰ 백그라운드 크롤링: ${CRAWL_INTERVAL / 1000}초마다 실행`);

        // 테마 히스토리 수집 시작 (5분 간격)
        startHistoryCollection();

        // 모든 테마 주가 배치 캐싱 스케줄러 시작 (5분 간격)
        themePriceCache.startScheduler();

        // 일별 주도테마 저장 (30분마다 업데이트)
        setInterval(async () => {
            try {
                await saveDailyLeadingThemes();
            } catch (error) {
                console.error('❌ 일별 주도테마 저장 실패:', error);
            }
        }, 30 * 60 * 1000);
        console.log('📅 일별 주도테마 저장: 30분마다 실행');
    });
});
