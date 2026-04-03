'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHotStocks } from '@/lib/api/leading';
import GradeBadge from '@/components/ui/GradeBadge';
import Link from 'next/link';

// ============================================================
// 배경 버전 전환: 'A' = 글로우 오브 + 캔들, 'B' = 파티클 + 캔들
// ============================================================
const BG_VERSION: 'A' | 'B' = 'A';

// ---- 공통: 캔들 차트 배경 ----
function CandleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame: number;
        let t = 0;

        const resize = () => {
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;
            ctx.scale(2, 2);
        };
        resize();
        window.addEventListener('resize', resize);

        // Generate random candle data
        const candles: { x: number; o: number; h: number; l: number; c: number }[] = [];
        let price = 50;
        const w = canvas.offsetWidth;
        const candleCount = Math.floor(w / 8);
        for (let i = 0; i < candleCount; i++) {
            const change = (Math.random() - 0.48) * 4;
            const open = price;
            price += change;
            const close = price;
            const high = Math.max(open, close) + Math.random() * 2;
            const low = Math.min(open, close) - Math.random() * 2;
            candles.push({ x: i * 8 + 4, o: open, h: high, l: low, c: close });
        }

        const draw = () => {
            t += 0.003;
            const W = canvas.offsetWidth;
            const H = canvas.offsetHeight;
            ctx.clearRect(0, 0, W, H);

            const baseY = H * 0.5;
            const scale = H * 0.006;
            const shift = Math.sin(t) * 10;

            for (const c of candles) {
                const isUp = c.c >= c.o;
                ctx.strokeStyle = isUp ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)';
                ctx.fillStyle = isUp ? 'rgba(239,68,68,0.06)' : 'rgba(59,130,246,0.06)';
                ctx.lineWidth = 1;

                const x = c.x;
                const top = baseY - c.h * scale + shift;
                const bot = baseY - c.l * scale + shift;
                const oY = baseY - c.o * scale + shift;
                const cY = baseY - c.c * scale + shift;

                // Wick
                ctx.beginPath();
                ctx.moveTo(x, top);
                ctx.lineTo(x, bot);
                ctx.stroke();

                // Body
                const bodyTop = Math.min(oY, cY);
                const bodyH = Math.max(Math.abs(oY - cY), 1);
                ctx.fillRect(x - 2.5, bodyTop, 5, bodyH);
            }

            frame = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.6 }}
        />
    );
}

// ---- 버전 A: 글로우 오브 (Apple 스타일) ----
function GlowOrbs() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
                className="absolute w-[600px] h-[600px] rounded-full"
                style={{
                    top: '10%', left: '20%',
                    background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'orbFloat1 12s ease-in-out infinite',
                }}
            />
            <div
                className="absolute w-[500px] h-[500px] rounded-full"
                style={{
                    top: '40%', right: '10%',
                    background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'orbFloat2 15s ease-in-out infinite',
                }}
            />
            <div
                className="absolute w-[400px] h-[400px] rounded-full"
                style={{
                    bottom: '10%', left: '40%',
                    background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'orbFloat3 18s ease-in-out infinite',
                }}
            />
        </div>
    );
}

// ---- 버전 B: 파티클 네트워크 ----
function ParticleNetwork() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame: number;
        const resize = () => {
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;
            ctx.scale(2, 2);
        };
        resize();
        window.addEventListener('resize', resize);

        const W = () => canvas.offsetWidth;
        const H = () => canvas.offsetHeight;

        interface Particle {
            x: number; y: number; vx: number; vy: number; r: number;
        }

        const particles: Particle[] = [];
        const count = 40;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * W(),
                y: Math.random() * H(),
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.5 + 0.5,
            });
        }

        const draw = () => {
            const w = W();
            const h = H();
            ctx.clearRect(0, 0, w, h);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(59,130,246,0.3)';
                ctx.fill();
            }

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(59,130,246,${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            frame = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.5 }}
        />
    );
}

// ---- 카운트업 훅 ----
function useCountUp(target: number, duration: number = 1200): number {
    const [value, setValue] = useState(0);
    const startTime = useRef<number | null>(null);

    useEffect(() => {
        startTime.current = null;
        const animate = (timestamp: number) => {
            if (!startTime.current) startTime.current = timestamp;
            const progress = Math.min((timestamp - startTime.current) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [target, duration]);

    return value;
}

// ---- TOP 5 라이브 테이블 ----
function LiveStockTable() {
    const { data } = useQuery({
        queryKey: ['hotStocks-landing'],
        queryFn: () => fetchHotStocks(5),
        staleTime: 60 * 1000,
    });

    const stocks = data?.stocks || [];
    if (stocks.length === 0) return null;

    return (
        <div
            className="mt-10 w-full max-w-lg mx-auto"
            style={{ animation: 'heroFadeIn 0.8s ease-out 0.3s both' }}
        >
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-xl overflow-hidden shadow-lg">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">실시간 주도주 TOP 5</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)]">LIVE</span>
                </div>

                {stocks.map((stock, i) => {
                    const isUp = stock.changeRate > 0;
                    return (
                        <div
                            key={stock.stockCode}
                            className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border-color)] last:border-b-0"
                            style={{ animation: `heroFadeIn 0.5s ease-out ${0.4 + i * 0.08}s both` }}
                        >
                            <span className="w-5 text-center text-sm font-bold text-[var(--text-tertiary)]">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{stock.stockName}</span>
                                    <GradeBadge grade={stock.grade} />
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-[var(--text-primary)]">{stock.currentPrice.toLocaleString()}</div>
                                <div className={`text-xs font-medium ${isUp ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                    {isUp ? '+' : ''}{stock.changeRate.toFixed(2)}%
                                </div>
                            </div>
                            <div className="w-10 text-right">
                                <span className="text-sm font-bold text-[var(--text-primary)]">{stock.totalScore}</span>
                            </div>
                        </div>
                    );
                })}

                <div className="relative">
                    <div className="h-12 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Link href="/login" className="text-sm font-medium text-[var(--accent-blue)] hover:underline">
                            + 나머지 종목 보기 →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- 숫자 증명 바 ----
function StatsBar() {
    const themes = useCountUp(280, 1500);
    const stocks = useCountUp(700, 1500);

    return (
        <div
            className="flex items-center justify-center gap-6 sm:gap-10 mt-8"
            style={{ animation: 'heroFadeIn 0.8s ease-out 0.25s both' }}
        >
            {[
                { value: `${themes}+`, label: '테마 분석' },
                { value: `${stocks}+`, label: '종목 추적' },
                { value: '실시간', label: 'WebSocket' },
            ].map(item => (
                <div key={item.label} className="text-center">
                    <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">{item.value}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{item.label}</div>
                </div>
            ))}
        </div>
    );
}

// ---- 메인 히어로 ----
export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg-primary)] py-20">
            {/* Background layers */}
            <CandleBackground />
            {BG_VERSION === 'A' ? <GlowOrbs /> : <ParticleNetwork />}

            {/* Content */}
            <div className="relative z-10 w-full max-w-2xl mx-auto px-6">
                {/* Badge */}
                <div className="text-center" style={{ animation: 'heroFadeIn 0.6s ease-out both' }}>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]/70 backdrop-blur-sm text-xs text-[var(--text-secondary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        장 중 실시간 업데이트
                    </span>
                </div>

                {/* Headline */}
                <h1
                    className="text-center mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] leading-[1.1] tracking-tight"
                    style={{ animation: 'heroFadeIn 0.8s ease-out 0.1s both' }}
                >
                    돈이 몰리는 종목을
                    <br />
                    <span style={{ color: 'var(--accent-blue)' }}>실시간</span>으로
                </h1>

                {/* Sub */}
                <p
                    className="text-center mt-4 text-base sm:text-lg text-[var(--text-secondary)] max-w-md mx-auto"
                    style={{ animation: 'heroFadeIn 0.8s ease-out 0.15s both' }}
                >
                    거래대금 · 등락률 · 거래량 · 뉴스 · 테마 집중도
                    <br className="hidden sm:block" />
                    5가지 지표로 주도주를 찾아냅니다
                </p>

                {/* Stats */}
                <StatsBar />

                {/* Live stock table */}
                <LiveStockTable />

                {/* CTA */}
                <div className="text-center mt-8" style={{ animation: 'heroFadeIn 0.8s ease-out 0.5s both' }}>
                    <Link
                        href="/login"
                        className="inline-flex items-center h-12 px-8 text-base font-semibold text-white rounded-xl transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        style={{ background: 'var(--accent-blue)' }}
                    >
                        무료로 시작하기
                    </Link>
                    <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                        가입 10초 · 완전 무료
                    </p>
                </div>
            </div>
        </section>
    );
}
