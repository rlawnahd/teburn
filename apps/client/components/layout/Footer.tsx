'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] py-4 px-3">
            <div className="flex items-center justify-between max-w-screen-xl mx-auto">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                        &copy; {new Date().getFullYear()} TEBURN
                    </span>
                    <Link
                        href="/privacy"
                        className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                        개인정보처리방침
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="https://t.me/teburn_hot_bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                        title="텔레그램 알림봇"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        알림봇
                    </a>
                </div>
            </div>
        </footer>
    );
}
