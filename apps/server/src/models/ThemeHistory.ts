import mongoose, { Document, Schema } from 'mongoose';

export interface IThemeHistory extends Document {
    themeName: string;
    avgChangeRate: number;
    topStock: string;        // 대장주 (거래대금 1위)
    topStockRate: number;    // 대장주 등락률
    timestamp: Date;
}

const ThemeHistorySchema: Schema = new Schema({
    themeName: { type: String, required: true, index: true },
    avgChangeRate: { type: Number, required: true },
    topStock: { type: String, default: '' },
    topStockRate: { type: Number, default: 0 },
    timestamp: { type: Date, required: true, index: true },
});

// 복합 인덱스: 테마별 시간순 조회 최적화
ThemeHistorySchema.index({ themeName: 1, timestamp: -1 });

// 오래된 데이터 자동 삭제 (30일 후)
ThemeHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IThemeHistory>('ThemeHistory', ThemeHistorySchema);
