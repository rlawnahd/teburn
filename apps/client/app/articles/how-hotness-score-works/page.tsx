import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'TEBURN 주도주 점수 산출 원리 - TEBURN',
    description: 'TEBURN의 주도주 점수 시스템과 등급 산출 원리를 자세히 알아봅니다.',
};

export default function HowHotnessScoreWorksPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/articles" className="text-[14px] text-[var(--accent-blue)] hover:underline">
                        &larr; 목록으로
                    </Link>
                </div>
                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-6 space-y-6">
                    <div>
                        <h1 className="text-lg font-bold text-[var(--text-primary)]">TEBURN 주도주 점수 산출 원리</h1>
                        <p className="text-[14px] text-[var(--text-tertiary)] mt-1">2025년 2월 25일</p>
                    </div>

                    <Section title="1. 주도주 점수란?">
                        <p>
                            주도주 점수는 TEBURN이 자체적으로 산출하는 100점 만점의 종합 평가 시스템입니다.
                            국내 주식시장에서 특정 시점에 시장을 이끌고 있는 종목, 즉 &quot;주도주&quot;를
                            정량적으로 식별하기 위해 개발되었습니다.
                        </p>
                        <p className="mt-2">
                            단순히 주가 상승률만으로 주도주를 판단하는 것이 아니라, 거래대금의 규모, 거래량의 급변 정도,
                            뉴스 미디어 노출 빈도, 그리고 테마 내에서의 자금 집중도까지 복합적으로 고려합니다.
                            이를 통해 일시적인 가격 변동이 아닌, 실질적으로 시장의 관심과 자금이 집중되는
                            종목을 파악할 수 있도록 설계하였습니다.
                        </p>
                    </Section>

                    <Section title="2. 점수 산출 요소">
                        <p>
                            TEBURN의 주도주 점수는 단일 지표가 아닌 여러 시장 신호를 종합적으로 평가합니다.
                            "왜 이 종목이 주도주인가?"라는 질문에 답하기 위해, 가격이 아닌 본질적인 시장 흐름을
                            추적하는 것이 핵심입니다.
                        </p>
                        <ul className="list-disc pl-5 space-y-3 mt-3">
                            <li>
                                <strong>거래대금</strong> — 해당 종목에 실제로 유입된 자금의 규모입니다.
                                상승률이 비슷해도 거래대금이 큰 종목이 진짜 시장의 관심을 받는 종목입니다.
                                시가총액 대비 비율도 함께 고려합니다.
                            </li>
                            <li>
                                <strong>상대 강도</strong> — 시장 전체(코스피·코스닥) 대비 얼마나 강한지를 측정합니다.
                                지수가 빠지는 날에도 자기 자리를 지키거나 오히려 상승하는 종목이 진짜 주도주입니다.
                            </li>
                            <li>
                                <strong>거래량 급증률</strong> — 평소 거래량 대비 당일 거래량이 얼마나 폭증했는지를
                                측정합니다. 거래량 폭증은 새로운 매수 주체의 진입 신호입니다.
                            </li>
                            <li>
                                <strong>대장주 집중도</strong> — 해당 종목이 속한 테마 내에서 자금이 얼마나 집중되어
                                있는지를 측정합니다. 같은 테마 안에서 가장 먼저 강하게 반응하는 종목,
                                즉 대장주에 자금이 몰립니다.
                            </li>
                            <li>
                                <strong>시세 패턴</strong> — 당일 한 번 시세가 나왔다가 가볍게 눌린 종목에 주목합니다.
                                첫 시세는 시장에 종목을 각인시키고, 그 다음 다시 살아나는 움직임이
                                진짜 주도주의 시작인 경우가 많습니다.
                            </li>
                            <li>
                                <strong>등락률</strong> — 당일 주가 상승률입니다. 다만 상승률은 결과 지표일 뿐,
                                거래대금이나 거래량 같은 본질 지표가 더 중요합니다.
                            </li>
                            <li>
                                <strong>시장 시선</strong> — 해당 종목이 뉴스에 얼마나 노출되고 있는지로
                                시장 참여자들의 관심을 측정합니다.
                            </li>
                            <li>
                                <strong>연속성 보너스</strong> — 며칠 연속 주도주 상위권에 등장한 종목에 가산점이
                                부여됩니다. 지속적으로 시장을 주도하는 종목은 단기 급등주와 다른 신뢰도를 가집니다.
                            </li>
                        </ul>
                    </Section>

                    <Section title="3. 등급 시스템">
                        <p>산출된 총점에 따라 다음과 같이 5단계 등급이 부여됩니다.</p>
                        <ul className="list-disc pl-5 space-y-2 mt-3">
                            <li>
                                <strong>S등급</strong> — 시장의 핵심 주도주입니다.
                                거래대금, 상대 강도, 거래량, 테마 집중도, 시세 패턴 등 모든 면에서
                                두각을 나타내는 종목으로, 당일 시장을 대표하는 최상위 종목입니다.
                            </li>
                            <li>
                                <strong>A등급</strong> — 강한 주도주 후보군입니다.
                                여러 지표에서 높은 점수를 기록하고 있으며, 시장 상황에 따라 S등급으로 상향될 가능성이 있습니다.
                            </li>
                            <li>
                                <strong>B등급</strong> — 주목할 만한 종목입니다.
                                일부 지표에서 양호한 수치를 보이고 있으나, 아직 모든 조건이 갖추어지지 않은 상태입니다.
                            </li>
                            <li>
                                <strong>C등급</strong> — 관심 종목 수준입니다.
                                상승세를 보이고 있으나 자금 유입이나 시장 관심이 제한적인 종목입니다.
                            </li>
                            <li>
                                <strong>D등급</strong> — 주도주 요건을 충족하지 못하는 종목입니다.
                                일부 지표에서만 소폭의 움직임이 관찰되는 상태입니다.
                            </li>
                        </ul>
                    </Section>

                    <Section title="4. 데이터 업데이트 주기">
                        <p>
                            주도주 점수는 주식시장 개장 시간(09:00~15:30) 동안 5분 간격으로 자동 갱신됩니다.
                            각 갱신 시점마다 최신 시세 데이터를 기반으로 7가지 지표를 재계산하여 점수와 등급을 업데이트합니다.
                        </p>
                        <p className="mt-2">
                            장 시작 직후에는 거래 데이터가 충분히 축적되지 않아 점수의 변동 폭이 클 수 있으며,
                            장중 시간이 경과할수록 보다 안정적인 점수가 산출됩니다.
                            장 마감 후에는 당일 최종 데이터를 기준으로 정산된 점수가 유지됩니다.
                        </p>
                        <p className="mt-2">
                            또한, 서버에서는 stale-while-revalidate 방식을 적용하여 이전 캐시 데이터를 즉시 제공하면서
                            백그라운드에서 새로운 데이터를 갱신합니다. 이를 통해 사용자는 지연 없이 최신에 가까운
                            데이터를 확인할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="5. 점수 활용 팁">
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong>S등급 알림 활용</strong> — TEBURN 텔레그램 봇(@teburn_hot_bot)을 통해
                                S등급 종목이 새로 포착될 때 실시간 알림을 받을 수 있습니다.
                                장중 빠르게 주도주를 확인하고 싶다면 알림 기능을 활용해 보세요.
                            </li>
                            <li>
                                <strong>등급 변화 추이 관찰</strong> — 단일 시점의 등급보다는 시간에 따른 등급 변화를
                                관찰하는 것이 더 유용합니다. B등급에서 A등급, 나아가 S등급으로 상향되는 종목은
                                지속적으로 시장의 관심이 확대되고 있음을 의미합니다.
                            </li>
                            <li>
                                <strong>복수 지표 확인</strong> — 총점뿐 아니라 개별 지표 점수도 함께 확인하세요.
                                거래대금과 등락률이 높지만 뉴스 점수가 낮은 경우, 아직 시장에 널리 알려지지 않은
                                초기 단계의 움직임일 수 있습니다. 반대로 뉴스 점수만 높고 거래대금이 낮다면
                                실제 자금 유입 없이 기사만 나오는 상황일 수 있습니다.
                            </li>
                            <li>
                                <strong>일일 요약 리포트</strong> — 매 거래일 장 마감 후 텔레그램 봇을 통해
                                당일 주도주 요약을 받아볼 수 있습니다. 하루의 시장 흐름을 빠르게 정리하는 데 도움이 됩니다.
                            </li>
                        </ul>
                    </Section>

                    <Section title="면책 조항">
                        <p>
                            본 점수 및 등급은 공개된 시장 데이터를 기반으로 자동 산출된 참고 자료이며,
                            특정 종목의 매수, 매도, 또는 보유를 권유하는 것이 아닙니다.
                            주도주 점수가 높다고 해서 해당 종목의 향후 수익을 보장하지 않으며,
                            모든 투자 판단과 그에 따른 결과는 투자자 본인에게 있습니다.
                        </p>
                        <p className="mt-2">
                            TEBURN은 정보의 정확성과 신뢰성을 위해 노력하고 있으나,
                            데이터 수집 및 처리 과정에서 오류가 발생할 수 있습니다.
                            투자 결정 시에는 반드시 본인의 판단과 추가적인 정보 확인을 병행하시기 바랍니다.
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
