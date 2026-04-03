import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'teburn-jwt-secret-change-in-prod';
const LAST_SEEN_UPDATE_INTERVAL = 15 * 60 * 1000;
const lastSeenUpdateCache = new Map<string, number>();

export interface AuthRequest extends Request {
    user?: any;
}

export function generateToken(userId: string, provider: string): string {
    return jwt.sign({ userId, provider }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; provider: string } | null {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: string; provider: string };
    } catch {
        return null;
    }
}

async function touchLastSeen(userId: string): Promise<void> {
    const now = Date.now();
    const lastUpdated = lastSeenUpdateCache.get(userId) || 0;
    if (now - lastUpdated < LAST_SEEN_UPDATE_INTERVAL) {
        return;
    }

    lastSeenUpdateCache.set(userId, now);
    try {
        await User.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date(now) } });
    } catch {
        lastSeenUpdateCache.delete(userId);
    }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const token = req.cookies?.token;
    if (!token) return next();

    const payload = verifyToken(token);
    if (!payload) return next();

    const user = await User.findById(payload.userId).lean();
    if (user) {
        req.user = user;
        void touchLastSeen(String(user._id));
    }
    next();
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ success: false, message: 'Invalid token' });

    const user = await User.findById(payload.userId).lean();
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    req.user = user;
    void touchLastSeen(String(user._id));
    next();
}
