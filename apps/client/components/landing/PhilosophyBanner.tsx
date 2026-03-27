'use client';

import { Target, BookOpen, Compass, Wrench } from 'lucide-react';

const PRINCIPLES = [
    { icon: Target, text: '한 가지 매매를 깊게 파는 것이 실력이 된다' },
    { icon: BookOpen, text: '매일 복기하는 사람이 결국 이긴다' },
    { icon: Compass, text: '나와 맞는 매매를 찾는 여정' },
    { icon: Wrench, text: '도구에 익숙해지면, 판단이 빨라진다' },
];

export default function PhilosophyBanner() {
    return (
        <section className="py-14 sm:py-20 bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
            <div className="max-w-[960px] mx-auto px-4 sm:px-6">
                <h2 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] text-center mb-10">
                    매매의 기준
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {PRINCIPLES.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={i}
                                className="flex items-start gap-4 p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50"
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[var(--bg-tertiary)]">
                                    <Icon size={20} className="text-[var(--brand-primary)]" />
                                </div>
                                <p className="text-base font-medium text-[var(--text-primary)] leading-relaxed pt-2">
                                    {item.text}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
