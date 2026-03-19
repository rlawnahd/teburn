import mongoose, { Document, Schema } from 'mongoose';

export type TradeType = 'buy' | 'sell';
export type TradeStatus = 'pending' | 'filled' | 'failed' | 'cancelled';
export type SellReason = 'take_profit' | 'stop_loss' | 'time_exit' | 'grade_drop' | 'daily_limit' | 'manual';

export interface ITrade extends Document {
    stockCode: string;
    stockName: string;
    type: TradeType;
    status: TradeStatus;
    orderPrice: number;
    filledPrice: number;
    quantity: number;
    amount: number;
    fee: number;
    tax: number;
    signal: {
        hotnessGrade: string;
        hotnessScore: number;
        volumeSurgeRate: number;
        changeRate: number;
        newsCount: number;
    } | null;
    sellReason: SellReason | null;
    buyTradeId: mongoose.Types.ObjectId | null;
    pnl: number | null;
    pnlRate: number | null;
    kiwoomOrderId: string | null;
    orderedAt: Date;
    filledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const TradeSchema: Schema = new Schema({
    stockCode: { type: String, required: true, index: true },
    stockName: { type: String, required: true },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    status: { type: String, enum: ['pending', 'filled', 'failed', 'cancelled'], default: 'pending' },
    orderPrice: { type: Number, required: true },
    filledPrice: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    amount: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    signal: { type: Object, default: null },
    sellReason: { type: String, enum: ['take_profit', 'stop_loss', 'time_exit', 'grade_drop', 'daily_limit', 'manual'], default: null },
    buyTradeId: { type: Schema.Types.ObjectId, ref: 'Trade', default: null },
    pnl: { type: Number, default: null },
    pnlRate: { type: Number, default: null },
    kiwoomOrderId: { type: String, default: null },
    orderedAt: { type: Date, required: true },
    filledAt: { type: Date, default: null },
}, { timestamps: true });

TradeSchema.index({ orderedAt: -1 });
TradeSchema.index({ type: 1, status: 1 });

export default mongoose.model<ITrade>('Trade', TradeSchema);
