import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import newsRoutes from './routes/news';
import themesRoutes from './routes/themes';
import stocksRoutes from './routes/stocks';
import overseasThemesRoutes from './routes/overseasThemes';
import etfRoutes from './routes/etf';
import { crawlNaverFinanceNews } from './services/crawler';
import { kisWebSocket, RealtimePrice } from './services/kisWebSocket';
import { analyzeNews } from './services/aiAnalyzer';
import { startHistoryCollection } from './services/themeHistoryService';
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

// 크롤링 주기 (30초)
const CRAWL_INTERVAL = 30 * 1000;

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

// 4. 백그라운드 크롤링 + AI 분석
let lastNewsLinks: Set<string> = new Set();
let latestNews: Array<{
    id: number;
    title: string;
    link: string;
    press: string;
    summary: string;
    createdAt: string;
    isDetailed: boolean;
    sentiment: 'positive' | 'negative' | 'neutral';
    aiReason: string;
    stocks: string[];
    themes: string[];
    score: number;
}> = [];

const backgroundCrawl = async () => {
    try {
        console.log('🔄 백그라운드 크롤링 시작...');
        const crawledNews = await crawlNaverFinanceNews();

        // 새로운 뉴스 찾기
        const newNews = crawledNews.filter((news) => !lastNewsLinks.has(news.link));

        if (newNews.length > 0) {
            console.log(`📰 새 뉴스 ${newNews.length}개 발견!`);

            // 실시간 뉴스 전송 (AI 분석 없이 빠르게)
            const realtimeNews = newNews.map((item, index) => ({
                id: Date.now() + index,
                ...item,
                isDetailed: false,
                sentiment: 'neutral' as const,
                aiReason: '',
                stocks: [],
                themes: [],
                score: 50,
            }));

            io.emit('newNews', realtimeNews);

            // 최신 뉴스 목록 업데이트 (새 클라이언트 연결 시 사용)
            latestNews = [...realtimeNews, ...latestNews].slice(0, 30);

            // 백그라운드 AI 분석 비활성화 (클릭 시 분석으로 변경)
            // TODO: 나중에 다시 활성화하려면 주석 해제
            /*
            const toAnalyze = newNews.slice(0, 3);
            for (const news of toAnalyze) {
                try {
                    console.log(`🤖 백그라운드 AI 분석: ${news.title.substring(0, 30)}...`);
                    const analysis = await analyzeNews(news.title, news.summary);
                    await News.findOneAndUpdate(
                        { link: news.link },
                        {
                            title: news.title,
                            link: news.link,
                            press: news.press,
                            summary: news.summary,
                            publishedAt: news.createdAt,
                            sentiment: analysis.sentiment,
                            aiReason: analysis.reason,
                            stocks: analysis.stocks,
                            themes: analysis.themes,
                            score: analysis.score,
                            analyzedAt: new Date(),
                        },
                        { upsert: true, new: true }
                    );
                    io.emit('newsAnalyzed', {
                        link: news.link,
                        sentiment: analysis.sentiment,
                        aiReason: analysis.reason,
                        stocks: analysis.stocks,
                        themes: analysis.themes,
                        score: analysis.score,
                    });
                } catch (err) {
                    console.error(`❌ AI 분석 실패: ${news.title}`, err);
                }
            }
            */
        }

        // 링크 목록 업데이트
        lastNewsLinks = new Set(crawledNews.map((n) => n.link));
    } catch (error) {
        console.error('❌ 백그라운드 크롤링 에러:', error);
    }
};

// 5. WebSocket 연결 처리
io.on('connection', async (socket) => {
    console.log(`🔌 클라이언트 연결: ${socket.id}`);

    // 연결 즉시 최신 뉴스 전송
    if (latestNews.length > 0) {
        console.log(`📤 기존 뉴스 ${latestNews.length}개 전송`);
        socket.emit('newNews', latestNews);
    } else {
        // 아직 크롤링된 뉴스가 없으면 즉시 크롤링
        console.log(`📥 신규 클라이언트용 즉시 크롤링...`);
        const crawledNews = await crawlNaverFinanceNews();
        const initialNews = crawledNews.map((item, index) => ({
            id: Date.now() + index,
            ...item,
            isDetailed: false,
            sentiment: 'neutral' as const,
            aiReason: '',
            stocks: [],
            themes: [],
            score: 50,
        }));
        latestNews = initialNews.slice(0, 30);
        lastNewsLinks = new Set(crawledNews.map((n) => n.link));
        socket.emit('newNews', latestNews);
    }

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
app.use('/api/overseas-themes', overseasThemesRoutes);
app.use('/api/etf', etfRoutes);

app.get('/', (req, res) => {
    res.send('NewsPick Backend API is Running!');
});

// 7. 서버 실행
connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`🚀 Server is running at http://localhost:${PORT}`);
        console.log(`🔌 WebSocket 활성화됨`);

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
