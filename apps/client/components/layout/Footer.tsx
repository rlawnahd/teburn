'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] py-4 px-4">
            <div className="flex items-center justify-between max-w-screen-xl mx-auto">
                <span className="text-[13px] text-[var(--text-tertiary)]">
                    &copy; {new Date().getFullYear()} TEBURN
                </span>
                <Link
                    href="/privacy"
                    className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                    개인정보처리방침
                </Link>
            </div>
        </footer>
    );
}
