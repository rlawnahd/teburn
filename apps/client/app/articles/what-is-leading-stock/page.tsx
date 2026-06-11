import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '주도주란 무엇인가? - TEBURN',
    description: '주도주의 개념과 특징, 시장에서 주도주가 중요한 이유와 찾는 방법을 알아봅니다.',
};

export default function WhatIsLeadingStockPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/articles" className="text-[14px] text-[var(--accent)] hover:underline">
                        &larr; 목록으로
                    </Link>
                </div>

                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-6 space-y-6">
                    <div>
                        <h1 className="text-lg font-bold text-[var(--text-primary)]">주도주란 무엇인가?</h1>
                        <p className="text-[14px] text-[var(--text-tertiary)] mt-1">2025년 2월 25일</p>
                    </div>

                    <Section title="1. 주도주의 정의">
                        <p>
                            주도주(Leading Stock)란 특정 시기에 시장의 흐름을 주도하며 가장 강한 상승세를 보이는 종목을 의미합니다.
                            단순히 주가가 오르는 종목이 아니라, 거래량과 시장 참여자들의 관심이 집중되면서 해당 시장이나 섹터 전체의
                            방향성을 결정짓는 핵심 종목입니다.
                        </p>
                        <p className="mt-2">
                            주도주는 시장의 특정 테마나 이슈와 밀접하게 연관되어 있으며, 해당 테마가 부각될 때 가장 먼저 반응하고
                            가장 큰 폭으로 움직이는 경향이 있습니다. 예를 들어, 반도체 산업이 주목받는 시기에는 반도체 관련 대장주가
                            주도주가 되며, 정책 변화가 있을 때는 관련 수혜주가 시장을 이끌게 됩니다.
                        </p>
                    </Section>

                    <Section title="2. 주도주의 특징">
                        <p>
                            주도주에는 몇 가지 공통적인 특징이 있습니다. 첫째, 거래량이 평소 대비 크게 증가합니다.
                            시장 참여자들의 매수와 매도가 활발하게 이루어지면서 거래량이 급증하는 것은 주도주의 가장 대표적인 신호입니다.
                            일반적으로 평균 거래량 대비 2배 이상 증가하는 경우가 많습니다.
                        </p>
                        <p className="mt-2">
                            둘째, 강한 가격 상승세를 보입니다. 주도주는 단순히 하루 반짝 오르는 것이 아니라
                            수일에서 수주에 걸쳐 지속적인 상승 추세를 형성합니다. 조정이 오더라도 빠르게 회복하며,
                            시장 전체가 약세일 때도 상대적으로 강한 흐름을 유지합니다.
                        </p>
                        <p className="mt-2">
                            셋째, 뉴스와 미디어에서 자주 언급됩니다. 주도주는 시장의 화제가 되기 때문에 관련 뉴스 기사가
                            빈번하게 생산되며, 투자자 커뮤니티에서도 활발한 논의가 이루어집니다. 이러한 관심의 집중이
                            다시 거래량과 가격 상승으로 이어지는 선순환 구조를 만들어냅니다.
                        </p>
                    </Section>

                    <Section title="3. 주도주가 중요한 이유">
                        <p>
                            주도주를 파악하는 것은 현재 시장의 방향성을 이해하는 데 핵심적인 역할을 합니다.
                            주도주가 속한 섹터와 테마를 분석하면, 시장 자금이 어디로 흘러가고 있는지 파악할 수 있습니다.
                            이는 곧 시장의 주요 관심사와 향후 투자 트렌드를 읽는 단서가 됩니다.
                        </p>
                        <p className="mt-2">
                            또한 주도주의 움직임은 수급 흐름을 확인하는 지표가 됩니다. 기관투자자와 외국인 투자자의
                            매매 동향이 주도주에 집중되는 경우가 많기 때문에, 주도주의 수급 변화를 관찰하면
                            큰 손(Big Hand)들의 투자 방향을 가늠할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            투자 타이밍 측면에서도 주도주는 중요합니다. 주도주가 새롭게 등장하거나 교체되는 시점은
                            시장의 패러다임이 변화하고 있다는 신호일 수 있으며, 이를 빠르게 포착하면 새로운 투자 기회를
                            발견할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="4. 주도주를 찾는 방법">
                        <p>
                            주도주를 찾기 위해서는 여러 지표를 종합적으로 분석해야 합니다. 가장 기본적인 방법은
                            거래량 분석입니다. 최근 거래량이 평균 대비 크게 증가한 종목을 필터링하면 시장의 관심이
                            집중되고 있는 종목을 빠르게 파악할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            가격 상승률도 중요한 판단 기준입니다. 단기간에 높은 수익률을 기록하면서도 거래량이
                            뒷받침되는 종목은 주도주 후보로 볼 수 있습니다. 다만, 거래량 없이 가격만 오르는 경우는
                            지속성이 떨어질 수 있으므로 주의가 필요합니다.
                        </p>
                        <p className="mt-2">
                            뉴스 빈도 역시 주도주를 판별하는 핵심 요소입니다. 특정 종목에 대한 뉴스가 급격히 늘어나는 것은
                            시장의 관심이 해당 종목에 쏠리고 있다는 의미이며, 이는 주가 변동의 촉매 역할을 합니다.
                            기관과 외국인의 순매수 동향도 함께 확인하면 보다 정확한 판단이 가능합니다.
                        </p>
                    </Section>

                    <Section title="5. TEBURN에서 주도주 확인하기">
                        <p>
                            TEBURN은 위에서 설명한 다양한 지표들을 종합하여 주도주를 자동으로 분석하고 점수화하는 서비스입니다.
                            TEBURN의 &quot;주도주&quot; 탭에서는 거래량 변화, 가격 상승률, 뉴스 빈도 등을 기반으로 산출된
                            주도주 점수를 통해 현재 시장에서 가장 주목받는 종목들을 한눈에 확인할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            각 종목은 100점 만점의 점수와 함께 S, A, B, C, D 등급으로 분류되어 직관적으로
                            주도주 여부를 판단할 수 있습니다. S등급은 현재 시장에서 가장 강력한 주도주를 의미하며,
                            실시간으로 업데이트되는 데이터를 통해 빠르게 변화하는 시장 상황을 놓치지 않고 확인할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="면책 조항">
                        <p>
                            본 콘텐츠는 주도주의 개념에 대한 일반적인 정보 제공을 목적으로 작성되었으며,
                            특정 종목에 대한 매수, 매도, 보유 등의 투자 권유나 투자 조언이 아닙니다.
                            주식 투자는 원금 손실의 위험이 있으며, 모든 투자 판단과 그에 따른 결과는
                            투자자 본인에게 있습니다. 투자 결정 시에는 반드시 본인의 판단과 책임 하에 이루어져야 하며,
                            필요한 경우 전문 금융 상담사와 상의하시기 바랍니다.
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
