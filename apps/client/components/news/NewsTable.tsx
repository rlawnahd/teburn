'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { NewsItem } from '@/lib/api/news';

interface Props {
    news: NewsItem[];
    selectedLink: string | null;
    onSelect: (news: NewsItem) => void;
}

export default function NewsTable({ news, selectedLink, onSelect }: Props) {
    const getSentimentIcon = (sentiment: string) => {
        if (sentiment === 'positive') {
            return <TrendingUp size={14} className="text-red-400" />;
        }
        if (sentiment === 'negative') {
            return <TrendingDown size={14} className="text-blue-400" />;
        }
        return <Minus size={14} className="text-slate-500" />;
    };

    const getSentimentBg = (sentiment: string) => {
        if (sentiment === 'positive') return 'bg-red-500/10 text-red-400';
        if (sentiment === 'negative') return 'bg-blue-500/10 text-blue-400';
        return 'bg-slate-700/50 text-slate-400';
    };


    // 날짜 간결하게 표시 (오늘이면 시간만, 아니면 MM/DD HH:mm)
    const formatTime = (createdAt: string) => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

        // "2024.12.09 09:32" 형태 파싱
        const [datePart, timePart] = createdAt.split(' ');

        if (datePart === todayStr) {
            return timePart || createdAt; // 오늘이면 시간만 (09:32)
        }

        // 오늘이 아니면 MM/DD 형태
        const parts = datePart?.split('.');
        if (parts && parts.length >= 3) {
            return `${parts[1]}/${parts[2]}`;
        }

        return timePart || createdAt;
    };

    return (
        <div className="overflow-hidden rounded-lg border border-slate-800">
            {/* 테이블 헤더 */}
            <div className="grid grid-cols-[60px_100px_50px_1fr] gap-2 px-3 py-2 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-500 font-medium">
                <div>시간</div>
                <div>종목</div>
                <div className="text-center">호/악</div>
                <div>제목</div>
            </div>

            {/* 테이블 바디 */}
            <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
                {news.map((item, idx) => {
                    const sentiment = item.sentiment || 'neutral';
                    const stocks = item.stocks || [];
                    const isSelected = selectedLink === item.link;

                    return (
                        <div
                            key={`${item.link}-${idx}`}
                            onClick={() => onSelect(item)}
                            className={`grid grid-cols-[60px_100px_50px_1fr] gap-2 px-3 py-2.5 border-b border-slate-800/50 cursor-pointer transition-all ${
                                isSelected
                                    ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
                                    : 'hover:bg-slate-800/50'
                            }`}
                        >
                            {/* 시간 */}
                            <div className="text-xs font-mono text-slate-500">
                                {formatTime(item.createdAt)}
                            </div>

                            {/* 종목 */}
                            <div className="flex items-center gap-1 overflow-hidden">
                                {stocks.length > 0 ? (
                                    <span className="text-xs font-semibold text-orange-300 truncate">
                                        {stocks[0]}
                                        {stocks.length > 1 && (
                                            <span className="text-slate-500 ml-1">+{stocks.length - 1}</span>
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-600">-</span>
                                )}
                            </div>

                            {/* 호재/악재 */}
                            <div className="flex justify-center">
                                <span className={`flex items-center justify-center w-6 h-6 rounded ${getSentimentBg(sentiment)}`}>
                                    {getSentimentIcon(sentiment)}
                                </span>
                            </div>

                            {/* 제목 */}
                            <div className="min-w-0">
                                <p className={`text-sm truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                    {item.title}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
