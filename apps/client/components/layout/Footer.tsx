'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] py-4 px-4">
            <div className="max-w-screen-xl mx-auto space-y-3">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                    <Link
                        href="/about"
                        className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                        서비스 소개
                    </Link>
                    <Link
                        href="/guide"
                        className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                        이용 가이드
                    </Link>
                    <Link
                        href="/faq"
                        className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                        FAQ
                    </Link>
                    <Link
                        href="/terms"
                        className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                        이용약관
                    </Link>
                    <Link
                        href="/privacy"
                        className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                        개인정보처리방침
                    </Link>
                </div>
                <div className="text-center">
                    <span className="text-[13px] text-[var(--text-tertiary)]">
                        &copy; {new Date().getFullYear()} TEBURN
                    </span>
                </div>
            </div>
        </footer>
    );
}
