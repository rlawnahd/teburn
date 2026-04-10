'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHotStocks } from '@/lib/api/leading';
import GradeBadge from '@/components/ui/GradeBadge';
import GalaxyBackground from '@/components/ui/GalaxyBackground';
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

        const points2: { x: number; y: number }[] = [];

        const generatePoints = () => {
            points.length = 0;
            points2.length = 0;
            const w = W();
            const h = H();

            // 빨간 라인 (주도주): 전반 파란선과 비슷 → 후반 급등
            let y1 = h * 0.53;
            for (let i = 0; i < pointCount; i++) {
                const x = (i / (pointCount - 1)) * w;
                const ratio = i / pointCount;

                if (ratio < 0.6) {
                    // 전반 60%: 파란선과 비슷하게 등락 (교차)
                    const wave = Math.sin(ratio * Math.PI * 5) * (h * 0.03);
                    y1 += (Math.random() - 0.5) * (h * 0.015) + wave * 0.3;
                } else {
                    // 후반 40%: 급격히 치솟음
                    const rocketPhase = (ratio - 0.6) / 0.4; // 0→1
                    y1 -= (h * 0.01) * (1 + rocketPhase * 5);
                    y1 += (Math.random() - 0.5) * (h * 0.006);
                }
                y1 = Math.max(h * 0.06, Math.min(h * 0.85, y1));
                points.push({ x, y: y1 });
            }

            // 파란 라인 (시장 평균): 완만한 횡보, 약간의 등락만
            let y2 = h * 0.55;
            for (let i = 0; i < pointCount; i++) {
                const x = (i / (pointCount - 1)) * w;
                y2 += (Math.random() - 0.5) * (h * 0.012);
                // 후반에도 횡보 유지 (빨간 선만 치솟음)
                y2 = Math.max(h * 0.4, Math.min(h * 0.65, y2));
                points2.push({ x, y: y2 });
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

            // fireIntensity (파티클용)
            const fireIntensity = Math.max(0, (progress - 0.6) / 0.4);

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

            // (글로우/파티클 제거됨)

            // 두 번째 라인 (파란, 교차)
            if (progress > 0.15) {
                const p2 = Math.min((progress - 0.15) / 0.85, 1);
                const count2 = Math.floor(p2 * points2.length);
                if (count2 >= 2) {
                    const drawLine2 = (count: number) => {
                        ctx.moveTo(points2[0].x, points2[0].y);
                        for (let i = 1; i < count; i++) {
                            const prev = points2[i - 1];
                            const curr = points2[i];
                            const cpx = (prev.x + curr.x) / 2;
                            ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
                        }
                    };

                    // 글로우
                    ctx.beginPath();
                    drawLine2(count2);
                    ctx.strokeStyle = 'rgba(59,130,246,0.1)';
                    ctx.lineWidth = 6;
                    ctx.stroke();

                    // 메인
                    ctx.beginPath();
                    drawLine2(count2);
                    ctx.strokeStyle = 'rgba(59,130,246,0.35)';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // 코어
                    ctx.beginPath();
                    drawLine2(count2);
                    ctx.strokeStyle = 'rgba(100,160,255,0.5)';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }

            // 라벨 표시 (progress 0.8 이후 페이드인)
            const labelAlpha = Math.max(0, (progress - 0.8) / 0.2);
            if (labelAlpha > 0) {
                ctx.font = 'bold 12px "Pretendard Variable", sans-serif';

                // 빨간 라인 라벨: 주도주
                const redTip = points[visibleCount - 1];
                ctx.fillStyle = `rgba(239,68,68,${labelAlpha})`;
                ctx.fillText('주도주', redTip.x - 50, redTip.y - 10);

                // 파란 라인 라벨: KOSPI
                const p2Count = Math.floor(Math.min((progress - 0.15) / 0.85, 1) * points2.length);
                if (p2Count >= 2) {
                    const blueTip = points2[p2Count - 1];
                    ctx.fillStyle = `rgba(100,160,255,${labelAlpha * 0.7})`;
                    ctx.fillText('KOSPI', blueTip.x - 50, blueTip.y + 20);
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

// ---- 쓰레드 스포일러 (은하수 반짝이 canvas) ----
function SpoilerOverlay() {
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

        interface Star { x: number; y: number; size: number; speed: number; alpha: number; color: [number, number, number]; phase: number; }
        const stars: Star[] = [];
        const w = () => canvas.offsetWidth;
        const h = () => canvas.offsetHeight;

        for (let i = 0; i < 50; i++) {
            const colors: [number, number, number][] = [
                [255, 255, 255],   // white
                [200, 180, 255],   // lavender
                [150, 180, 255],   // light blue
                [255, 200, 255],   // pink
                [180, 150, 255],   // purple
            ];
            stars.push({
                x: Math.random() * w(),
                y: Math.random() * h(),
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                alpha: Math.random(),
                color: colors[Math.floor(Math.random() * colors.length)],
                phase: Math.random() * Math.PI * 2,
            });
        }

        let t = 0;
        const draw = () => {
            t += 0.02;
            ctx.clearRect(0, 0, w(), h());

            for (const star of stars) {
                // 반짝임
                const twinkle = Math.sin(t * star.speed * 3 + star.phase) * 0.5 + 0.5;
                const alpha = twinkle * 0.8 + 0.1;

                // 느리게 떠다님
                star.x += Math.sin(t * star.speed + star.phase) * 0.15;
                star.y += Math.cos(t * star.speed * 0.7 + star.phase) * 0.1;

                // 경계 처리
                if (star.x < -5) star.x = w() + 5;
                if (star.x > w() + 5) star.x = -5;
                if (star.y < -5) star.y = h() + 5;
                if (star.y > h() + 5) star.y = -5;

                const [r, g, b] = star.color;

                // 글로우
                if (star.size > 0.8) {
                    const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4);
                    glow.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.3})`);
                    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
                    ctx.fillStyle = glow;
                    ctx.fill();
                }

                // 별 본체
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                ctx.fill();
            }

            frame = requestAnimationFrame(draw);
        };
        draw();

        return () => cancelAnimationFrame(frame);
    }, []);

    return (
        <div className="absolute inset-0 z-10 overflow-hidden rounded-none pointer-events-none">
            <div className="absolute inset-0 spoiler-galaxy-bg" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
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

// ---- 실데이터 미니 스트립 ----
type GlanceStock = { grade: string; changeRate: number; themes: string[]; totalScore: number };

function MarketGlance({ stocks }: { stocks: GlanceStock[] }) {
    if (stocks.length === 0) return null;

    const sCount = stocks.filter(s => s.grade === 'S').length;
    const marketTemp = Math.round(stocks.reduce((sum, s) => sum + s.totalScore, 0) / stocks.length);
    const tempColor = marketTemp >= 60 ? '#ef4444' : marketTemp >= 40 ? '#e0e0e0' : '#2962ff';

    // Top theme among S-grade
    const sStocks = stocks.filter(s => s.grade === 'S');
    const themeMap = new Map<string, { count: number; totalChange: number }>();
    sStocks.forEach((s) => {
        s.themes.forEach((theme) => {
            const entry = themeMap.get(theme) ?? { count: 0, totalChange: 0 };
            themeMap.set(theme, { count: entry.count + 1, totalChange: entry.totalChange + s.changeRate });
        });
    });
    let topTheme: string | null = null;
    let topThemeAvg = 0;
    themeMap.forEach((val, key) => {
        if (!topTheme || val.count > (themeMap.get(topTheme)?.count ?? 0)) {
            topTheme = key;
            topThemeAvg = val.totalChange / val.count;
        }
    });

    return (
        <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap mt-5 text-xs" style={{ animation: 'heroFadeIn 0.8s ease-out 0.28s both' }}>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5">
                <span style={{ color: '#ef4444', fontWeight: 700 }}>S등급 {sCount}개</span>
            </span>
            {topTheme && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5">
                    <span className="text-white/60">탑테마</span>
                    <span className="font-semibold text-white/90">{topTheme}</span>
                    <span style={{ color: topThemeAvg >= 0 ? '#ef4444' : '#2962ff', fontWeight: 600 }}>
                        {topThemeAvg >= 0 ? '+' : ''}{topThemeAvg.toFixed(1)}%
                    </span>
                </span>
            )}
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5">
                <span className="text-white/60">시장온도</span>
                <span style={{ color: tempColor, fontWeight: 700 }}>{marketTemp}</span>
            </span>
        </div>
    );
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
        <div className="mt-6 w-full max-w-lg mx-auto" style={{ animation: 'heroFadeIn 0.8s ease-out 0.3s both' }}>
            <MarketGlance stocks={stocks} />
            <div className="mt-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-xl overflow-hidden shadow-lg">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">실시간 주도주 TOP 5</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)]">LIVE</span>
                </div>

                {stocks.map((stock, i) => {
                    const isUp = stock.changeRate > 0;
                    const isHidden = i >= 2;
                    const isSGrade = stock.grade === 'S';

                    return (
                        <div
                            key={stock.stockCode}
                            className={`relative flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border-color)] last:border-b-0 ${isHidden ? 'select-none overflow-hidden' : ''}`}
                            style={{
                                animation: `heroFadeIn 0.5s ease-out ${0.4 + i * 0.08}s both`,
                                ...(isSGrade && !isHidden ? {
                                    background: 'linear-gradient(90deg, rgba(239,68,68,0.05) 0%, transparent 100%)',
                                    boxShadow: 'inset 3px 0 0 var(--rise-color)',
                                } : {}),
                            }}
                        >
                            {/* 은하수 스포일러 오버레이 */}
                            {isHidden && <SpoilerOverlay />}
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

// ---- 실시간 상태 배지 ----
function MarketStatusBadge() {
    const { data } = useQuery({
        queryKey: ['hotStocks-landing'],
        queryFn: () => fetchHotStocks(5),
        staleTime: 60 * 1000,
    });
    const ms = data?.marketStatus;
    if (!ms) return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]/70 backdrop-blur-sm text-xs text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
            데이터 로딩 중
        </span>
    );
    const isLive = ms.isOpen;
    return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]/70 backdrop-blur-sm text-xs text-[var(--text-secondary)]">
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            {ms.statusText} {isLive ? '· 실시간 업데이트' : ''}
        </span>
    );
}

// ---- 메인 ----
export default function HeroSection() {
    return (
        <section className="relative flex items-center justify-center overflow-hidden py-16 sm:py-20" style={{ background: '#0a0e1a', minHeight: '85vh' }}>
            <GalaxyBackground />
            <ChartLineBackground />

            <div className="relative z-10 w-full max-w-2xl mx-auto px-6 text-white" style={{ ['--text-primary' as any]: '#f0f0f0', ['--text-secondary' as any]: '#9ca3af', ['--text-tertiary' as any]: '#6b7280', ['--border-color' as any]: '#1e293b', ['--bg-primary' as any]: '#0f1629', ['--bg-secondary' as any]: '#131b30' }}>
                <div className="text-center" style={{ animation: 'heroFadeIn 0.6s ease-out both' }}>
                    <MarketStatusBadge />
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
