import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '이용약관 - TEBURN',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/" className="text-[13px] text-[var(--accent-blue)] hover:underline">
                        &larr; 홈으로
                    </Link>
                </div>

                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-6 space-y-6">
                    <h1 className="text-lg font-bold text-[var(--text-primary)]">이용약관</h1>
                    <p className="text-[13px] text-[var(--text-tertiary)]">시행일: 2025년 2월 25일</p>

                    <Section title="제1조 (목적)">
                        <p>
                            이 약관은 TEBURN(이하 &quot;서비스&quot;)이 제공하는 주식 시장 정보 서비스의 이용 조건 및 절차,
                            이용자와 서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
                        </p>
                    </Section>

                    <Section title="제2조 (정의)">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>&quot;서비스&quot;란 TEBURN이 웹사이트(teburn.com) 및 텔레그램 봇을 통해 제공하는 주식 시장 정보 분석 서비스를 말합니다.</li>
                            <li>&quot;이용자&quot;란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
                            <li>&quot;주도주 점수&quot;란 서비스가 자체 알고리즘으로 산출하는 종목별 시장 관심도 지표를 말합니다.</li>
                        </ul>
                    </Section>

                    <Section title="제3조 (약관의 효력 및 변경)">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
                            <li>서비스는 필요한 경우 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 서비스 내 공지합니다.</li>
                            <li>변경된 약관에 동의하지 않는 이용자는 서비스 이용을 중단할 수 있습니다.</li>
                        </ul>
                    </Section>

                    <Section title="제4조 (서비스의 제공)">
                        <p>서비스는 다음과 같은 기능을 제공합니다.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>주도주 점수 및 등급 정보</li>
                            <li>종목별 시세, 거래량, 뉴스 정보</li>
                            <li>테마별·섹터별 시장 동향</li>
                            <li>텔레그램 봇을 통한 알림 서비스</li>
                            <li>기타 서비스가 추가 개발하여 제공하는 기능</li>
                        </ul>
                    </Section>

                    <Section title="제5조 (서비스 이용)">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>서비스는 별도의 회원가입 없이 무료로 이용할 수 있습니다.</li>
                            <li>서비스는 연중무휴, 1일 24시간 제공을 원칙으로 합니다. 다만, 시스템 점검이나 기술적 장애 등의 사유로 일시 중단될 수 있습니다.</li>
                            <li>서비스가 제공하는 데이터는 장중 일정 간격으로 업데이트되며, 실시간 시세와 차이가 있을 수 있습니다.</li>
                        </ul>
                    </Section>

                    <Section title="제6조 (이용자의 의무)">
                        <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>서비스의 운영을 방해하는 행위</li>
                            <li>서비스에서 제공하는 정보를 무단으로 수집, 복제, 배포하는 행위</li>
                            <li>서비스의 시스템에 부당한 접근을 시도하는 행위</li>
                            <li>타인의 명예를 훼손하거나 불이익을 주는 행위</li>
                            <li>기타 관련 법령에 위반되는 행위</li>
                        </ul>
                    </Section>

                    <Section title="제7조 (투자 관련 면책)">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>서비스에서 제공하는 모든 정보(주도주 점수, 등급, 뉴스 등)는 투자 참고 자료이며, 특정 종목의 매수·매도를 권유하거나 추천하지 않습니다.</li>
                            <li>서비스의 정보를 기반으로 한 투자 판단 및 그에 따른 손익에 대한 책임은 전적으로 이용자 본인에게 있습니다.</li>
                            <li>서비스는 데이터의 정확성과 신뢰성을 위해 노력하지만, 정보의 완전성이나 정확성을 보장하지 않습니다.</li>
                            <li>시세 데이터는 실시간 데이터와 차이가 발생할 수 있으며, 이로 인한 투자 손실에 대해 서비스는 책임을 지지 않습니다.</li>
                        </ul>
                    </Section>

                    <Section title="제8조 (지적재산권)">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>서비스가 제작한 콘텐츠(디자인, 텍스트, 알고리즘 등)에 대한 저작권 및 지적재산권은 서비스에 귀속됩니다.</li>
                            <li>이용자는 서비스에서 제공하는 정보를 개인적인 용도로만 사용할 수 있으며, 상업적 목적으로 무단 이용할 수 없습니다.</li>
                        </ul>
                    </Section>

                    <Section title="제9조 (서비스의 변경 및 중단)">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>서비스는 운영상, 기술상의 필요에 따라 제공하는 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</li>
                            <li>서비스 변경 또는 중단 시 서비스 내 공지를 통해 이용자에게 알립니다.</li>
                            <li>무료로 제공되는 서비스의 변경 또는 중단에 대해 별도의 보상을 하지 않습니다.</li>
                        </ul>
                    </Section>

                    <Section title="제10조 (준거법 및 관할)">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>본 약관의 해석 및 서비스 이용에 관한 분쟁은 대한민국 법률에 따릅니다.</li>
                            <li>서비스 이용과 관련하여 발생한 분쟁에 대해서는 민사소송법상의 관할 법원에 소를 제기할 수 있습니다.</li>
                        </ul>
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
