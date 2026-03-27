'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Search, X, Menu } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

import { useAuth } from '@/hooks/useAuth';
import { searchStocks, SearchStockResult } from '@/lib/api/stocks';

function SearchModal({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchStockResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const data = await searchStocks(q);
            setResults(data);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleChange = (value: string) => {
        setQuery(value);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => handleSearch(value), 200);
    };

    const handleSelect = (stockCode: string) => {
        onClose();
        router.push(`/stocks/${encodeURIComponent(stockCode)}`);
    };

    return (
        <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/40 animate-backdropIn" onClick={onClose} />
            <div className="relative max-w-lg mx-3 sm:mx-auto mt-12 animate-scaleIn">
                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)]">
                        <Search size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => handleChange(e.target.value)}
                            placeholder="종목명 또는 종목코드 검색..."
                            className="flex-1 text-[14px] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border-none"
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
                                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                        {isSearching && (
                            <div className="px-4 py-4 text-center text-sm text-[var(--text-tertiary)]">검색 중...</div>
                        )}
                        {!isSearching && query && results.length === 0 && (
                            <div className="px-4 py-4 text-center text-sm text-[var(--text-tertiary)]">검색 결과가 없습니다</div>
                        )}
                        {results.map((stock) => {
                            const isPositive = stock.changeRate > 0;
                            return (
                                <button
                                    key={stock.stockCode}
                                    onClick={() => handleSelect(stock.stockCode)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors text-left border-b border-[var(--border-color)] last:border-b-0"
                                >
                                    <div className="min-w-0">
                                        <div className="text-[14px] font-medium text-[var(--text-primary)] truncate">{stock.stockName}</div>
                                        <div className="text-[12px] text-[var(--text-tertiary)]">{stock.stockCode}</div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                        <div className="text-[14px] text-[var(--text-primary)]">{stock.currentPrice.toLocaleString()}</div>
                                        <div className={`text-[12px] font-medium ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {!query && (
                        <div className="px-4 py-3 text-center text-sm text-[var(--text-tertiary)]">
                            종목명(삼성전자) 또는 종목코드(005930)로 검색
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const NAV_LINKS = [
    { href: '/', label: '홈', authRequired: false },
    { href: '/guide', label: '가이드', authRequired: false },
];

export default function Header() {
    const pathname = usePathname();
    const { user, isLoggedIn, logout } = useAuth();
    const [showSearch, setShowSearch] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
            if (e.key === 'Escape' && showMobileMenu) {
                setShowMobileMenu(false);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [showMobileMenu]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <header
                className={`${scrolled ? 'h-10' : 'h-12'} border-b border-[var(--border-color)] flex items-center justify-between px-4 bg-[var(--bg-primary)] sticky top-0 z-50 transition-all duration-200 ${
                    scrolled ? 'shadow-[var(--shadow-header)]' : ''
                }`}
            >
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/teburn-text-logo.svg"
                            alt="TEBURN"
                            width={scrolled ? 75 : 90}
                            height={scrolled ? 20 : 24}
                            priority
                        />
                    </Link>
                    {/* 데스크톱 네비 */}
                    <nav className="hidden md:flex items-center gap-1 ml-2">
                        {NAV_LINKS.filter((link) => !link.authRequired || isLoggedIn).map((link) => {
                            const isActive = link.href === '/'
                                ? pathname === '/'
                                : pathname.startsWith(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-2.5 py-1.5 text-sm transition-colors rounded ${
                                        isActive
                                            ? 'text-[var(--text-primary)] font-medium'
                                            : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* 텔레그램 — 데스크톱 */}
                    <a
                        href="https://t.me/teburn_hot_bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded"
                        title="텔레그램 알림봇"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        <span className="text-[12px]">알림봇</span>
                    </a>

                    {/* 검색 버튼 */}
                    <button
                        onClick={() => setShowSearch(true)}
                        className="flex items-center gap-1.5 h-8 px-2.5 border border-[var(--border-color)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors rounded"
                    >
                        <Search size={14} />
                        <span className="text-[12px] hidden sm:inline">검색</span>
                        <kbd className="text-xs hidden sm:inline opacity-40 ml-1">⌘K</kbd>
                    </button>

                    {/* 로그인/로그아웃 */}
                    {isLoggedIn ? (
                        <div className="hidden sm:flex items-center gap-1.5">
                            {user?.profileImage && (
                                <img
                                    src={user.profileImage}
                                    alt={user.name}
                                    className="w-6 h-6 rounded-full"
                                />
                            )}
                            <button
                                onClick={logout}
                                className="h-8 px-2.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded"
                            >
                                로그아웃
                            </button>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="hidden sm:flex items-center h-8 px-3 text-[12px] font-medium bg-[var(--accent-color)] text-white rounded hover:opacity-90 transition-opacity"
                        >
                            로그인
                        </Link>
                    )}

                    <ThemeToggle />

                    {/* 모바일 햄버거 */}
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="md:hidden flex items-center justify-center w-8 h-8 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </header>

            {/* 모바일 메뉴 */}
            {showMobileMenu && (
                <>
                <div className="md:hidden fixed inset-0 top-12 z-30" onClick={() => setShowMobileMenu(false)} />
                <div className="md:hidden fixed inset-x-0 top-12 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] shadow-lg animate-slideDown">
                    <nav className="p-3 space-y-1">
                        {NAV_LINKS.filter((link) => !link.authRequired || isLoggedIn).map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setShowMobileMenu(false)}
                                className="block px-3 py-2.5 text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors rounded"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <a
                            href="https://t.me/teburn_hot_bot"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setShowMobileMenu(false)}
                            className="flex items-center gap-2 px-3 py-2.5 text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors rounded"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg>
                            텔레그램 알림봇
                        </a>
                        {isLoggedIn ? (
                            <button
                                onClick={() => { logout(); setShowMobileMenu(false); }}
                                className="w-full text-left px-3 py-2.5 text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors rounded"
                            >
                                로그아웃
                            </button>
                        ) : (
                            <Link
                                href="/login"
                                onClick={() => setShowMobileMenu(false)}
                                className="block px-3 py-2.5 text-[14px] font-medium text-[var(--accent-color)] hover:bg-[var(--bg-tertiary)] transition-colors rounded"
                            >
                                로그인
                            </Link>
                        )}
                    </nav>
                </div>
                </>
            )}

            {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
        </>
    );
}
