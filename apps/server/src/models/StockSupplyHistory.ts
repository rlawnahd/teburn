import mongoose, { Document, Schema } from 'mongoose';

export interface IStockSupplyHistory extends Document {
    stockCode: string;
    stockName: string;
    date: Date;
    foreignNet: number; // 외국인 순매수 (원)
    instNet: number;    // 기관 순매수 (원)
    retailNet: number;  // 개인 순매수 (원)
    updatedAt: Date;
}

const StockSupplyHistorySchema: Schema = new Schema({
    stockCode: { type: String, required: true, index: true },
    stockName: { type: String, required: true },
    date: { type: Date, required: true },
    foreignNet: { type: Number, default: 0 },
    instNet: { type: Number, default: 0 },
    retailNet: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
});

// 복합 인덱스
StockSupplyHistorySchema.index({ stockCode: 1, date: -1 });
StockSupplyHistorySchema.index({ stockCode: 1, date: 1 }, { unique: true });

// 30일 후 자동 삭제
StockSupplyHistorySchema.index({ date: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IStockSupplyHistory>('StockSupplyHistory', StockSupplyHistorySchema);
