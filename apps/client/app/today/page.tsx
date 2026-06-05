import type { Metadata } from 'next';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface HotStock {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
    totalScore: number;
    grade: string;
    themes: string[];
    reason?: string;
    volumeSurgeRate: number | null;
    streakDays: number;
}

interface MarketStatus {
    status: string;
    statusText: string;
    isOpen: boolean;
}

async function fetchData(): Promise<{
    stocks: HotStock[];
    marketStatus: MarketStatus | null;
    lastUpdateTime: string | null;
}> {
    try {
        const res = await fetch(`${API_URL}/leading/hot?limit=10`, {
            next: { revalidate: 300 },
        });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        return {
            stocks: json.data.stocks ?? [],
            marketStatus: json.data.marketStatus ?? null,
            lastUpdateTime: json.data.lastUpdateTime ?? null,
        };
    } catch {
        return { stocks: [], marketStatus: null, lastUpdateTime: null };
    }
}

function todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${y}년 ${m}월 ${day}일 (${weekdays[d.getDay()]})`;
}

function formatValue(v: number): string {
    if (v >= 1e12) return (v / 1e12).toFixed(1) + '조';
    if (v >= 1e8) return (v / 1e8).toFixed(0) + '억';
    return v.toLocaleString();
}

export async function generateMetadata(): Promise<Metadata> {
    const { stocks } = await fetchData();
    const top3 = stocks.slice(0, 3).map(s => s.stockName).join(', ');
    const date = todayStr();
    const title = `오늘의 주도주 TOP 10 순위 — ${date} | TEBURN 주도주 랭킹`;
    const description = top3
        ? `${date} 주도주 순위 1위 ${stocks[0]?.stockName ?? ''}. ${top3} 등 주도주 TOP 10. 거래대금·등락률·거래량·뉴스·테마 종합 점수 기반 주도주 실시간 분석.`
        : `${date} 오늘의 주도주 순위 — 실시간 주도주 랭킹 서비스 TEBURN`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: 'https://teburn.com/today',
            siteName: 'TEBURN',
            locale: 'ko_KR',
            type: 'article',
        },
        twitter: { card: 'summary', title, description },
        alternates: { canonical: 'https://teburn.com/today' },
    };
}

export default async function TodayPage() {
    const { stocks, marketStatus, lastUpdateTime } = await fetchData();
    const date = todayStr();

    const sCount = stocks.filter(s => s.grade === 'S').length;
    const aCount = stocks.filter(s => s.grade === 'A').length;
    const avgScore = stocks.length > 0
        ? Math.round(stocks.reduce((sum, s) => sum + s.totalScore, 0) / stocks.length)
        : 0;

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-[800px] mx-auto px-4 py-8">
                {/* 헤더 */}
                <div className="mb-6">
                    <Link href="/" className="text-xs text-[var(--accent-blue)] hover:underline">
                        ← 홈으로
                    </Link>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-3">
                        오늘의 주도주 TOP 10
                    </h1>
                    <p className="text-sm text-[var(--text-tertiary)] mt-1">{date}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                        {marketStatus && (
                            <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${marketStatus.isOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="text-[var(--text-tertiary)]">{marketStatus.statusText}</span>
                            </span>
                        )}
                        <span className="text-[var(--text-tertiary)]">시장온도 {avgScore}</span>
                        <span className="text-[var(--text-tertiary)]">S등급 {sCount}개 · A등급 {aCount}개</span>
                    </div>
                </div>

                {/* 종목 리스트 */}
                {stocks.length === 0 ? (
                    <div className="card p-8 text-center text-sm text-[var(--text-tertiary)]">
                        데이터 준비 중입니다.
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        {stocks.map((stock, i) => {
                            const isPositive = stock.changeRate > 0;
                            return (
                                <Link
                                    key={stock.stockCode}
                                    href={`/stocks/${stock.stockCode}`}
                                    className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                    <span className={`w-6 text-center text-sm font-semibold ${i < 3 ? 'text-[var(--accent-blue)]' : 'text-[var(--text-tertiary)]'}`}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-[var(--text-primary)]">{stock.stockName}</span>
                                            {(stock.volumeSurgeRate ?? 0) >= 10 && <span className="text-[12px]">🔥</span>}
                                            {stock.streakDays >= 3 && (
                                                <span className="text-[11px] text-amber-600">{stock.streakDays}일</span>
                                            )}
                                        </div>
                                        {stock.reason && (
                                            <p className="text-[13px] text-[var(--text-secondary)] truncate mt-0.5">💡 {stock.reason}</p>
                                        )}
                                        {stock.themes.length > 0 && (
                                            <p className="text-[12px] text-[var(--text-tertiary)] truncate mt-0.5">
                                                {stock.themes.slice(0, 3).join(' · ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-sm text-[var(--text-primary)]">{stock.currentPrice.toLocaleString()}</div>
                                        <div className={`text-xs font-medium ${isPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                            {isPositive ? '+' : ''}{stock.changeRate.toFixed(2)}%
                                        </div>
                                    </div>
                                    <div className="w-14 text-right flex-shrink-0">
                                        <div className="text-xs font-medium text-[var(--text-secondary)]">{formatValue(stock.tradingValue)}</div>
                                        <div className="text-[12px] text-[var(--text-tertiary)]">{stock.totalScore}점</div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* 하단 안내 */}
                <div className="mt-6 text-center space-y-2">
                    <p className="text-xs text-[var(--text-tertiary)]">
                        거래대금 · 등락률 · 거래량 · 뉴스 · 테마 집중도 5가지 지표 종합
                        {lastUpdateTime && ` · 마지막 갱신 ${new Date(lastUpdateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                    <Link
                        href="/?tab=hot"
                        className="inline-block text-sm font-medium text-[var(--accent-blue)] hover:underline"
                    >
                        전체 주도주 리스트 보기 →
                    </Link>
                </div>

                {/* SEO용 구조화 텍스트 */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: `오늘의 주도주 TOP 10 — ${date}`,
                        description: `${date} 한국 주식시장 주도주 순위. ${stocks.slice(0, 3).map(s => s.stockName).join(', ')} 등.`,
                        datePublished: new Date().toISOString(),
                        dateModified: lastUpdateTime || new Date().toISOString(),
                        author: { '@type': 'Organization', name: 'TEBURN' },
                        publisher: { '@type': 'Organization', name: 'TEBURN', url: 'https://teburn.com' },
                    }) }}
                />
            </div>
        </div>
    );
}
