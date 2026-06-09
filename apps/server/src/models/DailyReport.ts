import mongoose, { Document, Schema } from 'mongoose';

export interface ReportTheme {
    rank: number;
    themeName: string;
    avgChangeRate: number;
    topStock: string;
    topStockRate: number;
}

export interface ReportStock {
    rank: number;
    stockCode: string;
    stockName: string;
    changeRate: number;
    tradingValue: number;
    grade: string;
    score: number;
    themes: string[];
}

export interface IDailyReport extends Document {
    date: string; // YYYY-MM-DD
    aiSummary: string;
    topThemes: ReportTheme[];
    topStocks: ReportStock[];
    generatedAt: Date;
    createdAt: Date;
}

const ReportThemeSchema = new Schema<ReportTheme>({
    rank: { type: Number, required: true },
    themeName: { type: String, required: true },
    avgChangeRate: { type: Number, default: 0 },
    topStock: { type: String, default: '' },
    topStockRate: { type: Number, default: 0 },
}, { _id: false });

const ReportStockSchema = new Schema<ReportStock>({
    rank: { type: Number, required: true },
    stockCode: { type: String, default: '' },
    stockName: { type: String, required: true },
    changeRate: { type: Number, default: 0 },
    tradingValue: { type: Number, default: 0 },
    grade: { type: String, default: '' },
    score: { type: Number, default: 0 },
    themes: { type: [String], default: [] },
}, { _id: false });

const DailyReportSchema: Schema = new Schema({
    date: { type: String, required: true, unique: true },
    aiSummary: { type: String, default: '' },
    topThemes: { type: [ReportThemeSchema], default: [] },
    topStocks: { type: [ReportStockSchema], default: [] },
    generatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IDailyReport>('DailyReport', DailyReportSchema);
