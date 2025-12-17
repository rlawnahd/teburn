'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ChevronRight, Sparkles, Tag, Loader2, Zap } from 'lucide-react';
import { NewsItem, analyzeNewsItem, AnalysisResult } from '@/lib/api/news';

interface Props {
    data: NewsItem;
    onAnalyzed?: (link: string, result: AnalysisResult) => void;
}

// 센티멘트 한글 변환
const sentimentLabel = {
    positive: '호재',
    negative: '악재',
    neutral: '중립',
};

export default function NewsRow({ data, onAnalyzed }: Props) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [localAnalysis, setLocalAnalysis] = useState<AnalysisResult | null>(null);

    // 로컬 분석 결과가 있으면 사용, 없으면 props 데이터 사용
    const sentiment = localAnalysis?.sentiment || data.sentiment || 'neutral';
    const stocks = localAnalysis?.stocks || data.stocks || [];
    const themes = localAnalysis?.themes || data.themes || [];
    const score = localAnalysis?.score || data.score || 50;
    const aiReason = localAnalysis?.aiReason || data.aiReason || '';
    const isDetailed = data.isDetailed || false;
    const hasAnalysis = !!localAnalysis || !!data.aiReason;

    const isPositive = sentiment === 'positive';
    const isNegative = sentiment === 'negative';

    const sentimentColor = isPositive ? 'text-red-500' : isNegative ? 'text-blue-500' : 'text-slate-500';
    const sentimentBg = isPositive
        ? 'bg-red-50 border-red-200'
        : isNegative
            ? 'bg-blue-50 border-blue-200'
            : 'bg-slate-100 border-slate-200';

    const handleClick = () => {
        window.open(data.link, '_blank', 'noopener,noreferrer');
    };

    const handleAnalyze = async (e: React.MouseEvent) => {
        e.stopPropagation(); // 카드 클릭 이벤트 방지

        if (isAnalyzing || hasAnalysis) return;

        setIsAnalyzing(true);
        try {
            const result = await analyzeNewsItem(data);
            setLocalAnalysis(result);
            onAnalyzed?.(data.link, result);
        } catch (error) {
            console.error('AI 분석 실패:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 상세 분석 뉴스 (상위 5개) - 큰 카드
    if (isDetailed) {
        return (
            <article
                onClick={handleClick}
                className="group p-5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer mb-4"
            >
                {/* 상단: 배지 + 시간 + 언론사 + AI 분석 버튼 */}
                <div className="flex items-center gap-2 mb-3">
                    {hasAnalysis ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                            <Sparkles size={12} />
                            AI 분석 완료
                        </span>
                    ) : (
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-300 hover:bg-yellow-100 transition-colors disabled:opacity-50"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" />
                                    분석 중...
                                </>
                            ) : (
                                <>
                                    <Zap size={12} />
                                    AI 분석하기
                                </>
                            )}
                        </button>
                    )}
                    <span className="text-xs text-slate-500">{data.createdAt}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{data.press}</span>
                </div>

                {/* 관련 종목 + 테마 */}
                {(stocks.length > 0 || themes.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {stocks.map((stock, i) => (
                            <span
                                key={`stock-${i}`}
                                className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200"
                            >
                                {stock}
                            </span>
                        ))}
                        {themes.map((theme, i) => (
                            <span
                                key={`theme-${i}`}
                                className="flex items-center gap-1 text-xs text-cyan-600 bg-cyan-50 px-2 py-1 rounded border border-cyan-200"
                            >
                                <Tag size={10} />
                                {theme}
                            </span>
                        ))}
                    </div>
                )}

                {/* 제목 */}
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">
                    {data.title}
                </h3>

                {/* 요약 (긴 버전) */}
                <p className="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed">{data.summary}</p>

                {/* AI 분석 박스 */}
                {hasAnalysis ? (
                    <div className="relative p-4 bg-indigo-50 rounded-lg border border-indigo-200 mb-4">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l"></div>
                        <p className="text-sm text-slate-700 pl-3 leading-relaxed">
                            <span className="text-indigo-600 font-semibold text-xs mr-2">AI 분석</span>
                            {aiReason}
                        </p>
                    </div>
                ) : (
                    <div className="relative p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 mb-4">
                        <p className="text-sm text-slate-500 text-center">
                            {isAnalyzing ? 'AI가 뉴스를 분석하고 있습니다...' : 'AI 분석하기 버튼을 클릭하세요'}
                        </p>
                    </div>
                )}

                {/* 하단: 호재/악재 + 영향도 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${sentimentBg}`}>
                            {isPositive ? (
                                <TrendingUp size={14} className={sentimentColor} />
                            ) : isNegative ? (
                                <TrendingDown size={14} className={sentimentColor} />
                            ) : (
                                <div className="w-2 h-0.5 bg-slate-400"></div>
                            )}
                            <span className={`text-xs font-bold ${sentimentColor}`}>
                                {sentimentLabel[sentiment]}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full">
                            <span className="text-xs text-slate-500">영향도</span>
                            <span className={`text-sm font-mono font-bold ${score >= 80 ? 'text-yellow-600' : score >= 60 ? 'text-slate-700' : 'text-slate-500'}`}>
                                {score}
                            </span>
                        </div>
                    </div>

                    <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
            </article>
        );
    }

    // 일반 뉴스 (6번째 이후) - 작은 리스트
    return (
        <article
            className="group flex items-center gap-4 p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
        >
            {/* 시간 */}
            <div className="w-14 text-xs text-slate-500 font-mono shrink-0">
                {data.createdAt.split(' ')[1] || data.createdAt}
            </div>

            {/* 언론사 */}
            <div className="w-16 shrink-0">
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 truncate block">{data.press}</span>
            </div>

            {/* 제목 (클릭하면 링크 열기) */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
                <h3 className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                    {data.title}
                </h3>
            </div>

            {/* AI 분석 버튼 */}
            {!hasAnalysis && (
                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1 text-[10px] font-semibold text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-300 hover:bg-yellow-100 transition-colors disabled:opacity-50 shrink-0"
                >
                    {isAnalyzing ? (
                        <Loader2 size={10} className="animate-spin" />
                    ) : (
                        <Zap size={10} />
                    )}
                </button>
            )}

            {/* 호재/악재 */}
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${sentimentBg}`}>
                {isPositive ? (
                    <TrendingUp size={12} className={sentimentColor} />
                ) : isNegative ? (
                    <TrendingDown size={12} className={sentimentColor} />
                ) : (
                    <div className="w-1.5 h-0.5 bg-slate-400"></div>
                )}
                <span className={`text-[10px] font-bold ${sentimentColor}`}>{sentimentLabel[sentiment]}</span>
            </div>

            {/* 영향도 */}
            <div className="w-10 text-right">
                <span className={`text-xs font-mono font-bold ${score >= 80 ? 'text-yellow-600' : score >= 60 ? 'text-slate-700' : 'text-slate-500'}`}>
                    {score}
                </span>
            </div>

            <ChevronRight
                size={16}
                className="text-slate-400 group-hover:text-slate-600 transition-colors cursor-pointer"
                onClick={handleClick}
            />
        </article>
    );
}
