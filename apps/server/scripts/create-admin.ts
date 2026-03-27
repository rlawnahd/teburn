import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/teburn';

async function createAdmin() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB 연결됨');

    const User = mongoose.model('User', new mongoose.Schema({
        name: String,
        email: String,
        profileImage: String,
        provider: String,
        providerId: String,
        password: String,
    }, { timestamps: true }));

    const existing = await User.findOne({ provider: 'local', providerId: 'admin' });
    if (existing) {
        console.log('admin 계정이 이미 존재합니다.');
        await mongoose.disconnect();
        return;
    }

    const hashedPassword = await bcrypt.hash('teburn2026!@', 10);
    await User.create({
        name: 'admin',
        email: '',
        provider: 'local',
        providerId: 'admin',
        password: hashedPassword,
    });

    console.log('admin 계정 생성 완료');
    await mongoose.disconnect();
}

createAdmin().catch(err => {
    console.error('에러:', err);
    process.exit(1);
});
