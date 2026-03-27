'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signup as signupApi, checkUsername, getLoginUrl } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    const handleUsernameBlur = async () => {
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
        if (password !== passwordConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setIsSubmitting(true);
        try {
            await signupApi(trimmedUsername, password);
            await refreshUser();
            router.push('/');
        } catch (err: any) {
            const msg = err?.response?.data?.message || '오류가 발생했습니다.';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <h1 className="text-2xl font-bold tracking-wider text-[var(--text-primary)]">TEBURN</h1>
                    </Link>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">무료로 가입하고 주도주를 실시간으로 확인하세요</p>
                </div>

                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-6">
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
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                                autoComplete="username"
                                autoFocus
                            />
                            {usernameStatus === 'available' && (
                                <p className="text-xs mt-1 text-green-500">사용 가능한 아이디입니다.</p>
                            )}
                            {usernameStatus === 'taken' && (
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
                                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] pr-10"
                                    autoComplete="new-password"
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

                        <div>
                            <label className="block text-sm font-medium mb-1">비밀번호 확인</label>
                            <input
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="비밀번호 재입력"
                                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
                                autoComplete="new-password"
                            />
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 rounded-lg font-medium bg-[var(--accent-blue)] text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            가입하기
                        </button>
                    </form>

                    <p className="text-sm text-center mt-4 text-[var(--text-secondary)]">
                        이미 계정이 있으신가요?{' '}
                        <Link href="/login" className="text-[var(--accent-blue)] hover:underline">
                            로그인
                        </Link>
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
        </div>
    );
}
