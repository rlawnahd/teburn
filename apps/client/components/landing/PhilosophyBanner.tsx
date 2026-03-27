'use client';

import { useState, useEffect } from 'react';

const QUOTES = [
    '한 가지 매매를 깊게 파는 것이 실력이 된다',
    '매일 복기하는 사람이 결국 이긴다',
    '나와 맞는 매매를 찾는 여정',
    '도구에 익숙해지면, 판단이 빨라진다',
];

export default function PhilosophyBanner() {
    const [index, setIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % QUOTES.length);
                setFade(true);
            }, 400);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-12 sm:py-16 bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
            <div className="max-w-[640px] mx-auto px-4 text-center">
                <p
                    className={`text-lg sm:text-xl font-semibold text-[var(--text-primary)] transition-opacity duration-400 ${
                        fade ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    &ldquo;{QUOTES[index]}&rdquo;
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-4">
                    {QUOTES.map((_, i) => (
                        <span
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                                i === index ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-color)]'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
