# 아이디/비밀번호 회원가입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 OAuth 로그인에 아이디/비밀번호 자체 회원가입을 추가한다.

**Architecture:** User 모델에 `provider: 'local'`과 `password` 필드를 추가하고, signup/login/check-username REST 엔드포인트를 구현한다. 클라이언트 LoginModal을 아이디/비밀번호 폼 + OAuth 버튼 구조로 확장한다. 기존 JWT httpOnly 쿠키 방식을 그대로 사용한다.

**Tech Stack:** Express, Mongoose, bcryptjs, express-rate-limit, Next.js (React 19), TailwindCSS 4

**Spec:** `docs/superpowers/specs/2026-03-27-local-auth-design.md`

---

## File Structure

**서버 (수정):**
- `apps/server/src/models/User.ts` — provider에 'local' 추가, password 필드 추가
- `apps/server/src/routes/auth.ts` — signup, login, check-username 라우트 추가 + rate limiter 적용

**클라이언트 (수정):**
- `apps/client/lib/api/auth.ts` — signup, login, checkUsername API 함수 + AuthUser 타입에 'local' 추가
- `apps/client/lib/auth/AuthProvider.tsx` — refreshUser 메서드 추가
- `apps/client/components/auth/LoginModal.tsx` — 로그인/회원가입 폼 UI

---

### Task 1: 의존성 설치

**Files:**
- Modify: `apps/server/package.json`

- [ ] **Step 1: bcryptjs와 express-rate-limit 설치**

```bash
cd apps/server && pnpm add bcryptjs express-rate-limit && pnpm add -D @types/bcryptjs
```

- [ ] **Step 2: 설치 확인**

```bash
cd apps/server && node -e "require('bcryptjs'); require('express-rate-limit'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add apps/server/package.json apps/server/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "chore: add bcryptjs and express-rate-limit dependencies"
```

---

### Task 2: User 모델 확장

**Files:**
- Modify: `apps/server/src/models/User.ts`

- [ ] **Step 1: IUser 인터페이스에 password 추가, provider에 'local' 추가**

`apps/server/src/models/User.ts` 전체를 아래로 교체:

```typescript
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
```

핵심 변경:
- `provider` enum에 `'local'` 추가
- `password` 필드: `select: false`로 기본 쿼리에서 제외

- [ ] **Step 2: tsc 빌드 확인**

```bash
cd apps/server && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/models/User.ts
git commit -m "feat: User 모델에 local provider와 password 필드 추가"
```

---

### Task 3: 서버 auth 라우트 — signup, login, check-username

**Files:**
- Modify: `apps/server/src/routes/auth.ts`

- [ ] **Step 1: import 추가 및 rate limiter, 유효성 검증 헬퍼 작성**

`apps/server/src/routes/auth.ts` 파일 상단, 기존 import 아래에 추가:

```typescript
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

const authRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

const USERNAME_REGEX = /^[a-z0-9]{4,20}$/;

function validateUsername(raw: string): { valid: boolean; username: string; error?: string } {
    const username = raw.toLowerCase();
    if (!USERNAME_REGEX.test(username)) {
        return { valid: false, username, error: '아이디는 영문/숫자 4~20자여야 합니다.' };
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
```

- [ ] **Step 2: signup 라우트 추가**

`router.post('/logout', ...)` 위에 추가:

```typescript
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
        });

        const token = generateToken(user._id.toString(), 'local');
        res.cookie('token', token, cookieOptions);
        res.status(201).json({ success: true, data: userToResponse(user) });
    } catch (err) {
        console.error('회원가입 에러:', err);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});
```

- [ ] **Step 3: login 라우트 추가**

signup 라우트 아래에 추가:

```typescript
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
    try {
        const { username: rawUsername, password } = req.body;
        if (!rawUsername || !password) {
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

        const token = generateToken(user._id.toString(), 'local');
        res.cookie('token', token, cookieOptions);
        res.json({ success: true, data: userToResponse(user) });
    } catch (err) {
        console.error('로그인 에러:', err);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
});
```

- [ ] **Step 4: check-username 라우트 추가**

login 라우트 아래에 추가:

```typescript
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
```

- [ ] **Step 5: tsc 빌드 확인**

```bash
cd apps/server && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/routes/auth.ts
git commit -m "feat: signup, login, check-username 라우트 추가"
```

---

### Task 4: 클라이언트 API 레이어 + AuthProvider

**Files:**
- Modify: `apps/client/lib/api/auth.ts`
- Modify: `apps/client/lib/auth/AuthProvider.tsx`

- [ ] **Step 1: auth.ts API 함수 및 타입 확장**

`apps/client/lib/api/auth.ts` 전체를 아래로 교체:

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
    provider: 'kakao' | 'google' | 'local';
}

export const fetchCurrentUser = async (): Promise<AuthUser | null> => {
    const { data } = await axios.get<{ success: boolean; data: AuthUser | null }>(
        `${API_URL}/auth/me`,
        { withCredentials: true }
    );
    return data.data;
};

export const signup = async (username: string, password: string): Promise<AuthUser> => {
    const { data } = await axios.post<{ success: boolean; data: AuthUser }>(
        `${API_URL}/auth/signup`,
        { username, password },
        { withCredentials: true }
    );
    return data.data;
};

export const login = async (username: string, password: string): Promise<AuthUser> => {
    const { data } = await axios.post<{ success: boolean; data: AuthUser }>(
        `${API_URL}/auth/login`,
        { username, password },
        { withCredentials: true }
    );
    return data.data;
};

export const checkUsername = async (username: string): Promise<boolean> => {
    const { data } = await axios.get<{ success: boolean; available: boolean }>(
        `${API_URL}/auth/check-username/${encodeURIComponent(username)}`,
        { withCredentials: true }
    );
    return data.available;
};

export const logout = async (): Promise<void> => {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
};

export const getLoginUrl = (provider: 'kakao' | 'google'): string => {
    return `${API_URL}/auth/${provider}`;
};
```

- [ ] **Step 2: AuthProvider에 refreshUser 추가**

`apps/client/lib/auth/AuthProvider.tsx` 전체를 아래로 교체:

```typescript
'use client';

import { createContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthUser, fetchCurrentUser, logout as logoutApi } from '@/lib/api/auth';

export interface AuthContextType {
    user: AuthUser | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoggedIn: false,
    isLoading: true,
    logout: async () => {},
    refreshUser: async () => {},
});

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const u = await fetchCurrentUser();
            setUser(u);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        refreshUser().finally(() => setIsLoading(false));
    }, [refreshUser]);

    const logout = useCallback(async () => {
        await logoutApi();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}
```

- [ ] **Step 3: useAuth 훅이 refreshUser를 노출하는지 확인**

`apps/client/hooks/useAuth.ts`를 읽어서 `useContext(AuthContext)`를 반환하는지 확인. 반환한다면 refreshUser가 자동으로 노출됨. 별도 수정 불필요할 가능성 높음.

- [ ] **Step 4: Commit**

```bash
git add apps/client/lib/api/auth.ts apps/client/lib/auth/AuthProvider.tsx
git commit -m "feat: 클라이언트 auth API 및 AuthProvider에 local auth 지원 추가"
```

---

### Task 5: LoginModal UI — 로그인/회원가입 폼

**Files:**
- Modify: `apps/client/components/auth/LoginModal.tsx`

- [ ] **Step 1: LoginModal 전체 교체**

`apps/client/components/auth/LoginModal.tsx` 전체를 아래로 교체:

```typescript
'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { getLoginUrl, signup, login, checkUsername } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Mode = 'login' | 'signup';

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { refreshUser } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    if (!isOpen) return null;

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setUsername('');
        setPassword('');
        setPasswordConfirm('');
        setError('');
        setUsernameStatus('idle');
        setShowPassword(false);
    };

    const switchMode = (newMode: Mode) => {
        setMode(newMode);
        resetForm();
    };

    const handleUsernameBlur = async () => {
        if (mode !== 'signup') return;
        const trimmed = username.trim().toLowerCase();
        if (!/^[a-z0-9]{4,20}$/.test(trimmed)) {
            setUsernameStatus('idle');
            return;
        }
        setUsernameStatus('checking');
        try {
            const available = await checkUsername(trimmed);
            setUsernameStatus(available ? 'available' : 'taken');
        } catch {
            setUsernameStatus('idle');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const trimmedUsername = username.trim().toLowerCase();

        if (!/^[a-z0-9]{4,20}$/.test(trimmedUsername)) {
            setError('아이디는 영문/숫자 4~20자여야 합니다.');
            return;
        }
        if (password.length < 8 || password.length > 72) {
            setError('비밀번호는 8~72자여야 합니다.');
            return;
        }
        if (mode === 'signup' && password !== passwordConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (mode === 'signup') {
                await signup(trimmedUsername, password);
            } else {
                await login(trimmedUsername, password);
            }
            await refreshUser();
            onClose();
            resetForm();
        } catch (err: any) {
            const msg = err?.response?.data?.message || '오류가 발생했습니다.';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
            <div
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-6 w-[360px] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">
                        {mode === 'login' ? '로그인' : '회원가입'}
                    </h2>
                    <button onClick={handleClose} className="p-1 hover:bg-[var(--bg-secondary)] rounded">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">아이디</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setUsernameStatus('idle');
                            }}
                            onBlur={handleUsernameBlur}
                            placeholder="영문/숫자 4~20자"
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
                            autoComplete="username"
                        />
                        {mode === 'signup' && usernameStatus === 'available' && (
                            <p className="text-xs mt-1 text-green-500">사용 가능한 아이디입니다.</p>
                        )}
                        {mode === 'signup' && usernameStatus === 'taken' && (
                            <p className="text-xs mt-1 text-red-500">이미 사용 중인 아이디입니다.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">비밀번호</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="8자 이상"
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] pr-10"
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {mode === 'signup' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">비밀번호 확인</label>
                            <input
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="비밀번호 재입력"
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-lg font-medium bg-[var(--accent-color)] text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                        {mode === 'login' ? '로그인' : '가입하기'}
                    </button>
                </form>

                <p className="text-sm text-center mt-4 text-[var(--text-secondary)]">
                    {mode === 'login' ? (
                        <>계정이 없으신가요?{' '}
                            <button onClick={() => switchMode('signup')} className="text-[var(--accent-color)] hover:underline">
                                회원가입
                            </button>
                        </>
                    ) : (
                        <>이미 계정이 있으신가요?{' '}
                            <button onClick={() => switchMode('login')} className="text-[var(--accent-color)] hover:underline">
                                로그인
                            </button>
                        </>
                    )}
                </p>

                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--border-color)]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-[var(--bg-primary)] text-[var(--text-secondary)]">또는</span>
                    </div>
                </div>

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

- [ ] **Step 2: 개발 서버에서 모달 확인**

```bash
cd apps/client && pnpm dev
```

브라우저에서 로그인 모달을 열어 로그인/회원가입 전환, 폼 입력, OAuth 버튼이 모두 보이는지 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/client/components/auth/LoginModal.tsx
git commit -m "feat: LoginModal에 아이디/비밀번호 로그인·회원가입 폼 추가"
```

---

### Task 6: 통합 테스트

- [ ] **Step 1: 서버 빌드 확인**

```bash
cd apps/server && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 2: 클라이언트 빌드 확인**

```bash
cd apps/client && pnpm build
```
Expected: 빌드 성공

- [ ] **Step 3: 수동 E2E 테스트**

1. 서버/클라이언트 로컬 실행
2. 회원가입 테스트: 아이디 `testuser1` / 비밀번호 `test1234` → 201 + 자동 로그인 확인
3. 로그아웃 후 로그인 테스트: 동일 아이디/비밀번호 → 200 + 로그인 확인
4. 중복 아이디 테스트: 같은 아이디로 재가입 → 409 에러
5. 잘못된 비밀번호 테스트: → 401 에러
6. 유효성 검증 테스트: 짧은 아이디, 짧은 비밀번호 → 400 에러
7. 카카오/Google 로그인이 여전히 정상 동작하는지 확인

- [ ] **Step 4: 최종 Commit**

```bash
git add -A
git commit -m "feat: 아이디/비밀번호 회원가입 기능 완성"
```
