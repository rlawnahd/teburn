import React from 'react';
import { TrendingUp, TrendingDown, ChevronRight, Sparkles } from 'lucide-react';
import { NewsItem } from '@/lib/api/news';

interface Props {
    data: NewsItem;
}

export default function NewsRow({ data }: Props) {
    const sentiment = data.sentiment || 'neutral';
    const stocks = data.stocks || [];
    const score = data.score || 50;
    const aiReason = data.aiReason || 'AI 분석 대기 중...';
    const isDetailed = data.isDetailed || false;

    const isPositive = sentiment === 'positive';
    const isNegative = sentiment === 'negative';

    const sentimentColor = isPositive ? 'text-red-400' : isNegative ? 'text-blue-400' : 'text-slate-400';
    const sentimentBg = isPositive
        ? 'bg-red-500/10 border-red-500/20'
        : isNegative
            ? 'bg-blue-500/10 border-blue-500/20'
            : 'bg-slate-500/10 border-slate-500/20';

    const handleClick = () => {
        window.open(data.link, '_blank', 'noopener,noreferrer');
    };

    // 상세 분석 뉴스 (상위 5개) - 큰 카드
    if (isDetailed) {
        return (
            <article
                onClick={handleClick}
                className="group p-5 border border-slate-800 rounded-lg hover:bg-[#131b2e] hover:border-slate-700 transition-all cursor-pointer mb-4"
            >
                {/* 상단: 배지 + 시간 + 언론사 */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center gap-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                        <Sparkles size={12} />
                        상세 분석
                    </span>
                    <span className="text-xs text-slate-500">{data.createdAt}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-slate-800 rounded text-slate-500">{data.press}</span>
                </div>

                {/* 제목 */}
                <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-indigo-400 transition-colors leading-tight">
                    {data.title}
                </h3>

                {/* 요약 (긴 버전) */}
                <p className="text-sm text-slate-400 mb-4 line-clamp-3 leading-relaxed">{data.summary}</p>

                {/* AI Analysis Box */}
                <div className="relative p-4 bg-slate-900/80 rounded-lg border border-slate-800/60 mb-4">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l"></div>
                    <p className="text-sm text-slate-400 pl-3 leading-relaxed">
                        <span className="text-indigo-400 font-semibold text-xs uppercase mr-2 tracking-wider">
                            AI Analysis
                        </span>
                        {aiReason}
                    </p>
                </div>

                {/* 하단: Sentiment + Score + 종목 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Sentiment */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${sentimentBg}`}>
                            {isPositive ? (
                                <TrendingUp size={14} className={sentimentColor} />
                            ) : isNegative ? (
                                <TrendingDown size={14} className={sentimentColor} />
                            ) : (
                                <div className="w-2 h-0.5 bg-slate-400"></div>
                            )}
                            <span className={`text-xs font-bold uppercase tracking-wide ${sentimentColor}`}>
                                {sentiment}
                            </span>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                            <span className="text-xs text-slate-500">Impact</span>
                            <span className={`text-sm font-mono font-bold ${score >= 80 ? 'text-yellow-400' : 'text-slate-400'}`}>
                                {score}
                            </span>
                        </div>
                    </div>

                    {/* 종목 태그 */}
                    <div className="flex items-center gap-2">
                        {stocks.length > 0 ? (
                            stocks.map((stock, i) => (
                                <span
                                    key={i}
                                    className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700"
                                >
                                    {stock}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-slate-600">종목 분석 대기</span>
                        )}
                        <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </div>
                </div>
            </article>
        );
    }

    // 일반 뉴스 (6번째 이후) - 작은 리스트
    return (
        <article
            onClick={handleClick}
            className="group flex items-center gap-4 p-3 border-b border-slate-800/50 hover:bg-[#131b2e] transition-colors cursor-pointer"
        >
            {/* 시간 */}
            <div className="w-16 text-xs text-slate-500 font-mono shrink-0">
                {data.createdAt.split(' ')[1] || data.createdAt}
            </div>

            {/* 언론사 */}
            <div className="w-20 shrink-0">
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-500">{data.press}</span>
            </div>

            {/* 제목 */}
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-300 group-hover:text-indigo-400 transition-colors truncate">
                    {data.title}
                </h3>
            </div>

            {/* Sentiment */}
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${sentimentBg}`}>
                {isPositive ? (
                    <TrendingUp size={12} className={sentimentColor} />
                ) : isNegative ? (
                    <TrendingDown size={12} className={sentimentColor} />
                ) : (
                    <div className="w-1.5 h-0.5 bg-slate-400"></div>
                )}
                <span className={`text-[10px] font-bold uppercase ${sentimentColor}`}>{sentiment}</span>
            </div>

            {/* Score */}
            <div className="w-12 text-right">
                <span className={`text-xs font-mono font-bold ${score >= 80 ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {score}
                </span>
            </div>

            <ChevronRight size={16} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
        </article>
    );
}
