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
