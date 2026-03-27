import mongoose, { Document, Schema } from 'mongoose';

export interface IHotnessHistory extends Document {
    stockCode: string;
    stockName: string;
    totalScore: number;
    grade: string;
    tradingValueScore: number;
    momentumScore: number;
    volumeScore: number;
    newsScore: number;
    themeConcentrationScore: number;
    streakScore: number;
    date: string; // YYYY-MM-DD
    createdAt: Date;
}

const HotnessHistorySchema: Schema = new Schema({
    stockCode: { type: String, required: true },
    stockName: { type: String, required: true },
    totalScore: { type: Number, required: true },
    grade: { type: String, required: true },
    tradingValueScore: { type: Number, default: 0 },
    momentumScore: { type: Number, default: 0 },
    volumeScore: { type: Number, default: 0 },
    newsScore: { type: Number, default: 0 },
    themeConcentrationScore: { type: Number, default: 0 },
    streakScore: { type: Number, default: 0 },
    date: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// 종목별 날짜 유니크 (하루에 한 번만 저장)
HotnessHistorySchema.index({ stockCode: 1, date: 1 }, { unique: true });

// 종목별 최근 조회 최적화
HotnessHistorySchema.index({ stockCode: 1, date: -1 });

// 90일 후 자동 삭제
HotnessHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IHotnessHistory>('HotnessHistory', HotnessHistorySchema);
