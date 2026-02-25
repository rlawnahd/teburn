import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '투자 가이드 - TEBURN',
    description: '주도주, 테마주, 거래량 분석 등 주식 투자에 도움이 되는 가이드를 제공합니다.',
};

const articles = [
    {
        slug: 'what-is-leading-stock',
        title: '주도주란 무엇인가?',
        summary: '주도주의 개념과 특징, 시장에서 주도주가 중요한 이유와 찾는 방법을 알아봅니다.',
        date: '2025-02-25',
    },
    {
        slug: 'how-hotness-score-works',
        title: 'TEBURN 주도주 점수 산출 원리',
        summary: 'TEBURN의 100점 만점 주도주 점수 시스템과 S/A/B/C/D 등급 산출 방식을 설명합니다.',
        date: '2025-02-25',
    },
    {
        slug: 'theme-investing-basics',
        title: '테마주 투자의 기초',
        summary: '테마주의 개념과 테마가 형성되는 과정, 테마주 투자 시 주의할 점을 소개합니다.',
        date: '2025-02-25',
    },
    {
        slug: 'volume-surge-meaning',
        title: '거래량 급증이 의미하는 것',
        summary: '주식 거래량 급증의 다양한 의미와 해석 방법, 거래량과 가격의 관계를 알아봅니다.',
        date: '2025-02-25',
    },
    {
        slug: 'how-to-use-teburn',
        title: 'TEBURN 200% 활용하기',
        summary: 'TEBURN의 주요 기능과 각 탭별 활용 팁, 텔레그램 봇 연동 방법을 안내합니다.',
        date: '2025-02-25',
    },
];

export default function ArticlesPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/" className="text-[13px] text-[var(--accent-blue)] hover:underline">
                        &larr; 홈으로
                    </Link>
                </div>

                <h1 className="text-lg font-bold text-[var(--text-primary)] mb-4">투자 가이드</h1>
                <p className="text-[13px] text-[var(--text-tertiary)] mb-6">
                    주도주, 테마주, 거래량 분석 등 주식 투자에 도움이 되는 가이드를 제공합니다.
                </p>

                <div className="grid gap-3">
                    {articles.map((article) => (
                        <Link
                            key={article.slug}
                            href={`/articles/${article.slug}`}
                            className="block bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 hover:border-[var(--accent-blue)] transition-colors"
                        >
                            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                                {article.title}
                            </h2>
                            <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                                {article.summary}
                            </p>
                            <p className="text-[12px] text-[var(--text-tertiary)] mt-2">
                                {article.date}
                            </p>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
