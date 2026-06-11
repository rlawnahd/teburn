'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const GRADES = [
    {
        grade: 'S',
        label: 'S등급',
        score: '70점 이상',
        description: '거래대금 · 모멘텀 · 뉴스 · 테마 집중도 모두 최상위',
        color: '#ef4444',
        glowColor: 'rgba(239,68,68,0.4)',
        size: 'large',
    },
    {
        grade: 'A',
        label: 'A등급',
        score: '50~69점',
        description: '시장 평균 이상의 주도력',
        color: '#f97316',
        glowColor: 'rgba(249,115,22,0.3)',
        size: 'medium',
    },
    {
        grade: 'B',
        label: 'B등급',
        score: '35~49점',
        description: '관심 구간 진입',
        color: 'var(--grade-b)',
        glowColor: 'rgba(113,113,122,0.2)',
        size: 'small',
    },
];

function GradeCard({ item, index }: { item: typeof GRADES[0]; index: number }) {
    const isS = item.grade === 'S';
    const isA = item.grade === 'A';
    const isLarge = isS;
    const isMedium = isA;

    return (
        <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.8 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
                type: 'spring',
                stiffness: 200,
                damping: 20,
                delay: index * 0.12,
            }}
            whileHover={isS ? { y: -8, scale: 1.03 } : isMedium ? { y: -4 } : undefined}
            className="relative rounded-xl border p-5 transition-all duration-300 bg-[var(--bg-primary)]"
            style={{
                borderColor: isS ? item.color : 'var(--border-color)',
                boxShadow: isS
                    ? `0 0 30px ${item.glowColor}, 0 0 60px ${item.glowColor}`
                    : isA
                    ? `0 0 15px ${item.glowColor}`
                    : 'none',
            }}
        >
            {/* Grade badge */}
            <div className="flex items-center gap-3 mb-3">
                <span
                    className={`${isLarge ? 'text-3xl' : isMedium ? 'text-2xl' : 'text-xl'} font-black`}
                    style={{ color: item.color }}
                >
                    {item.grade}
                </span>
                <div>
                    <div className={`${isLarge ? 'text-base' : 'text-sm'} font-semibold text-[var(--text-primary)]`}>
                        {item.label}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">{item.score}</div>
                </div>
            </div>

            <p className={`${isLarge ? 'text-sm' : 'text-xs'} text-[var(--text-secondary)]`}>
                {item.description}
            </p>

            {/* S등급 네온 보더 애니메이션 */}
            {isS && (
                <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                        border: `1px solid ${item.color}`,
                        animation: 'sGlowPulse 2s ease-in-out infinite',
                    }}
                />
            )}
        </motion.div>
    );
}

export default function GradeShowcase() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section ref={ref} className="py-16 sm:py-24 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="max-w-[800px] mx-auto px-4 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                        5가지 지표로 등급을 매깁니다
                    </h2>
                    <p className="text-sm text-[var(--text-tertiary)] mt-2">
                        S등급 종목이 그날의 진짜 주도주입니다
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {GRADES.map((item, i) => (
                        <GradeCard key={item.grade} item={item} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}
