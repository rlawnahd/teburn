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
        bg: 'bg-[var(--rise-color)]',
        lightBg: 'bg-[var(--rise-bg)]',
        border: 'border-[var(--rise-color)]/30',
        text: 'text-[var(--rise-color)]',
        icon: TrendingUp,
    },
    negative: {
        label: '악재',
        bg: 'bg-[var(--fall-color)]',
        lightBg: 'bg-[var(--fall-bg)]',
        border: 'border-[var(--fall-color)]/30',
        text: 'text-[var(--fall-color)]',
        icon: TrendingDown,
    },
    neutral: {
        label: '중립',
        bg: 'bg-[var(--text-tertiary)]',
        lightBg: 'bg-[var(--bg-tertiary)]',
        border: 'border-[var(--border-color)]',
        text: 'text-[var(--text-secondary)]',
        icon: null,
    },
};

export default function NewsModal({ news, isOpen, onClose, onAnalyzed }: Props) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [localAnalysis, setLocalAnalysis] = useState<Record<string, AnalysisResult>>({});

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
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-[var(--bg-primary)] rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-white ${config.bg}`}>
                                {Icon && <Icon size={16} />}
                                {config.label}
                            </span>

                            <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
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
                            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* 본문 */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* 제목 */}
                        <h2 className="text-xl font-bold text-[var(--text-primary)] leading-tight">
                            {news.title}
                        </h2>

                        {/* 종목 태그 */}
                        {(stocks.length > 0 || negativeStocks.length > 0) && (
                            <div className="space-y-3">
                                {stocks.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-[var(--rise-color)] w-10">호재</span>
                                        {stocks.map((stock, i) => (
                                            <span
                                                key={`stock-${i}`}
                                                className="text-sm font-semibold px-3 py-1.5 rounded-xl bg-[var(--rise-bg)] text-[var(--rise-color)]"
                                            >
                                                {stock}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {negativeStocks.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-[var(--fall-color)] w-10">악재</span>
                                        {negativeStocks.map((stock, i) => (
                                            <span
                                                key={`neg-${i}`}
                                                className="text-sm font-semibold px-3 py-1.5 rounded-xl bg-[var(--fall-bg)] text-[var(--fall-color)]"
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
                                <Tag size={14} className="text-[var(--text-tertiary)]" />
                                {themes.map((theme, i) => (
                                    <span
                                        key={`theme-${i}`}
                                        className="text-sm px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                    >
                                        {theme}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* 요약 */}
                        <div className="p-5 bg-[var(--bg-tertiary)] rounded-2xl">
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                {news.summary}
                            </p>
                        </div>

                        {/* AI 분석 */}
                        {hasAnalysis ? (
                            <div className="p-5 bg-[var(--accent-blue-light)] rounded-2xl border border-[var(--accent-blue)]/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={16} className="text-[var(--accent-blue)]" />
                                    <span className="text-sm font-bold text-[var(--accent-blue)]">AI 분석</span>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    {aiReason}
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 rounded-2xl text-white font-bold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-[1.02]"
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
                    <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                        <button
                            onClick={handleOpenLink}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
