import mongoose, { Document, Schema } from 'mongoose';

export interface IStockVolumeHistory extends Document {
    stockCode: string;
    stockName: string;
    date: Date;
    volume: number;
    tradingValue: number;
    changeRate: number;
}

const StockVolumeHistorySchema: Schema = new Schema({
    stockCode: { type: String, required: true, index: true },
    stockName: { type: String, required: true },
    date: { type: Date, required: true },
    volume: { type: Number, required: true },
    tradingValue: { type: Number, required: true },
    changeRate: { type: Number, default: 0 },
});

// 복합 인덱스: 종목별 날짜순 조회 최적화
StockVolumeHistorySchema.index({ stockCode: 1, date: -1 });

// 중복 방지
StockVolumeHistorySchema.index({ stockCode: 1, date: 1 }, { unique: true });

// 30일 후 자동 삭제 (급증률 계산에 20일만 필요)
StockVolumeHistorySchema.index({ date: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IStockVolumeHistory>('StockVolumeHistory', StockVolumeHistorySchema);
