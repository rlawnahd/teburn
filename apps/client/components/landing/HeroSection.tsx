'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHotStocks } from '@/lib/api/leading';
import { formatTradingValue } from '@/lib/utils/format';
import GradeBadge from '@/components/ui/GradeBadge';
import Link from 'next/link';

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
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/90 backdrop-blur-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">실시간 주도주 TOP 5</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)]">LIVE</span>
                </div>

                {/* Stock rows */}
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

                {/* Blur fade + CTA */}
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

export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg-primary)] py-20">
            {/* Subtle gradient background */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full"
                    style={{ background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)', opacity: 0.03, filter: 'blur(100px)' }} />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-2xl mx-auto px-6">
                {/* Badge */}
                <div className="text-center" style={{ animation: 'heroFadeIn 0.6s ease-out both' }}>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 text-xs text-[var(--text-secondary)]">
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
                        className="inline-flex items-center h-12 px-8 text-base font-semibold text-white rounded-xl transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
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
