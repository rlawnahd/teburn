import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '자주 묻는 질문 - TEBURN',
    description: 'TEBURN 서비스 이용에 관한 자주 묻는 질문과 답변을 확인하세요.',
};

export default function FaqPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/" className="text-[14px] text-[var(--accent-blue)] hover:underline">
                        &larr; 홈으로
                    </Link>
                </div>

                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-6 space-y-6">
                    <h1 className="text-lg font-bold text-[var(--text-primary)]">자주 묻는 질문</h1>

                    <QnA question="TEBURN은 어떤 서비스인가요?">
                        <p>
                            TEBURN은 한국 주식 시장의 주도주를 실시간으로 분석하여 보여주는 무료 서비스입니다.
                            거래량, 가격 변동률, 뉴스 노출 빈도 등 다양한 지표를 종합 분석하여 자체 &quot;주도주 점수&quot;를 산출하고,
                            이를 S/A/B/C/D 등급으로 분류하여 제공합니다.
                            회원가입 없이 누구나 웹 브라우저에서 바로 이용할 수 있습니다.
                        </p>
                    </QnA>

                    <QnA question="데이터는 얼마나 자주 업데이트되나요?">
                        <p>
                            장중(오전 9시~오후 3시 30분)에는 5분 간격으로 주도주 점수와 시세 데이터가 업데이트됩니다.
                            장 마감 후에는 최종 정산된 데이터가 반영됩니다. 뉴스 데이터는 수시로 수집됩니다.
                        </p>
                    </QnA>

                    <QnA question="주도주 점수란 무엇인가요?">
                        <p>
                            주도주 점수는 TEBURN이 자체적으로 산출하는 100점 만점의 종합 지표입니다.
                            특정 종목이 현재 시장에서 얼마나 강한 주도력을 보이는지를 수치화한 것으로,
                            거래량 변화율, 가격 상승률, 뉴스 노출 빈도, 시가총액 대비 거래대금 비율 등이 반영됩니다.
                            자세한 산출 원리는 <Link href="/articles/how-hotness-score-works" className="text-[var(--accent-blue)] hover:underline">주도주 점수 산출 원리</Link> 글에서 확인하실 수 있습니다.
                        </p>
                    </QnA>

                    <QnA question="등급(S/A/B/C/D) 기준은 어떻게 되나요?">
                        <p>주도주 점수에 따라 다음과 같이 등급이 부여됩니다.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li><span className="font-medium">S등급</span> — 90점 이상. 시장을 강하게 주도하는 최상위 종목</li>
                            <li><span className="font-medium">A등급</span> — 75~89점. 높은 시장 관심을 받는 종목</li>
                            <li><span className="font-medium">B등급</span> — 60~74점. 보통 수준의 관심을 받는 종목</li>
                            <li><span className="font-medium">C등급</span> — 45~59점. 시장 주도력이 약한 종목</li>
                            <li><span className="font-medium">D등급</span> — 44점 이하. 현재 시장에서 주목받지 못하는 종목</li>
                        </ul>
                    </QnA>

                    <QnA question="TEBURN은 무료인가요?">
                        <p>
                            네, TEBURN의 모든 기능은 완전히 무료입니다.
                            회원가입도 필요 없으며, 텔레그램 봇 알림 서비스도 무료로 이용할 수 있습니다.
                            서비스 운영 비용은 광고 수익으로 충당하고 있습니다.
                        </p>
                    </QnA>

                    <QnA question="TEBURN이 종목을 추천해 주나요?">
                        <p>
                            아닙니다. TEBURN은 특정 종목의 매수·매도를 추천하지 않습니다.
                            TEBURN이 제공하는 주도주 점수와 등급은 현재 시장에서 해당 종목이 받고 있는 관심도를 수치화한 것일 뿐,
                            해당 종목의 향후 주가 방향을 예측하거나 투자를 권유하는 것이 아닙니다.
                            모든 투자 판단과 그에 따른 책임은 이용자 본인에게 있습니다.
                        </p>
                    </QnA>

                    <QnA question="모바일에서도 사용할 수 있나요?">
                        <p>
                            네, TEBURN은 반응형 웹으로 제작되어 스마트폰과 태블릿에서도 최적화된 화면으로 이용할 수 있습니다.
                            별도의 앱 설치 없이 모바일 브라우저에서 teburn.com에 접속하시면 됩니다.
                            추가로 텔레그램 봇을 통해 모바일에서 실시간 알림을 받을 수도 있습니다.
                        </p>
                    </QnA>

                    <QnA question="텔레그램 봇은 어떻게 이용하나요?">
                        <p>텔레그램 앱에서 다음 단계를 따라 주세요.</p>
                        <ol className="list-decimal pl-5 space-y-1 mt-2">
                            <li><a href="https://t.me/teburn_hot_bot" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-blue)] hover:underline">@teburn_hot_bot</a>을 검색하여 대화를 시작합니다.</li>
                            <li><span className="font-mono bg-[var(--bg-secondary)] px-1 rounded">/start</span>를 입력하면 알림 구독이 시작됩니다.</li>
                            <li>S등급 주도주 등장 시 실시간 알림, 평일 오후 3시 40분에 일일 요약을 받을 수 있습니다.</li>
                        </ol>
                    </QnA>

                    <QnA question="데이터 출처는 어디인가요?">
                        <p>
                            TEBURN은 네이버 금융과 한국투자증권 KIS Open API에서 시세, 거래량, 뉴스, 테마 등의 데이터를 수집합니다.
                            수집된 데이터는 TEBURN의 자체 알고리즘을 통해 가공되어 주도주 점수로 산출됩니다.
                        </p>
                    </QnA>

                    <QnA question="문의사항이 있으면 어떻게 하나요?">
                        <p>
                            서비스 이용 중 문의사항이나 개선 의견이 있으시면 이메일(<span className="text-[var(--accent-blue)]">rlawnahd123@naver.com</span>)로 연락해 주세요.
                            가능한 빠르게 답변드리겠습니다.
                        </p>
                    </QnA>
                </div>
            </main>
        </div>
    );
}

function QnA({ question, children }: { question: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Q. {question}</h2>
            <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                {children}
            </div>
        </section>
    );
}
