'use client';

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, ExternalLink, Sparkles, Tag, Loader2, Zap, Clock, Building2 } from 'lucide-react';
import { NewsItem, analyzeNewsItem, AnalysisResult } from '@/lib/api/news';

interface Props {
    news: NewsItem | null;
    isOpen: boolean;
    onClose: () => void;
    onAnalyzed?: (link: string, result: AnalysisResult) => void;
}

const sentimentConfig = {
    positive: {
        label: '호재',
        bg: 'bg-red-500',
        lightBg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-600',
        icon: TrendingUp,
    },
    negative: {
        label: '악재',
        bg: 'bg-blue-500',
        lightBg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        icon: TrendingDown,
    },
    neutral: {
        label: '중립',
        bg: 'bg-slate-400',
        lightBg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-600',
        icon: null,
    },
};

export default function NewsModal({ news, isOpen, onClose, onAnalyzed }: Props) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [localAnalysis, setLocalAnalysis] = useState<Record<string, AnalysisResult>>({});

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !news) return null;

    const analysis = localAnalysis[news.link];
    const sentiment = analysis?.sentiment || news.sentiment || 'neutral';
    const stocks = analysis?.stocks || news.stocks || [];
    const negativeStocks = analysis?.negativeStocks || news.negativeStocks || [];
    const themes = analysis?.themes || news.themes || [];
    const aiReason = analysis?.aiReason || news.aiReason || '';
    const hasAnalysis = !!analysis || !!news.aiReason;
    const config = sentimentConfig[sentiment];
    const Icon = config.icon;

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

    return (
        <>
            {/* 백드롭 */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            {/* 호재/악재 배지 */}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white ${config.bg}`}>
                                {Icon && <Icon size={16} />}
                                {config.label}
                            </span>

                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {news.createdAt}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Building2 size={14} />
                                    {news.press}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* 본문 */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* 제목 */}
                        <h2 className="text-xl font-bold text-slate-900 leading-tight">
                            {news.title}
                        </h2>

                        {/* 종목 태그 */}
                        {(stocks.length > 0 || negativeStocks.length > 0) && (
                            <div className="space-y-2">
                                {stocks.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-red-500 w-10">호재</span>
                                        {stocks.map((stock, i) => (
                                            <span
                                                key={`stock-${i}`}
                                                className="text-sm font-semibold px-3 py-1 rounded-lg bg-red-100 text-red-700 border border-red-200"
                                            >
                                                {stock}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {negativeStocks.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-blue-500 w-10">악재</span>
                                        {negativeStocks.map((stock, i) => (
                                            <span
                                                key={`neg-${i}`}
                                                className="text-sm font-semibold px-3 py-1 rounded-lg bg-blue-100 text-blue-700 border border-blue-200"
                                            >
                                                {stock}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 테마 */}
                        {themes.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Tag size={14} className="text-slate-400" />
                                {themes.map((theme, i) => (
                                    <span
                                        key={`theme-${i}`}
                                        className="text-sm px-3 py-1 rounded-lg bg-slate-100 text-slate-600"
                                    >
                                        {theme}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* 요약 */}
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {news.summary}
                            </p>
                        </div>

                        {/* AI 분석 */}
                        {hasAnalysis ? (
                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles size={16} className="text-indigo-600" />
                                    <span className="text-sm font-bold text-indigo-600">AI 분석</span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    {aiReason}
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 rounded-xl text-white font-bold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        AI 분석 중...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={18} />
                                        AI로 분석하기
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* 푸터 */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                        <button
                            onClick={handleOpenLink}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-300 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                        >
                            <ExternalLink size={16} />
                            원문 보기
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
