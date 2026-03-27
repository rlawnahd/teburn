'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { fetchHotStocks } from '@/lib/api/leading';
import Link from 'next/link';

const TICKER_DATA = [
    { name: '삼성전자', code: '005930', base: 72400, change: 2.3 },
    { name: 'SK하이닉스', code: '000660', base: 185000, change: 4.1 },
    { name: 'LG에너지솔루션', code: '373220', base: 380000, change: -1.2 },
    { name: '현대차', code: '005380', base: 245000, change: 1.8 },
    { name: '카카오', code: '035720', base: 48500, change: -0.7 },
    { name: 'NAVER', code: '035420', base: 195000, change: 3.2 },
    { name: '셀트리온', code: '068270', base: 178000, change: 5.4 },
    { name: '기아', code: '000270', base: 120000, change: 2.1 },
    { name: 'POSCO홀딩스', code: '005490', base: 310000, change: -0.5 },
    { name: '크래프톤', code: '259960', base: 255000, change: 6.8 },
    { name: 'KB금융', code: '105560', base: 78000, change: 1.5 },
    { name: '삼성SDI', code: '006400', base: 350000, change: -2.1 },
];

function TickerRow({ stocks, direction, speed }: { stocks: typeof TICKER_DATA; direction: 'left' | 'right'; speed: number }) {
    const [offset, setOffset] = useState(0);
    const frameRef = useRef<number>(0);
    const [prices, setPrices] = useState(() => stocks.map(s => ({ ...s, current: s.base, rate: s.change })));

    useEffect(() => {
        let t = 0;
        const animate = () => {
            t += 1;
            setOffset(prev => prev + (direction === 'left' ? -speed : speed));
            if (t % 60 === 0) {
                setPrices(prev => prev.map((s, i) => {
                    const noise = Math.sin(t * 0.01 + i * 2.3) * s.base * 0.002;
                    const current = Math.round(s.base + noise);
                    const rate = ((current - s.base) / s.base) * 100 + s.change;
                    return { ...s, current, rate };
                }));
            }
            frameRef.current = requestAnimationFrame(animate);
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [direction, speed]);

    const doubled = [...prices, ...prices];

    return (
        <div className="flex whitespace-nowrap" style={{ transform: `translateX(${offset % (prices.length * 200)}px)` }}>
            {doubled.map((stock, i) => {
                const isUp = stock.rate >= 0;
                return (
                    <div key={`${stock.code}-${i}`} className="inline-flex items-center gap-3 px-5 py-2 flex-shrink-0" style={{ minWidth: '200px' }}>
                        <span className="text-xs font-medium text-[var(--text-primary)] opacity-60">{stock.name}</span>
                        <span className="text-xs font-mono opacity-50" style={{ color: isUp ? 'var(--rise-color)' : 'var(--fall-color)' }}>
                            {stock.current.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-mono opacity-40" style={{ color: isUp ? 'var(--rise-color)' : 'var(--fall-color)' }}>
                            {isUp ? '+' : ''}{stock.rate.toFixed(2)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function LiveTickerBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
            <div className="absolute top-[15%] left-0 right-0 opacity-30">
                <TickerRow stocks={TICKER_DATA.slice(0, 6)} direction="left" speed={0.3} />
            </div>
            <div className="absolute top-[30%] left-0 right-0 opacity-20">
                <TickerRow stocks={TICKER_DATA.slice(6, 12)} direction="right" speed={0.2} />
            </div>
            <div className="absolute top-[65%] left-0 right-0 opacity-15">
                <TickerRow stocks={[...TICKER_DATA].reverse().slice(0, 6)} direction="left" speed={0.25} />
            </div>
            <div className="absolute top-[80%] left-0 right-0 opacity-10">
                <TickerRow stocks={[...TICKER_DATA].reverse().slice(6, 12)} direction="right" speed={0.15} />
            </div>
        </div>
    );
}

function useCountUp(target: number, duration: number = 1000): number {
    const [value, setValue] = useState(0);
    const startTime = useRef<number | null>(null);

    useEffect(() => {
        startTime.current = null;
        const animate = (timestamp: number) => {
            if (!startTime.current) startTime.current = timestamp;
            const progress = Math.min((timestamp - startTime.current) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [target, duration]);

    return value;
}

function TopStockCard() {
    const { data } = useQuery({
        queryKey: ['hotStocks-landing'],
        queryFn: () => fetchHotStocks(1),
        staleTime: 60 * 1000,
    });

    const top = data?.stocks?.[0];
    const animatedScore = useCountUp(top?.totalScore || 0, 1200);

    if (!top) return null;

    const isUp = top.changeRate > 0;

    return (
        <div
            className="mt-10 mx-auto max-w-sm"
            style={{ animation: 'heroFadeIn 0.8s ease-out 0.3s both' }}
        >
            <div className="relative rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/90 backdrop-blur-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                    <Trophy size={14} className="text-amber-500" />
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">오늘의 주도주 1위</span>
                    <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">LIVE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>

                {/* Stock info */}
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-[var(--text-primary)]">{top.stockName}</span>
                                <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    style={{
                                        backgroundColor: top.grade === 'S' ? 'var(--grade-s)' : 'var(--grade-a)',
                                        color: 'white',
                                    }}
                                >
                                    {top.grade}등급
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-[var(--text-primary)]">{top.currentPrice.toLocaleString()}원</span>
                                <span className={`text-sm font-semibold ${isUp ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                    {isUp ? '+' : ''}{top.changeRate.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-[var(--text-primary)]">{animatedScore}</div>
                            <div className="text-[10px] text-[var(--text-tertiary)]">주도주 점수</div>
                        </div>
                    </div>

                    {/* Score bars */}
                    <div className="mt-3 grid grid-cols-6 gap-1">
                        {[
                            { label: '거래대금', score: top.tradingValueScore, max: 35 },
                            { label: '모멘텀', score: top.momentumScore, max: 20 },
                            { label: '거래량', score: top.volumeScore, max: 15 },
                            { label: '뉴스', score: top.newsScore, max: 15 },
                            { label: '테마', score: top.themeConcentrationScore, max: 15 },
                            { label: '연속', score: top.streakScore ?? 0, max: 30 },
                        ].map((item) => (
                            <div key={item.label} className="text-center">
                                <div className="h-8 bg-[var(--bg-tertiary)] rounded-sm relative overflow-hidden">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 rounded-sm transition-all"
                                        style={{
                                            height: `${(item.score / item.max) * 100}%`,
                                            background: 'var(--brand-primary)',
                                            opacity: 0.7,
                                        }}
                                    />
                                </div>
                                <div className="text-[9px] text-[var(--text-tertiary)] mt-1">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Blur overlay for "more" */}
                <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
                    <Link href="/login" className="w-full text-xs text-[var(--accent-blue)] hover:underline block text-center">
                        + 29개 종목 더 보기 →
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg-primary)]">
            {/* Live ticker background */}
            <LiveTickerBackground />

            {/* Content */}
            <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
                {/* Logo */}
                <div
                    className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-sm"
                    style={{ animation: 'heroFadeIn 0.6s ease-out both' }}
                >
                    <span className="text-sm font-bold tracking-wider text-[var(--text-primary)]">TEBURN</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--rise-color)] text-white font-semibold">BETA</span>
                </div>

                <h1
                    className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--text-primary)] leading-[1.1] tracking-tight"
                    style={{ animation: 'heroFadeIn 0.8s ease-out 0.1s both' }}
                >
                    오늘의 주도주를
                    <br />
                    <span style={{ color: 'var(--brand-primary)' }}>실시간</span>으로
                </h1>

                <p
                    className="mt-5 text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto"
                    style={{ animation: 'heroFadeIn 0.8s ease-out 0.2s both' }}
                >
                    거래대금, 등락률, 거래량, 뉴스, 테마 집중도
                    <br className="hidden sm:block" />
                    5가지 지표로 주도주를 실시간 분석합니다
                </p>

                {/* Top 1 stock card */}
                <TopStockCard />

                <div style={{ animation: 'heroFadeIn 0.8s ease-out 0.45s both' }}>
                    <Link
                        href="/login"
                        className="mt-8 inline-flex items-center h-14 px-10 text-base font-semibold text-white rounded-xl transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            background: 'var(--accent-blue)',
                        }}
                    >
                        무료로 시작하기
                    </Link>

                    <p className="mt-4 text-xs text-[var(--text-tertiary)]">
                        가입은 무료, 10초면 충분합니다
                    </p>
                </div>
            </div>

        </section>
    );
}
