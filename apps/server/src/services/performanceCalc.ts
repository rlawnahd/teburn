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

// 등급일로부터 7일(달력) 경과 시 거래정지/상폐로 간주
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
 * @param candles 날짜 오름차순 정렬, 중복 날짜 없음 (호출자가 보장)
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

    // 등급일 이후 일봉 없음 — 7일(달력) 경과 시 거래정지/상폐로 간주
    if (entryIdx === -1) {
        if (asOfDate >= addDays(gradeDate, EXCLUDE_AFTER_DAYS)) {
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
