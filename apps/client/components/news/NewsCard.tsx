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
        bg: 'bg-[var(--rise-color)]',
        text: 'text-white',
        icon: TrendingUp,
    },
    negative: {
        label: '악재',
        bg: 'bg-[var(--fall-color)]',
        text: 'text-white',
        icon: TrendingDown,
    },
    neutral: {
        label: '중립',
        bg: 'bg-[var(--text-tertiary)]',
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

    const formatTime = (createdAt: string) => {
        const timePart = createdAt.split(' ')[1];
        return timePart || createdAt;
    };

    return (
        <article
            onClick={onClick}
            className={`p-5 rounded-2xl cursor-pointer transition-all border-2 ${
                isSelected
                    ? 'border-[var(--accent-blue)] bg-[var(--accent-blue-light)] shadow-[var(--shadow-md)]'
                    : 'border-transparent bg-[var(--bg-primary)] hover:border-[var(--border-color)] hover:shadow-[var(--shadow-sm)]'
            }`}
        >
            {/* 상단: 호재/악재 배지 + 시간 + 언론사 */}
            <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${config.bg} ${config.text}`}>
                    {Icon && <Icon size={12} />}
                    {config.label}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <Clock size={12} />
                    {formatTime(news.createdAt)}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <Building2 size={12} />
                    {news.press}
                </div>
            </div>

            {/* 제목 */}
            <h3 className={`text-base font-bold leading-snug mb-3 ${isSelected ? 'text-[var(--accent-blue)]' : 'text-[var(--text-primary)]'}`}>
                {news.title}
            </h3>

            {/* 종목 태그 - 호재/악재 구분 */}
            {(stocks.length > 0 || negativeStocks.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {stocks.map((stock, i) => (
                        <span
                            key={`stock-${i}`}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--rise-bg)] text-[var(--rise-color)]"
                        >
                            {stock}
                        </span>
                    ))}
                    {negativeStocks.map((stock, i) => (
                        <span
                            key={`neg-${i}`}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--fall-bg)] text-[var(--fall-color)]"
                        >
                            {stock}
                        </span>
                    ))}
                </div>
            )}

            {/* 테마 태그 */}
            {themes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {themes.map((theme, i) => (
                        <span
                            key={`theme-${i}`}
                            className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                        >
                            #{theme}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
}
