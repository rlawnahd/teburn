import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import newsRoutes from './routes/news';
// 1. 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || '';

// 2. 미들웨어 설정 (JSON 요청 처리용)
app.use(express.json());
app.use(cors());

// 3. MongoDB 연결 함수
const connectDB = async () => {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_URI가 .env 파일에 정의되지 않았습니다.');
        }

        // Mongoose 연결 설정
        const conn = await mongoose.connect(MONGO_URI);

        console.log('----------------------------------------');
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`); // 호스트명
        console.log(`📂 Target DB: ${conn.connection.name}`); // ★ 실제 연결된 DB 이름
        console.log('----------------------------------------');
    } catch (error) {
        console.error('----------------------------------------');
        console.error('❌ MongoDB Connection Failed:');
        console.error(error);
        console.error('----------------------------------------');
        process.exit(1); // 치명적 에러 시 프로세스 종료
    }
};

app.use('/api/news', newsRoutes);
// 4. 서버 실행
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });
});

// 테스트용 기본 라우트
app.get('/', (req, res) => {
    res.send('NewsPick Backend API is Running!');
});
