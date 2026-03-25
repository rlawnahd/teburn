import { Suspense } from 'react';
import HomeContent from '@/components/home/HomeContent';

export const dynamic = 'force-dynamic';

function HomeLoading() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
            <div className="text-[13px] text-[var(--text-tertiary)]">로딩 중...</div>
        </div>
    );
}

export default function HomePage() {
    return (
        <>
            <Suspense fallback={<HomeLoading />}>
                <HomeContent />
            </Suspense>

            {/* SSR 정적 소개 섹션 — 크롤러가 읽을 수 있는 텍스트 콘텐츠 */}
            <section className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
                <div className="max-w-[1280px] mx-auto px-4 py-10">
                    <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-6 text-center">
                        TEBURN — 오늘의 주도주를 한눈에
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FeatureCard
                            title="실시간 주도주 분석"
                            description="거래량, 가격 변동률, 뉴스 빈도 등을 종합 분석하여 시장을 이끄는 종목을 S·A·B·C·D 등급으로 분류합니다. 장중 5분 간격으로 업데이트됩니다."
                        />
                        <FeatureCard
                            title="거래대금 · 섹터 · 지수"
                            description="거래대금 상위 종목, 업종별 시장 동향, 코스피·코스닥 지수 현황까지 하나의 화면에서 확인할 수 있습니다."
                        />
                        <FeatureCard
                            title="테마별 종목 분류"
                            description="AI, 2차전지, 반도체 등 시장에서 주목받는 테마와 해당 테마에 속한 종목들의 등락 현황을 한눈에 파악할 수 있습니다."
                        />
                        <FeatureCard
                            title="종목 상세 분석"
                            description="개별 종목의 차트, 최신 뉴스, 관련 테마, 주도주 점수 변화 추이를 상세 페이지에서 확인할 수 있습니다."
                        />
                        <FeatureCard
                            title="텔레그램 실시간 알림"
                            description="S등급 주도주가 새로 등장하면 텔레그램으로 실시간 알림을 받고, 매일 장 마감 후 일일 요약을 받아볼 수 있습니다."
                        />
                        <FeatureCard
                            title="무료 · 간편 로그인"
                            description="TEBURN의 모든 기능은 완전 무료이며, 카카오 또는 Google 계정으로 10초 만에 시작할 수 있습니다."
                        />
                    </div>

                    <p className="mt-6 text-[12px] text-[var(--text-tertiary)] text-center leading-relaxed">
                        TEBURN에서 제공하는 정보는 투자 참고용이며, 특정 종목의 매수·매도를 추천하지 않습니다.
                        투자에 대한 최종 판단과 책임은 이용자 본인에게 있습니다.
                    </p>
                </div>
            </section>
        </>
    );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
    return (
        <div className="card p-4">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{description}</p>
        </div>
    );
}
