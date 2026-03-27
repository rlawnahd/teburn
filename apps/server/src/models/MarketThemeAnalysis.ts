import mongoose, { Schema, Document } from 'mongoose';

export interface IThemeItem {
    name: string;
    stocks: string[];
    reason: string;
}

export interface IMarketThemeAnalysis extends Document {
    date: string;           // KST date string "2026-03-27"
    themes: IThemeItem[];
    analyzedAt: Date;
    aiModel: string;
}

const ThemeItemSchema = new Schema<IThemeItem>({
    name: { type: String, required: true },
    stocks: { type: [String], default: [] },
    reason: { type: String, required: true },
}, { _id: false });

const MarketThemeAnalysisSchema = new Schema<IMarketThemeAnalysis>({
    date: { type: String, required: true },
    themes: { type: [ThemeItemSchema], default: [] },
    analyzedAt: { type: Date, default: Date.now },
    aiModel: { type: String, default: 'gpt-5.4-nano' },
});

MarketThemeAnalysisSchema.index({ date: 1 }, { unique: true });

export default mongoose.model<IMarketThemeAnalysis>('MarketThemeAnalysis', MarketThemeAnalysisSchema);
