'use client';

import { useState, useEffect, useRef } from 'react';
import LoginModal from '@/components/auth/LoginModal';

function AnimatedNumbers() {
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = canvasRef.current;
        if (!container) return;

        const stocks = [
            { name: 'KOSPI', base: 2650 },
            { name: 'KOSDAQ', base: 870 },
            { name: '삼성전자', base: 72400 },
            { name: 'SK하이닉스', base: 185000 },
            { name: 'LG에너지솔루션', base: 380000 },
            { name: '현대차', base: 245000 },
        ];

        const els = container.querySelectorAll<HTMLSpanElement>('[data-ticker]');
        let frame: number;
        let t = 0;

        const tick = () => {
            t += 1;
            els.forEach((el, i) => {
                const stock = stocks[i % stocks.length];
                const noise = Math.sin(t * 0.02 + i * 1.7) * stock.base * 0.003;
                const val = stock.base + noise;
                const change = (noise / stock.base) * 100;
                const isUp = change >= 0;

                el.textContent = `${stock.name} ${val.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} ${isUp ? '+' : ''}${change.toFixed(2)}%`;
                el.style.color = isUp
                    ? 'var(--rise-color)'
                    : 'var(--fall-color)';
            });
            frame = requestAnimationFrame(tick);
        };

        tick();
        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <div
            ref={canvasRef}
            className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-[0.07]"
            aria-hidden="true"
        >
            {Array.from({ length: 6 }).map((_, i) => (
                <span
                    key={i}
                    data-ticker
                    className="absolute text-[13px] font-mono whitespace-nowrap"
                    style={{
                        top: `${12 + i * 14}%`,
                        left: `${5 + (i % 3) * 32}%`,
                        animationDelay: `${i * 0.3}s`,
                    }}
                />
            ))}
        </div>
    );
}

export default function HeroSection() {
    const [showLogin, setShowLogin] = useState(false);

    return (
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-[var(--bg-secondary)]">
            {/* Grid background */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage:
                        'linear-gradient(var(--text-tertiary) 1px, transparent 1px), linear-gradient(90deg, var(--text-tertiary) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />

            {/* Glow accent */}
            <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)',
                    opacity: 0.06,
                    filter: 'blur(80px)',
                }}
            />

            <AnimatedNumbers />

            {/* Content */}
            <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
                <h1
                    className="text-[32px] sm:text-[42px] lg:text-[52px] font-extrabold text-[var(--text-primary)] leading-tight tracking-tight"
                    style={{
                        animation: 'heroFadeIn 0.8s ease-out both',
                    }}
                >
                    오늘의 주도주를
                    <br />
                    찾아라
                </h1>

                <p
                    className="mt-4 text-[14px] sm:text-[16px] text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto"
                    style={{
                        animation: 'heroFadeIn 0.8s ease-out 0.15s both',
                    }}
                >
                    거래대금, 등락률, 거래량, 뉴스, 테마 집중도까지
                    <br className="hidden sm:block" />
                    실시간 주도주 분석 서비스
                </p>

                <div
                    style={{
                        animation: 'heroFadeIn 0.8s ease-out 0.3s both',
                    }}
                >
                    <button
                        onClick={() => setShowLogin(true)}
                        className="mt-8 inline-flex items-center h-12 px-8 text-[15px] font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            background: 'var(--brand-gradient)',
                            boxShadow: '0 4px 24px rgba(239, 68, 68, 0.25)',
                        }}
                    >
                        무료로 시작하기
                    </button>

                    <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">
                        카카오 / Google 계정으로 간편 로그인
                    </p>
                </div>
            </div>

            <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
        </section>
    );
}
