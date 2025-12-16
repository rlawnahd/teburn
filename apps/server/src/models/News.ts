// apps/server/src/models/News.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
    // 기본 정보 (크롤링)
    title: string;
    link: string;
    press: string;
    summary: string;
    publishedAt: string;

    // AI 분석 결과
    sentiment: 'positive' | 'negative' | 'neutral';
    aiReason: string;
    stocks: string[];           // 수혜주
    negativeStocks: string[];   // 피해주
    themes: string[];
    score: number;
    analyzedAt: Date;

    // 메타
    createdAt: Date;
    updatedAt: Date;
}

const NewsSchema: Schema = new Schema(
    {
        // 기본 정보
        title: { type: String, required: true },
        link: { type: String, required: true, unique: true }, // 중복 방지
        press: { type: String, default: '' },
        summary: { type: String, default: '' },
        publishedAt: { type: String, default: '' },

        // AI 분석 결과
        sentiment: {
            type: String,
            enum: ['positive', 'negative', 'neutral'],
            default: 'neutral',
        },
        aiReason: { type: String, default: '' },
        stocks: [{ type: String }],
        negativeStocks: [{ type: String }],
        themes: [{ type: String }],
        score: { type: Number, default: 50 },
        analyzedAt: { type: Date },
    },
    {
        timestamps: true, // createdAt, updatedAt 자동 생성
    }
);

// link 필드에 인덱스 추가 (중복 체크 성능 향상)
NewsSchema.index({ link: 1 });
// 최신순 정렬을 위한 인덱스
NewsSchema.index({ createdAt: -1 });

export default mongoose.model<INews>('News', NewsSchema);
