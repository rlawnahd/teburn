// apps/server/src/models/News.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
    title: string;
    link: string;
    createdAt: Date;
}

const NewsSchema: Schema = new Schema({
    title: { type: String, required: true },
    link: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<INews>('News', NewsSchema);
