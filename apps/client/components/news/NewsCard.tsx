'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Clock, Building2 } from 'lucide-react';
import { NewsItem } from '@/lib/api/news';

interface Props {
    news: NewsItem;
    isSelected: boolean;
    onClick: () => void;
}

const sentimentConfig = {
    positive: {
        label: '호재',
        bg: 'bg-red-500',
        text: 'text-white',
        icon: TrendingUp,
    },
    negative: {
        label: '악재',
        bg: 'bg-blue-500',
        text: 'text-white',
        icon: TrendingDown,
    },
    neutral: {
        label: '중립',
        bg: 'bg-slate-400',
        text: 'text-white',
        icon: null,
    },
};

export default function NewsCard({ news, isSelected, onClick }: Props) {
    const sentiment = news.sentiment || 'neutral';
    const stocks = news.stocks || [];
    const negativeStocks = news.negativeStocks || [];
    const themes = news.themes || [];
    const config = sentimentConfig[sentiment];
    const Icon = config.icon;

    // 시간 포맷
    const formatTime = (createdAt: string) => {
        const timePart = createdAt.split(' ')[1];
        return timePart || createdAt;
    };

    return (
        <article
            onClick={onClick}
            className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : 'border-transparent bg-white hover:border-slate-200 hover:shadow-sm'
            }`}
        >
            {/* 상단: 호재/악재 배지 + 시간 + 언론사 */}
            <div className="flex items-center gap-2 mb-3">
                {/* 호재/악재 배지 - 크고 눈에 띄게 */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${config.bg} ${config.text}`}>
                    {Icon && <Icon size={12} />}
                    {config.label}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={12} />
                    {formatTime(news.createdAt)}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Building2 size={12} />
                    {news.press}
                </div>
            </div>

            {/* 제목 - 크게 */}
            <h3 className={`text-base font-bold leading-snug mb-2 ${isSelected ? 'text-indigo-900' : 'text-slate-900'}`}>
                {news.title}
            </h3>

            {/* 종목 태그 - 호재/악재 구분 */}
            {(stocks.length > 0 || negativeStocks.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {stocks.map((stock, i) => (
                        <span
                            key={`stock-${i}`}
                            className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200"
                        >
                            {stock}
                        </span>
                    ))}
                    {negativeStocks.map((stock, i) => (
                        <span
                            key={`neg-${i}`}
                            className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200"
                        >
                            {stock}
                        </span>
                    ))}
                </div>
            )}

            {/* 테마 태그 */}
            {themes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {themes.map((theme, i) => (
                        <span
                            key={`theme-${i}`}
                            className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600"
                        >
                            #{theme}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
}
