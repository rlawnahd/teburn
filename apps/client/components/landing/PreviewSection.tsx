import Link from 'next/link';

export default function PreviewSection() {
    return (
        <section className="py-16 sm:py-20 bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
            <div className="max-w-[640px] mx-auto px-4 text-center">
                <h2 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] mb-3">
                    지금 바로 시작하세요
                </h2>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-8">
                    회원가입은 무료, 10초면 충분합니다.
                </p>

                <Link
                    href="/signup"
                    className="inline-flex items-center h-12 px-8 text-[15px] font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                        background: 'var(--brand-gradient)',
                        boxShadow: '0 4px 24px rgba(239, 68, 68, 0.25)',
                    }}
                >
                    무료로 시작하기
                </Link>

                <p className="mt-8 text-[12px] text-[var(--text-tertiary)] leading-relaxed">
                    TEBURN에서 제공하는 정보는 투자 참고용이며, 특정 종목의 매수 · 매도를 추천하지 않습니다.
                    <br />
                    투자에 대한 최종 판단과 책임은 이용자 본인에게 있습니다.
                </p>
            </div>
        </section>
    );
}
