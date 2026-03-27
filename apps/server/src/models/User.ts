import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    profileImage?: string;
    provider: 'kakao' | 'google' | 'local';
    providerId: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, default: '' },
        profileImage: { type: String },
        provider: { type: String, required: true, enum: ['kakao', 'google', 'local'] },
        providerId: { type: String, required: true },
        password: { type: String, select: false },
    },
    { timestamps: true }
);

userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export default mongoose.model<IUser>('User', userSchema);
