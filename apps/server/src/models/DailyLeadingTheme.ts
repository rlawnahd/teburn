import mongoose, { Document, Schema } from 'mongoose';

export interface ITopTheme {
    rank: number;
    themeName: string;
    avgChangeRate: number;
    totalTradingValue: number;
    topStock: string;
    topStockRate: number;
}

export interface ITopStock {
    rank: number;
    stockCode: string;
    stockName: string;
    changeRate: number;
    tradingValue: number;
    themes: string[];
}

export interface IDailyLeadingTheme extends Document {
    date: Date;
    topThemes: ITopTheme[];
    topStocks: ITopStock[];
    createdAt: Date;
}

const TopThemeSchema = new Schema<ITopTheme>(
    {
        rank: { type: Number, required: true },
        themeName: { type: String, required: true },
        avgChangeRate: { type: Number, required: true },
        totalTradingValue: { type: Number, required: true },
        topStock: { type: String, default: '' },
        topStockRate: { type: Number, default: 0 },
    },
    { _id: false }
);

const TopStockSchema = new Schema<ITopStock>(
    {
        rank: { type: Number, required: true },
        stockCode: { type: String, required: true },
        stockName: { type: String, required: true },
        changeRate: { type: Number, required: true },
        tradingValue: { type: Number, required: true },
        themes: { type: [String], default: [] },
    },
    { _id: false }
);

const DailyLeadingThemeSchema: Schema = new Schema({
    date: { type: Date, required: true, unique: true },
    topThemes: { type: [TopThemeSchema], default: [] },
    topStocks: { type: [TopStockSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
});

// 날짜 인덱스 (조회 최적화)
DailyLeadingThemeSchema.index({ date: -1 });

// 90일 후 자동 삭제
DailyLeadingThemeSchema.index({ date: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IDailyLeadingTheme>('DailyLeadingTheme', DailyLeadingThemeSchema);
