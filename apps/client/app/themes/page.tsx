'use client';

import React from 'react';
import { Zap, Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';

// 더미 테마 데이터
const DUMMY_THEMES = [
    {
        name: '반도체',
        change: +2.3,
        stocks: ['삼성전자', 'SK하이닉스', '한미반도체'],
        newsCount: 12,
    },
    {
        name: '2차전지',
        change: -1.5,
        stocks: ['LG에너지솔루션', '삼성SDI', '에코프로'],
        newsCount: 8,
    },
    {
        name: 'AI/소프트웨어',
        change: +3.1,
        stocks: ['네이버', '카카오', '크래프톤'],
        newsCount: 15,
    },
    {
        name: '바이오/헬스케어',
        change: +0.2,
        stocks: ['셀트리온', '삼성바이오로직스', '유한양행'],
        newsCount: 6,
    },
    {
        name: '자동차',
        change: -0.8,
        stocks: ['현대차', '기아', '현대모비스'],
        newsCount: 9,
    },
    {
        name: '금융',
        change: +1.2,
        stocks: ['KB금융', '신한지주', '하나금융지주'],
        newsCount: 5,
    },
];

function Sidebar() {
    return (
        <aside className="w-64 bg-[#0B1120] border-r border-slate-800 hidden md:flex flex-col fixed h-full z-20">
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <Zap className="text-yellow-400 mr-2" size={20} fill="currentColor" />
                <span className="text-lg font-bold text-white tracking-wide">StockLight</span>
            </div>
            <nav className="flex-1 px-3 py-6 space-y-1">
                <Link
                    href="/"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all text-sm font-medium"
                >
                    <Newspaper size={18} />
                    <span>뉴스 피드</span>
                </Link>
                <Link
                    href="/themes"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-md bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500 transition-all text-sm font-medium"
                >
                    <TrendingUp size={18} />
                    <span>테마 현황</span>
                </Link>
            </nav>
        </aside>
    );
}

export default function ThemesPage() {
    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-indigo-500/30">
            <Sidebar />

            <main className="flex-1 md:ml-64 p-0">
                <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
                    <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                        테마별 시장 현황
                        <span className="text-xs text-slate-500 font-normal ml-2">더미 데이터</span>
                    </h1>
                </header>

                <div className="p-6 max-w-[1600px] mx-auto">
                    {/* 테마 카드 그리드 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {DUMMY_THEMES.map((theme) => {
                            const isPositive = theme.change > 0;
                            const isNegative = theme.change < 0;
                            const changeColor = isPositive
                                ? 'text-red-400'
                                : isNegative
                                    ? 'text-blue-400'
                                    : 'text-slate-400';
                            const changeBg = isPositive
                                ? 'bg-red-500/10 border-red-500/20'
                                : isNegative
                                    ? 'bg-blue-500/10 border-blue-500/20'
                                    : 'bg-slate-500/10 border-slate-500/20';

                            return (
                                <div
                                    key={theme.name}
                                    className="p-5 border border-slate-800 rounded-lg hover:bg-[#131b2e] hover:border-slate-700 transition-all cursor-pointer"
                                >
                                    {/* 헤더: 테마명 + 등락률 */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-white">{theme.name}</h3>
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${changeBg}`}>
                                            {isPositive ? (
                                                <TrendingUp size={16} className={changeColor} />
                                            ) : isNegative ? (
                                                <TrendingDown size={16} className={changeColor} />
                                            ) : (
                                                <Minus size={16} className={changeColor} />
                                            )}
                                            <span className={`text-sm font-bold ${changeColor}`}>
                                                {isPositive ? '+' : ''}{theme.change.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* 관련 종목 */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {theme.stocks.map((stock) => (
                                            <span
                                                key={stock}
                                                className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded"
                                            >
                                                {stock}
                                            </span>
                                        ))}
                                    </div>

                                    {/* 하단: 뉴스 개수 */}
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>관련 뉴스 {theme.newsCount}건</span>
                                        <span className="text-indigo-400 hover:text-indigo-300">자세히 보기 →</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 안내 문구 */}
                    <div className="mt-8 p-4 bg-slate-900/50 border border-slate-800 rounded-lg text-center">
                        <p className="text-sm text-slate-500">
                            실제 데이터 연동 예정 - 현재는 더미 데이터입니다
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
