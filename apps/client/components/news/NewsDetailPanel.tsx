'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ExternalLink, Sparkles, Tag, Loader2, Zap } from 'lucide-react';
import { NewsItem, analyzeNewsItem, AnalysisResult } from '@/lib/api/news';

interface Props {
    news: NewsItem | null;
    onAnalyzed?: (link: string, result: AnalysisResult) => void;
}

const sentimentLabel = {
    positive: '호재',
    negative: '악재',
    neutral: '중립',
};

export default function NewsDetailPanel({ news, onAnalyzed }: Props) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [localAnalysis, setLocalAnalysis] = useState<Record<string, AnalysisResult>>({});

    if (!news) {
        return (
            <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                    <Sparkles size={40} className="mx-auto mb-3 text-slate-700" />
                    <p className="text-sm">뉴스를 선택하면</p>
                    <p className="text-sm">상세 정보가 표시됩니다</p>
                </div>
            </div>
        );
    }

    // 로컬 분석 결과가 있으면 사용
    const analysis = localAnalysis[news.link];
    const sentiment = analysis?.sentiment || news.sentiment || 'neutral';
    const stocks = analysis?.stocks || news.stocks || [];
    const negativeStocks = analysis?.negativeStocks || news.negativeStocks || [];
    const themes = analysis?.themes || news.themes || [];
    const aiReason = analysis?.aiReason || news.aiReason || '';
    const hasAnalysis = !!analysis || !!news.aiReason;

    const isPositive = sentiment === 'positive';
    const isNegative = sentiment === 'negative';

    const sentimentColor = isPositive ? 'text-red-400' : isNegative ? 'text-blue-400' : 'text-slate-400';
    const sentimentBg = isPositive
        ? 'bg-red-500/10 border-red-500/30'
        : isNegative
            ? 'bg-blue-500/10 border-blue-500/30'
            : 'bg-slate-700/50 border-slate-600';

    const handleAnalyze = async () => {
        if (isAnalyzing || hasAnalysis) return;

        setIsAnalyzing(true);
        try {
            const result = await analyzeNewsItem(news);
            setLocalAnalysis((prev) => ({ ...prev, [news.link]: result }));
            onAnalyzed?.(news.link, result);
        } catch (error) {
            console.error('AI 분석 실패:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleOpenLink = () => {
        window.open(news.link, '_blank', 'noopener,noreferrer');
    };

    // 날짜 간결하게 표시
    const formatDate = (createdAt: string) => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
        const [datePart, timePart] = createdAt.split(' ');

        if (datePart === todayStr) {
            return `오늘 ${timePart}`;
        }

        const parts = datePart?.split('.');
        if (parts && parts.length >= 3) {
            return `${parts[1]}/${parts[2]} ${timePart}`;
        }
        return createdAt;
    };

    return (
        <div className="h-full flex flex-col">
            {/* 헤더: 언론사 + 시간 + 링크 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400">
                        {news.press}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(news.createdAt)}</span>
                </div>
                <button
                    onClick={handleOpenLink}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                    <ExternalLink size={12} />
                    원문
                </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 제목 */}
                <h2 className="text-lg font-bold text-white leading-tight">
                    {news.title}
                </h2>

                {/* 종목 + 테마 태그 */}
                {(stocks.length > 0 || negativeStocks.length > 0 || themes.length > 0) && (
                    <div className="space-y-2">
                        {/* 호재 종목 */}
                        {stocks.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] text-red-500 font-medium">호재</span>
                                {stocks.map((stock, i) => (
                                    <span
                                        key={`stock-${i}`}
                                        className="text-xs font-semibold text-red-300 bg-red-500/10 px-2 py-1 rounded border border-red-500/20"
                                    >
                                        {stock}
                                    </span>
                                ))}
                            </div>
                        )}
                        {/* 악재 종목 */}
                        {negativeStocks.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] text-blue-500 font-medium">악재</span>
                                {negativeStocks.map((stock, i) => (
                                    <span
                                        key={`neg-stock-${i}`}
                                        className="text-xs font-semibold text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"
                                    >
                                        {stock}
                                    </span>
                                ))}
                            </div>
                        )}
                        {/* 테마 */}
                        {themes.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] text-cyan-500 font-medium">테마</span>
                                {themes.map((theme, i) => (
                                    <span
                                        key={`theme-${i}`}
                                        className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20"
                                    >
                                        <Tag size={10} />
                                        {theme}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 요약 */}
                <p className="text-sm text-slate-400 leading-relaxed">
                    {news.summary}
                </p>

                {/* 호재/악재 */}
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${sentimentBg}`}>
                        {isPositive ? (
                            <TrendingUp size={16} className={sentimentColor} />
                        ) : isNegative ? (
                            <TrendingDown size={16} className={sentimentColor} />
                        ) : (
                            <div className="w-4 h-0.5 bg-slate-400"></div>
                        )}
                        <span className={`text-sm font-bold ${sentimentColor}`}>
                            {sentimentLabel[sentiment]}
                        </span>
                    </div>
                </div>

                {/* AI 분석 섹션 */}
                <div className="pt-2">
                    {hasAnalysis ? (
                        <div className="relative p-4 bg-slate-900/80 rounded-lg border border-slate-700">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l"></div>
                            <div className="flex items-center gap-2 mb-2 pl-3">
                                <Sparkles size={14} className="text-indigo-400" />
                                <span className="text-xs font-semibold text-indigo-400">AI 분석</span>
                            </div>
                            <p className="text-sm text-slate-300 pl-3 leading-relaxed">
                                {aiReason}
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 font-semibold transition-colors disabled:opacity-50"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    AI 분석 중...
                                </>
                            ) : (
                                <>
                                    <Zap size={16} />
                                    AI 분석하기
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
