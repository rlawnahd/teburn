import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    profileImage?: string;
    provider: 'kakao' | 'google';
    providerId: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        profileImage: { type: String },
        provider: { type: String, required: true, enum: ['kakao', 'google'] },
        providerId: { type: String, required: true },
    },
    { timestamps: true }
);

userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export default mongoose.model<IUser>('User', userSchema);
