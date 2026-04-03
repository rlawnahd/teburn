import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { generateToken, AuthRequest, authMiddleware, requireAuth } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

const router = Router();

const authRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

const USERNAME_REGEX = /^[a-z0-9]{4,20}$/;
const RESERVED_USERNAMES = ['admin', 'root', 'system', 'null', 'undefined', 'api', 'auth'];

function validateUsername(raw: string): { valid: boolean; username: string; error?: string } {
    const username = raw.toLowerCase();
    if (!USERNAME_REGEX.test(username)) {
        return { valid: false, username, error: '아이디는 영문/숫자 4~20자여야 합니다.' };
    }
    if (RESERVED_USERNAMES.includes(username)) {
        return { valid: false, username, error: '사용할 수 없는 아이디입니다.' };
    }
    return { valid: true, username };
}

function validatePassword(password: string): string | null {
    if (!password || password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
    if (password.length > 72) return '비밀번호는 72자 이하여야 합니다.';
    return null;
}

function userToResponse(user: any) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        provider: user.provider,
    };
}

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

async function findOrCreateUser(provider: 'kakao', profile: any) {
    const providerId = profile.id;
    const email = profile._json?.kakao_account?.email || '';
    const name = profile.displayName || profile._json?.properties?.nickname || '';
    const profileImage = profile._json?.properties?.profile_image;

    let user = await User.findOne({ provider, providerId });
    if (!user) {
        user = await User.create({ name, email, profileImage, provider, providerId, lastSeenAt: new Date() });
    } else {
        user.lastSeenAt = new Date();
        await user.save();
    }
    return user;
}

if (process.env.KAKAO_CLIENT_ID) {
    passport.use(new KakaoStrategy(
        {
            clientID: process.env.KAKAO_CLIENT_ID!,
            clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
            callbackURL: process.env.KAKAO_CALLBACK_URL || `${CLIENT_URL}/api/auth/kakao/callback`,
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
            try {
                const user = await findOrCreateUser('kakao', profile);
                done(null, user);
            } catch (err) {
                done(err);
            }
        }
    ));

    router.get('/kakao', passport.authenticate('kakao', { session: false }));

    router.get('/kakao/callback', (req: Request, res: Response, next: any) => {
        passport.authenticate('kakao', { session: false }, (err: any, user: any) => {
            if (err) {
                console.error('❌ 카카오 로그인 에러:', err);
                return res.redirect(`${CLIENT_URL}?auth=failed&reason=error`);
            }
            if (!user) {
                console.error('❌ 카카오 로그인: 유저 없음');
                return res.redirect(`${CLIENT_URL}?auth=failed&reason=no-user`);
            }
            try {
                const token = generateToken(user._id.toString(), user.provider);
                res.cookie('token', token, cookieOptions);
                console.log('✅ 카카오 로그인 성공:', user.name);
                res.redirect(CLIENT_URL);
            } catch (tokenErr) {
                console.error('❌ 토큰 생성 에러:', tokenErr);
                res.redirect(`${CLIENT_URL}?auth=failed&reason=token`);
            }
        })(req, res, next);
    });
}

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
    if (!req.user) {
        return res.json({ success: true, data: null });
    }
    res.json({
        success: true,
        data: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            profileImage: req.user.profileImage,
            provider: req.user.provider,
        },
    });
});

router.get('/ws-token', requireAuth, (req: AuthRequest, res: Response) => {
    const wsToken = jwt.sign(
        { userId: req.user._id.toString(), provider: req.user.provider },
        process.env.JWT_SECRET || 'teburn-jwt-secret-change-in-prod',
        { expiresIn: '60s' }
    );
    res.json({ success: true, token: wsToken });
});

router.post('/signup', authRateLimit, async (req: Request, res: Response) => {
    try {
        const { username: rawUsername, password } = req.body;
        if (!rawUsername || typeof rawUsername !== 'string') {
            return res.status(400).json({ success: false, message: '아이디를 입력해주세요.' });
        }
        const { valid, username, error } = validateUsername(rawUsername);
        if (!valid) {
            return res.status(400).json({ success: false, message: error });
        }
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ success: false, message: passwordError });
        }

        const existing = await User.findOne({ provider: 'local', providerId: username });
        if (existing) {
            return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: username,
            email: '',
            provider: 'local',
            providerId: username,
            password: hashedPassword,
            lastSeenAt: new Date(),
        });

        const token = generateToken(user._id.toString(), 'local');
        res.cookie('token', token, cookieOptions);
        res.status(201).json({ success: true, data: userToResponse(user) });
    } catch (err: any) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
        }
        console.error('회원가입 에러:', err);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});

router.post('/login', authRateLimit, async (req: Request, res: Response) => {
    try {
        const { username: rawUsername, password } = req.body;
        if (!rawUsername || !password || typeof rawUsername !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
        }
        const username = rawUsername.toLowerCase();

        const user = await User.findOne({ provider: 'local', providerId: username }).select('+password');
        if (!user || !user.password) {
            return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        user.lastSeenAt = new Date();
        await user.save();

        const token = generateToken(user._id.toString(), 'local');
        res.cookie('token', token, cookieOptions);
        res.json({ success: true, data: userToResponse(user) });
    } catch (err) {
        console.error('로그인 에러:', err);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});

router.get('/check-username/:username', authRateLimit, async (req: Request, res: Response) => {
    try {
        const { valid, username, error } = validateUsername(req.params.username);
        if (!valid) {
            return res.status(400).json({ success: false, message: error });
        }
        const existing = await User.findOne({ provider: 'local', providerId: username });
        res.json({ success: true, available: !existing });
    } catch (err) {
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});

router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('token', cookieOptions);
    res.json({ success: true });
});

export default router;
