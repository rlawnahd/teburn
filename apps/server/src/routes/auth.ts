import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { generateToken, AuthRequest, authMiddleware, requireAuth } from '../middleware/auth';

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

async function findOrCreateUser(provider: 'kakao' | 'google', profile: any) {
    const providerId = profile.id;
    const email = provider === 'kakao'
        ? profile._json?.kakao_account?.email || ''
        : profile.emails?.[0]?.value || '';
    const name = profile.displayName || profile._json?.properties?.nickname || '';
    const profileImage = provider === 'kakao'
        ? profile._json?.properties?.profile_image
        : profile.photos?.[0]?.value;

    let user = await User.findOne({ provider, providerId });
    if (!user) {
        user = await User.create({ name, email, profileImage, provider, providerId });
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

if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || `${CLIENT_URL}/api/auth/google/callback`,
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
            try {
                const user = await findOrCreateUser('google', profile);
                done(null, user);
            } catch (err) {
                done(err);
            }
        }
    ));

    router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

    router.get('/google/callback',
        passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}?auth=failed` }),
        (req: Request, res: Response) => {
            const user = req.user as any;
            const token = generateToken(user._id.toString(), user.provider);
            res.cookie('token', token, cookieOptions);
            res.redirect(CLIENT_URL);
        }
    );
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

router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('token', cookieOptions);
    res.json({ success: true });
});

export default router;
