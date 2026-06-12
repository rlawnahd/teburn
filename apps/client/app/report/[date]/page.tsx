import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const revalidate = 3600;

interface ReportTheme {
    rank: number;
    themeName: string;
    avgChangeRate: number;
    topStock: string;
    topStockRate: number;
}
interface ReportStock {
    rank: number;
    stockCode: string;
    stockName: string;
    changeRate: number;
    tradingValue: number;
    grade: string;
    score: number;
    themes: string[];
}
interface DailyReport {
    date: string;
    aiSummary: string;
    topThemes: ReportTheme[];
    topStocks: ReportStock[];
}

async function fetchReport(date: string): Promise<DailyReport | null> {
    try {
        const res = await fetch(`${API_URL}/report/${date}`, { next: { revalidate: 3600 } });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data ?? null;
    } catch {
        return null;
    }
}

function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function pct(v: number): { text: string; cls: string } {
    const text = (v > 0 ? '+' : '') + v.toFixed(2) + '%';
    const cls = v > 0 ? 'text-[var(--rise-color)]' : v < 0 ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]';
    return { text, cls };
}

function formatValue(v: number): string {
    if (v >= 1e12) return (v / 1e12).toFixed(1) + '조';
    if (v >= 1e8) return (v / 1e8).toFixed(0) + '억';
    return v.toLocaleString();
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
    const { date } = await params;
    const report = await fetchReport(date);
    if (!report) {
        return { title: '리포트를 찾을 수 없습니다 | TEBURN' };
    }
    const label = formatDate(date);
    const topThemes = report.topThemes.slice(0, 3).map(t => t.themeName).join(', ');
    const topStocks = report.topStocks.slice(0, 3).map(s => s.stockName).join(', ');
    const title = `${label} 주도주·급등테마 분석 | TEBURN`;
    const description = `${label} 한국 증시 주도테마 ${topThemes || ''}. 주도주 ${topStocks || ''}. 거래대금·등락률·등급 기반 마감 리포트.`;
    return {
        title,
        description,
        openGraph: { title, description, url: `https://teburn.com/report/${date}`, siteName: 'TEBURN', locale: 'ko_KR', type: 'article' },
        twitter: { card: 'summary', title, description },
        alternates: { canonical: `https://teburn.com/report/${date}` },
    };
}

export default async function ReportPage({ params }: { params: Promise<{ date: string }> }) {
    const { date } = await params;
    const report = await fetchReport(date);
    if (!report) notFound();

    const label = formatDate(date);

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-[800px] mx-auto px-4 py-8">
                {/* 헤더 */}
                <div className="mb-6">
                    <Link href="/report" className="text-xs text-[var(--accent)] hover:underline">
                        ← 리포트 목록
                    </Link>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-3">
                        {label} 주도주·급등테마 분석
                    </h1>
                </div>

                {/* AI 요약 */}
                {report.aiSummary && (
                    <section className="card p-5 mb-8">
                        {report.aiSummary.split('\n').filter(Boolean).map((para, i) => (
                            <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2 last:mb-0">
                                {para}
                            </p>
                        ))}
                    </section>
                )}

                {/* 주도테마 */}
                {report.topThemes.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">주도테마</h2>
                        <div className="card overflow-hidden">
                            {report.topThemes.map((t) => {
                                const p = pct(t.avgChangeRate);
                                return (
                                    <div key={t.rank} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] last:border-b-0">
                                        <span className="w-5 text-center text-sm font-semibold text-[var(--text-tertiary)]">{t.rank}</span>
                                        <Link href={`/themes/${encodeURIComponent(t.themeName)}`} className="flex-1 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline">
                                            {t.themeName}
                                        </Link>
                                        <span className="text-xs text-[var(--text-tertiary)]">대장주 {t.topStock}</span>
                                        <span className={`text-sm font-semibold w-20 text-right ${p.cls}`}>{p.text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 주도주 */}
                {report.topStocks.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">주도주 TOP</h2>
                        <div className="card overflow-hidden">
                            {report.topStocks.map((s) => {
                                const p = pct(s.changeRate);
                                return (
                                    <Link
                                        key={s.rank}
                                        href={`/stocks/${s.stockCode}`}
                                        className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <span className="w-5 text-center text-sm font-semibold text-[var(--text-tertiary)]">{s.rank}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-[var(--text-primary)]">{s.stockName}</span>
                                                {(s.grade === 'S' || s.grade === 'A') && (
                                                    <span className={`text-[10px] font-bold ${s.grade === 'S' ? 'text-[var(--grade-s)]' : 'text-[var(--grade-a)]'}`}>{s.grade}</span>
                                                )}
                                            </div>
                                            {s.themes.length > 0 && (
                                                <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">{s.themes.slice(0, 3).join(' · ')}</p>
                                            )}
                                        </div>
                                        <span className="text-xs text-[var(--text-tertiary)] w-16 text-right">{formatValue(s.tradingValue)}</span>
                                        <span className={`text-sm font-semibold w-20 text-right ${p.cls}`}>{p.text}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 상호링크 */}
                <div className="flex gap-3 text-xs">
                    <Link href="/today" className="text-[var(--accent)] hover:underline">오늘의 주도주 →</Link>
                    <Link href="/performance" className="text-[var(--accent)] hover:underline">주도주 성적표 →</Link>
                </div>
            </div>
        </div>
    );
}
