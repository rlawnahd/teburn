import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '이용 가이드 - TEBURN',
    description: 'TEBURN의 주요 기능과 각 탭별 사용법, 텔레그램 봇 연동 방법을 안내합니다.',
};

export default function GuidePage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/" className="text-[14px] text-[var(--accent-blue)] hover:underline">
                        &larr; 홈으로
                    </Link>
                </div>

                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-6 space-y-6">
                    <h1 className="text-lg font-bold text-[var(--text-primary)]">이용 가이드</h1>
                    <p className="text-[14px] text-[var(--text-tertiary)]">
                        TEBURN의 주요 기능과 사용법을 안내합니다. 회원가입 없이 바로 이용할 수 있습니다.
                    </p>

                    <Section title="주도주 탭">
                        <p>
                            TEBURN의 핵심 기능입니다. 현재 시장에서 가장 주목받는 종목들을 주도주 점수 순으로 보여줍니다.
                        </p>
                        <p className="mt-2 font-medium text-[var(--text-primary)]">등급 의미</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li><span className="font-medium">S등급</span> (90점 이상) — 시장을 강하게 주도하는 종목. 거래량, 가격 상승, 뉴스 노출 모두 최상위</li>
                            <li><span className="font-medium">A등급</span> (75~89점) — 높은 관심을 받는 종목. 주도주 후보군</li>
                            <li><span className="font-medium">B등급</span> (60~74점) — 보통 수준의 관심. 상승 여력 관찰 필요</li>
                            <li><span className="font-medium">C등급</span> (45~59점) — 낮은 관심. 시장 주도력이 약한 상태</li>
                            <li><span className="font-medium">D등급</span> (44점 이하) — 최소 관심. 현재 시장에서 주목받지 못하는 종목</li>
                        </ul>
                        <p className="mt-2">
                            점수는 장중 5분 간격으로 업데이트되며, 등급 옆의 점수 변화 표시를 통해 추세를 확인할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="거래대금 탭">
                        <p>
                            당일 거래대금 기준으로 상위 종목들을 보여줍니다.
                            거래대금은 거래량에 가격을 곱한 값으로, 실제로 얼마나 많은 자금이 해당 종목에 유입되고 있는지를 나타냅니다.
                            거래대금이 높은 종목일수록 시장의 관심이 집중되고 있다는 의미입니다.
                        </p>
                    </Section>

                    <Section title="섹터 탭">
                        <p>
                            업종(섹터)별로 시장 동향을 한눈에 파악할 수 있습니다.
                            각 섹터의 등락률과 주요 종목들의 현황을 확인하여, 어떤 업종이 강세인지 또는 약세인지 빠르게 판단할 수 있습니다.
                            특정 섹터를 클릭하면 해당 업종에 속한 종목들의 상세 정보를 볼 수 있습니다.
                        </p>
                    </Section>

                    <Section title="캘린더 탭">
                        <p>
                            실적 발표, 배당, 공모주 청약 등 주요 주식 관련 일정을 달력 형태로 보여줍니다.
                            중요한 이벤트를 미리 확인하여 투자 계획 수립에 참고할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="지수 탭">
                        <p>
                            코스피, 코스닥 등 주요 시장 지수의 현황을 확인할 수 있습니다.
                            전체 시장의 흐름을 파악하고, 개별 종목의 움직임과 비교하는 데 활용할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="종목 상세 페이지">
                        <p>
                            종목명을 클릭하면 해당 종목의 상세 페이지로 이동합니다. 상세 페이지에서는 다음 정보를 확인할 수 있습니다.
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>실시간 차트 및 시세 정보</li>
                            <li>관련 최신 뉴스</li>
                            <li>종목이 속한 테마 정보</li>
                            <li>주도주 점수 변화 추이</li>
                        </ul>
                    </Section>

                    <Section title="테마 페이지">
                        <p>
                            테마별로 관련 종목들을 묶어 보여줍니다. AI, 2차전지, 반도체 등 현재 시장에서 관심받는 테마와
                            해당 테마에 속한 종목들의 등락 현황을 한눈에 확인할 수 있습니다.
                            테마 페이지에서 각 종목의 주도주 점수도 함께 표시되므로, 테마 내에서 가장 강한 종목을 빠르게 파악할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="검색 기능">
                        <p>
                            상단의 검색 아이콘을 클릭하거나 단축키 <span className="font-mono bg-[var(--bg-secondary)] px-1 rounded">&#8984;K</span>를 눌러
                            종목명 또는 종목 코드로 빠르게 검색할 수 있습니다. 검색 결과에서 종목을 선택하면 해당 종목의 상세 페이지로 바로 이동합니다.
                        </p>
                    </Section>

                    <Section title="텔레그램 봇 연동">
                        <p>
                            TEBURN 텔레그램 봇을 통해 주도주 알림을 실시간으로 받아볼 수 있습니다.
                        </p>
                        <ol className="list-decimal pl-5 space-y-1 mt-2">
                            <li>텔레그램에서 <a href="https://t.me/teburn_hot_bot" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-blue)] hover:underline">@teburn_hot_bot</a>을 검색합니다.</li>
                            <li><span className="font-mono bg-[var(--bg-secondary)] px-1 rounded">/start</span> 명령어를 입력하여 구독을 시작합니다.</li>
                            <li>S등급 주도주가 새로 등장하면 실시간 알림을 받습니다.</li>
                            <li>매일 평일 오후 3시 40분에 일일 요약을 받습니다.</li>
                        </ol>
                        <p className="mt-2">
                            <span className="font-mono bg-[var(--bg-secondary)] px-1 rounded">/hot</span> 명령어로 현재 주도주 현황을 즉시 확인할 수도 있습니다.
                            알림을 중단하려면 <span className="font-mono bg-[var(--bg-secondary)] px-1 rounded">/stop</span>을 입력하세요.
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
