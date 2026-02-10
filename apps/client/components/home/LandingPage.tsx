'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

interface LandingPageProps {
    onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
    const [phase, setPhase] = useState<'idle' | 'exit'>('idle');
    const initRef = useRef(false);

    // UnicornStudio 초기화
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const w = window as any;
        w.UnicornStudio = { isInitialized: false };
        const script = document.createElement('script');
        script.src =
            'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js';
        script.onload = () => {
            w.UnicornStudio.init();
        };
        document.head.appendChild(script);
    }, []);

    // 파티클 생성
    useEffect(() => {
        const container = document.getElementById('landing-particles');
        if (!container || container.childElementCount > 0) return;

        for (let i = 0; i < 12; i++) {
            const p = document.createElement('div');
            p.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255,120,50,0.4);
                left: ${Math.random() * 100}%;
                width: ${2 + Math.random() * 2}px;
                height: ${2 + Math.random() * 2}px;
                animation: landing-float ${6 + Math.random() * 8}s linear ${Math.random() * 6}s infinite;
            `;
            container.appendChild(p);
        }
    }, []);

    const handleEnter = useCallback(() => {
        if (phase !== 'idle') return;
        setPhase('exit');
        setTimeout(() => onEnter(), 800);
    }, [phase, onEnter]);

    return (
        <div
            className={`fixed inset-0 z-[9999]`}
            style={{
                background: '#050505',
                opacity: phase === 'exit' ? 0 : 1,
                transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* Fire background */}
            <div className="absolute inset-0 z-[1]">
                <div
                    data-us-project="8NjDnsOHLj9ZsRA9pBz5"
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            {/* Dark overlay for readability */}
            <div
                className="absolute inset-0 z-[2]"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
                }}
            />

            {/* Floating ember particles */}
            <div
                id="landing-particles"
                className="absolute inset-0 z-[3] pointer-events-none overflow-hidden"
            />

            {/* Content */}
            <div
                className="relative z-[10] h-full flex flex-col items-center justify-center text-center gap-5"
                style={{
                    transform: phase === 'exit' ? 'scale(1.05) translateY(-20px)' : 'scale(1) translateY(0)',
                    opacity: phase === 'exit' ? 0 : 1,
                    transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease',
                }}
            >
                {/* Logo */}
                <div
                    className="mb-1.5"
                    style={{
                        filter: 'drop-shadow(0 0 40px rgba(239,68,68,0.3))',
                    }}
                >
                    <Image
                        src="/teburn-text-logo.svg"
                        alt="TEBURN"
                        width={280}
                        height={280}
                        priority
                    />
                </div>

                {/* Headline */}
                <h2 className="text-[22px] font-semibold text-white/85 leading-relaxed">
                    시장이 불붙기 전에, 먼저 발견하세요
                </h2>

                {/* Subtext */}
                <p className="text-sm text-white/45 max-w-[420px] leading-[1.7]">
                    테마주 급등의 신호를 포착하고, 주도주를 실시간으로 추적합니다.
                    <br />
                    타오르는 시장, 가장 빠른 인사이트.
                </p>

                {/* Tags */}
                <div className="flex gap-2 flex-wrap justify-center">
                    {['핫함 점수 분석', '테마 급등 감지', '선물지수 모니터링'].map((tag) => (
                        <span
                            key={tag}
                            className="px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                color: 'rgba(255,200,180,0.7)',
                                border: '1px solid rgba(255,100,50,0.15)',
                            }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* CTA Button */}
                <button
                    onClick={handleEnter}
                    className="relative mt-2.5 px-12 py-4 rounded-[14px] text-base font-bold text-white border-none cursor-pointer overflow-hidden hover:-translate-y-[3px]"
                    style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                        boxShadow: '0 4px 35px rgba(239,68,68,0.4), 0 0 80px rgba(239,68,68,0.15)',
                        letterSpacing: '0.5px',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                            '0 8px 45px rgba(239,68,68,0.55), 0 0 100px rgba(239,68,68,0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                            '0 4px 35px rgba(239,68,68,0.4), 0 0 80px rgba(239,68,68,0.15)';
                    }}
                >
                    <span className="relative z-10">불꽃 속으로 &rarr;</span>
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                            animation: 'landing-shimmer 3s infinite',
                        }}
                    />
                </button>
            </div>

            {/* Bottom hint */}
            <div
                className="absolute bottom-9 left-1/2 -translate-x-1/2 z-[10] text-[11px] text-white/20 flex flex-col items-center gap-1.5"
                style={{
                    opacity: phase === 'exit' ? 0 : 1,
                    transition: 'opacity 0.5s ease',
                }}
            >
                <span>클릭하여 시작하기</span>
                <div
                    className="w-3.5 h-3.5"
                    style={{
                        borderRight: '1.5px solid rgba(255,255,255,0.15)',
                        borderBottom: '1.5px solid rgba(255,255,255,0.15)',
                        transform: 'rotate(45deg)',
                        animation: 'landing-bounce 2s infinite',
                    }}
                />
            </div>
        </div>
    );
}
