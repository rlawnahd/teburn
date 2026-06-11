import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '서비스 소개 - TEBURN',
    description: 'TEBURN은 한국 주식 시장의 주도주를 실시간으로 분석하는 무료 서비스입니다.',
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/" className="text-[14px] text-[var(--accent)] hover:underline">
                        &larr; 홈으로
                    </Link>
                </div>

                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-6 space-y-6">
                    <h1 className="text-lg font-bold text-[var(--text-primary)]">서비스 소개</h1>

                    <Section title="TEBURN이란?">
                        <p>
                            TEBURN은 한국 주식 시장에서 지금 가장 주목받는 종목, 즉 &quot;주도주&quot;를 실시간으로 분석하고 시각화하는 무료 서비스입니다.
                            매일 수천 개의 종목이 거래되는 시장에서, 어떤 종목이 실제로 시장을 이끌고 있는지를 한눈에 파악할 수 있도록 돕습니다.
                        </p>
                        <p className="mt-2">
                            거래량, 가격 변동률, 뉴스 노출 빈도, 테마 연관성 등 다양한 지표를 종합하여 자체적인 &quot;주도주 점수&quot;를 산출하고,
                            이를 S, A, B, C, D 등급으로 분류하여 제공합니다. 회원가입 없이 누구나 무료로 이용할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="왜 만들었나요?">
                        <p>
                            주식 투자를 하다 보면, 오늘 시장을 이끄는 종목이 무엇인지 빠르게 파악하고 싶을 때가 많습니다.
                            하지만 여러 증권사 앱과 뉴스 사이트를 번갈아 확인하는 것은 번거롭고 시간이 많이 걸립니다.
                        </p>
                        <p className="mt-2">
                            TEBURN은 이런 불편함을 해결하기 위해 만들어졌습니다. 하나의 화면에서 주도주 현황, 거래대금 순위,
                            섹터별 동향, 테마별 종목 분류, 주요 일정까지 한눈에 확인할 수 있습니다.
                            또한 텔레그램 봇을 통해 S등급 주도주가 등장하면 실시간으로 알림을 받을 수도 있습니다.
                        </p>
                    </Section>

                    <Section title="연락처">
                        <p>서비스 관련 문의나 피드백은 아래로 연락해 주세요.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>서비스명: TEBURN</li>
                            <li>이메일: rlawnahd123@naver.com</li>
                            <li>텔레그램 봇: <a href="https://t.me/teburn_hot_bot" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">@teburn_hot_bot</a></li>
                        </ul>
                    </Section>

                    <Section title="면책 조항">
                        <p>
                            TEBURN에서 제공하는 정보는 투자 참고용이며, 특정 종목의 매수·매도를 추천하지 않습니다.
                            투자에 대한 최종 판단과 책임은 이용자 본인에게 있습니다.
                            TEBURN은 데이터의 정확성을 위해 노력하지만, 실시간 시세와 차이가 발생할 수 있으며,
                            이로 인한 투자 손실에 대해 책임을 지지 않습니다.
                        </p>
                    </Section>
                </div>
            </main>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
            <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                {children}
            </div>
        </section>
    );
}
