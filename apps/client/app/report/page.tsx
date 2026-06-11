import type { Metadata } from 'next';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: '주도주 일별 리포트 — 날짜별 시장 분석 아카이브 | TEBURN',
    description: '한국 증시 주도주·급등테마 일별 마감 리포트 아카이브. 날짜별 시장 요약과 주도주·테마 순위를 확인하세요.',
    alternates: { canonical: 'https://teburn.com/report' },
};

interface ReportListItem {
    date: string;
    summaryPreview: string;
    themeCount: number;
    stockCount: number;
}

async function fetchReports(): Promise<ReportListItem[]> {
    try {
        const res = await fetch(`${API_URL}/report?limit=60`, { next: { revalidate: 3600 } });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data?.reports ?? [];
    } catch {
        return [];
    }
}

function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const wd = weekdays[new Date(`${dateStr}T00:00:00+09:00`).getDay()];
    return `${y}년 ${Number(m)}월 ${Number(d)}일 (${wd})`;
}

export default async function ReportIndexPage() {
    const reports = await fetchReports();

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-[800px] mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link href="/" className="text-xs text-[var(--accent)] hover:underline">← 홈으로</Link>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-3">주도주 일별 리포트</h1>
                    <p className="text-sm text-[var(--text-tertiary)] mt-2">날짜별 시장 마감 분석 — 주도테마와 주도주를 한눈에.</p>
                </div>

                {reports.length === 0 ? (
                    <div className="card p-8 text-center text-sm text-[var(--text-tertiary)]">아직 리포트가 없습니다.</div>
                ) : (
                    <div className="space-y-2">
                        {reports.map((r) => (
                            <Link
                                key={r.date}
                                href={`/report/${r.date}`}
                                className="block card p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{formatDate(r.date)}</span>
                                    <span className="text-xs text-[var(--text-tertiary)]">테마 {r.themeCount} · 종목 {r.stockCount}</span>
                                </div>
                                {r.summaryPreview && (
                                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2">{r.summaryPreview}…</p>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
