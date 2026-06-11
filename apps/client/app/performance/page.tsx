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
        const res = await fetch(`${API_URL}/performance/summary`, { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        return json.data?.windows ?? [];
    } catch {
        return [];
    }
}

async function fetchDaily(): Promise<DailyEntry[]> {
    try {
        const res = await fetch(`${API_URL}/performance/daily?days=30`, { next: { revalidate: 3600 } });
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

function fmtPct(v: number | null): { text: string; cls: string } {
    if (v === null) return { text: '—', cls: 'text-[var(--text-tertiary)]' };
    const text = (v > 0 ? '+' : '') + v.toFixed(2) + '%';
    const cls = v > 0 ? 'text-[var(--rise-color)]' : v < 0 ? 'text-[var(--fall-color)]' : 'text-[var(--text-tertiary)]';
    return { text, cls };
}

function fmtWin(v: number | null): string {
    return v === null ? '—' : v.toFixed(0) + '%';
}

function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

// 대표 윈도우: 30 → 90 → 7일 순, S등급 표본 있는 것
function pickWindow(windows: WindowSummary[]): WindowSummary | null {
    for (const d of [30, 90, 7]) {
        const w = windows.find((x) => x.days === d);
        if (w && w.S.count > 0 && w.S.winRateD1 !== null) return w;
    }
    return windows.find((w) => w.S.count > 0) ?? null;
}

// 신뢰도 평결 한 줄 (다음날 성적 기준)
function verdictLine(s: GradeSummary): string {
    const wr = s.winRateD1 ?? 0;
    const d1 = s.avgReturnD1 ?? 0;
    if (wr >= 60 && d1 > 0) return '신호 다음날 사면 대체로 수익이 났습니다 — 따라 살 만했던 구간.';
    if (wr >= 50 && d1 > 0) return '절반 이상 적중하고 평균도 플러스였습니다.';
    if (d1 > 0) return '적중률은 절반 아래지만 평균은 플러스 — 수익 종목이 손실을 메운 구간.';
    return '신호 다음날 진입은 평균적으로 손실이었습니다 — 이 구간은 신중히 봐야 합니다.';
}

// ============================
// 메타데이터
// ============================

const META_DESC =
    'TEBURN 알고리즘이 매일 뽑는 주도주(S·A등급)를 신호 다음날 샀다면 실제로 수익이 났는지 — 적중률과 평균 수익률로 검증한 신뢰도 성적표입니다.';

export const metadata: Metadata = {
    title: '주도주 성적표 — 알고리즘 신뢰도 검증 | TEBURN',
    description: META_DESC,
    openGraph: {
        title: '주도주 성적표 — 알고리즘 신뢰도 검증 | TEBURN',
        description: META_DESC,
        url: 'https://teburn.com/performance',
        siteName: 'TEBURN',
        locale: 'ko_KR',
        type: 'article',
    },
    twitter: { card: 'summary', title: '주도주 성적표 — 알고리즘 신뢰도 검증 | TEBURN', description: META_DESC },
    alternates: { canonical: 'https://teburn.com/performance' },
};

// ============================
// 페이지
// ============================

export default async function PerformancePage() {
    const [windows, dailyEntries] = await Promise.all([fetchSummary(), fetchDaily()]);
    const hero = pickWindow(windows);

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-[800px] mx-auto px-4 py-8">
                {/* 헤더 */}
                <div className="mb-5">
                    <Link href="/" className="text-xs text-[var(--accent-blue)] hover:underline">← 홈으로</Link>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-3">주도주 성적표</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                        <strong className="text-[var(--text-primary)]">TEBURN이 뽑은 주도주, 믿고 사도 될까?</strong>{' '}
                        알고리즘이 매일 선정한 S·A등급 종목을 <strong className="text-[var(--text-primary)]">신호 다음날 샀다면</strong> 실제로 수익이 났는지를
                        적중률과 평균 수익률로 검증합니다. 좋은 성적도 나쁜 성적도 그대로 공개합니다.
                    </p>
                </div>

                {!hero ? (
                    <div className="card p-8 text-center text-sm text-[var(--text-tertiary)]">아직 데이터가 없습니다.</div>
                ) : (
                    <>
                        {/* 히어로 평결 — S등급, 다음날 성적 */}
                        {(() => {
                            const s = hero.S;
                            const wr = s.winRateD1 ?? 0;
                            const hit = Math.round((wr / 100) * s.count);
                            const avg = fmtPct(s.avgReturnD1);
                            const d5 = fmtPct(s.avgReturnD5);
                            return (
                                <section className="card p-5 mb-4">
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        최근 {hero.days}일 · <span className="font-semibold text-[var(--grade-s)]">S등급</span> 주도주를 신호 다음날 샀다면
                                    </p>
                                    <div className="mt-4 flex items-end gap-8 flex-wrap">
                                        <div>
                                            <div className="text-xs text-[var(--text-tertiary)] mb-0.5">적중률</div>
                                            <div className="text-4xl font-bold text-[var(--text-primary)] tabular-nums leading-none">{fmtWin(s.winRateD1)}</div>
                                            <div className="text-xs text-[var(--text-tertiary)] mt-1">{s.count}개 중 {hit}개 수익</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-[var(--text-tertiary)] mb-0.5">평균 수익률</div>
                                            <div className={`text-4xl font-bold tabular-nums leading-none ${avg.cls}`}>{avg.text}</div>
                                            <div className="text-xs text-[var(--text-tertiary)] mt-1">다음날 종가 기준</div>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed">{verdictLine(s)}</p>
                                    <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                                        1주일 더 들고 갔다면(5거래일): 평균 <span className={d5.cls}>{d5.text}</span>
                                    </p>
                                </section>
                            );
                        })()}

                        {/* 보조 — A등급 + 기간별 적중률 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                            <div className="card p-4">
                                <div className="text-xs text-[var(--text-tertiary)] mb-1.5">A등급 (최근 {hero.days}일)</div>
                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <span className="text-base font-semibold text-[var(--text-primary)]">적중률 {fmtWin(hero.A.winRateD1)}</span>
                                    <span className={`text-sm font-medium ${fmtPct(hero.A.avgReturnD1).cls}`}>평균 {fmtPct(hero.A.avgReturnD1).text}</span>
                                    <span className="text-xs text-[var(--text-tertiary)]">표본 {hero.A.count}</span>
                                </div>
                            </div>
                            <div className="card p-4">
                                <div className="text-xs text-[var(--text-tertiary)] mb-1.5">기간별 S등급 적중률</div>
                                <div className="flex gap-4 text-sm">
                                    {[7, 30, 90].map((d) => {
                                        const w = windows.find((x) => x.days === d);
                                        return (
                                            <span key={d} className="text-[var(--text-tertiary)]">
                                                {d}일 <span className="font-semibold text-[var(--text-primary)]">{fmtWin(w?.S.winRateD1 ?? null)}</span>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 일자별 상세 — 기본 접힘 */}
                        {dailyEntries.length > 0 && (
                            <details className="mb-8 card overflow-hidden">
                                <summary className="px-4 py-3 cursor-pointer select-none text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                                    전체 일자별 기록 보기 ({dailyEntries.length}일)
                                </summary>
                                <div className="border-t border-[var(--border-color)] divide-y divide-[var(--border-color)]">
                                    {dailyEntries.map((entry) => (
                                        <details key={entry.date} className="bg-[var(--bg-primary)]">
                                            <summary className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-[var(--bg-tertiary)] transition-colors">
                                                <span className="text-sm text-[var(--text-primary)]">{formatDate(entry.date)}</span>
                                                <span className="text-xs text-[var(--text-tertiary)]">{entry.stocks.length}종목</span>
                                            </summary>
                                            <div className="border-t border-[var(--border-color)]">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-tertiary)]">
                                                            <th className="px-4 py-2 text-left font-normal">종목명</th>
                                                            <th className="px-3 py-2 text-center font-normal w-12">등급</th>
                                                            <th className="px-3 py-2 text-right font-normal w-20">다음날</th>
                                                            <th className="px-4 py-2 text-right font-normal w-20">1주일</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {entry.stocks.map((stock) => {
                                                            const ex = stock.status === 'excluded';
                                                            const d1 = ex ? { text: '제외', cls: 'text-[var(--text-tertiary)]' } : fmtPct(stock.returnD1);
                                                            const d5 = ex ? { text: '—', cls: 'text-[var(--text-tertiary)]' } : fmtPct(stock.returnD5);
                                                            const gc = stock.grade === 'S' ? 'text-[var(--grade-s)]' : 'text-[var(--grade-a)]';
                                                            return (
                                                                <tr key={stock.stockCode} className="border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors">
                                                                    <td className="px-4 py-2">
                                                                        <Link href={`/stocks/${stock.stockCode}`} className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] hover:underline">{stock.stockName}</Link>
                                                                    </td>
                                                                    <td className={`px-3 py-2 text-center text-xs font-semibold ${gc}`}>{stock.grade}</td>
                                                                    <td className={`px-3 py-2 text-right text-xs font-medium ${d1.cls}`}>{d1.text}</td>
                                                                    <td className={`px-4 py-2 text-right text-xs font-medium ${d5.cls}`}>{d5.text}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </details>
                        )}
                    </>
                )}

                {/* 방법론 노트 */}
                <div className="bg-[var(--bg-primary)] rounded-lg px-4 py-4">
                    <h2 className="text-xs font-semibold text-[var(--text-tertiary)] mb-2">검증 방법</h2>
                    <ul className="space-y-1 text-xs text-[var(--text-tertiary)] list-disc list-inside">
                        <li>S·A등급 = 거래대금·등락률·뉴스·테마 집중도를 종합한 점수로 매일 자동 선정합니다.</li>
                        <li>장마감(15:35) 기준 선정된 종목을 다음 거래일 시가에 매수했다고 가정합니다.</li>
                        <li>적중률 = 수익이 난 종목 비율, 평균 수익률 = 동일가중 평균(수수료·슬리피지 미반영)입니다.</li>
                        <li>다음날 성적 = 진입일 종가 기준, 1주일 성적 = 진입 후 5거래일째 종가 기준입니다.</li>
                        <li>거래정지·상장폐지로 시세가 없는 종목은 통계에서 제외합니다.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
