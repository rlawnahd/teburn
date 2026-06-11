import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: '개인정보처리방침 - TEBURN',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <main className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/" className="text-[14px] text-[var(--accent)] hover:underline">
                        &larr; 홈으로
                    </Link>
                </div>

                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-6 space-y-6">
                    <h1 className="text-lg font-bold text-[var(--text-primary)]">개인정보처리방침</h1>
                    <p className="text-[14px] text-[var(--text-tertiary)]">시행일: 2025년 2월 11일</p>

                    <Section title="1. 개인정보의 처리 목적">
                        <p>TEBURN(이하 &quot;서비스&quot;)은 다음의 목적을 위하여 개인정보를 처리합니다.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>서비스 제공 및 운영</li>
                            <li>서비스 이용 통계 및 분석</li>
                            <li>서비스 개선 및 신규 기능 개발</li>
                        </ul>
                    </Section>

                    <Section title="2. 수집하는 개인정보 항목">
                        <p>서비스는 별도의 회원가입 없이 이용할 수 있으며, 최소한의 정보만 자동으로 수집됩니다.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>자동 수집 항목: 접속 IP, 브라우저 유형, 접속 일시, 방문 페이지, 기기 정보</li>
                            <li>쿠키(Cookie): 서비스 이용 환경 설정(다크 모드 등) 저장 목적</li>
                        </ul>
                    </Section>

                    <Section title="3. 개인정보의 보유 및 이용 기간">
                        <p>수집된 정보는 서비스 이용 통계 목적으로만 활용되며, 수집일로부터 1년 이내에 파기합니다.</p>
                    </Section>

                    <Section title="4. 개인정보의 제3자 제공">
                        <p>서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>법령에 의한 요청이 있는 경우</li>
                            <li>이용자가 사전에 동의한 경우</li>
                        </ul>
                    </Section>

                    <Section title="5. 광고 서비스">
                        <p>서비스는 Google AdSense를 통해 광고를 게재할 수 있습니다. Google은 쿠키를 사용하여 이전 방문 기록을 기반으로 광고를 게재할 수 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>Google의 광고 쿠키 사용에 대해서는 <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Google 광고 정책</a>을 참고하시기 바랍니다.</li>
                            <li>Google Analytics를 사용하여 서비스 이용 통계를 수집합니다.</li>
                        </ul>
                    </Section>

                    <Section title="6. 이용자의 권리">
                        <p>이용자는 언제든지 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다.</p>
                    </Section>

                    <Section title="7. 개인정보 보호책임자">
                        <p>서비스의 개인정보 처리에 관한 문의는 아래로 연락해 주시기 바랍니다.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>서비스명: TEBURN</li>
                            <li>이메일: rlawnahd123@naver.com</li>
                        </ul>
                    </Section>

                    <Section title="8. 개인정보처리방침 변경">
                        <p>이 개인정보처리방침은 법령 및 서비스 정책 변경에 따라 변경될 수 있으며, 변경 시 서비스 내 공지합니다.</p>
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
