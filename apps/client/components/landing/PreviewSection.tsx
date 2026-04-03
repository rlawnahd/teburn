import Link from 'next/link';

export default function PreviewSection() {
    return (
        <section className="py-16 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
            <div className="max-w-[640px] mx-auto px-4 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-3">
                    지금 시장을 확인하세요
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mb-8">
                    매일 장 시작과 함께, 돈이 몰리는 종목을 실시간으로.
                </p>

                <Link
                    href="/login"
                    className="inline-flex items-center h-12 px-8 text-base font-semibold text-white rounded-xl transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'var(--accent-blue)' }}
                >
                    무료로 시작하기
                </Link>

                <p className="mt-10 text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    TEBURN에서 제공하는 정보는 투자 참고용이며, 특정 종목의 매수 · 매도를 추천하지 않습니다.
                    <br />
                    투자에 대한 최종 판단과 책임은 이용자 본인에게 있습니다.
                </p>
            </div>
        </section>
    );
}
