import mongoose, { Document, Schema } from 'mongoose';

// 캐시된 주가 정보
interface CachedStockPrice {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    tradingValue: number;
    marketCap: number;
    updatedAt: Date;
}

// 테마별 캐시
interface CachedThemePrice {
    themeName: string;
    avgChangeRate: number;
    stockCount: number;
    totalStockCount: number;
    totalTradingValue: number;
    leaderStock: CachedStockPrice | null;
    topStocks: CachedStockPrice[];
    allStocks: CachedStockPrice[];
    updatedAt: Date;
}

export interface IPriceCache extends Document {
    key: string; // 'main' 고정 (단일 캐시)
    stockPrices: CachedStockPrice[];
    themePrices: CachedThemePrice[];
    lastUpdateTime: Date;
    savedAt: Date;
}

const CachedStockPriceSchema = new Schema({
    stockCode: String,
    stockName: String,
    currentPrice: Number,
    changePrice: Number,
    changeRate: Number,
    volume: Number,
    tradingValue: Number,
    marketCap: Number,
    updatedAt: Date,
}, { _id: false });

const CachedThemePriceSchema = new Schema({
    themeName: String,
    avgChangeRate: Number,
    stockCount: Number,
    totalStockCount: Number,
    totalTradingValue: Number,
    leaderStock: { type: CachedStockPriceSchema, default: null },
    topStocks: [CachedStockPriceSchema],
    allStocks: [CachedStockPriceSchema],
    updatedAt: Date,
}, { _id: false });

const PriceCacheSchema = new Schema({
    key: { type: String, required: true, unique: true, default: 'main' },
    stockPrices: [CachedStockPriceSchema],
    themePrices: [CachedThemePriceSchema],
    lastUpdateTime: Date,
    savedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPriceCache>('PriceCache', PriceCacheSchema);
