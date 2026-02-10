'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';
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

    // ESC로 닫기
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
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative max-w-lg mx-auto mt-12 mx-3">
                <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-lg">
                    {/* 검색 입력 */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)]">
                        <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => handleChange(e.target.value)}
                            placeholder="종목명 또는 종목코드 검색..."
                            className="flex-1 text-[13px] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
                                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* 결과 */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {isSearching && (
                            <div className="px-3 py-4 text-center text-[11px] text-[var(--text-tertiary)]">검색 중...</div>
                        )}
                        {!isSearching && query && results.length === 0 && (
                            <div className="px-3 py-4 text-center text-[11px] text-[var(--text-tertiary)]">검색 결과가 없습니다</div>
                        )}
                        {results.map((stock) => {
                            const isPositive = stock.changeRate > 0;
                            return (
                                <button
                                    key={stock.stockCode}
                                    onClick={() => handleSelect(stock.stockCode)}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-tertiary)] transition-colors text-left border-b border-[var(--border-color)] last:border-b-0"
                                >
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{stock.stockName}</div>
                                        <div className="text-[11px] text-[var(--text-tertiary)]">{stock.stockCode}</div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                        <div className="text-[13px] text-[var(--text-primary)]">{stock.currentPrice.toLocaleString()}</div>
                                        <div className={`text-[11px] font-medium ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* 힌트 */}
                    {!query && (
                        <div className="px-3 py-3 text-center text-[11px] text-[var(--text-tertiary)]">
                            종목명(삼성전자) 또는 종목코드(005930)로 검색
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Header() {
    const [showSearch, setShowSearch] = useState(false);

    // Ctrl+K / Cmd+K 단축키
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    return (
        <>
            <header className="h-10 border-b border-[var(--border-color)] flex items-center justify-between px-3 bg-[var(--bg-primary)] sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/teburn-text-logo.svg"
                            alt="TEBURN"
                            width={80}
                            height={20}
                            priority
                        />
                    </Link>
                    <span className="text-[11px] font-medium text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-1.5 py-0.5">BETA</span>
                </div>

                <div className="flex items-center gap-1">
                    {/* 검색 버튼 */}
                    <button
                        onClick={() => setShowSearch(true)}
                        className="flex items-center gap-1.5 h-6 px-2 border border-[var(--border-color)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors"
                    >
                        <Search size={11} />
                        <span className="text-[11px] hidden sm:inline">검색</span>
                        <kbd className="text-[11px] hidden sm:inline opacity-50 ml-1">⌘K</kbd>
                    </button>
                    <ThemeToggle />
                </div>
            </header>

            {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
        </>
    );
}
