import mongoose, { Document, Schema } from 'mongoose';

export interface IStockReasonCache extends Document {
    cacheKey: string;      // "YYYY-MM-DD:stockCode"
    stockCode: string;
    reason: string;
    createdAt: Date;
}

const StockReasonCacheSchema: Schema = new Schema({
    cacheKey: { type: String, required: true, unique: true },
    stockCode: { type: String, required: true },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// 3일 후 자동 삭제 (당일 + 캘린더 최근 날짜 참조 위해 여유)
StockReasonCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

export default mongoose.model<IStockReasonCache>('StockReasonCache', StockReasonCacheSchema);
