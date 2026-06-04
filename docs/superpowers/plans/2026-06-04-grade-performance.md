# 등급 성적표 (Grade Performance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** S/A등급 주도주의 익일 시가 매수 기준 수익률(D+1/D+5)을 자동 추적·집계해 `/performance` 페이지로 공개한다.

**Architecture:** 순수 계산 로직(`performanceCalc.ts`, 테스트 대상)과 I/O 오케스트레이션(`performanceService.ts`, KIS 일봉 조회 + mongoose)을 분리한다. 매일 15:35 장마감 배치에서 당일 S/A 레코드를 생성하고 미완성 레코드를 일봉으로 채운다. 배포 시 컬렉션이 비어 있으면 `HotnessHistory` 90일치를 소급 백필한다.

**Tech Stack:** Express + mongoose + TypeScript (apps/server), Next.js App Router SSR (apps/client), KIS 일봉 API (FHKST03010100), vitest (신규 도입)

**Spec:** `docs/superpowers/specs/2026-06-04-grade-performance-design.md`

---

## File Structure

```
apps/server/
  package.json                                  # Modify: vitest devDep + test script
  src/models/GradePerformance.ts                # Create: mongoose 모델
  src/services/performanceCalc.ts               # Create: 순수 계산 함수 (테스트 대상)
  src/services/__tests__/performanceCalc.test.ts # Create: 단위 테스트
  src/services/performanceService.ts            # Create: KIS 일봉 조회 + 배치 오케스트레이션
  src/routes/performance.ts                     # Create: /api/performance/*
  src/server.ts                                 # Modify: 라우트 등록 + 15:35 배치 + 백필
apps/client/
  app/performance/page.tsx                      # Create: SSR 성적표 페이지
```

---

### Task 1: vitest 테스트 인프라 셋업

**Files:**
- Modify: `apps/server/package.json`

- [ ] **Step 1: vitest 설치**

```bash
cd /Users/kimjumong/code/home/teburn && pnpm --filter server add -D vitest
```

- [ ] **Step 2: test 스크립트 추가**

`apps/server/package.json`의 `"scripts"`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: 동작 확인**

Run: `pnpm --filter server test`
Expected: "No test files found" 류 메시지와 함께 종료 (테스트 파일이 아직 없으므로 정상)

- [ ] **Step 4: Commit**

```bash
git add apps/server/package.json pnpm-lock.yaml
git commit -m "chore: vitest 테스트 인프라 추가"
```

---

### Task 2: GradePerformance 모델

**Files:**
- Create: `apps/server/src/models/GradePerformance.ts`

- [ ] **Step 1: 모델 작성** (기존 `HotnessHistory.ts` 패턴을 따름. TTL 인덱스 없음 — 영구 보관)

```typescript
import mongoose, { Document, Schema } from 'mongoose';

export type PerformanceStatus = 'pending' | 'partial' | 'complete' | 'excluded';

export interface IGradePerformance extends Document {
    stockCode: string;
    stockName: string;
    grade: 'S' | 'A';
    totalScore: number;
    date: string; // 등급일 D (YYYY-MM-DD)
    entryPrice: number | null;  // D+1 거래일 시가
    d1Close: number | null;     // D+1 거래일 종가
    d5Close: number | null;     // 진입일 포함 5거래일째 종가
    returnD1: number | null;    // %
    returnD5: number | null;    // %
    status: PerformanceStatus;
    createdAt: Date;
}

const GradePerformanceSchema: Schema = new Schema({
    stockCode: { type: String, required: true },
    stockName: { type: String, required: true },
    grade: { type: String, enum: ['S', 'A'], required: true },
    totalScore: { type: Number, required: true },
    date: { type: String, required: true },
    entryPrice: { type: Number, default: null },
    d1Close: { type: Number, default: null },
    d5Close: { type: Number, default: null },
    returnD1: { type: Number, default: null },
    returnD5: { type: Number, default: null },
    status: {
        type: String,
        enum: ['pending', 'partial', 'complete', 'excluded'],
        default: 'pending',
    },
    createdAt: { type: Date, default: Date.now },
});

// 종목별 날짜 유니크 (하루에 한 번만)
GradePerformanceSchema.index({ stockCode: 1, date: 1 }, { unique: true });
// 날짜 범위 조회 최적화 (summary/daily API)
GradePerformanceSchema.index({ date: -1 });

export default mongoose.model<IGradePerformance>('GradePerformance', GradePerformanceSchema);
```

- [ ] **Step 2: 컴파일 확인**

Run: `pnpm --filter server build`
Expected: 에러 없이 종료

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/models/GradePerformance.ts
git commit -m "feat: GradePerformance 모델 추가"
```

---

### Task 3: 수익률 계산 순수 함수 (TDD)

**Files:**
- Create: `apps/server/src/services/performanceCalc.ts`
- Test: `apps/server/src/services/__tests__/performanceCalc.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
import { describe, it, expect } from 'vitest';
import { computePerformance, addDays, DailyCandle } from '../performanceCalc';

// 헬퍼: 일봉 생성
function candle(date: string, open: number, close: number): DailyCandle {
    return { date, open, close };
}

describe('addDays', () => {
    it('YYYY-MM-DD 문자열에 일수를 더한다', () => {
        expect(addDays('2026-06-01', 3)).toBe('2026-06-04');
        expect(addDays('2026-06-01', -7)).toBe('2026-05-25');
    });
});

describe('computePerformance', () => {
    // 2026-06-01(월) 등급 → 6/02 진입, 6/02~6/08 거래일 5개
    const fullCandles: DailyCandle[] = [
        candle('2026-06-01', 9000, 9500),   // 등급일 당일 (진입 아님)
        candle('2026-06-02', 10000, 10500), // D+1: 진입일 (1일째)
        candle('2026-06-03', 10500, 10300), // 2일째
        candle('2026-06-04', 10300, 10800), // 3일째
        candle('2026-06-05', 10800, 11000), // 4일째
        candle('2026-06-08', 11000, 12000), // 5일째 (D+5)
    ];

    it('진입일 시가 매수 기준 D+1/D+5 수익률을 계산한다 (complete)', () => {
        const r = computePerformance('2026-06-01', fullCandles, '2026-06-10');
        expect(r.status).toBe('complete');
        expect(r.entryPrice).toBe(10000);
        expect(r.d1Close).toBe(10500);
        expect(r.returnD1).toBe(5);       // 10500/10000 - 1 = 5%
        expect(r.d5Close).toBe(12000);
        expect(r.returnD5).toBe(20);      // 12000/10000 - 1 = 20%
    });

    it('D+1이 휴장이면 다음 거래일을 진입일로 쓴다', () => {
        // 6/02 휴장 → 6/03이 진입일
        const candles = fullCandles.filter(c => c.date !== '2026-06-02');
        const r = computePerformance('2026-06-01', candles, '2026-06-10');
        expect(r.entryPrice).toBe(10500); // 6/03 시가
        expect(r.d1Close).toBe(10300);    // 6/03 종가
    });

    it('진입일 이후 5거래일 미도래면 partial (D+1만 채움)', () => {
        const candles = fullCandles.slice(0, 3); // 6/01, 6/02, 6/03만
        const r = computePerformance('2026-06-01', candles, '2026-06-04');
        expect(r.status).toBe('partial');
        expect(r.returnD1).toBe(5);
        expect(r.d5Close).toBeNull();
        expect(r.returnD5).toBeNull();
    });

    it('등급일 이후 일봉이 아직 없으면 pending (7일 이내)', () => {
        const candles = [candle('2026-06-01', 9000, 9500)];
        const r = computePerformance('2026-06-01', candles, '2026-06-02');
        expect(r.status).toBe('pending');
        expect(r.entryPrice).toBeNull();
    });

    it('등급일 후 7일이 지나도 일봉이 없으면 excluded (거래정지 등)', () => {
        const candles = [candle('2026-06-01', 9000, 9500)];
        const r = computePerformance('2026-06-01', candles, '2026-06-09');
        expect(r.status).toBe('excluded');
    });

    it('진입일 시가가 0이면 excluded (데이터 이상)', () => {
        const candles = [candle('2026-06-01', 9000, 9500), candle('2026-06-02', 0, 10500)];
        const r = computePerformance('2026-06-01', candles, '2026-06-10');
        expect(r.status).toBe('excluded');
    });

    it('수익률은 소수 둘째 자리로 반올림한다', () => {
        const candles = [
            candle('2026-06-02', 30000, 30100), // 0.3333..%
            candle('2026-06-03', 1, 1),
            candle('2026-06-04', 1, 1),
            candle('2026-06-05', 1, 1),
            candle('2026-06-08', 1, 1),
        ];
        const r = computePerformance('2026-06-01', candles, '2026-06-10');
        expect(r.returnD1).toBe(0.33);
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter server test`
Expected: FAIL — `performanceCalc` 모듈 없음

- [ ] **Step 3: 최소 구현 작성** (`apps/server/src/services/performanceCalc.ts`)

```typescript
// 등급 성적표 — 순수 계산 함수 (I/O 없음, 단위 테스트 대상)

export interface DailyCandle {
    date: string;  // YYYY-MM-DD
    open: number;
    close: number;
}

export interface ComputedPerformance {
    entryPrice: number | null;
    d1Close: number | null;
    d5Close: number | null;
    returnD1: number | null;
    returnD5: number | null;
    status: 'pending' | 'partial' | 'complete' | 'excluded';
}

// 등급일 후 이 일수(달력 기준)가 지나도 일봉이 없으면 excluded
const EXCLUDE_AFTER_DAYS = 7;
// 진입일 포함 5거래일째가 D+5
const D5_TRADING_DAYS = 5;

export function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * 등급일(D)과 일봉 배열(오름차순)로 수익률 계산.
 * 진입일 = D 이후 첫 거래일 시가 매수 기준.
 */
export function computePerformance(
    gradeDate: string,
    candles: DailyCandle[],
    asOfDate: string,
): ComputedPerformance {
    const empty: ComputedPerformance = {
        entryPrice: null, d1Close: null, d5Close: null,
        returnD1: null, returnD5: null, status: 'pending',
    };

    const entryIdx = candles.findIndex(c => c.date > gradeDate);

    // 등급일 이후 일봉 없음 — 7일 경과 시 거래정지/상폐로 간주
    if (entryIdx === -1) {
        if (asOfDate > addDays(gradeDate, EXCLUDE_AFTER_DAYS)) {
            return { ...empty, status: 'excluded' };
        }
        return empty;
    }

    const entry = candles[entryIdx];
    if (entry.open <= 0) {
        return { ...empty, status: 'excluded' };
    }

    const returnD1 = round2((entry.close / entry.open - 1) * 100);
    const d5Candle = candles[entryIdx + D5_TRADING_DAYS - 1];

    if (!d5Candle) {
        return {
            entryPrice: entry.open, d1Close: entry.close, d5Close: null,
            returnD1, returnD5: null, status: 'partial',
        };
    }

    return {
        entryPrice: entry.open,
        d1Close: entry.close,
        d5Close: d5Candle.close,
        returnD1,
        returnD5: round2((d5Candle.close / entry.open - 1) * 100),
        status: 'complete',
    };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter server test`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/services/performanceCalc.ts apps/server/src/services/__tests__/performanceCalc.test.ts
git commit -m "feat: 등급 성적표 수익률 계산 함수 (TDD)"
```

---

### Task 4: 집계 함수 summarizePerformance (TDD)

**Files:**
- Modify: `apps/server/src/services/performanceCalc.ts`
- Test: `apps/server/src/services/__tests__/performanceCalc.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가** (기존 테스트 파일 하단에 append)

```typescript
import { summarizePerformance, PerfRecordLike } from '../performanceCalc';

describe('summarizePerformance', () => {
    function rec(over: Partial<PerfRecordLike>): PerfRecordLike {
        return {
            stockCode: '005930', stockName: '삼성전자', grade: 'S',
            date: '2026-06-01', returnD1: 0, returnD5: null, status: 'partial',
            ...over,
        };
    }

    it('등급별 평균 수익률·승률·표본수를 계산한다', () => {
        const records: PerfRecordLike[] = [
            rec({ stockCode: 'A1', stockName: '에이', grade: 'S', returnD1: 10, returnD5: 20, status: 'complete' }),
            rec({ stockCode: 'A2', stockName: '비', grade: 'S', returnD1: -2, status: 'partial' }),
            rec({ stockCode: 'A3', stockName: '씨', grade: 'A', returnD1: 4, returnD5: 6, status: 'complete' }),
        ];
        const s = summarizePerformance(records, 30, '2026-06-10');

        expect(s.S.count).toBe(2);
        expect(s.S.avgReturnD1).toBe(4);        // (10 + -2) / 2
        expect(s.S.avgReturnD5).toBe(20);       // complete만
        expect(s.S.winRateD1).toBe(50);         // 1/2
        expect(s.S.best?.stockName).toBe('에이');
        expect(s.S.worst?.stockName).toBe('비');
        expect(s.A.count).toBe(1);
        expect(s.A.avgReturnD1).toBe(4);
    });

    it('윈도우 밖 레코드와 excluded/pending은 제외한다', () => {
        const records: PerfRecordLike[] = [
            rec({ stockCode: 'A1', date: '2026-04-01', returnD1: 99, status: 'complete' }), // 윈도우 밖
            rec({ stockCode: 'A2', returnD1: null, status: 'excluded' }),
            rec({ stockCode: 'A3', returnD1: null, status: 'pending' }),
            rec({ stockCode: 'A4', returnD1: 5, status: 'partial' }),
        ];
        const s = summarizePerformance(records, 7, '2026-06-05');
        expect(s.S.count).toBe(1);
        expect(s.S.avgReturnD1).toBe(5);
    });

    it('표본이 없으면 null 평균을 반환한다', () => {
        const s = summarizePerformance([], 7, '2026-06-05');
        expect(s.S.count).toBe(0);
        expect(s.S.avgReturnD1).toBeNull();
        expect(s.S.winRateD1).toBeNull();
        expect(s.S.best).toBeNull();
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter server test`
Expected: FAIL — `summarizePerformance` export 없음

- [ ] **Step 3: 구현 추가** (`performanceCalc.ts` 하단에 append)

```typescript
// ---------- 집계 ----------

export interface PerfRecordLike {
    stockCode: string;
    stockName: string;
    grade: string;
    date: string;
    returnD1: number | null;
    returnD5: number | null;
    status: string;
}

export interface GradeSummary {
    count: number;
    avgReturnD1: number | null;
    avgReturnD5: number | null;
    winRateD1: number | null; // returnD1 > 0 비율 (%)
    best: { stockCode: string; stockName: string; returnD1: number } | null;
    worst: { stockCode: string; stockName: string; returnD1: number } | null;
}

function summarizeGrade(records: PerfRecordLike[]): GradeSummary {
    const measured = records.filter(
        r => r.returnD1 !== null && (r.status === 'partial' || r.status === 'complete'),
    );
    if (measured.length === 0) {
        return { count: 0, avgReturnD1: null, avgReturnD5: null, winRateD1: null, best: null, worst: null };
    }

    const d1s = measured.map(r => r.returnD1 as number);
    const d5s = measured.filter(r => r.status === 'complete' && r.returnD5 !== null).map(r => r.returnD5 as number);
    const wins = d1s.filter(v => v > 0).length;
    const sorted = [...measured].sort((a, b) => (b.returnD1 as number) - (a.returnD1 as number));
    const toPick = (r: PerfRecordLike) => ({
        stockCode: r.stockCode, stockName: r.stockName, returnD1: r.returnD1 as number,
    });

    return {
        count: measured.length,
        avgReturnD1: round2(d1s.reduce((a, b) => a + b, 0) / d1s.length),
        avgReturnD5: d5s.length > 0 ? round2(d5s.reduce((a, b) => a + b, 0) / d5s.length) : null,
        winRateD1: round2((wins / measured.length) * 100),
        best: toPick(sorted[0]),
        worst: toPick(sorted[sorted.length - 1]),
    };
}

/**
 * 최근 windowDays(달력일) 윈도우의 등급별 성적 집계
 */
export function summarizePerformance(
    records: PerfRecordLike[],
    windowDays: number,
    asOfDate: string,
): { S: GradeSummary; A: GradeSummary } {
    const cutoff = addDays(asOfDate, -windowDays);
    const inWindow = records.filter(r => r.date >= cutoff);
    return {
        S: summarizeGrade(inWindow.filter(r => r.grade === 'S')),
        A: summarizeGrade(inWindow.filter(r => r.grade === 'A')),
    };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter server test`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/services/performanceCalc.ts apps/server/src/services/__tests__/performanceCalc.test.ts
git commit -m "feat: 등급 성적표 집계 함수 추가"
```

---

### Task 5: performanceService — KIS 일봉 조회 + 배치

**Files:**
- Create: `apps/server/src/services/performanceService.ts`

I/O 오케스트레이션 — 로직은 모두 Task 3·4의 순수 함수에 위임하므로 단위 테스트 없음 (얇게 유지).

- [ ] **Step 1: 서비스 작성**

```typescript
// 등급 성적표 — KIS 일봉 조회 + 레코드 생성/채움 배치
import axios from 'axios';
import GradePerformance from '../models/GradePerformance';
import HotnessHistory from '../models/HotnessHistory';
import { getKisToken } from './kisRestApi';
import { acquireKisToken } from './kisRateLimiter';
import { computePerformance, DailyCandle } from './performanceCalc';

const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_IS_MOCK = process.env.KIS_IS_MOCK === 'true';
const BASE_URL = KIS_IS_MOCK
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443';

function kstTodayStr(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * KIS 기간별 일봉 조회 (FHKST03010100) — 시가/종가, 오름차순 반환
 */
export async function fetchDailyCandles(
    stockCode: string,
    startDate: string, // YYYY-MM-DD
    endDate: string,
): Promise<DailyCandle[]> {
    await acquireKisToken();

    try {
        const token = await getKisToken();
        const response = await axios.get(
            `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    authorization: `Bearer ${token}`,
                    appkey: KIS_APP_KEY,
                    appsecret: KIS_APP_SECRET,
                    tr_id: 'FHKST03010100',
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J',
                    FID_INPUT_ISCD: stockCode,
                    FID_INPUT_DATE_1: startDate.replace(/-/g, ''),
                    FID_INPUT_DATE_2: endDate.replace(/-/g, ''),
                    FID_PERIOD_DIV_CODE: 'D',
                    FID_ORG_ADJ_PRC: '0', // 수정주가
                },
                timeout: 8000,
            },
        );

        if (response.data.rt_cd !== '0') {
            console.error(`일봉 조회 실패 (${stockCode}):`, response.data.msg1);
            return [];
        }

        const rows: any[] = response.data.output2 || [];
        return rows
            .filter(r => r && r.stck_bsop_date)
            .map(r => ({
                date: `${r.stck_bsop_date.slice(0, 4)}-${r.stck_bsop_date.slice(4, 6)}-${r.stck_bsop_date.slice(6, 8)}`,
                open: parseInt(r.stck_oprc) || 0,
                close: parseInt(r.stck_clpr) || 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error: any) {
        console.error(`일봉 조회 에러 (${stockCode}):`, error.response?.data || error.message);
        return [];
    }
}

export interface GradeRecordInput {
    stockCode: string;
    stockName: string;
    grade: string; // S/A만 저장됨
    totalScore: number;
    date: string; // YYYY-MM-DD
}

/**
 * S/A등급 레코드 생성 (이미 있으면 건드리지 않음 — $setOnInsert)
 */
export async function upsertGradeRecords(records: GradeRecordInput[]): Promise<number> {
    let created = 0;
    for (const r of records) {
        if (r.grade !== 'S' && r.grade !== 'A') continue;
        try {
            const result = await GradePerformance.findOneAndUpdate(
                { stockCode: r.stockCode, date: r.date },
                {
                    $setOnInsert: {
                        stockCode: r.stockCode,
                        stockName: r.stockName,
                        grade: r.grade,
                        totalScore: r.totalScore,
                        date: r.date,
                        status: 'pending',
                    },
                },
                { upsert: true, new: false },
            );
            if (!result) created++; // null이면 신규 생성
        } catch {
            // unique index 충돌 무시
        }
    }
    return created;
}

/**
 * 미완성(pending/partial) 레코드를 일봉으로 채움.
 * 종목별로 묶어 일봉 1콜로 해당 종목의 모든 날짜를 처리.
 */
export async function fillPerformanceRecords(): Promise<void> {
    const incomplete = await GradePerformance.find({
        status: { $in: ['pending', 'partial'] },
    }).lean();

    if (incomplete.length === 0) return;

    const byCode = new Map<string, typeof incomplete>();
    for (const rec of incomplete) {
        if (!byCode.has(rec.stockCode)) byCode.set(rec.stockCode, []);
        byCode.get(rec.stockCode)!.push(rec);
    }

    const today = kstTodayStr();
    let updated = 0;

    for (const [code, recs] of byCode) {
        const minDate = recs.map(r => r.date).sort()[0];
        const candles = await fetchDailyCandles(code, minDate, today);
        if (candles.length === 0) continue; // KIS 장애 등 — 다음 배치에서 재시도

        for (const rec of recs) {
            const result = computePerformance(rec.date, candles, today);
            if (result.status === 'pending') continue; // 변화 없음
            await GradePerformance.updateOne({ _id: rec._id }, { $set: result });
            updated++;
        }
    }

    console.log(`📈 성적표 채움 완료: ${updated}개 레코드 (${byCode.size}개 종목 조회)`);
}

/**
 * 컬렉션이 비어 있으면 HotnessHistory 90일치 S/A를 소급 백필 (배포 후 1회)
 */
export async function backfillPerformanceIfEmpty(): Promise<void> {
    const count = await GradePerformance.estimatedDocumentCount();
    if (count > 0) return;

    console.log('📈 성적표 백필 시작 (HotnessHistory 90일치 S/A)...');
    const hist = await HotnessHistory.find({ grade: { $in: ['S', 'A'] } }).lean();
    if (hist.length === 0) {
        console.log('📈 백필할 히스토리 없음');
        return;
    }

    await upsertGradeRecords(
        hist.map(h => ({
            stockCode: h.stockCode,
            stockName: h.stockName,
            grade: h.grade,
            totalScore: h.totalScore,
            date: h.date,
        })),
    );
    await fillPerformanceRecords();
    console.log(`📈 성적표 백필 완료: ${hist.length}개 히스토리 처리`);
}
```

- [ ] **Step 2: 컴파일 + 기존 테스트 확인**

Run: `pnpm --filter server build && pnpm --filter server test`
Expected: 빌드 성공, 11 tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/services/performanceService.ts
git commit -m "feat: 성적표 KIS 일봉 조회 및 배치 서비스"
```

---

### Task 6: API 라우트 + server.ts 연결

**Files:**
- Create: `apps/server/src/routes/performance.ts`
- Modify: `apps/server/src/server.ts`

- [ ] **Step 1: 라우트 작성** (기존 `routes/leading.ts`의 `{success, data}` 패턴을 따름)

```typescript
import { Router, Request, Response } from 'express';
import GradePerformance from '../models/GradePerformance';
import { summarizePerformance, addDays, PerfRecordLike } from '../services/performanceCalc';

const router = Router();

function kstTodayStr(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// 단일 객체 캐시 (Map 누적 금지 — 메모리 누수 방지)
let summaryCache: { data: any; ts: number } | null = null;
const SUMMARY_TTL = 60 * 60 * 1000; // 1시간

// 윈도우별(7/30/90일) 등급 성적 요약
router.get('/summary', async (req: Request, res: Response) => {
    try {
        if (summaryCache && Date.now() - summaryCache.ts < SUMMARY_TTL) {
            return res.json({ success: true, data: summaryCache.data });
        }

        const today = kstTodayStr();
        const records = await GradePerformance.find({
            date: { $gte: addDays(today, -90) },
        }).lean<PerfRecordLike[]>();

        const data = {
            windows: [7, 30, 90].map(days => ({
                days,
                ...summarizePerformance(records, days, today),
            })),
            updatedAt: new Date().toISOString(),
        };

        summaryCache = { data, ts: Date.now() };
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('성적표 요약 조회 에러:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 날짜별 종목 성적 리스트 (최근 N일, 최대 90)
router.get('/daily', async (req: Request, res: Response) => {
    try {
        const days = Math.min(parseInt(String(req.query.days)) || 30, 90);
        const today = kstTodayStr();
        const records = await GradePerformance.find({
            date: { $gte: addDays(today, -days) },
        })
            .sort({ date: -1, returnD1: -1 })
            .lean();

        // 날짜별 그룹핑
        const byDate = new Map<string, any[]>();
        for (const r of records) {
            if (!byDate.has(r.date)) byDate.set(r.date, []);
            byDate.get(r.date)!.push({
                stockCode: r.stockCode,
                stockName: r.stockName,
                grade: r.grade,
                totalScore: r.totalScore,
                returnD1: r.returnD1,
                returnD5: r.returnD5,
                status: r.status,
            });
        }

        res.json({
            success: true,
            data: {
                days: Array.from(byDate.entries()).map(([date, stocks]) => ({ date, stocks })),
            },
        });
    } catch (error: any) {
        console.error('성적표 일별 조회 에러:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
```

- [ ] **Step 2: server.ts에 라우트 등록**

`apps/server/src/server.ts` 상단 import 블록(`import tradingRoutes ...` 근처)에 추가:

```typescript
import performanceRoutes from './routes/performance';
import { upsertGradeRecords, fillPerformanceRecords, backfillPerformanceIfEmpty } from './services/performanceService';
```

라우트 등록 블록(`app.use('/api/auth', authRoutes);` 다음 줄)에 추가:

```typescript
app.use('/api/performance', performanceRoutes);
```

- [ ] **Step 3: 15:35 장마감 배치에 성적표 갱신 추가**

`server.ts`의 `checkMarketCloseSchedule` 내부, `saveDailyHotnessHistory()` try/catch 블록 **다음**에 추가 (같은 `if (lastVolumeCollectDate !== today)` 블록 안):

```typescript
                    // 등급 성적표: 오늘 S/A 레코드 생성 + 미완성 레코드 채움
                    try {
                        const saStocks = getHotStocksCache().filter(
                            (s) => s.grade === 'S' || s.grade === 'A'
                        );
                        await upsertGradeRecords(
                            saStocks.map((s) => ({
                                stockCode: s.stockCode,
                                stockName: s.stockName,
                                grade: s.grade,
                                totalScore: s.totalScore,
                                date: today,
                            }))
                        );
                        await fillPerformanceRecords();
                        console.log('등급 성적표 갱신 완료');
                    } catch (error) {
                        console.error('등급 성적표 갱신 실패:', error);
                    }
```

- [ ] **Step 4: 시작 시 백필 연결**

`server.ts`의 `themePriceCache.startScheduler()` 프로미스 체인에서 `startTelegramBot()` 다음 단계로 추가:

```typescript
            .then(() => {
                startKisWebSocket();
                startHistoryCollection();
                startThemeAnalysisScheduler();
                return startTelegramBot();
            })
            .then(() => {
                // 성적표 백필 (컬렉션 비어 있을 때 1회, 백그라운드)
                backfillPerformanceIfEmpty().catch(err => {
                    console.error('❌ 성적표 백필 실패:', err);
                });
            })
```

- [ ] **Step 5: 빌드 + 테스트 확인**

Run: `pnpm --filter server build && pnpm --filter server test`
Expected: 빌드 성공, 11 tests PASS

- [ ] **Step 6: 로컬 동작 확인** (MONGO_URI/KIS 키가 설정된 로컬 .env 필요)

```bash
pnpm --filter server dev
```

서버 기동 후 별도 터미널에서:

```bash
curl -s http://localhost:4000/api/performance/summary | head -c 500
```

Expected: `{"success":true,"data":{"windows":[{"days":7,...}]}}` 형태 응답. 백필이 돌았다면 표본 수 > 0, 로그에 `📈 성적표 백필 완료` 출력

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/routes/performance.ts apps/server/src/server.ts
git commit -m "feat: 성적표 API 라우트 + 장마감 배치 + 백필 연결"
```

---

### Task 7: /performance SSR 페이지

**Files:**
- Create: `apps/client/app/performance/page.tsx`

스타일은 `apps/client/app/today/page.tsx`의 구조·클래스 컨벤션을 따른다 (작성 전 해당 파일을 열어 색상/spacing 클래스를 맞출 것).

- [ ] **Step 1: 페이지 작성**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const metadata: Metadata = {
    title: '주도주 성적표 — S/A등급 실제 수익률 검증 | TEBURN',
    description:
        'TEBURN 주도주 점수의 실제 성적을 공개합니다. S/A등급 종목의 익일 시가 매수 기준 D+1, D+5 수익률과 승률을 매일 자동 검증합니다.',
};

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

async function fetchPerformance(): Promise<{
    windows: WindowSummary[];
    days: { date: string; stocks: DailyStock[] }[];
}> {
    try {
        const [summaryRes, dailyRes] = await Promise.all([
            fetch(`${API_URL}/performance/summary`, { next: { revalidate: 3600 } }),
            fetch(`${API_URL}/performance/daily?days=30`, { next: { revalidate: 3600 } }),
        ]);
        const summary = summaryRes.ok ? await summaryRes.json() : null;
        const daily = dailyRes.ok ? await dailyRes.json() : null;
        return {
            windows: summary?.data?.windows ?? [],
            days: daily?.data?.days ?? [],
        };
    } catch {
        return { windows: [], days: [] };
    }
}

function pct(v: number | null): string {
    if (v === null) return '—';
    return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function pctColor(v: number | null): string {
    if (v === null) return 'text-zinc-500';
    if (v > 0) return 'text-red-400';
    if (v < 0) return 'text-blue-400';
    return 'text-zinc-400';
}

function SummaryCard({ grade, s }: { grade: string; s: GradeSummary }) {
    return (
        <div className="rounded-xl bg-zinc-900 p-5">
            <div className="mb-3 flex items-center gap-2">
                <span className="text-lg font-bold">{grade}등급</span>
                <span className="text-xs text-zinc-500">표본 {s.count}건</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                    <div className="text-xs text-zinc-500">D+1 평균</div>
                    <div className={`text-lg font-semibold ${pctColor(s.avgReturnD1)}`}>{pct(s.avgReturnD1)}</div>
                </div>
                <div>
                    <div className="text-xs text-zinc-500">D+5 평균</div>
                    <div className={`text-lg font-semibold ${pctColor(s.avgReturnD5)}`}>{pct(s.avgReturnD5)}</div>
                </div>
                <div>
                    <div className="text-xs text-zinc-500">D+1 승률</div>
                    <div className="text-lg font-semibold">{s.winRateD1 === null ? '—' : `${s.winRateD1.toFixed(0)}%`}</div>
                </div>
            </div>
        </div>
    );
}

export default async function PerformancePage() {
    const { windows, days } = await fetchPerformance();

    return (
        <main className="mx-auto max-w-3xl px-4 py-8">
            <h1 className="text-2xl font-bold">주도주 성적표</h1>
            <p className="mt-2 text-sm text-zinc-400">
                S/A등급 종목의 <strong>익일 시가 매수 기준</strong> 실제 수익률을 매일 자동 검증합니다.
                좋은 성적도 나쁜 성적도 그대로 공개합니다.
            </p>

            {/* 윈도우별 요약 (7/30/90일) */}
            {windows.length === 0 && (
                <p className="mt-8 text-sm text-zinc-500">아직 데이터가 없습니다.</p>
            )}
            {windows.map(w => (
                <section key={w.days} className="mt-8">
                    <h2 className="mb-3 text-sm font-semibold text-zinc-400">최근 {w.days}일</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <SummaryCard grade="S" s={w.S} />
                        <SummaryCard grade="A" s={w.A} />
                    </div>
                </section>
            ))}

            {/* 일자별 상세 */}
            <section className="mt-10">
                <h2 className="mb-3 text-sm font-semibold text-zinc-400">일자별 상세</h2>
                <div className="space-y-2">
                    {days.map(({ date, stocks }) => (
                        <details key={date} className="rounded-lg bg-zinc-900">
                            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                                {date} <span className="ml-2 text-xs text-zinc-500">{stocks.length}종목</span>
                            </summary>
                            <div className="border-t border-zinc-800 px-4 py-2">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-zinc-500">
                                            <th className="py-1 font-normal">종목</th>
                                            <th className="py-1 font-normal">등급</th>
                                            <th className="py-1 text-right font-normal">D+1</th>
                                            <th className="py-1 text-right font-normal">D+5</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stocks.map(s => (
                                            <tr key={s.stockCode}>
                                                <td className="py-1.5">
                                                    <Link href={`/stocks/${s.stockCode}`} className="hover:underline">
                                                        {s.stockName}
                                                    </Link>
                                                </td>
                                                <td className="py-1.5">{s.grade}</td>
                                                <td className={`py-1.5 text-right ${pctColor(s.returnD1)}`}>
                                                    {s.status === 'excluded' ? '제외' : pct(s.returnD1)}
                                                </td>
                                                <td className={`py-1.5 text-right ${pctColor(s.returnD5)}`}>
                                                    {s.status === 'excluded' ? '—' : pct(s.returnD5)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    ))}
                </div>
            </section>

            {/* 방법론 */}
            <section className="mt-10 rounded-lg bg-zinc-900/50 p-4 text-xs leading-relaxed text-zinc-500">
                <h2 className="mb-2 font-semibold text-zinc-400">측정 방법</h2>
                <ul className="list-inside list-disc space-y-1">
                    <li>장마감(15:35) 기준 S/A등급 종목을 다음 거래일 시가에 매수했다고 가정합니다.</li>
                    <li>D+1 = 진입일 종가 수익률, D+5 = 진입일 포함 5거래일째 종가 수익률입니다.</li>
                    <li>동일가중 평균이며 수수료·슬리피지는 반영하지 않습니다.</li>
                    <li>상한가 갭 등으로 시가 매수가 불가능한 경우도 포함됩니다.</li>
                    <li>거래정지·상장폐지로 시세가 없는 종목은 통계에서 제외하고 표기합니다.</li>
                </ul>
            </section>
        </main>
    );
}
```

- [ ] **Step 2: 로컬 확인**

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000/performance` 접속.
Expected: 요약 카드 2개(S/A) + 일자별 아코디언 + 방법론 노트 렌더링. 데이터 없으면 "아직 데이터가 없습니다." 표시

- [ ] **Step 3: 스타일 정합성 확인**

`apps/client/app/today/page.tsx`와 비교해 배경/텍스트 색 클래스가 디자인 시스템과 어긋나면 맞춘다 (다크 온리 시스템 — 직접 띄워서 확인).

- [ ] **Step 4: Commit**

```bash
git add apps/client/app/performance/page.tsx
git commit -m "feat: 주도주 성적표 /performance SSR 페이지"
```

---

### Task 8: 배포 전 최종 검증

- [ ] **Step 1: 전체 테스트 + 빌드**

```bash
pnpm --filter server test && pnpm --filter server build && pnpm --filter client build
```

Expected: 테스트 11개 PASS, 서버/클라이언트 빌드 성공

- [ ] **Step 2: 백필 아이덤포턴시 확인** (로컬)

서버를 두 번 재시작해도 GradePerformance 레코드 수가 그대로인지 확인:

```bash
# mongosh 또는 서버 로그로 확인 — 두 번째 기동 시 "백필 시작" 로그가 없어야 함
```

Expected: 두 번째 기동에서는 `estimatedDocumentCount > 0`이므로 백필 스킵

- [ ] **Step 3: 사용자에게 배포 확인 요청**

Railway 배포는 사용자 승인 후 진행 (git push → 자동 배포). 배포 직후 KIS rate limit 공유 주의: 백필(수백 콜)이 themePriceCache 배치와 rate limiter를 공유하므로 첫 기동 직후 주가 캐시 갱신이 평소보다 느릴 수 있음 — 정상.
