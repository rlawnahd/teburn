'use client';

import { useState, useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [authenticated, setAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem('admin-auth') === 'true';
        if (stored) setAuthenticated(true); // eslint-disable-line react-hooks/set-state-in-effect
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const correctPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '1234';
        if (pin === correctPin) {
            sessionStorage.setItem('admin-auth', 'true');
            setAuthenticated(true);
        } else {
            setError(true);
            setPin('');
        }
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
                <form onSubmit={handleSubmit} className="w-full max-w-xs mx-auto px-4">
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-8">
                        <h1 className="text-lg font-bold text-[var(--text-primary)] text-center mb-6">
                            관리자 인증
                        </h1>
                        <input
                            type="password"
                            inputMode="numeric"
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value);
                                setError(false);
                            }}
                            placeholder="PIN 입력"
                            autoFocus
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-center text-lg tracking-[0.3em] placeholder:text-[var(--text-tertiary)] placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                        />
                        {error && (
                            <p className="text-sm text-red-500 text-center mt-3">
                                PIN이 올바르지 않습니다
                            </p>
                        )}
                        <button
                            type="submit"
                            className="w-full mt-4 px-4 py-3 rounded-lg bg-[var(--accent-blue)] text-white text-sm font-medium hover:bg-[var(--accent-blue)]/90 transition-colors"
                        >
                            확인
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return <>{children}</>;
}
