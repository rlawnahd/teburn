import type { Metadata } from 'next';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ============================
// 타입 정의
// ============================

interface GradeSummary {
    count: number;
    avgReturnD1: number | null;
    avgReturnD5: number | null;
    winRateD1: number | null;
    best: { stockCode: string; stockName: string; returnD1: number } | null;
    worst: { stockCode: string; stockName: string; returnD1: number } | null;
}

interface WindowSummary {
    days: number;
    S: GradeSummary;
    A: GradeSummary;
}

interface DailyStock {
    stockCode: string;
    stockName: string;
    grade: string;
    totalScore: number;
    returnD1: number | null;
    returnD5: number | null;
    status: string;
}

interface DailyEntry {
    date: string;
    stocks: DailyStock[];
}

// ============================
// 데이터 페치
// ============================

async function fetchSummary(): Promise<WindowSummary[]> {
    try {
        const res = await fetch(`${API_URL}/performance/summary`, {
            next: { revalidate: 3600 },
        });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        return json.data?.windows ?? [];
    } catch {
        return [];
    }
}

async function fetchDaily(): Promise<DailyEntry[]> {
    try {
        const res = await fetch(`${API_URL}/performance/daily?days=30`, {
            next: { revalidate: 3600 },
        });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        return json.data?.days ?? [];
    } catch {
        return [];
    }
}

// ============================
// 포맷 헬퍼
// ============================

function formatReturn(v: number | null): { text: string; cls: string } {
    if (v === null) return { text: '—', cls: 'text-[var(--text-tertiary)]' };
    const text = (v > 0 ? '+' : '') + v.toFixed(2) + '%';
    const cls =
        v > 0
            ? 'text-[var(--rise-color)]'
            : v < 0
              ? 'text-[var(--fall-color)]'
              : 'text-[var(--text-tertiary)]';
    return { text, cls };
}

function formatWinRate(v: number | null): string {
    if (v === null) return '—';
    return v.toFixed(0) + '%';
}

// 당일 단타(D+1) vs 일주일 보유(D+5) 패턴을 한 줄로 해석
function interpretPattern(s: GradeSummary): string | null {
    if (s.count === 0 || s.avgReturnD1 === null) return null;
    const f = (v: number) => (v > 0 ? '+' : '') + v.toFixed(2) + '%';
    const d1 = s.avgReturnD1;

    if (s.avgReturnD5 === null) {
        return `당일 단타 평균 ${f(d1)} · 일주일 성적은 아직 집계 중입니다.`;
    }
    const d5 = s.avgReturnD5;

    if (d1 > 0 && d5 < 0) {
        return `당일 단타는 평균 ${f(d1)}로 플러스지만 일주일 들고 가면 ${f(d5)} — 신호 다음날 반짝하고 식는 패턴입니다.`;
    }
    if (d1 > 0 && d5 >= d1) {
        return `당일 단타 ${f(d1)}, 일주일 보유 ${f(d5)} — 들고 갈수록 강해지는 패턴입니다.`;
    }
    if (d1 > 0) {
        return `당일 단타 ${f(d1)}, 일주일 보유 ${f(d5)} — 시간이 갈수록 탄력이 줄어드는 패턴입니다.`;
    }
    if (d5 < 0) {
        return `당일 단타 ${f(d1)}, 일주일 보유 ${f(d5)} — 신호 다음날 진입이 불리했던 구간입니다.`;
    }
    return `당일 단타는 ${f(d1)}로 약했지만 일주일 보유 시 ${f(d5)} — 뒤늦게 살아나는 패턴입니다.`;
}

function formatDate(dateStr: string): string {
    // dateStr: "2026-06-04" 형식
    const [y, m, d] = dateStr.split('-');
    return `${y}년 ${m}월 ${d}일`;
}

// ============================
// 메타데이터
// ============================

export const metadata: Metadata = {
    title: '주도주 성적표 — S/A등급 실제 수익률 검증 | TEBURN',
    description:
        'TEBURN 주도주 점수의 실제 성적을 공개합니다. S/A등급 종목의 익일 시가 매수 기준 당일 단타·일주일 보유 수익률과 승률을 매일 자동 검증합니다.',
    openGraph: {
        title: '주도주 성적표 — S/A등급 실제 수익률 검증 | TEBURN',
        description:
            'TEBURN 주도주 점수의 실제 성적을 공개합니다. S/A등급 종목의 익일 시가 매수 기준 당일 단타·일주일 보유 수익률과 승률을 매일 자동 검증합니다.',
        url: 'https://teburn.com/performance',
        siteName: 'TEBURN',
        locale: 'ko_KR',
        type: 'article',
    },
    twitter: {
        card: 'summary',
        title: '주도주 성적표 — S/A등급 실제 수익률 검증 | TEBURN',
        description:
            'TEBURN 주도주 점수의 실제 성적을 공개합니다. S/A등급 종목의 익일 시가 매수 기준 당일 단타·일주일 보유 수익률과 승률을 매일 자동 검증합니다.',
    },
    alternates: { canonical: 'https://teburn.com/performance' },
};

// ============================
// 서브 컴포넌트
// ============================

function GradeCard({
    grade,
    summary,
}: {
    grade: 'S' | 'A';
    summary: GradeSummary;
}) {
    const gradeColor =
        grade === 'S' ? 'text-[var(--grade-s)]' : 'text-[var(--grade-a)]';
    const d1 = formatReturn(summary.avgReturnD1);
    const d5 = formatReturn(summary.avgReturnD5);

    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-bold ${gradeColor}`}>{grade}등급</span>
                <span className="text-xs text-[var(--text-tertiary)]">
                    표본 {summary.count}건
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <div className="text-[11px] text-[var(--text-secondary)]">당일 단타</div>
                    <div className="text-[10px] text-[var(--text-disabled)] mb-1 leading-tight">
                        시가 매수<br />당일 종가 매도
                    </div>
                    <div className={`text-sm font-semibold ${d1.cls}`}>{d1.text}</div>
                </div>
                <div>
                    <div className="text-[11px] text-[var(--text-secondary)]">일주일 보유</div>
                    <div className="text-[10px] text-[var(--text-disabled)] mb-1 leading-tight">
                        시가 매수<br />5일째 종가 매도
                    </div>
                    <div className={`text-sm font-semibold ${d5.cls}`}>{d5.text}</div>
                </div>
                <div>
                    <div className="text-[11px] text-[var(--text-secondary)]">단타 승률</div>
                    <div className="text-[10px] text-[var(--text-disabled)] mb-1 leading-tight">
                        플러스<br />비율
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatWinRate(summary.winRateD1)}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================
// 페이지
// ============================

export default async function PerformancePage() {
    const [windows, dailyEntries] = await Promise.all([
        fetchSummary(),
        fetchDaily(),
    ]);

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-[800px] mx-auto px-4 py-8">
                {/* 헤더 */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="text-xs text-[var(--accent-blue)] hover:underline"
                    >
                        ← 홈으로
                    </Link>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-3">
                        주도주 성적표
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                        S/A등급 종목의 <strong className="text-[var(--text-primary)]">익일 시가 매수 기준</strong> 실제 수익률을
                        매일 자동 검증합니다. 좋은 성적도 나쁜 성적도 그대로 공개합니다.
                    </p>
                </div>

                {/* 윈도우별 요약 */}
                {windows.length === 0 ? (
                    <div className="card p-8 text-center text-sm text-[var(--text-tertiary)] mb-6">
                        아직 데이터가 없습니다.
                    </div>
                ) : (
                    <div className="space-y-8 mb-8">
                        {windows.map((w) => {
                            const insight = interpretPattern(w.S);
                            return (
                                <section key={w.days}>
                                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                                        최근 {w.days}일
                                    </h2>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <GradeCard grade="S" summary={w.S} />
                                        <GradeCard grade="A" summary={w.A} />
                                    </div>
                                    {insight && (
                                        <p className="mt-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                                            <span className="font-semibold text-[var(--grade-s)]">S등급</span> {insight}
                                        </p>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}

                {/* 일자별 상세 */}
                {dailyEntries.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                            일자별 상세
                        </h2>
                        <div className="space-y-2">
                            {dailyEntries.map((entry) => (
                                <details
                                    key={entry.date}
                                    className="bg-[var(--bg-primary)] rounded-lg overflow-hidden"
                                >
                                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-[var(--bg-tertiary)] transition-colors">
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {formatDate(entry.date)}
                                        </span>
                                        <span className="text-xs text-[var(--text-tertiary)]">
                                            {entry.stocks.length}종목
                                        </span>
                                    </summary>
                                    <div className="border-t border-[var(--border-color)]">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-[var(--border-color)]">
                                                    <th className="px-4 py-2 text-left text-xs text-[var(--text-tertiary)] font-normal">
                                                        종목명
                                                    </th>
                                                    <th className="px-3 py-2 text-center text-xs text-[var(--text-tertiary)] font-normal w-12">
                                                        등급
                                                    </th>
                                                    <th className="px-3 py-2 text-right text-xs text-[var(--text-tertiary)] font-normal w-20">
                                                        당일단타
                                                    </th>
                                                    <th className="px-4 py-2 text-right text-xs text-[var(--text-tertiary)] font-normal w-20">
                                                        일주일
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {entry.stocks.map((stock) => {
                                                    const isExcluded = stock.status === 'excluded';
                                                    const d1 = isExcluded
                                                        ? { text: '제외', cls: 'text-[var(--text-tertiary)]' }
                                                        : formatReturn(stock.returnD1);
                                                    const d5 = isExcluded
                                                        ? { text: '—', cls: 'text-[var(--text-tertiary)]' }
                                                        : formatReturn(stock.returnD5);
                                                    const gradeColor =
                                                        stock.grade === 'S'
                                                            ? 'text-[var(--grade-s)]'
                                                            : 'text-[var(--grade-a)]';

                                                    return (
                                                        <tr
                                                            key={stock.stockCode}
                                                            className="border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors"
                                                        >
                                                            <td className="px-4 py-2.5">
                                                                <Link
                                                                    href={`/stocks/${stock.stockCode}`}
                                                                    className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] hover:underline transition-colors"
                                                                >
                                                                    {stock.stockName}
                                                                </Link>
                                                            </td>
                                                            <td className={`px-3 py-2.5 text-center text-xs font-semibold ${gradeColor}`}>
                                                                {stock.grade}
                                                            </td>
                                                            <td className={`px-3 py-2.5 text-right text-xs font-medium ${d1.cls}`}>
                                                                {d1.text}
                                                            </td>
                                                            <td className={`px-4 py-2.5 text-right text-xs font-medium ${d5.cls}`}>
                                                                {d5.text}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            ))}
                        </div>
                    </section>
                )}

                {/* 방법론 노트 */}
                <div className="bg-[var(--bg-primary)] rounded-lg px-4 py-4">
                    <h3 className="text-xs font-semibold text-[var(--text-tertiary)] mb-2">
                        측정 방법
                    </h3>
                    <ul className="space-y-1 text-xs text-[var(--text-tertiary)] list-disc list-inside">
                        <li>장마감(15:35) 기준 S/A등급 종목을 다음 거래일 시가에 매수했다고 가정합니다.</li>
                        <li>당일 단타 = 진입일(다음 거래일) 시가에 사서 그날 종가에 판 수익률입니다.</li>
                        <li>일주일 보유 = 진입일 시가에 사서 5거래일째 종가에 판 수익률입니다.</li>
                        <li>동일가중 평균이며 수수료·슬리피지는 반영하지 않습니다.</li>
                        <li>상한가 갭 등으로 시가 매수가 불가능한 경우도 포함됩니다.</li>
                        <li>거래정지·상장폐지로 시세가 없는 종목은 통계에서 제외하고 표기합니다.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
