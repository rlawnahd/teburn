import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'TEBURN 200% 활용하기 - TEBURN',
    description: 'TEBURN의 주요 기능과 각 탭별 활용 팁, 텔레그램 봇 연동 방법을 알아봅니다.',
};

export default function HowToUseTeburnPage() {
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
                        <h1 className="text-lg font-bold text-[var(--text-primary)]">TEBURN 200% 활용하기</h1>
                        <p className="text-[13px] text-[var(--text-tertiary)] mt-1">2025년 2월 25일</p>
                    </div>

                    <Section title="1. TEBURN 시작하기">
                        <p>
                            TEBURN은 별도의 회원가입이나 로그인 없이 누구나 바로 사용할 수 있는 주식 분석 서비스입니다.
                            사이트에 접속하면 곧바로 오늘의 주도주 현황을 확인할 수 있으며, 추가적인 설정 과정 없이
                            모든 기능을 자유롭게 이용할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            메인 화면 상단에는 주도주, 거래대금, 섹터, 캘린더 등 핵심 탭이 배치되어 있어
                            원하는 정보에 빠르게 접근할 수 있습니다. 상단 검색 기능(&#x2318;K)을 활용하면
                            특정 종목명이나 종목코드를 입력하여 바로 해당 종목의 상세 페이지로 이동할 수 있습니다.
                            다크 모드도 지원하므로, 장시간 모니터링 시 눈의 피로를 줄일 수 있습니다.
                        </p>
                    </Section>

                    <Section title="2. 주도주 탭 활용하기">
                        <p>
                            TEBURN의 핵심 기능인 주도주 탭에서는 현재 시장에서 가장 주목받는 종목들을 등급별로 확인할 수 있습니다.
                            각 종목은 거래량 변화, 가격 상승률, 뉴스 빈도 등 여러 지표를 종합하여 100점 만점으로 점수가 산출되며,
                            이를 기반으로 S, A, B, C, D 다섯 단계의 등급으로 분류됩니다.
                        </p>
                        <p className="mt-2">
                            S등급은 현재 시장에서 가장 강력한 주도주를 의미하며, 등급이 낮아질수록 상대적으로
                            주도주 특성이 약한 종목입니다. 상단의 등급 필터를 활용하면 원하는 등급의 종목만
                            선별하여 볼 수 있어 효율적인 분석이 가능합니다.
                        </p>
                        <p className="mt-2">
                            데이터는 장중 실시간으로 업데이트되므로, 시장 상황의 변화를 빠르게 포착할 수 있습니다.
                            특정 종목의 점수가 급격히 상승하거나 등급이 변경되는 것을 관찰하면,
                            해당 종목에 시장의 관심이 새롭게 집중되고 있다는 신호로 해석할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="3. 거래대금 · 섹터 · 캘린더 탭">
                        <p>
                            거래대금 탭에서는 당일 거래대금 기준으로 상위 종목들을 확인할 수 있습니다.
                            거래대금은 시장 참여자들의 실질적인 자금 흐름을 보여주는 지표로,
                            단순 거래량보다 더 정확하게 시장의 관심도를 파악하는 데 유용합니다.
                            거래대금이 급증한 종목은 기관이나 외국인의 대규모 매매가 이루어지고 있을 가능성이 높습니다.
                        </p>
                        <p className="mt-2">
                            섹터 탭에서는 업종별로 시장 상황을 분석할 수 있습니다. 어떤 업종이 강세를 보이고
                            어떤 업종이 약세인지 한눈에 파악할 수 있어, 시장 전체의 자금 흐름과 투자 트렌드를
                            이해하는 데 도움이 됩니다. 특정 섹터를 클릭하면 해당 업종에 속한 개별 종목들의
                            상세 현황도 확인할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            캘린더 탭에서는 실적 발표, 배당 기준일, 공모주 청약 등 주요 투자 일정을
                            날짜별로 확인할 수 있습니다. 중요한 일정을 사전에 파악해 두면
                            이벤트에 따른 주가 변동에 미리 대비할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="4. 종목 상세 페이지">
                        <p>
                            주도주 목록이나 검색 결과에서 특정 종목을 클릭하면 종목 상세 페이지로 이동합니다.
                            이 페이지에서는 해당 종목에 대한 다양한 정보를 종합적으로 확인할 수 있습니다.
                            실시간 주가 차트를 통해 가격 흐름을 시각적으로 파악하고, 최신 관련 뉴스를 통해
                            해당 종목에 영향을 미치는 이슈들을 확인할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            재무 정보 섹션에서는 매출액, 영업이익, 시가총액 등 기본적인 펀더멘털 지표를 제공하며,
                            테마 연관 종목 기능을 통해 동일 테마에 속한 다른 종목들의 현황도 함께 살펴볼 수 있습니다.
                            이를 통해 특정 테마의 전체적인 강세 여부를 판단하는 데 활용할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="5. 텔레그램 봇 연동">
                        <p>
                            TEBURN은 텔레그램 봇(@teburn_hot_bot)을 통해 실시간 알림 서비스를 제공합니다.
                            텔레그램 앱에서 &quot;@teburn_hot_bot&quot;을 검색하여 봇을 찾은 뒤,
                            /start 명령어를 입력하면 구독이 시작됩니다.
                        </p>
                        <p className="mt-2">
                            구독 후에는 S등급 주도주가 새롭게 등장할 때마다 실시간 알림을 받을 수 있어,
                            시장의 중요한 변화를 놓치지 않고 확인할 수 있습니다. 또한 평일 장 마감 후에는
                            당일의 주도주 현황을 정리한 일일 요약 리포트가 자동으로 발송됩니다.
                        </p>
                        <p className="mt-2">
                            /hot 명령어를 입력하면 현재 시점의 주도주 현황을 즉시 확인할 수 있으며,
                            /stop 명령어로 알림 수신을 일시 중지하거나, /help 명령어로 사용 가능한
                            명령어 목록을 확인할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="6. 활용 팁">
                        <p>
                            TEBURN을 보다 효과적으로 활용하기 위한 몇 가지 팁을 소개합니다.
                            먼저 장 시작 전(오전 9시 이전)에 전일의 주도주 현황과 등급 변화를 미리 확인해 두면,
                            당일 시장의 흐름을 예측하는 데 도움이 됩니다. 전일 S등급이었던 종목이 유지되고 있는지,
                            새로운 종목이 부상하고 있는지를 살펴보는 것이 좋습니다.
                        </p>
                        <p className="mt-2">
                            테마별로 강세 종목을 비교 분석하는 것도 유용한 방법입니다. 동일 테마 내에서
                            어떤 종목이 가장 높은 점수를 받고 있는지, 테마 전체적으로 점수가 상승하고 있는지
                            하락하고 있는지를 확인하면 해당 테마의 지속성을 판단하는 데 참고가 됩니다.
                        </p>
                        <p className="mt-2">
                            거래량이 급증한 종목은 반드시 주의 깊게 모니터링할 필요가 있습니다.
                            평소 대비 거래량이 크게 늘어난 종목은 새로운 재료가 발생했거나 수급에 큰 변화가
                            생겼을 가능성이 높으므로, 관련 뉴스와 함께 종합적으로 분석하는 것을 권장합니다.
                        </p>
                    </Section>

                    <Section title="면책 조항">
                        <p>
                            본 콘텐츠는 TEBURN 서비스의 기능 안내를 목적으로 작성되었으며,
                            특정 종목에 대한 매수, 매도, 보유 등의 투자 권유나 투자 조언이 아닙니다.
                            TEBURN에서 제공하는 주도주 점수, 등급 및 각종 데이터는 참고용 정보이며,
                            이를 기반으로 한 투자 판단에 대한 책임은 전적으로 투자자 본인에게 있습니다.
                            주식 투자는 원금 손실의 위험이 있으므로, 투자 결정 시에는 반드시 본인의 판단과
                            책임 하에 이루어져야 하며, 필요한 경우 전문 금융 상담사와 상의하시기 바랍니다.
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
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">{title}</h2>
            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {children}
            </div>
        </section>
    );
}
