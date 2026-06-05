import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
            <div className="text-center px-4">
                <div className="text-6xl font-bold text-[var(--text-disabled)] mb-2">404</div>
                <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    페이지를 찾을 수 없습니다
                </h1>
                <p className="text-[14px] text-[var(--text-tertiary)] mb-6">
                    요청하신 페이지가 존재하지 않거나 이동되었습니다.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium bg-[var(--text-primary)] text-[var(--bg-primary)] rounded transition-colors hover:opacity-90"
                >
                    홈으로 돌아가기
                </Link>
            </div>
        </div>
    );
}
