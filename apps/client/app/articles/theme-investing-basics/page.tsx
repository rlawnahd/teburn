import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '테마주 투자의 기초 - TEBURN',
    description: '테마주의 개념과 투자 시 주의할 점, TEBURN에서 테마를 분석하는 방법을 소개합니다.',
};

export default function ThemeInvestingBasicsPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/articles" className="text-[13px] text-[var(--accent-blue)] hover:underline">
                        &larr; 목록으로
                    </Link>
                </div>
                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-6 space-y-6">
                    <div>
                        <h1 className="text-lg font-bold text-[var(--text-primary)]">테마주 투자의 기초</h1>
                        <p className="text-[13px] text-[var(--text-tertiary)] mt-1">2025년 2월 25일</p>
                    </div>

                    <Section title="테마주란?">
                        <p>
                            테마주란 특정 이슈, 정책, 산업 트렌드에 의해 함께 움직이는 종목군을 의미합니다.
                            예를 들어 AI 관련주, 2차전지 관련주, 반도체 관련주 등이 대표적인 테마에 해당합니다.
                            이러한 종목들은 개별 기업의 실적보다 해당 테마에 대한 시장의 관심도에 따라
                            주가가 동반 상승하거나 하락하는 경향을 보입니다.
                        </p>
                        <p className="mt-2">
                            한국 주식시장에서 테마주는 특히 중소형주 중심으로 활발하게 형성됩니다.
                            하나의 종목이 여러 테마에 동시에 속할 수도 있으며, 시장 상황에 따라
                            새로운 테마가 등장하거나 기존 테마가 소멸하기도 합니다.
                            테마의 범위는 기술 혁신부터 정치적 이슈, 계절적 요인에 이르기까지 매우 다양합니다.
                        </p>
                    </Section>

                    <Section title="테마가 형성되는 과정">
                        <p>
                            테마는 다양한 계기를 통해 형성됩니다. 가장 흔한 촉매는 정부의 정책 발표입니다.
                            예를 들어 정부가 신재생에너지 육성 계획을 발표하면 태양광, 풍력, 수소 관련 종목들이
                            하나의 테마로 묶여 시장의 주목을 받게 됩니다.
                        </p>
                        <p className="mt-2">
                            기술 혁신도 강력한 테마 형성 요인입니다. ChatGPT 등장 이후 AI 관련주가
                            폭발적으로 부상한 것이 대표적인 사례입니다. 이 외에도 글로벌 공급망 변화,
                            국제 정세 변동, 원자재 가격 변동, 계절적 수요 변화(예: 여름철 냉방 관련주,
                            겨울철 난방 관련주) 등이 테마를 만들어냅니다.
                        </p>
                        <p className="mt-2">
                            테마 형성 초기에는 소수의 핵심 종목이 먼저 움직이고, 이후 관련 종목들로 매수세가
                            확산되는 패턴이 일반적입니다. 이 과정에서 뉴스와 소셜미디어를 통해 테마에 대한
                            인식이 빠르게 퍼져나갑니다.
                        </p>
                    </Section>

                    <Section title="테마주 투자의 장점과 위험">
                        <p>
                            테마주 투자의 가장 큰 장점은 단기간에 높은 수익을 기대할 수 있다는 점입니다.
                            시장의 관심이 특정 테마에 집중될 때 관련 종목들은 동반 상승하며,
                            이 흐름을 초기에 포착하면 의미 있는 수익을 얻을 수 있습니다.
                            또한 테마를 이해하면 개별 종목이 아닌 산업 전체의 방향성을 파악하는 데
                            도움이 됩니다.
                        </p>
                        <p className="mt-2">
                            반면, 테마주 투자에는 상당한 위험이 따릅니다. 테마에 대한 과도한 기대감으로
                            주가가 급등한 뒤 실체가 없는 것으로 판명되면 급락이 발생할 수 있습니다.
                            특히 실적 기반이 취약한 종목은 테마 소멸 시 원래 가격 이하로 하락하는 경우가
                            많습니다. &quot;묻지마 투자&quot;로 테마주에 뛰어드는 것은 매우 위험한 행동입니다.
                        </p>
                        <p className="mt-2">
                            또한 테마의 수명은 예측하기 어렵습니다. 몇 주 만에 사라지는 단기 테마도 있고,
                            수년간 지속되는 장기 테마도 있습니다. 투자자는 테마의 지속 가능성을 항상
                            냉정하게 판단해야 합니다.
                        </p>
                    </Section>

                    <Section title="테마주 분석 시 확인할 것들">
                        <p>
                            테마주에 투자하기 전에 반드시 확인해야 할 요소들이 있습니다.
                            첫째, 테마의 지속성입니다. 일회성 이슈인지, 구조적 변화에 기반한 장기 트렌드인지를
                            구분해야 합니다. 정부 정책이나 기술 혁신에 기반한 테마는 비교적 오래 지속되는 경향이 있습니다.
                        </p>
                        <p className="mt-2">
                            둘째, 실적 연관성입니다. 테마와 실제 매출 및 이익이 연결되는 종목인지 확인해야 합니다.
                            단순히 사업 분야가 유사하다는 이유만으로 테마에 편입된 종목은 실질적인 수혜가
                            제한적일 수 있습니다.
                        </p>
                        <p className="mt-2">
                            셋째, 수급 동향을 살펴야 합니다. 기관과 외국인의 매매 동향, 거래량 변화 추이를
                            확인하면 테마에 대한 시장 참여자들의 실제 관심도를 파악할 수 있습니다.
                            마지막으로 관련 뉴스의 빈도와 내용을 추적하면 테마의 현재 상태와
                            향후 방향성을 가늠하는 데 도움이 됩니다.
                        </p>
                    </Section>

                    <Section title="TEBURN으로 테마 분석하기">
                        <p>
                            TEBURN은 한국 주식시장의 테마별 종목 분류를 제공합니다.
                            테마 페이지에서는 각 테마에 속한 종목들의 현재 주가, 등락률, 거래량 등을
                            한눈에 확인할 수 있습니다. 테마별 평균 등락률을 통해 어떤 테마가 현재
                            시장에서 주목받고 있는지 빠르게 파악할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            또한 TEBURN의 주도주 점수 시스템은 각 종목의 시장 영향력을 S부터 D까지
                            등급으로 분류합니다. 테마 내에서 어떤 종목이 주도적으로 움직이고 있는지
                            확인하면 테마의 핵심 종목과 후발 종목을 구분하는 데 유용합니다.
                            뉴스 빈도 데이터를 함께 활용하면 테마에 대한 시장의 관심 변화를
                            정량적으로 추적할 수 있습니다.
                        </p>
                    </Section>

                    <div className="border-t border-[var(--border-color)] pt-4">
                        <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
                            본 콘텐츠는 정보 제공 목적으로 작성되었으며, 특정 종목에 대한 매수 또는 매도 권유가 아닙니다.
                            투자 판단의 책임은 전적으로 투자자 본인에게 있으며, 투자 전 반드시 충분한 조사와 분석을 수행하시기 바랍니다.
                            과거의 수익률이 미래의 수익률을 보장하지 않습니다.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">{title}</h2>
            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {children}
            </div>
        </section>
    );
}
