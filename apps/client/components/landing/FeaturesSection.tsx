'use client';

import { TrendingUp, Zap, BarChart3, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
    icon: LucideIcon;
    title: string;
    description: string;
}

const FEATURES: Feature[] = [
    {
        icon: TrendingUp,
        title: '주도주 분석',
        description:
            '거래대금, 모멘텀, 거래량, 뉴스, 테마 집중도 5가지 지표로 주도주 점수를 실시간 계산합니다.',
    },
    {
        icon: Zap,
        title: '실시간 시세',
        description:
            '로그인 유저에게 실시간 체결 데이터를 WebSocket으로 즉시 전달합니다.',
    },
    {
        icon: BarChart3,
        title: '테마 분석',
        description:
            '200개+ 테마의 등락률, 주도주, 트렌드를 한눈에 파악합니다.',
    },
    {
        icon: Bell,
        title: '거래량 급증 감지',
        description:
            '평균 거래량 대비 급증하는 종목을 실시간으로 포착합니다.',
    },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
    const Icon = feature.icon;

    return (
        <div
            className="group p-6 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] transition-all duration-200 hover:border-[var(--brand-primary)] hover:shadow-[var(--shadow-card-hover)]"
            style={{
                animation: `featureFadeIn 0.5s ease-out ${index * 0.1}s both`,
            }}
        >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors duration-200 bg-[var(--bg-tertiary)] group-hover:bg-[var(--rise-bg)]">
                <Icon
                    size={20}
                    className="text-[var(--text-tertiary)] transition-colors duration-200 group-hover:text-[var(--brand-primary)]"
                />
            </div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">
                {feature.title}
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {feature.description}
            </p>
        </div>
    );
}

export default function FeaturesSection() {
    return (
        <section className="py-16 sm:py-20 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
            <div className="max-w-[960px] mx-auto px-4 sm:px-6">
                <h2 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] text-center mb-3">
                    당신의 트레이딩에 엣지를 더하세요
                </h2>
                <p className="text-[13px] text-[var(--text-tertiary)] text-center mb-10">
                    복잡한 데이터, 쉽고 빠르게
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {FEATURES.map((feature, i) => (
                        <FeatureCard key={feature.title} feature={feature} index={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}
