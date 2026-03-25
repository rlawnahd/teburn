import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import newsRoutes from './routes/news';
import themesRoutes from './routes/themes';
import stocksRoutes from './routes/stocks';
import leadingRoutes from './routes/leading';
import adminRoutes from './routes/admin';
import indicesRoutes from './routes/indices';
import { crawlNaverFinanceNews } from './services/crawler';
import { startThemeUpdateScheduler } from './services/themeCrawler';
import Theme from './models/Theme';
import { themePriceCache } from './services/themePriceCache';
import { saveDailyLeadingThemes } from './services/leadingStockService';
import { warmupHotStocks, saveDailyHotnessHistory } from './services/hotnessService';
import { saveTodayVolumeHistory } from './services/volumeSurgeService';
import { startTelegramBot } from './services/telegramBot';
import { warmupChartHistory } from './services/indexService';
import tradingRoutes from './routes/trading';
import { startTradingBot } from './services/tradingBot';
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
app.use(cors({
    origin: [
        'https://teburn.com',
        'https://teburn-client.vercel.app',
        'http://localhost:3000', // 로컬 개발용
    ],
    credentials: true,
}));

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
app.use('/api/admin', adminRoutes);
app.use('/api/indices', indicesRoutes);
app.use('/api/trading', tradingRoutes);

app.get('/', (req, res) => {
    res.send('NewsPick Backend API is Running!');
});

// Health check API
app.get('/health', async (req, res) => {
    const healthCheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: {
            status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            host: mongoose.connection.host || null,
            db: mongoose.connection.name || null,
        },
        memory: {
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        },
    };

    const httpStatus = mongoose.connection.readyState === 1 ? 200 : 503;
    res.status(httpStatus).json(healthCheck);
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

        // 서버 outbound IP 확인 (키움 REST API IP 등록용)
        axios.get('https://api.ipify.org').then(res => {
            console.log(`🌐 서버 Outbound IP: ${res.data}`);
        }).catch(() => {});

        // 테마 자동 업데이트 스케줄러 시작 (1일 1회)
        startThemeUpdateScheduler();

        // 초기 크롤링
        backgroundCrawl();

        // 주기적 크롤링 시작
        setInterval(backgroundCrawl, CRAWL_INTERVAL);
        console.log(`⏰ 백그라운드 크롤링: ${CRAWL_INTERVAL / 1000}초마다 실행`);

        // 지수 차트 히스토리 워밍업 (당일 분봉 데이터 백필)
        warmupChartHistory().catch(err => {
            console.error('⚠️ 지수 차트 워밍업 실패:', err);
        });

        // 모든 테마 주가 배치 캐싱 스케줄러 시작 (5분 간격)
        // DB에서 캐시 복원 후 백그라운드 갱신 → 완료 후 주도주 점수 사전 계산
        themePriceCache.startScheduler()
            .then(() => warmupHotStocks())
            .then(() => startTelegramBot())
            // .then(() => startTradingBot())  // Python 봇으로 대체 (apps/bot)
            .catch(err => {
                console.error('❌ 주가 캐시/주도주 웜업 실패:', err);
            });

        // 일별 주도테마 저장 (30분마다 업데이트)
        setInterval(async () => {
            try {
                await saveDailyLeadingThemes();
            } catch (error) {
                console.error('❌ 일별 주도테마 저장 실패:', error);
            }
        }, 30 * 60 * 1000);
        console.log('📅 일별 주도테마 저장: 30분마다 실행');

        // 장 마감 후 거래량 히스토리 수집 스케줄러 (15:35에 실행)
        let lastVolumeCollectDate = '';

        const checkMarketCloseSchedule = async () => {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const hour = now.getHours();
            const minute = now.getMinutes();
            const dayOfWeek = now.getDay(); // 0=일, 6=토

            // 평일 15:35~15:40 사이에 실행 (장 마감 직후)
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour === 15 && minute >= 35 && minute <= 40) {
                // 거래량 히스토리 저장 (하루 1회)
                if (lastVolumeCollectDate !== today) {
                    console.log('📊 장 마감 후 거래량 히스토리 저장 시작...');
                    try {
                        await saveTodayVolumeHistory();
                        lastVolumeCollectDate = today;
                        console.log('✅ 거래량 히스토리 저장 완료');
                    } catch (error) {
                        console.error('❌ 거래량 히스토리 저장 실패:', error);
                    }

                    // 주도주 점수 히스토리 저장
                    try {
                        await saveDailyHotnessHistory();
                        console.log('주도주 히스토리 저장 완료');
                    } catch (error) {
                        console.error('주도주 히스토리 저장 실패:', error);
                    }

                    // 장 마감 잔고 동기화 (당일 최종 데이터 기록)
                    try {
                        const { syncWithKiwoomBalance } = require('./services/tradingService');
                        await syncWithKiwoomBalance();
                        console.log('✅ 장 마감 잔고 동기화 완료');
                    } catch (error) {
                        console.error('❌ 장 마감 잔고 동기화 실패:', error);
                    }
                }
            }
        };

        // 1분마다 스케줄 체크
        setInterval(checkMarketCloseSchedule, 60 * 1000);
        console.log('⏰ 장 마감 거래량 수집: 평일 15:35에 자동 실행');

        // 서버 시작 시 오늘 데이터가 없으면 즉시 수집 시도 (장 마감 후인 경우)
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 16) {
            console.log('🔄 서버 시작: 오늘 거래량 데이터 수집 시도...');
            setTimeout(async () => {
                try {
                    await saveTodayVolumeHistory();
                    console.log('✅ 거래량 데이터 수집 완료');
                } catch (error) {
                    console.error('❌ 거래량 데이터 수집 실패:', error);
                }
            }, 10000); // 캐시 로딩 후 10초 대기
        }
    });
});
