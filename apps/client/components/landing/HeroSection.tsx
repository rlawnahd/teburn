'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHotStocks } from '@/lib/api/leading';
import GradeBadge from '@/components/ui/GradeBadge';
import Link from 'next/link';

// ---- 배경: 우상향 차트 라인 드로잉 ----
function ChartLineBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame: number;
        let progress = 0;

        const resize = () => {
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;
            ctx.scale(2, 2);
        };
        resize();
        window.addEventListener('resize', resize);

        // 우상향 차트 포인트 생성
        const W = () => canvas.offsetWidth;
        const H = () => canvas.offsetHeight;
        const pointCount = 80;
        const points: { x: number; y: number }[] = [];

        const generatePoints = () => {
            points.length = 0;
            const w = W();
            const h = H();
            let y = h * 0.7;
            for (let i = 0; i < pointCount; i++) {
                const x = (i / (pointCount - 1)) * w;
                // 전반적으로 우상향 + 노이즈
                y += (Math.random() - 0.55) * (h * 0.03);
                y = Math.max(h * 0.15, Math.min(h * 0.85, y));
                points.push({ x, y });
            }
        };
        generatePoints();

        const draw = () => {
            progress = Math.min(progress + 0.008, 1);
            const w = W();
            const h = H();
            ctx.clearRect(0, 0, w, h);

            const visibleCount = Math.floor(progress * points.length);
            if (visibleCount < 2) {
                frame = requestAnimationFrame(draw);
                return;
            }

            // 라인 경로 그리기 함수
            const drawLine = (count: number) => {
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < count; i++) {
                    const prev = points[i - 1];
                    const curr = points[i];
                    const cpx = (prev.x + curr.x) / 2;
                    ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
                }
            };

            // 그라데이션 영역 (차트 아래 채우기)
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, 'rgba(239,68,68,0.12)');
            gradient.addColorStop(1, 'rgba(239,68,68,0)');

            ctx.beginPath();
            drawLine(visibleCount);
            const lastVisible = points[visibleCount - 1];
            ctx.lineTo(lastVisible.x, h);
            ctx.lineTo(points[0].x, h);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // 글로우 라인 (넓고 흐린 빛)
            ctx.beginPath();
            drawLine(visibleCount);
            ctx.strokeStyle = 'rgba(239,68,68,0.15)';
            ctx.lineWidth = 8;
            ctx.stroke();

            // 메인 라인 (밝고 선명)
            ctx.beginPath();
            drawLine(visibleCount);
            ctx.strokeStyle = 'rgba(239,68,68,0.6)';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // 코어 라인 (가장 밝음)
            ctx.beginPath();
            drawLine(visibleCount);
            ctx.strokeStyle = 'rgba(255,120,120,0.8)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 끝점 글로우
            if (progress < 1) {
                const tip = points[visibleCount - 1];
                const glow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 35);
                glow.addColorStop(0, 'rgba(239,68,68,0.7)');
                glow.addColorStop(0.5, 'rgba(239,68,68,0.2)');
                glow.addColorStop(1, 'rgba(239,68,68,0)');
                ctx.beginPath();
                ctx.arc(tip.x, tip.y, 35, 0, Math.PI * 2);
                ctx.fillStyle = glow;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,150,150,1)';
                ctx.fill();
            }

            // 두 번째 라인 (빨간, 더 아래쪽)
            if (progress > 0.2) {
                const p2 = Math.min((progress - 0.2) / 0.8, 1);
                const count2 = Math.floor(p2 * points.length);
                if (count2 >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, points[0].y + h * 0.15);
                    for (let i = 1; i < count2; i++) {
                        const prev = points[i - 1];
                        const curr = points[i];
                        const cpx = (prev.x + curr.x) / 2;
                        ctx.quadraticCurveTo(prev.x, prev.y + h * 0.15, cpx, (prev.y + curr.y) / 2 + h * 0.15);
                    }
                    ctx.strokeStyle = 'rgba(59,130,246,0.2)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }

            if (progress < 1) {
                frame = requestAnimationFrame(draw);
            }
        };

        draw();
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ---- 글로우 오브 ----
function GlowOrbs() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-[600px] h-[600px] rounded-full"
                style={{ top: '10%', left: '20%', background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'orbFloat1 12s ease-in-out infinite' }} />
            <div className="absolute w-[500px] h-[500px] rounded-full"
                style={{ top: '40%', right: '10%', background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'orbFloat2 15s ease-in-out infinite' }} />
        </div>
    );
}

// ---- 카운트업 ----
function useCountUp(target: number, duration: number = 1200): number {
    const [value, setValue] = useState(0);
    const startTime = useRef<number | null>(null);
    useEffect(() => {
        startTime.current = null;
        const animate = (timestamp: number) => {
            if (!startTime.current) startTime.current = timestamp;
            const progress = Math.min((timestamp - startTime.current) / duration, 1);
            setValue(Math.round((1 - Math.pow(1 - progress, 3)) * target));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [target, duration]);
    return value;
}

// ---- TOP 5 라이브 테이블 (S등급 글로우 + 4~5위 블러) ----
function LiveStockTable() {
    const { data } = useQuery({
        queryKey: ['hotStocks-landing'],
        queryFn: () => fetchHotStocks(5),
        staleTime: 60 * 1000,
    });

    const stocks = data?.stocks || [];
    if (stocks.length === 0) return null;

    return (
        <div className="mt-10 w-full max-w-lg mx-auto" style={{ animation: 'heroFadeIn 0.8s ease-out 0.3s both' }}>
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
                    const isBlurred = i >= 3;
                    const isSGrade = stock.grade === 'S';

                    return (
                        <div
                            key={stock.stockCode}
                            className={`flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border-color)] last:border-b-0 ${isBlurred ? 'select-none' : ''} ${
                                isSGrade && !isBlurred ? 'relative' : ''
                            }`}
                            style={{
                                animation: `heroFadeIn 0.5s ease-out ${0.4 + i * 0.08}s both`,
                                filter: isBlurred ? 'blur(5px)' : 'none',
                                opacity: isBlurred ? 0.6 : 1,
                                ...(isSGrade && !isBlurred ? {
                                    background: 'linear-gradient(90deg, rgba(239,68,68,0.05) 0%, transparent 100%)',
                                    boxShadow: 'inset 3px 0 0 var(--rise-color)',
                                } : {}),
                            }}
                        >
                            <span className={`w-5 text-center text-sm font-bold ${i < 3 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'}`}>{i + 1}</span>
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

// ---- 숫자 증명 ----
function StatsBar() {
    const themes = useCountUp(280, 1500);
    const stocks = useCountUp(700, 1500);
    return (
        <div className="flex items-center justify-center gap-6 sm:gap-10 mt-8" style={{ animation: 'heroFadeIn 0.8s ease-out 0.25s both' }}>
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

// ---- 메인 ----
export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20" style={{ background: '#0a0e1a' }}>
            <ChartLineBackground />
            <GlowOrbs />

            <div className="relative z-10 w-full max-w-2xl mx-auto px-6 text-white" style={{ ['--text-primary' as any]: '#f0f0f0', ['--text-secondary' as any]: '#9ca3af', ['--text-tertiary' as any]: '#6b7280', ['--border-color' as any]: '#1e293b', ['--bg-primary' as any]: '#0f1629', ['--bg-secondary' as any]: '#131b30' }}>
                <div className="text-center" style={{ animation: 'heroFadeIn 0.6s ease-out both' }}>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]/70 backdrop-blur-sm text-xs text-[var(--text-secondary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        장 중 실시간 업데이트
                    </span>
                </div>

                <h1 className="text-center mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] leading-[1.1] tracking-tight"
                    style={{ animation: 'heroFadeIn 0.8s ease-out 0.1s both' }}>
                    돈이 몰리는 종목을
                    <br />
                    <span style={{ color: '#ef4444' }}>실시간</span>으로
                </h1>

                <p className="text-center mt-4 text-base sm:text-lg text-[var(--text-secondary)] max-w-md mx-auto"
                    style={{ animation: 'heroFadeIn 0.8s ease-out 0.15s both' }}>
                    거래대금 · 등락률 · 거래량 · 뉴스 · 테마 집중도
                    <br className="hidden sm:block" />
                    5가지 지표로 주도주를 찾아냅니다
                </p>

                <StatsBar />
                <LiveStockTable />

                <div className="text-center mt-8" style={{ animation: 'heroFadeIn 0.8s ease-out 0.5s both' }}>
                    <Link href="/login"
                        className="inline-flex items-center h-12 px-8 text-base font-semibold text-white rounded-xl transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        style={{ background: '#ef4444', boxShadow: '0 4px 24px rgba(239,68,68,0.4)' }}>
                        무료로 시작하기
                    </Link>
                    <p className="mt-3 text-xs text-[var(--text-tertiary)]">가입 10초 · 완전 무료</p>
                </div>
            </div>
        </section>
    );
}
