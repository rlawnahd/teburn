import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import newsRoutes from './routes/news';
import themesRoutes from './routes/themes';
import stocksRoutes from './routes/stocks';
import { crawlNaverFinanceNews } from './services/crawler';
import { kisWebSocket, RealtimePrice } from './services/kisWebSocket';
import { startHistoryCollection } from './services/themeHistoryService';
import { migrateFromJson, startThemeUpdateScheduler } from './services/themeCrawler';
import News from './models/News';

// 1. 환경 변수 로드
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
    },
});

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

// 5. WebSocket 연결 처리 (실시간 주가 전용)
io.on('connection', (socket) => {
    console.log(`🔌 클라이언트 연결: ${socket.id}`);

    // 실시간 주가 구독 요청
    socket.on('subscribeStockPrices', () => {
        console.log(`📈 클라이언트 ${socket.id} 실시간 주가 구독`);
        socket.join('stockPrices');

        // 현재 캐시된 테마 가격 즉시 전송
        const themePrices = kisWebSocket.getThemePrices();
        socket.emit('themePricesUpdate', themePrices);
    });

    socket.on('unsubscribeStockPrices', () => {
        socket.leave('stockPrices');
    });

    socket.on('disconnect', () => {
        console.log(`❌ 클라이언트 연결 해제: ${socket.id}`);
    });
});

// 6. API 라우트
app.use('/api/news', newsRoutes);
app.use('/api/themes', themesRoutes);
app.use('/api/stocks', stocksRoutes);

app.get('/', (req, res) => {
    res.send('NewsPick Backend API is Running!');
});

// 7. 서버 실행
connectDB().then(async () => {
    // 기존 JSON 데이터 마이그레이션 (DB에 데이터 없을 때만)
    await migrateFromJson();

    httpServer.listen(PORT, () => {
        console.log(`🚀 Server is running at http://localhost:${PORT}`);
        console.log(`🔌 WebSocket 활성화됨`);

        // 테마 자동 업데이트 스케줄러 시작 (1일 1회)
        startThemeUpdateScheduler();

        // 초기 크롤링
        backgroundCrawl();

        // 주기적 크롤링 시작
        setInterval(backgroundCrawl, CRAWL_INTERVAL);
        console.log(`⏰ 백그라운드 크롤링: ${CRAWL_INTERVAL / 1000}초마다 실행`);

        // KIS 실시간 WebSocket 연결
        kisWebSocket.connect().then(() => {
            console.log('📊 KIS 실시간 주가 WebSocket 연결됨');

            // 실시간 가격 업데이트 시 클라이언트에 푸시 (1초마다 배치)
            let lastPush = Date.now();
            kisWebSocket.onPriceUpdate((price: RealtimePrice) => {
                const now = Date.now();
                // 1초마다 테마 가격 업데이트 푸시
                if (now - lastPush >= 1000) {
                    const themePrices = kisWebSocket.getThemePrices();
                    io.to('stockPrices').emit('themePricesUpdate', themePrices);
                    lastPush = now;
                }
            });

            // 테마 히스토리 수집 시작 (5분 간격)
            startHistoryCollection();
        }).catch((err) => {
            console.error('❌ KIS WebSocket 연결 실패:', err.message);
        });
    });
});
