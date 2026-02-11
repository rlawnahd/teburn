import mongoose, { Document, Schema } from 'mongoose';

export interface ITelegramSubscriber extends Document {
    chatId: number;
    username: string;
    isActive: boolean;
    alertEnabled: boolean;
    dailySummaryEnabled: boolean;
    lastAlertedStocks: string[];
    lastAlertResetDate: string;
    createdAt: Date;
    updatedAt: Date;
}

const TelegramSubscriberSchema: Schema = new Schema(
    {
        chatId: { type: Number, required: true, unique: true },
        username: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
        alertEnabled: { type: Boolean, default: true },
        dailySummaryEnabled: { type: Boolean, default: true },
        lastAlertedStocks: [{ type: String }],
        lastAlertResetDate: { type: String, default: '' },
    },
    {
        timestamps: true,
    }
);

// chatId는 unique: true로 이미 인덱스 생성됨
TelegramSubscriberSchema.index({ isActive: 1 });

export default mongoose.model<ITelegramSubscriber>('TelegramSubscriber', TelegramSubscriberSchema);
