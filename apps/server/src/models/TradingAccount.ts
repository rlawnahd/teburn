import mongoose, { Document, Schema } from 'mongoose';

export interface IPosition {
    stockCode: string;
    stockName: string;
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
    pnl: number;
    pnlRate: number;
    buyTradeId: mongoose.Types.ObjectId;
    boughtAt: Date;
}

export interface ITradingAccount extends Document {
    dateKey: string;
    initialCapital: number;
    cash: number;
    positions: IPosition[];
    totalValue: number;
    totalPnl: number;
    totalPnlRate: number;
    dailyPnl: number;
    todayTradeCount: number;
    winCount: number;
    loseCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const PositionSchema: Schema = new Schema({
    stockCode: { type: String, required: true },
    stockName: { type: String, required: true },
    quantity: { type: Number, required: true },
    avgBuyPrice: { type: Number, required: true },
    currentPrice: { type: Number, default: 0 },
    pnl: { type: Number, default: 0 },
    pnlRate: { type: Number, default: 0 },
    buyTradeId: { type: Schema.Types.ObjectId, ref: 'Trade' },
    boughtAt: { type: Date, required: true },
}, { _id: false });

const TradingAccountSchema: Schema = new Schema({
    dateKey: { type: String, required: true },
    initialCapital: { type: Number, required: true, default: 1000000 },
    cash: { type: Number, required: true },
    positions: [PositionSchema],
    totalValue: { type: Number, required: true },
    totalPnl: { type: Number, default: 0 },
    totalPnlRate: { type: Number, default: 0 },
    dailyPnl: { type: Number, default: 0 },
    todayTradeCount: { type: Number, default: 0 },
    winCount: { type: Number, default: 0 },
    loseCount: { type: Number, default: 0 },
}, { timestamps: true });

TradingAccountSchema.index({ dateKey: 1 }, { unique: true });

export default mongoose.model<ITradingAccount>('TradingAccount', TradingAccountSchema);
