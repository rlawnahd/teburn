export default function PreviewSection() {
    return (
        <section className="py-10 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
            <div className="max-w-[640px] mx-auto px-4 text-center">
                <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    TEBURN에서 제공하는 정보는 투자 참고용이며, 특정 종목의 매수 · 매도를 추천하지 않습니다.
                    <br />
                    투자에 대한 최종 판단과 책임은 이용자 본인에게 있습니다.
                </p>
            </div>
        </section>
    );
}
