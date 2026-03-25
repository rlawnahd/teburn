# Auth + Realtime WebSocket + Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소셜 로그인 인증, 실시간 WebSocket 시세/주도주 점수, 랜딩 페이지를 추가하여 로그인 유저에게 실시간 경험을 제공한다.

**Architecture:** 카카오/구글 OAuth -> JWT 쿠키 인증. 키움 실시간 WebSocket 체결 데이터를 서버 WebSocket으로 로그인 유저에게 중계. 주도주 점수는 실시간 항목(70점)과 배치 항목(30점)의 하이브리드 방식. 비로그인 유저는 기존 5분 폴링 유지. 랜딩 페이지로 로그인 유도.

**Tech Stack:** Express, Mongoose, ws, passport, passport-kakao, passport-google-oauth20, jsonwebtoken, cookie-parser / Next.js 16, React 19, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-25-auth-realtime-landing-design.md`

---

## File Structure

### Server — New Files
| File | Responsibility |
|------|---------------|
| `apps/server/src/models/User.ts` | User 모델 (소셜 로그인) |
| `apps/server/src/routes/auth.ts` | OAuth 라우트 (카카오/구글 콜백, me, logout) |
| `apps/server/src/middleware/auth.ts` | JWT 검증 미들웨어 |
| `apps/server/src/services/wsServer.ts` | 클라이언트 WebSocket 서버 (인증, 구독, broadcast) |
| `apps/server/src/services/realtimeHotness.ts` | 실시간 주도주 점수 하이브리드 계산 |

### Server — Modified Files
| File | Changes |
|------|---------|
| `apps/server/src/server.ts` | http.createServer 전환, auth 라우트 등록, wsServer 시작, cookie-parser 추가 |
| `apps/server/src/services/kiwoomWebSocket.ts` | onRealtimePrice 콜백에서 wsServer broadcast 연결 |
| `apps/server/package.json` | passport, passport-kakao, passport-google-oauth20, jsonwebtoken, cookie-parser 추가 |

### Client — New Files
| File | Responsibility |
|------|---------------|
| `apps/client/lib/auth/AuthProvider.tsx` | AuthContext + AuthProvider (로그인 상태 전역 관리) |
| `apps/client/hooks/useAuth.ts` | useAuth 훅 (AuthContext consumer) |
| `apps/client/hooks/useRealtimePrice.ts` | WebSocket 연결 + 실시간 가격/점수 수신 (hotnessUpdate 포함) |
| `apps/client/components/landing/LandingPage.tsx` | 랜딩 페이지 메인 컴포넌트 |
| `apps/client/components/landing/HeroSection.tsx` | 히어로 섹션 |
| `apps/client/components/landing/FeaturesSection.tsx` | 기능 소개 섹션 |
| `apps/client/components/landing/PreviewSection.tsx` | 대시보드 미리보기 섹션 |
| `apps/client/components/auth/LoginModal.tsx` | 소셜 로그인 모달 |
| `apps/client/lib/api/auth.ts` | 인증 API 클라이언트 |

### Client — Modified Files
| File | Changes |
|------|---------|
| `apps/client/app/layout.tsx` | AuthProvider 래핑 |
| `apps/client/app/page.tsx` | 로그인 분기 (랜딩 vs 대시보드) |
| `apps/client/components/layout/Header.tsx` | 로그인/프로필 버튼 추가 |
| `apps/client/components/leading/HotStocksView.tsx` | 실시간 가격/점수 WebSocket 연동 |
| `apps/client/app/stocks/[stockCode]/page.tsx` | 실시간 가격 WebSocket 연동 |

---

## Task 1: Server Dependencies + User Model

**Files:**
- Modify: `apps/server/package.json`
- Create: `apps/server/src/models/User.ts`

- [ ] **Step 1: Install server dependencies**

```bash
cd apps/server && pnpm add passport passport-kakao passport-google-oauth20 jsonwebtoken cookie-parser && pnpm add -D @types/passport @types/passport-google-oauth20 @types/jsonwebtoken @types/cookie-parser
```

Note: `passport-kakao`에는 `@types/passport-kakao`가 없을 수 있음. 없으면 스킵.

- [ ] **Step 2: Create User model**

Create `apps/server/src/models/User.ts`:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/package.json apps/server/pnpm-lock.yaml apps/server/src/models/User.ts
git commit -m "feat: User 모델 + 인증 관련 의존성 추가"
```

---

## Task 2: JWT Auth Middleware

**Files:**
- Create: `apps/server/src/middleware/auth.ts`

- [ ] **Step 1: Create auth middleware**

Create `apps/server/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'teburn-jwt-secret-change-in-prod';

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

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const token = req.cookies?.token;
    if (!token) return next();

    const payload = verifyToken(token);
    if (!payload) return next();

    const user = await User.findById(payload.userId).lean();
    if (user) {
        req.user = user;
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
    next();
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/middleware/auth.ts
git commit -m "feat: JWT 인증 미들웨어 (generateToken, verifyToken, authMiddleware)"
```

---

## Task 3: OAuth Routes (Kakao + Google)

**Files:**
- Create: `apps/server/src/routes/auth.ts`
- Modify: `apps/server/src/server.ts`

- [ ] **Step 1: Create auth routes**

Create `apps/server/src/routes/auth.ts`:

```typescript
import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { generateToken, AuthRequest, authMiddleware, requireAuth } from '../middleware/auth';

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN; // e.g., '.teburn.com' for prod

// Cookie options
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

// Find or create user from OAuth profile
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

// Kakao OAuth
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

    router.get('/kakao/callback',
        passport.authenticate('kakao', { session: false, failureRedirect: `${CLIENT_URL}?auth=failed` }),
        (req: Request, res: Response) => {
            const user = req.user as any;
            const token = generateToken(user._id.toString(), user.provider);
            res.cookie('token', token, cookieOptions);
            res.redirect(CLIENT_URL);
        }
    );
}

// Google OAuth
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

// Get current user
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

// Short-lived WebSocket auth token (60s expiry)
router.get('/ws-token', requireAuth, (req: AuthRequest, res: Response) => {
    const wsToken = jwt.sign(
        { userId: req.user._id.toString(), provider: req.user.provider },
        process.env.JWT_SECRET || 'teburn-jwt-secret-change-in-prod',
        { expiresIn: '60s' }
    );
    res.json({ success: true, token: wsToken });
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('token', cookieOptions);
    res.json({ success: true });
});

export default router;
```

- [ ] **Step 2: Register auth routes + cookie-parser in server.ts**

In `apps/server/src/server.ts`, add imports at the top:

```typescript
import cookieParser from 'cookie-parser';
import passport from 'passport';
import authRoutes from './routes/auth';
```

After `app.use(cors(...))`, add:

```typescript
app.use(cookieParser());
app.use(passport.initialize());
```

After the existing route registrations, add:

```typescript
app.use('/api/auth', authRoutes);
```

- [ ] **Step 3: Add env vars to .env**

Add to `apps/server/.env` (placeholder values):

```
JWT_SECRET=your-jwt-secret-here
CLIENT_URL=http://localhost:3000
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_CALLBACK_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/auth.ts apps/server/src/server.ts
git commit -m "feat: 카카오/구글 소셜 로그인 OAuth 라우트 + JWT 쿠키 인증"
```

---

## Task 4: Client Auth Provider + Login UI

**Files:**
- Create: `apps/client/lib/api/auth.ts`
- Create: `apps/client/lib/auth/AuthProvider.tsx`
- Create: `apps/client/hooks/useAuth.ts`
- Create: `apps/client/components/auth/LoginModal.tsx`
- Modify: `apps/client/app/layout.tsx`
- Modify: `apps/client/components/layout/Header.tsx`

- [ ] **Step 1: Create auth API client**

Create `apps/client/lib/api/auth.ts`:

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
    provider: 'kakao' | 'google';
}

export const fetchCurrentUser = async (): Promise<AuthUser | null> => {
    const { data } = await axios.get<{ success: boolean; data: AuthUser | null }>(
        `${API_URL}/auth/me`,
        { withCredentials: true }
    );
    return data.data;
};

export const logout = async (): Promise<void> => {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
};

export const getLoginUrl = (provider: 'kakao' | 'google'): string => {
    return `${API_URL}/auth/${provider}`;
};
```

- [ ] **Step 2: Create AuthProvider**

Create `apps/client/lib/auth/AuthProvider.tsx`:

```tsx
'use client';

import { createContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthUser, fetchCurrentUser, logout as logoutApi } from '@/lib/api/auth';

export interface AuthContextType {
    user: AuthUser | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoggedIn: false,
    isLoading: true,
    logout: async () => {},
});

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCurrentUser()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    const logout = useCallback(async () => {
        await logoutApi();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
```

- [ ] **Step 3: Create useAuth hook**

Create `apps/client/hooks/useAuth.ts`:

```tsx
'use client';

import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/lib/auth/AuthProvider';

export function useAuth(): AuthContextType {
    return useContext(AuthContext);
}
```

- [ ] **Step 4: Create LoginModal**

Create `apps/client/components/auth/LoginModal.tsx`:

```tsx
'use client';

import { X } from 'lucide-react';
import { getLoginUrl } from '@/lib/api/auth';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-6 w-[360px] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">로그인</h2>
                    <button onClick={onClose} className="p-1 hover:bg-[var(--bg-secondary)] rounded">
                        <X size={18} />
                    </button>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-6">
                    로그인하면 실시간 시세와 주도주 점수를 확인할 수 있어요.
                </p>

                <div className="space-y-3">
                    <a
                        href={getLoginUrl('kakao')}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium"
                        style={{ backgroundColor: '#FEE500', color: '#000000' }}
                    >
                        카카오로 시작하기
                    </a>

                    <a
                        href={getLoginUrl('google')}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                    >
                        Google로 시작하기
                    </a>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 5: Wrap layout with AuthProvider**

In `apps/client/app/layout.tsx`, add import:

```typescript
import AuthProvider from '@/lib/auth/AuthProvider';
```

Wrap `<ThemeProvider>` children with `<AuthProvider>`:

```tsx
<ThemeProvider>
    <AuthProvider>
        <QueryProvider>
            ...
        </QueryProvider>
    </AuthProvider>
</ThemeProvider>
```

- [ ] **Step 6: Add login/profile button to Header**

In `apps/client/components/layout/Header.tsx`:

Import:
```typescript
import { useAuth } from '@/hooks/useAuth';
import LoginModal from '@/components/auth/LoginModal';
import { useState } from 'react';
```

Inside the Header component, add state and auth:
```typescript
const { user, isLoggedIn, logout } = useAuth();
const [showLoginModal, setShowLoginModal] = useState(false);
```

In the header's right-side button area (before ThemeToggle), add:
```tsx
{isLoggedIn ? (
    <div className="flex items-center gap-2">
        {user?.profileImage && (
            <img src={user.profileImage} alt="" className="w-7 h-7 rounded-full" />
        )}
        <button onClick={logout} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            로그아웃
        </button>
    </div>
) : (
    <button
        onClick={() => setShowLoginModal(true)}
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--accent-color)] text-white hover:opacity-90"
    >
        로그인
    </button>
)}
```

At the end of the component (before closing fragment/div), add:
```tsx
<LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
```

- [ ] **Step 7: Commit**

```bash
git add apps/client/lib/api/auth.ts apps/client/lib/auth/AuthProvider.tsx apps/client/hooks/useAuth.ts apps/client/components/auth/LoginModal.tsx apps/client/app/layout.tsx apps/client/components/layout/Header.tsx
git commit -m "feat: 클라이언트 인증 — AuthProvider, 로그인 모달, 헤더 로그인 버튼"
```

---

## Task 5: WebSocket Server

**Files:**
- Create: `apps/server/src/services/wsServer.ts`
- Modify: `apps/server/src/server.ts`

- [ ] **Step 1: Create WebSocket server**

Create `apps/server/src/services/wsServer.ts`:

```typescript
import { Server as HTTPServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { verifyToken } from '../middleware/auth';
import { getMarketStatus } from '../utils/marketStatus';
import { subscribeStocks } from './kiwoomWebSocket';

interface AuthenticatedWS extends WebSocket {
    userId?: string;
    isAlive?: boolean;
    subscribedStocks?: Set<string>;
}

let wss: WebSocketServer | null = null;
const clients = new Set<AuthenticatedWS>();

// Global subscription: hot stocks TOP 30 (managed externally)
const globalSubscriptions = new Set<string>();
// Per-stock subscriber count (for individual subscriptions beyond global)
const stockRefCount = new Map<string, number>();

export function initWebSocketServer(server: HTTPServer): void {
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws: AuthenticatedWS) => {
        ws.isAlive = true;
        ws.subscribedStocks = new Set();

        // Auth timeout: 5 seconds to send token
        const authTimeout = setTimeout(() => {
            if (!ws.userId) {
                ws.close(4001, 'Auth timeout');
            }
        }, 5000);

        ws.on('message', (raw: WebSocket.Data) => {
            try {
                const msg = JSON.parse(raw.toString());

                // Auth message
                if (msg.type === 'auth') {
                    clearTimeout(authTimeout);
                    const payload = verifyToken(msg.token);
                    if (!payload) {
                        ws.close(4001, 'Invalid token');
                        return;
                    }
                    ws.userId = payload.userId;
                    clients.add(ws);
                    ws.send(JSON.stringify({ type: 'authenticated' }));
                    return;
                }

                // Require auth for all other messages
                if (!ws.userId) return;

                // Subscribe to individual stock
                if (msg.type === 'subscribe' && msg.stockCode) {
                    ws.subscribedStocks!.add(msg.stockCode);
                    addStockSubscription(msg.stockCode);
                }

                // Unsubscribe from individual stock
                if (msg.type === 'unsubscribe' && msg.stockCode) {
                    ws.subscribedStocks!.delete(msg.stockCode);
                    removeStockSubscription(msg.stockCode);
                }
            } catch {
                // ignore parse errors
            }
        });

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('close', () => {
            clearTimeout(authTimeout);
            clients.delete(ws);
            // Clean up individual subscriptions
            if (ws.subscribedStocks) {
                for (const code of ws.subscribedStocks) {
                    removeStockSubscription(code);
                }
            }
        });
    });

    // Ping/keepalive every 30 seconds
    setInterval(() => {
        for (const ws of clients) {
            if (!ws.isAlive) {
                ws.terminate();
                clients.delete(ws);
                continue;
            }
            ws.isAlive = false;
            ws.ping();
        }
    }, 30000);

    console.log('WebSocket server initialized');
}

/** Add individual stock subscription (reference counted) */
function addStockSubscription(stockCode: string): void {
    if (globalSubscriptions.has(stockCode)) return; // already globally subscribed
    const count = (stockRefCount.get(stockCode) || 0) + 1;
    stockRefCount.set(stockCode, count);
    if (count === 1) {
        syncKiwoomSubscriptions();
    }
}

/** Remove individual stock subscription */
function removeStockSubscription(stockCode: string): void {
    if (globalSubscriptions.has(stockCode)) return;
    const count = (stockRefCount.get(stockCode) || 0) - 1;
    if (count <= 0) {
        stockRefCount.delete(stockCode);
        syncKiwoomSubscriptions();
    } else {
        stockRefCount.set(stockCode, count);
    }
}

/** Update global subscriptions (called when hot stocks list refreshes) */
export function updateGlobalSubscriptions(stockCodes: string[]): void {
    globalSubscriptions.clear();
    for (const code of stockCodes) {
        globalSubscriptions.add(code);
    }
    syncKiwoomSubscriptions();
}

/** Sync all subscriptions to Kiwoom WebSocket.
 *  IMPORTANT: Uses addSubscriptions/removeSubscriptions instead of subscribeStocks
 *  to avoid clobbering trading bot's position subscriptions.
 *  kiwoomWebSocket.ts needs new exports: addSubscriptions(codes), removeSubscriptions(codes)
 *  that only add/remove without replacing the full set. */
function syncKiwoomSubscriptions(): void {
    const allCodes = new Set([...globalSubscriptions, ...stockRefCount.keys()]);
    subscribeStocks([...allCodes]);
    // TODO: Replace subscribeStocks with additive API when implementing.
    // The implementing agent must add addSubscriptions/removeSubscriptions to kiwoomWebSocket.ts
    // that merge with existing subscribedStocks instead of replacing them.
}

/** Broadcast price update to subscribers of a specific stock */
export function broadcastToSubscribers(stockCode: string, message: string): void {
    for (const ws of clients) {
        if (ws.readyState !== WebSocket.OPEN) continue;
        // Send if stock is globally subscribed or individually subscribed by this client
        if (globalSubscriptions.has(stockCode) || ws.subscribedStocks?.has(stockCode)) {
            ws.send(message);
        }
    }
}

/** Broadcast to all authenticated clients */
export function broadcastAll(message: string): void {
    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    }
}

/** Close all connections (called on market close) */
export function closeAllConnections(): void {
    const msg = JSON.stringify({ type: 'marketClosed' });
    for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
            ws.close(1000, 'Market closed');
        }
    }
    clients.clear();
    stockRefCount.clear();
    console.log('WebSocket: all connections closed (market closed)');
}

/** Get connected client count */
export function getConnectedClientCount(): number {
    return clients.size;
}
```

- [ ] **Step 2: Update server.ts to use http.createServer**

In `apps/server/src/server.ts`:

Add import at top:
```typescript
import http from 'http';
import { initWebSocketServer, closeAllConnections } from './services/wsServer';
```

Replace `app.listen(PORT, ...)` with:
```typescript
const server = http.createServer(app);
initWebSocketServer(server);
server.listen(PORT, () => {
    // ... existing callback content stays the same
});
```

In the market close schedule (the `setInterval(60000)` block that checks for 15:35-15:40), add after the existing tasks:
```typescript
// WebSocket 연결 정리
closeAllConnections();
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/services/wsServer.ts apps/server/src/server.ts
git commit -m "feat: WebSocket 서버 — JWT 인증, 구독 관리, ping/keepalive, 장마감 정리"
```

---

## Task 6: Kiwoom WS -> Client WS Bridge

**Files:**
- Modify: `apps/server/src/services/kiwoomWebSocket.ts`
- Modify: `apps/server/src/services/hotnessService.ts`

- [ ] **Step 1: Connect kiwoomWebSocket to wsServer broadcast**

In `apps/server/src/server.ts` (startup chain), after `warmupHotStocks()` and `startKiwoomWebSocket()`:

```typescript
import { onRealtimePrice } from './services/kiwoomWebSocket';
import { broadcastToSubscribers, updateGlobalSubscriptions } from './services/wsServer';

// Bridge: Kiwoom realtime price -> client WebSocket
onRealtimePrice((stockCode, price, changeRate, volume) => {
    broadcastToSubscribers(stockCode, JSON.stringify({
        type: 'price',
        stockCode,
        price,
        changeRate,
        volume,
        timestamp: Date.now(),
    }));
});
```

- [ ] **Step 2: Update global subscriptions when hot stocks refresh**

In `apps/server/src/services/hotnessService.ts`, in the `getTopHotStocks` function or the cache refresh logic, after `hotStocksCache` is updated:

```typescript
import { updateGlobalSubscriptions } from './wsServer';

// After hotStocksCache is set with new data:
updateGlobalSubscriptions(hotStocksCache.data.map(s => s.stockCode));
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/server.ts apps/server/src/services/hotnessService.ts
git commit -m "feat: 키움 실시간 체결 -> 클라이언트 WebSocket 브릿지 연결"
```

---

## Task 7: Realtime Hotness Score

**Files:**
- Create: `apps/server/src/services/realtimeHotness.ts`
- Modify: `apps/server/src/server.ts`

- [ ] **Step 1: Create realtimeHotness service**

Create `apps/server/src/services/realtimeHotness.ts`:

```typescript
import { HotnessScore, getGrade } from './hotnessService';
// IMPORTANT: The implementing agent must export getGrade, calcTradingValueScore,
// calcMomentumScore from hotnessService.ts so both services use identical scoring.
// Do NOT duplicate scoring functions — import them.

/**
 * In-memory realtime hotness scores for TOP 30 stocks.
 * Recalculates trading value and momentum scores on each tick.
 * Volume, news, and theme concentration scores are kept from the last batch calculation.
 */

interface RealtimeScore {
    stockCode: string;
    stockName: string;
    // Batch scores (updated every 5 min)
    newsScore: number;
    themeConcentrationScore: number;
    // Realtime accumulation
    cumulativeTradingValue: number; // today's cumulative trading value
    currentPrice: number;
    changeRate: number;
    cumulativeVolume: number;
    // Computed
    tradingValueScore: number;
    momentumScore: number;
    volumeScore: number;
    totalScore: number;
    grade: string;
}

const scores = new Map<string, RealtimeScore>();

// Scoring functions: import from hotnessService.ts (DO NOT duplicate)
// import { calcTradingValueScore, calcMomentumScore, getGrade } from './hotnessService';
// The implementing agent must export these functions from hotnessService.ts.

/** Initialize from batch-calculated hot stocks cache */
export function initRealtimeScores(batchScores: HotnessScore[]): void {
    scores.clear();
    for (const s of batchScores) {
        scores.set(s.stockCode, {
            stockCode: s.stockCode,
            stockName: s.stockName,
            newsScore: s.newsScore,
            themeConcentrationScore: s.themeConcentrationScore,
            cumulativeTradingValue: 0,
            currentPrice: 0,
            changeRate: s.changeRate || 0,
            cumulativeVolume: 0,
            tradingValueScore: s.tradingValueScore,
            momentumScore: s.momentumScore,
            volumeScore: s.volumeScore,
            totalScore: s.totalScore,
            grade: s.grade,
        });
    }
}

/** Update on realtime tick. Returns updated score if changed, null otherwise. */
export function realtimeHotnessUpdate(
    stockCode: string,
    price: number,
    changeRate: number,
    volume: number
): { totalScore: number; grade: string; tradingValueScore: number; momentumScore: number; volumeScore: number; newsScore: number; themeConcentrationScore: number } | null {
    const score = scores.get(stockCode);
    if (!score) return null;

    // Update realtime values
    score.currentPrice = price;
    score.changeRate = changeRate;
    score.cumulativeVolume += volume;
    score.cumulativeTradingValue += price * volume;

    // Recalculate realtime scores (use imported functions from hotnessService)
    const newTradingValueScore = calcTradingValueScore(score.cumulativeTradingValue);
    const newMomentumScore = calcMomentumScore(changeRate);

    const prevTotal = score.totalScore;

    score.tradingValueScore = newTradingValueScore;
    score.momentumScore = newMomentumScore;
    // volumeScore, newsScore, themeConcentrationScore: batch values (5min refresh)
    score.totalScore = score.tradingValueScore + score.momentumScore + score.volumeScore + score.newsScore + score.themeConcentrationScore;
    score.grade = getGrade(score.totalScore);

    // Only broadcast if score changed
    if (score.totalScore === prevTotal) return null;

    return {
        totalScore: score.totalScore,
        grade: score.grade,
        tradingValueScore: score.tradingValueScore,
        momentumScore: score.momentumScore,
        volumeScore: score.volumeScore,
        newsScore: score.newsScore,
        themeConcentrationScore: score.themeConcentrationScore,
    };
}

/** Merge batch scores (called every 5 min when hotnessService recalculates) */
export function mergeBatchScores(batchScores: HotnessScore[]): void {
    for (const s of batchScores) {
        const existing = scores.get(s.stockCode);
        if (existing) {
            // Update batch-only scores
            existing.newsScore = s.newsScore;
            existing.themeConcentrationScore = s.themeConcentrationScore;
            existing.volumeScore = s.volumeScore;
            // Recalc total
            existing.totalScore = existing.tradingValueScore + existing.momentumScore + existing.volumeScore + existing.newsScore + existing.themeConcentrationScore;
            existing.grade = getGrade(existing.totalScore);
        }
    }
    // Add new stocks, remove old ones
    const newCodes = new Set(batchScores.map(s => s.stockCode));
    for (const code of scores.keys()) {
        if (!newCodes.has(code)) scores.delete(code);
    }
    for (const s of batchScores) {
        if (!scores.has(s.stockCode)) {
            scores.set(s.stockCode, {
                stockCode: s.stockCode,
                stockName: s.stockName,
                newsScore: s.newsScore,
                themeConcentrationScore: s.themeConcentrationScore,
                cumulativeTradingValue: 0,
                currentPrice: 0,
                changeRate: 0,
                cumulativeVolume: 0,
                tradingValueScore: s.tradingValueScore,
                momentumScore: s.momentumScore,
                volumeScore: s.volumeScore,
                totalScore: s.totalScore,
                grade: s.grade,
            });
        }
    }
}
```

- [ ] **Step 2: Wire up realtime hotness in server.ts**

In the `onRealtimePrice` callback (from Task 6), add:

```typescript
import { realtimeHotnessUpdate } from './services/realtimeHotness';
import { broadcastAll } from './services/wsServer';

onRealtimePrice((stockCode, price, changeRate, volume) => {
    // Price broadcast (already from Task 6)
    broadcastToSubscribers(stockCode, JSON.stringify({
        type: 'price', stockCode, price, changeRate, volume, timestamp: Date.now(),
    }));

    // Hotness score update
    const updated = realtimeHotnessUpdate(stockCode, price, changeRate, volume);
    if (updated) {
        broadcastAll(JSON.stringify({
            type: 'hotness', stockCode, ...updated, timestamp: Date.now(),
        }));
    }
});
```

Initialize realtime scores after warmupHotStocks():
```typescript
import { initRealtimeScores } from './services/realtimeHotness';
// After warmupHotStocks():
const { getTopHotStocks } = require('./services/hotnessService');
const hotStocks = await getTopHotStocks(30);
initRealtimeScores(hotStocks);
```

- [ ] **Step 3: Merge batch scores on hotness cache refresh**

In `apps/server/src/services/hotnessService.ts`, after `hotStocksCache` is updated in the refresh logic:

```typescript
import { mergeBatchScores } from './realtimeHotness';

// After hotStocksCache.data is set:
mergeBatchScores(hotStocksCache.data);
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/services/realtimeHotness.ts apps/server/src/server.ts apps/server/src/services/hotnessService.ts
git commit -m "feat: 실시간 주도주 점수 하이브리드 계산 (거래대금/모멘텀 실시간 + 뉴스/테마 배치)"
```

---

## Task 8: Client WebSocket Hooks

**Files:**
- Create: `apps/client/hooks/useRealtimePrice.ts`

- [ ] **Step 1: Create useRealtimePrice hook**

Create `apps/client/hooks/useRealtimePrice.ts`:

```tsx
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

export interface PriceUpdate {
    stockCode: string;
    price: number;
    changeRate: number;
    volume: number;
    timestamp: number;
}

export interface HotnessUpdate {
    stockCode: string;
    totalScore: number;
    grade: string;
    tradingValueScore: number;
    momentumScore: number;
    volumeScore: number;
    newsScore: number;
    themeConcentrationScore: number;
    timestamp: number;
}

type PriceCallback = (update: PriceUpdate) => void;
type HotnessCallback = (update: HotnessUpdate) => void;
type MarketClosedCallback = () => void;

// Singleton WebSocket connection
let ws: WebSocket | null = null;
let wsToken: string | null = null;
const priceListeners = new Set<PriceCallback>();
const hotnessListeners = new Set<HotnessCallback>();
const marketClosedListeners = new Set<MarketClosedCallback>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let isConnecting = false;

function connect(token: string): void {
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) return;
    isConnecting = true;
    wsToken = token;

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        isConnecting = false;
        reconnectDelay = 1000;
        // Send auth token as first message
        ws!.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'price') {
                for (const cb of priceListeners) cb(msg);
            } else if (msg.type === 'hotness') {
                for (const cb of hotnessListeners) cb(msg);
            } else if (msg.type === 'marketClosed') {
                for (const cb of marketClosedListeners) cb();
                disconnect();
            }
        } catch {}
    };

    ws.onclose = () => {
        isConnecting = false;
        ws = null;
        // Reconnect with exponential backoff (unless market closed)
        if (wsToken) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                if (wsToken) connect(wsToken);
            }, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        }
    };

    ws.onerror = () => {
        isConnecting = false;
    };
}

function disconnect(): void {
    wsToken = null;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
}

function subscribe(stockCode: string): void {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'subscribe', stockCode }));
    }
}

function unsubscribe(stockCode: string): void {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe', stockCode }));
    }
}

/**
 * Hook: connect to WebSocket when logged in, receive price updates.
 * Automatically manages connection lifecycle.
 */
export function useRealtimeConnection(): void {
    const { isLoggedIn } = useAuth();

    useEffect(() => {
        if (!isLoggedIn) {
            disconnect();
            return;
        }
        // Fetch short-lived WS token from dedicated endpoint (not /me, to keep httpOnly secure)
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/ws-token`, {
            credentials: 'include',
        })
            .then(r => r.json())
            .then(data => {
                if (data.token) {
                    connect(data.token);
                }
            })
            .catch(() => {});

        return () => disconnect();
    }, [isLoggedIn]);
}

/** Hook: listen for price updates */
export function useOnPriceUpdate(callback: PriceCallback): void {
    const cbRef = useRef(callback);
    cbRef.current = callback;

    useEffect(() => {
        const handler: PriceCallback = (update) => cbRef.current(update);
        priceListeners.add(handler);
        return () => { priceListeners.delete(handler); };
    }, []);
}

/** Hook: listen for hotness updates */
export function useOnHotnessUpdate(callback: HotnessCallback): void {
    const cbRef = useRef(callback);
    cbRef.current = callback;

    useEffect(() => {
        const handler: HotnessCallback = (update) => cbRef.current(update);
        hotnessListeners.add(handler);
        return () => { hotnessListeners.delete(handler); };
    }, []);
}

/** Hook: subscribe to a specific stock (for detail page) */
export function useStockSubscription(stockCode: string): void {
    const { isLoggedIn } = useAuth();

    useEffect(() => {
        if (!isLoggedIn || !stockCode) return;
        subscribe(stockCode);
        return () => unsubscribe(stockCode);
    }, [isLoggedIn, stockCode]);
}
```

Note: WS token is fetched from the dedicated `/api/auth/ws-token` endpoint (added in Task 3).
This keeps the httpOnly JWT cookie secure while providing a short-lived (60s) token for WS auth.

- [ ] **Step 2: Remove unused useRealtimeHotness.ts from file table**

The `useRealtimeHotness.ts` file listed in the file structure table is not needed as a separate file.
All hotness update handling is done via `useOnHotnessUpdate` exported from `useRealtimePrice.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/client/hooks/useRealtimePrice.ts apps/server/src/routes/auth.ts
git commit -m "feat: 클라이언트 WebSocket 훅 — 실시간 가격/점수 수신, 종목 구독"
```

---

## Task 9: Integrate Realtime into Components

**Files:**
- Modify: `apps/client/components/leading/HotStocksView.tsx`
- Modify: `apps/client/app/stocks/[stockCode]/page.tsx`
- Modify: `apps/client/app/layout.tsx`

- [ ] **Step 1: Add useRealtimeConnection to layout**

In `apps/client/app/layout.tsx`, create a client component wrapper:

Create `apps/client/components/provider/RealtimeProvider.tsx`:

```tsx
'use client';

import { useRealtimeConnection } from '@/hooks/useRealtimePrice';

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
    useRealtimeConnection();
    return <>{children}</>;
}
```

In `apps/client/app/layout.tsx`, wrap inside AuthProvider:

```tsx
<AuthProvider>
    <QueryProvider>
        <RealtimeProvider>
            ...
        </RealtimeProvider>
    </QueryProvider>
</AuthProvider>
```

- [ ] **Step 2: Integrate into HotStocksView**

In `apps/client/components/leading/HotStocksView.tsx`:

Import:
```typescript
import { useOnPriceUpdate, useOnHotnessUpdate } from '@/hooks/useRealtimePrice';
import { useAuth } from '@/hooks/useAuth';
```

Inside the component, add WebSocket listeners that update the query cache:

```typescript
const { isLoggedIn } = useAuth();
const queryClient = useQueryClient();

// Realtime price updates
useOnPriceUpdate(useCallback((update) => {
    queryClient.setQueryData(['hotStocks'], (old: any) => {
        if (!old?.stocks) return old;
        return {
            ...old,
            stocks: old.stocks.map((s: any) =>
                s.stockCode === update.stockCode
                    ? { ...s, currentPrice: update.price, changeRate: update.changeRate }
                    : s
            ),
        };
    });
}, [queryClient]));

// Realtime hotness updates
useOnHotnessUpdate(useCallback((update) => {
    queryClient.setQueryData(['hotStocks'], (old: any) => {
        if (!old?.stocks) return old;
        return {
            ...old,
            stocks: old.stocks.map((s: any) =>
                s.stockCode === update.stockCode
                    ? { ...s, totalScore: update.totalScore, grade: update.grade }
                    : s
            ),
        };
    });
}, [queryClient]));

// Logged-in users get slower polling (WebSocket handles updates)
// Replace the existing refetchInterval with:
// isLoggedIn ? 5 * 60 * 1000 : (existing logic — read current value from component before editing)
```

- [ ] **Step 3: Integrate into StockDetailPage**

In `apps/client/app/stocks/[stockCode]/page.tsx`:

Import:
```typescript
import { useStockSubscription, useOnPriceUpdate } from '@/hooks/useRealtimePrice';
import { useAuth } from '@/hooks/useAuth';
```

Inside the component:
```typescript
const { isLoggedIn } = useAuth();

// Subscribe to this stock's realtime updates
useStockSubscription(stockCode);

// Update local state with realtime price
useOnPriceUpdate(useCallback((update) => {
    if (update.stockCode !== stockCode) return;
    queryClient.setQueryData(['stockDetail', stockCode], (old: any) => {
        if (!old) return old;
        return { ...old, currentPrice: update.price, changeRate: update.changeRate };
    });
}, [stockCode, queryClient]));

// Logged-in users: slower refetch (WebSocket handles it)
const refetchInterval = isLoggedIn ? 5 * 60 * 1000 : 60 * 1000;
```

- [ ] **Step 4: Integrate into TickerStrip**

In the TickerStrip component, add the same pattern as HotStocksView:

```typescript
import { useOnPriceUpdate } from '@/hooks/useRealtimePrice';
import { useAuth } from '@/hooks/useAuth';

const { isLoggedIn } = useAuth();

useOnPriceUpdate(useCallback((update) => {
    // Update ticker data in query cache with realtime price
    queryClient.setQueryData(['tickerData'], (old: any) => {
        if (!old) return old;
        return old.map((s: any) =>
            s.stockCode === update.stockCode
                ? { ...s, currentPrice: update.price, changeRate: update.changeRate }
                : s
        );
    });
}, [queryClient]));
```

- [ ] **Step 5: Commit**

```bash
git add apps/client/components/provider/RealtimeProvider.tsx apps/client/app/layout.tsx apps/client/components/leading/HotStocksView.tsx apps/client/app/stocks/\[stockCode\]/page.tsx apps/client/components/ticker/TickerStrip.tsx
git commit -m "feat: 주도주 리스트 + 종목 상세 + 티커스트립 실시간 WebSocket 연동"
```

---

## Task 10: Landing Page

**Files:**
- Create: `apps/client/components/landing/LandingPage.tsx`
- Create: `apps/client/components/landing/HeroSection.tsx`
- Create: `apps/client/components/landing/FeaturesSection.tsx`
- Create: `apps/client/components/landing/PreviewSection.tsx`
- Modify: `apps/client/app/page.tsx`

- [ ] **Step 1: Create HeroSection**

Create `apps/client/components/landing/HeroSection.tsx`:

```tsx
'use client';

import { useState } from 'react';
import LoginModal from '@/components/auth/LoginModal';

export default function HeroSection() {
    const [showLogin, setShowLogin] = useState(false);

    return (
        <section className="relative min-h-[80vh] flex items-center justify-center px-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)]" />

            <div className="relative z-10 text-center max-w-3xl mx-auto">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
                    오늘의{' '}
                    <span className="text-[var(--accent-color)]">주도주</span>를
                    <br />찾아라
                </h1>

                <p className="text-lg sm:text-xl text-[var(--text-secondary)] mb-10 max-w-xl mx-auto">
                    거래대금, 등락률, 거래량, 뉴스, 테마 집중도까지 --
                    <br />실시간 주도주 분석 서비스
                </p>

                <button
                    onClick={() => setShowLogin(true)}
                    className="px-8 py-4 text-lg font-semibold rounded-xl bg-[var(--accent-color)] text-white hover:opacity-90 transition-opacity"
                >
                    무료로 시작하기
                </button>

                <p className="mt-4 text-sm text-[var(--text-secondary)]">
                    카카오 / Google 계정으로 간편 로그인
                </p>
            </div>

            <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
        </section>
    );
}
```

- [ ] **Step 2: Create FeaturesSection**

Create `apps/client/components/landing/FeaturesSection.tsx`:

```tsx
import { TrendingUp, Zap, BarChart3, Bell } from 'lucide-react';

const features = [
    {
        icon: TrendingUp,
        title: '주도주 분석',
        description: '거래대금, 모멘텀, 거래량, 뉴스, 테마 집중도 5가지 지표로 주도주 점수를 실시간 계산합니다.',
    },
    {
        icon: Zap,
        title: '실시간 시세',
        description: '로그인 유저에게 실시간 체결 데이터를 WebSocket으로 즉시 전달합니다.',
    },
    {
        icon: BarChart3,
        title: '테마 분석',
        description: '200개+ 테마의 등락률, 주도주, 트렌드를 한눈에 파악합니다.',
    },
    {
        icon: Bell,
        title: '거래량 급증 감지',
        description: '평균 거래량 대비 급증하는 종목을 실시간으로 포착합니다.',
    },
];

export default function FeaturesSection() {
    return (
        <section className="py-20 px-4">
            <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
                    당신의 트레이딩에 엣지를 더하세요
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {features.map((f) => (
                        <div
                            key={f.title}
                            className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--accent-color)] transition-colors"
                        >
                            <f.icon size={28} className="text-[var(--accent-color)] mb-4" />
                            <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">{f.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 3: Create PreviewSection**

Create `apps/client/components/landing/PreviewSection.tsx`:

```tsx
'use client';

import { useState } from 'react';
import LoginModal from '@/components/auth/LoginModal';

export default function PreviewSection() {
    const [showLogin, setShowLogin] = useState(false);

    return (
        <section className="py-20 px-4 bg-[var(--bg-secondary)]">
            <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-2xl sm:text-3xl font-bold mb-6">
                    지금 바로 시작하세요
                </h2>
                <p className="text-[var(--text-secondary)] mb-10">
                    회원가입은 10초, 카카오 또는 Google 계정만 있으면 됩니다.
                </p>

                <button
                    onClick={() => setShowLogin(true)}
                    className="px-8 py-4 text-lg font-semibold rounded-xl bg-[var(--accent-color)] text-white hover:opacity-90 transition-opacity"
                >
                    지금 시작하기
                </button>
            </div>

            <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
        </section>
    );
}
```

- [ ] **Step 4: Create LandingPage**

Create `apps/client/components/landing/LandingPage.tsx`:

```tsx
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import PreviewSection from './PreviewSection';

export default function LandingPage() {
    return (
        <main>
            <HeroSection />
            <FeaturesSection />
            <PreviewSection />
        </main>
    );
}
```

- [ ] **Step 5: Update page.tsx with auth routing**

In `apps/client/app/page.tsx`:

Import:
```typescript
import { useAuth } from '@/hooks/useAuth';
import LandingPage from '@/components/landing/LandingPage';
```

In the `HomeContent` component (or equivalent), add at the top:

```typescript
const { isLoggedIn, isLoading } = useAuth();

if (isLoading) return <LoadingSkeleton />; // existing skeleton
if (!isLoggedIn) return <LandingPage />;

// ... existing dashboard content
```

Update the SSR section at the bottom of page.tsx: remove or update the "무료 . 회원가입 불필요" FeatureCard since login is now required.

- [ ] **Step 6: Update Header nav for landing**

In `apps/client/components/layout/Header.tsx`, update `NAV_LINKS` to conditionally show:

```typescript
const { isLoggedIn } = useAuth();

const navLinks = isLoggedIn
    ? [
        { href: '/', label: '홈' },
        { href: '/trading', label: '매매일지' },
        { href: '/guide', label: '가이드' },
    ]
    : [
        { href: '/', label: '홈' },
        { href: '/guide', label: '가이드' },
    ];
```

- [ ] **Step 7: Commit**

```bash
git add apps/client/components/landing/ apps/client/app/page.tsx apps/client/components/layout/Header.tsx
git commit -m "feat: 랜딩 페이지 — 히어로, 기능 소개, CTA (TradingView 스타일)"
```

---

## Task 11: Environment Variables + Final Wiring

**Files:**
- Modify: `apps/server/.env` (add missing vars)
- Modify: `apps/client/.env.local` (add WS URL)

- [ ] **Step 1: Server env vars**

Ensure `apps/server/.env` has:

```
JWT_SECRET=<generate a secure random string>
CLIENT_URL=https://teburn.com
COOKIE_DOMAIN=.teburn.com
KAKAO_CLIENT_ID=<from Kakao Developer Console>
KAKAO_CLIENT_SECRET=<from Kakao Developer Console>
KAKAO_CALLBACK_URL=https://api.teburn.com/api/auth/kakao/callback
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=https://api.teburn.com/api/auth/google/callback
```

- [ ] **Step 2: Client env vars**

Add to `apps/client/.env.local`:

```
NEXT_PUBLIC_WS_URL=wss://api.teburn.com
```

For local dev:
```
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

- [ ] **Step 3: Final commit**

```bash
git commit -m "chore: 환경변수 설정 가이드 정리"
```

---

## Summary

| Task | Description | Estimated Steps |
|------|-------------|-----------------|
| 1 | Server dependencies + User model | 3 |
| 2 | JWT auth middleware | 2 |
| 3 | OAuth routes (Kakao + Google) | 4 |
| 4 | Client auth provider + login UI | 7 |
| 5 | WebSocket server | 3 |
| 6 | Kiwoom WS -> Client WS bridge | 3 |
| 7 | Realtime hotness score | 4 |
| 8 | Client WebSocket hooks | 3 |
| 9 | Integrate realtime into components | 4 |
| 10 | Landing page | 7 |
| 11 | Env vars + final wiring | 3 |
| **Total** | | **43 steps** |

### Dependencies
- Task 1-3: Sequential (auth foundation)
- Task 4: Depends on Task 3 (needs auth endpoints)
- Task 5-7: Sequential (WebSocket foundation)
- Task 8: Depends on Task 5 (needs WS server)
- Task 9: Depends on Task 4 + Task 8 (needs auth + WS hooks)
- Task 10: Depends on Task 4 (needs auth for routing)
- Task 11: Final, depends on all
