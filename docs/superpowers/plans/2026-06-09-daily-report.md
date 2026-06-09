# 일별 마감 리포트 (Daily Report) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매일 장마감에 그날의 주도주·테마를 스냅샷하고 GPT 요약을 붙인 `DailyReport`를 생성해 `/report/[date]` SSR 페이지로 공개하고, 사이트맵·캘린더·네비로 연결해 SEO 유입을 확보한다.

**Architecture:** 순수 변환/프롬프트 로직(`dailyReportBuilder.ts`, vitest)과 I/O 오케스트레이션(`dailyReportService.ts`: 데이터 수집 + GPT + mongoose)을 분리. 리포트는 TTL 원본이 만료돼도 안 깨지도록 데이터를 `DailyReport`에 스냅샷한다. 생성은 기존 15:35 장마감 배치에 forward-only로 추가.

**Tech Stack:** Express + mongoose + TypeScript, OpenAI `gpt-5.4-nano` (기존 marketThemeService 패턴), Next.js App Router SSR+ISR, vitest

**Spec:** `docs/superpowers/specs/2026-06-09-daily-report-design.md`

---

## File Structure

```
apps/server/
  src/models/DailyReport.ts                         # Create: 모델 + ReportTheme/ReportStock 타입
  src/services/dailyReportBuilder.ts                # Create: 순수 함수 (toReportStocks/toReportThemes/buildReportPrompt)
  src/services/__tests__/dailyReportBuilder.test.ts # Create: 단위 테스트
  src/services/dailyReportService.ts                # Create: generateDailyReport/getDailyReport/listRecentReports (I/O)
  src/routes/report.ts                              # Create: /api/report/:date, /api/report
  src/server.ts                                     # Modify: 라우트 등록 + 15:35 배치에 generateDailyReport
apps/client/
  app/report/[date]/page.tsx                        # Create: 단일 리포트 SSR
  app/report/page.tsx                               # Create: 리포트 인덱스(허브)
  app/sitemap.ts                                    # Modify: 리포트 날짜 동적 등록
  components/leading/CalendarDetailModal.tsx        # Modify: "이 날 리포트" 링크
  components/layout/Header.tsx                      # Modify: 네비에 /report
  components/layout/Footer.tsx                      # Modify: 푸터에 /report
```

---

### Task 1: DailyReport 모델

**Files:**
- Create: `apps/server/src/models/DailyReport.ts`

- [ ] **Step 1: 모델 작성** (TTL 없음 — 영구. `GradePerformance.ts` 스타일 따름)

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface ReportTheme {
    rank: number;
    themeName: string;
    avgChangeRate: number;
    topStock: string;
    topStockRate: number;
}

export interface ReportStock {
    rank: number;
    stockCode: string;
    stockName: string;
    changeRate: number;
    tradingValue: number;
    grade: string;
    score: number;
    themes: string[];
}

export interface IDailyReport extends Document {
    date: string; // YYYY-MM-DD
    aiSummary: string;
    topThemes: ReportTheme[];
    topStocks: ReportStock[];
    generatedAt: Date;
    createdAt: Date;
}

const ReportThemeSchema = new Schema<ReportTheme>({
    rank: { type: Number, required: true },
    themeName: { type: String, required: true },
    avgChangeRate: { type: Number, default: 0 },
    topStock: { type: String, default: '' },
    topStockRate: { type: Number, default: 0 },
}, { _id: false });

const ReportStockSchema = new Schema<ReportStock>({
    rank: { type: Number, required: true },
    stockCode: { type: String, default: '' },
    stockName: { type: String, required: true },
    changeRate: { type: Number, default: 0 },
    tradingValue: { type: Number, default: 0 },
    grade: { type: String, default: '' },
    score: { type: Number, default: 0 },
    themes: { type: [String], default: [] },
}, { _id: false });

const DailyReportSchema: Schema = new Schema({
    date: { type: String, required: true, unique: true },
    aiSummary: { type: String, default: '' },
    topThemes: { type: [ReportThemeSchema], default: [] },
    topStocks: { type: [ReportStockSchema], default: [] },
    generatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IDailyReport>('DailyReport', DailyReportSchema);
```

- [ ] **Step 2: 컴파일 확인**

Run: `pnpm --filter server build`
Expected: 에러 없이 종료

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/models/DailyReport.ts
git commit -m "feat: DailyReport 모델 추가"
```

---

### Task 2: 순수 변환·프롬프트 함수 (TDD)

**Files:**
- Create: `apps/server/src/services/dailyReportBuilder.ts`
- Test: `apps/server/src/services/__tests__/dailyReportBuilder.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest';
import {
    toReportStocks,
    toReportThemes,
    buildReportPrompt,
    HotStockLike,
    DailyThemeLike,
} from '../dailyReportBuilder';

function hot(over: Partial<HotStockLike>): HotStockLike {
    return {
        stockCode: '005930', stockName: '삼성전자', changeRate: 3.1,
        tradingValue: 1000, grade: 'A', totalScore: 55, themes: ['반도체'],
        ...over,
    };
}

describe('toReportStocks', () => {
    it('HotStock 배열을 rank 부여하며 ReportStock으로 변환하고 limit으로 자른다', () => {
        const input: HotStockLike[] = [
            hot({ stockCode: 'A1', stockName: '에이', grade: 'S', totalScore: 80 }),
            hot({ stockCode: 'A2', stockName: '비', grade: 'A', totalScore: 50 }),
            hot({ stockCode: 'A3', stockName: '씨' }),
        ];
        const out = toReportStocks(input, 2);
        expect(out.length).toBe(2);
        expect(out[0]).toEqual({
            rank: 1, stockCode: 'A1', stockName: '에이', changeRate: 3.1,
            tradingValue: 1000, grade: 'S', score: 80, themes: ['반도체'],
        });
        expect(out[1].rank).toBe(2);
        expect(out[1].stockName).toBe('비');
    });

    it('빈 배열이면 빈 배열을 반환한다', () => {
        expect(toReportStocks([], 10)).toEqual([]);
    });
});

describe('toReportThemes', () => {
    it('DailyTheme 배열을 ReportTheme으로 변환하고 limit으로 자른다 (불필요 필드 제거)', () => {
        const input: DailyThemeLike[] = [
            { rank: 1, themeName: '반도체', avgChangeRate: 4.2, totalTradingValue: 999, topStock: '삼성전자', topStockRate: 5.1 },
            { rank: 2, themeName: '2차전지', avgChangeRate: 2.0, totalTradingValue: 500, topStock: '에코프로', topStockRate: 3.0 },
        ];
        const out = toReportThemes(input, 1);
        expect(out.length).toBe(1);
        expect(out[0]).toEqual({
            rank: 1, themeName: '반도체', avgChangeRate: 4.2, topStock: '삼성전자', topStockRate: 5.1,
        });
        expect((out[0] as any).totalTradingValue).toBeUndefined();
    });
});

describe('buildReportPrompt', () => {
    const themes: DailyThemeLike[] = [
        { rank: 1, themeName: '반도체', avgChangeRate: 4.2, totalTradingValue: 999, topStock: '삼성전자', topStockRate: 5.1 },
    ];
    const stocks: HotStockLike[] = [
        hot({ stockName: '에이', changeRate: 19.5, themes: ['반도체'] }),
    ];

    it('날짜·테마명·종목명을 포함한 프롬프트를 만든다', () => {
        const p = buildReportPrompt('2026-06-09', themes, stocks);
        expect(p).toContain('2026-06-09');
        expect(p).toContain('반도체');
        expect(p).toContain('에이');
    });

    it('테마/종목이 비어도 문자열을 반환한다 (throw 안 함)', () => {
        const p = buildReportPrompt('2026-06-09', [], []);
        expect(typeof p).toBe('string');
        expect(p).toContain('2026-06-09');
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter server test`
Expected: FAIL — `dailyReportBuilder` 모듈 없음

- [ ] **Step 3: 구현 작성** (`apps/server/src/services/dailyReportBuilder.ts`)

```typescript
// 일별 리포트 — 순수 변환·프롬프트 함수 (I/O 없음, 단위 테스트 대상)
import { ReportTheme, ReportStock } from '../models/DailyReport';

export interface HotStockLike {
    stockCode: string;
    stockName: string;
    changeRate: number;
    tradingValue: number;
    grade: string;
    totalScore: number;
    themes: string[];
}

export interface DailyThemeLike {
    rank: number;
    themeName: string;
    avgChangeRate: number;
    totalTradingValue: number;
    topStock: string;
    topStockRate: number;
}

export function toReportStocks(stocks: HotStockLike[], limit: number): ReportStock[] {
    return stocks.slice(0, limit).map((s, i) => ({
        rank: i + 1,
        stockCode: s.stockCode,
        stockName: s.stockName,
        changeRate: s.changeRate,
        tradingValue: s.tradingValue,
        grade: s.grade,
        score: s.totalScore,
        themes: s.themes,
    }));
}

export function toReportThemes(themes: DailyThemeLike[], limit: number): ReportTheme[] {
    return themes.slice(0, limit).map((t) => ({
        rank: t.rank,
        themeName: t.themeName,
        avgChangeRate: t.avgChangeRate,
        topStock: t.topStock,
        topStockRate: t.topStockRate,
    }));
}

/**
 * 그날 데이터로 GPT 시장 요약 프롬프트 생성 (한국어 2~3문단 요청)
 */
export function buildReportPrompt(
    date: string,
    themes: DailyThemeLike[],
    stocks: HotStockLike[],
): string {
    const themeLines = themes.length > 0
        ? themes.map(t => `- ${t.themeName} (평균 ${t.avgChangeRate.toFixed(1)}%, 대장주 ${t.topStock} ${t.topStockRate.toFixed(1)}%)`).join('\n')
        : '(주도테마 데이터 없음)';

    const stockLines = stocks.length > 0
        ? stocks.map((s, i) => `${i + 1}. ${s.stockName} ${s.changeRate.toFixed(1)}% (${s.grade}등급, 테마: ${s.themes.join('/') || '-'})`).join('\n')
        : '(주도주 데이터 없음)';

    return [
        `${date} 한국 주식시장 마감 데이터를 바탕으로 "오늘의 시장 요약"을 작성해줘.`,
        ``,
        `규칙:`,
        `- 한국어 2~3문단, 각 문단 2~4문장.`,
        `- 제공된 데이터(주도테마/주도주)에 근거할 것. 없는 사실/뉴스를 지어내지 말 것.`,
        `- 첫 문단: 오늘 시장을 이끈 핵심 테마와 대장주. 둘째 문단: 주목할 종목 흐름. (선택) 셋째 문단: 한 줄 시사점.`,
        `- 투자 권유/매수 추천 표현 금지. 사실 서술 위주.`,
        `- 마크다운 없이 평문으로.`,
        ``,
        `[주도테마]`,
        themeLines,
        ``,
        `[주도주 TOP]`,
        stockLines,
    ].join('\n');
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter server test`
Expected: PASS (기존 13 + 신규 5 = 18 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/services/dailyReportBuilder.ts apps/server/src/services/__tests__/dailyReportBuilder.test.ts
git commit -m "feat: 일별 리포트 순수 변환·프롬프트 함수 (TDD)"
```

---

### Task 3: dailyReportService (데이터 수집 + GPT + 저장)

**Files:**
- Create: `apps/server/src/services/dailyReportService.ts`

I/O 오케스트레이션 — 계산/프롬프트는 Task 2 순수 함수에 위임 (얇게 유지, 단위 테스트 없음).

- [ ] **Step 1: 서비스 작성**

```typescript
// 일별 마감 리포트 — 데이터 수집 + GPT 요약 + DB 저장 (forward-only, 멱등)
import OpenAI from 'openai';
import DailyReport from '../models/DailyReport';
import DailyLeadingTheme from '../models/DailyLeadingTheme';
import { getHotStocksCache } from './hotnessService';
import { toReportStocks, toReportThemes, buildReportPrompt, DailyThemeLike } from './dailyReportBuilder';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TOP_STOCKS = 10;
const TOP_THEMES = 8;

// KST 'YYYY-MM-DD' → 해당 날짜의 KST 자정 구간 [start, end)
function kstDayRange(date: string): { start: Date; end: Date } {
    const start = new Date(`${date}T00:00:00+09:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
}

async function generateSummary(date: string, themes: DailyThemeLike[], stocks: any[]): Promise<string> {
    const prompt = buildReportPrompt(date, themes, stocks);
    const response = await openai.chat.completions.create({
        model: 'gpt-5.4-nano',
        max_completion_tokens: 1200,
        messages: [
            { role: 'system', content: '한국 주식시장 전문 애널리스트. 제공된 데이터에만 근거해 객관적으로 시장을 요약한다. 없는 사실을 지어내지 않는다.' },
            { role: 'user', content: prompt },
        ],
    });
    return response.choices[0]?.message?.content?.trim() || '';
}

/**
 * 그날 리포트 생성 (이미 있으면 skip — 멱등, GPT 재호출 없음)
 */
export async function generateDailyReport(date: string): Promise<void> {
    const existing = await DailyReport.findOne({ date }).lean();
    if (existing) {
        console.log(`📄 일별 리포트 이미 존재: ${date} — skip`);
        return;
    }

    // 주도주: 현재 캐시(그날 장마감 시점) — 1회 캡처
    const hot = getHotStocksCache();
    const topStocks = toReportStocks(hot, TOP_STOCKS);

    // 주도테마: 그날 DailyLeadingTheme 최신 레코드
    const { start, end } = kstDayRange(date);
    const dailyTheme = await DailyLeadingTheme.findOne({ date: { $gte: start, $lt: end } })
        .sort({ date: -1 })
        .lean();
    const topThemes = toReportThemes((dailyTheme?.topThemes as DailyThemeLike[]) ?? [], TOP_THEMES);

    if (topStocks.length === 0 && topThemes.length === 0) {
        console.log(`📄 일별 리포트: ${date} 데이터 없음 — skip`);
        return;
    }

    let aiSummary = '';
    try {
        aiSummary = await generateSummary(date, topThemes, hot.slice(0, TOP_STOCKS));
    } catch (err: any) {
        console.error(`📄 일별 리포트 GPT 요약 실패 (${date}):`, err.message);
    }

    await DailyReport.findOneAndUpdate(
        { date },
        { $set: { date, aiSummary, topThemes, topStocks, generatedAt: new Date() } },
        { upsert: true },
    );
    console.log(`📄 일별 리포트 생성 완료: ${date} (테마 ${topThemes.length}, 종목 ${topStocks.length}, 요약 ${aiSummary ? 'O' : 'X'})`);
}

/** 단일 리포트 조회 */
export async function getDailyReport(date: string) {
    return DailyReport.findOne({ date }).lean();
}

/** 최근 리포트 목록 (date desc, 최대 90) */
export async function listRecentReports(limit: number) {
    const capped = Math.min(Math.max(limit, 1), 90);
    return DailyReport.find({}, { date: 1, aiSummary: 1, topThemes: 1, topStocks: 1 })
        .sort({ date: -1 })
        .limit(capped)
        .lean();
}
```

- [ ] **Step 2: 컴파일 + 기존 테스트 확인**

Run: `pnpm --filter server build && pnpm --filter server test`
Expected: 빌드 성공, 18 tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/services/dailyReportService.ts
git commit -m "feat: 일별 리포트 생성·조회 서비스"
```

---

### Task 4: API 라우트 + server.ts 연결

**Files:**
- Create: `apps/server/src/routes/report.ts`
- Modify: `apps/server/src/server.ts`

- [ ] **Step 1: 라우트 작성** (기존 `routes/leading.ts` `{success, data}` 패턴)

```typescript
import { Router, Request, Response } from 'express';
import { getDailyReport, listRecentReports } from '../services/dailyReportService';

const router = Router();

// 최근 리포트 목록 (인덱스/사이트맵용) — :date보다 먼저 등록
router.get('/', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(String(req.query.limit)) || 30;
        const reports = await listRecentReports(limit);
        res.json({
            success: true,
            data: {
                reports: reports.map((r: any) => ({
                    date: r.date,
                    summaryPreview: (r.aiSummary || '').slice(0, 120),
                    themeCount: r.topThemes?.length ?? 0,
                    stockCount: r.topStocks?.length ?? 0,
                })),
            },
        });
    } catch (error: any) {
        console.error('일별 리포트 목록 조회 에러:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 단일 리포트
router.get('/:date', async (req: Request, res: Response) => {
    try {
        const report = await getDailyReport(req.params.date);
        res.json({ success: true, data: report ?? null });
    } catch (error: any) {
        console.error('일별 리포트 조회 에러:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
```

- [ ] **Step 2: server.ts 라우트 등록**

`apps/server/src/server.ts` 상단 import 블록에 추가:
```typescript
import reportRoutes from './routes/report';
import { generateDailyReport } from './services/dailyReportService';
```

라우트 등록 블록(`app.use('/api/performance', performanceRoutes);` 다음 줄)에 추가:
```typescript
app.use('/api/report', reportRoutes);
```

- [ ] **Step 3: 15:35 장마감 배치에 리포트 생성 추가**

`server.ts`의 `checkMarketCloseSchedule` 내부, 등급 성적표 갱신(`등급 성적표 갱신 완료`) 블록 **다음**, 같은 `if (lastVolumeCollectDate !== today)` 블록 안 (closeAllConnections() 전):

```typescript
                    // 일별 마감 리포트 생성 (그날 1회, 멱등)
                    try {
                        const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000)
                            .toISOString().split('T')[0];
                        await generateDailyReport(kstToday);
                    } catch (error) {
                        console.error('일별 리포트 생성 실패:', error);
                    }
```

- [ ] **Step 4: 빌드 + 테스트**

Run: `pnpm --filter server build && pnpm --filter server test`
Expected: 빌드 성공, 18 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/report.ts apps/server/src/server.ts
git commit -m "feat: 일별 리포트 API 라우트 + 장마감 배치 연결"
```

---

### Task 5: `/report/[date]` SSR 페이지

**Files:**
- Create: `apps/client/app/report/[date]/page.tsx`

작성 전 `apps/client/app/performance/page.tsx`와 `apps/client/app/today/page.tsx`를 읽고 디자인 토큰·메타데이터 패턴을 따를 것.

- [ ] **Step 1: 페이지 작성**

```tsx
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
                    <Link href="/report" className="text-xs text-[var(--accent-blue)] hover:underline">
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
                                        <Link href={`/themes/${encodeURIComponent(t.themeName)}`} className="flex-1 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-blue)] hover:underline">
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
                    <Link href="/today" className="text-[var(--accent-blue)] hover:underline">오늘의 주도주 →</Link>
                    <Link href="/performance" className="text-[var(--accent-blue)] hover:underline">주도주 성적표 →</Link>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm --filter client build`
Expected: 성공. `/report/[date]` 가 ƒ (Dynamic) 또는 ISR로 빌드 산출물에 표시

- [ ] **Step 3: Commit**

```bash
git add apps/client/app/report/[date]/page.tsx
git commit -m "feat: 일별 리포트 /report/[date] SSR 페이지"
```

---

### Task 6: `/report` 인덱스(허브) 페이지

**Files:**
- Create: `apps/client/app/report/page.tsx`

- [ ] **Step 1: 페이지 작성**

```tsx
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
                    <Link href="/" className="text-xs text-[var(--accent-blue)] hover:underline">← 홈으로</Link>
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
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm --filter client build`
Expected: 성공, `/report` 라우트 표시

- [ ] **Step 3: Commit**

```bash
git add apps/client/app/report/page.tsx
git commit -m "feat: 일별 리포트 /report 인덱스 페이지"
```

---

### Task 7: 발견 경로 — 사이트맵 + 캘린더 + 네비

**Files:**
- Modify: `apps/client/app/sitemap.ts`
- Modify: `apps/client/components/leading/CalendarDetailModal.tsx`
- Modify: `apps/client/components/layout/Header.tsx`
- Modify: `apps/client/components/layout/Footer.tsx`

- [ ] **Step 1: 사이트맵에 리포트 동적 등록**

`apps/client/app/sitemap.ts`의 `fetchDynamicUrls` 함수 안, `return urls;` 직전에 추가:

```typescript
    try {
        // 일별 리포트
        const reportRes = await fetch(`${API_URL}/report?limit=90`, { next: { revalidate: 3600 } });
        if (reportRes.ok) {
            const reportJson = await reportRes.json();
            const reports: { date: string }[] = reportJson.data?.reports ?? [];
            for (const r of reports) {
                urls.push({
                    url: `https://teburn.com/report/${r.date}`,
                    lastModified: new Date(),
                    changeFrequency: 'monthly',
                    priority: 0.6,
                });
            }
        }
    } catch { /* API down → 정적 URL만 */ }
```

그리고 `staticUrls` 배열에 `/report` 인덱스 추가 (`/performance` 줄 다음):
```typescript
        { url: 'https://teburn.com/report', lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
```

- [ ] **Step 2: 캘린더 상세 모달에 리포트 링크 추가**

`apps/client/components/leading/CalendarDetailModal.tsx` 헤더 영역 — 닫기 버튼(`<X size={14} />`) 직전, 헤더의 우측 영역에 리포트 링크 추가. 기존 헤더 우측 닫기 버튼을 감싼 부분을 다음으로 교체:

기존:
```tsx
                    <button
                        onClick={onClose}
                        className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                        <X size={14} />
                    </button>
```
교체:
```tsx
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { router.push(`/report/${date}`); onClose(); }}
                            className="text-xs text-[var(--accent-blue)] hover:underline"
                        >
                            📄 리포트
                        </button>
                        <button
                            onClick={onClose}
                            className="w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
```
(`router`와 `date`는 이미 컴포넌트 스코프에 존재 — 추가 import 불필요. 리포트 없는 날이면 해당 페이지가 자동 404 처리되므로 v1은 항상 노출.)

- [ ] **Step 3: 헤더 네비에 리포트 추가**

`apps/client/components/layout/Header.tsx`의 `NAV_LINKS` 배열에 추가 (성적표 다음):
```typescript
const NAV_LINKS = [
    { href: '/', label: '홈', authRequired: false },
    { href: '/performance', label: '성적표', authRequired: false },
    { href: '/report', label: '리포트', authRequired: false },
    { href: '/guide', label: '가이드', authRequired: false },
];
```

- [ ] **Step 4: 푸터에 리포트 추가**

`apps/client/components/layout/Footer.tsx`의 서비스 링크 그룹에 추가 (주도주 성적표 다음):
```tsx
                                <Link href="/report" className={FOOTER_LINK}>일별 리포트</Link>
```

- [ ] **Step 5: 빌드 확인**

Run: `pnpm --filter client build`
Expected: 성공, 타입 에러 없음

- [ ] **Step 6: Commit**

```bash
git add apps/client/app/sitemap.ts apps/client/components/leading/CalendarDetailModal.tsx apps/client/components/layout/Header.tsx apps/client/components/layout/Footer.tsx
git commit -m "feat: 일별 리포트 발견 경로 — 사이트맵·캘린더·네비 연결"
```

---

### Task 8: 최종 검증

- [ ] **Step 1: 전체 테스트 + 빌드**

```bash
pnpm --filter server test && pnpm --filter server build && pnpm --filter client build
```
Expected: 18 tests PASS, 서버/클라이언트 빌드 성공, `/report`·`/report/[date]` 라우트 생성

- [ ] **Step 2: 멱등성 점검 (코드 리뷰)**

`generateDailyReport`가 같은 date 두 번 호출 시 두 번째는 `existing` 체크로 GPT 미호출하는지 코드로 확인. `DailyReport` unique index(date)가 동시 호출 시 안전망인지 확인.

- [ ] **Step 3: 배포 확인 요청**

배포는 사용자 승인 후 (git push → 자동 배포). forward-only이므로 첫 리포트는 다음 장마감(평일 15:35)에 생성됨 — 배포 직후엔 `/report` 목록이 비어 있는 게 정상.
