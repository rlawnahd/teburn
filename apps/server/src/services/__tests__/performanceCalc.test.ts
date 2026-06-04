import { describe, it, expect } from 'vitest';
import { computePerformance, addDays, DailyCandle } from '../performanceCalc';
import { summarizePerformance, PerfRecordLike } from '../performanceCalc';

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

    it('등급일 + 정확히 7일째에 일봉이 없으면 excluded (경계값)', () => {
        const candles = [candle('2026-06-01', 9000, 9500)];
        const r = computePerformance('2026-06-01', candles, '2026-06-08');
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
            candle('2026-06-08', 1, 30200), // 30200/30000 - 1 = 0.6667..%
        ];
        const r = computePerformance('2026-06-01', candles, '2026-06-10');
        expect(r.returnD1).toBe(0.33);
    });

    it('D+5 수익률도 소수 둘째 자리로 반올림한다', () => {
        const candles = [
            candle('2026-06-02', 30000, 30100), // 0.3333..%
            candle('2026-06-03', 1, 1),
            candle('2026-06-04', 1, 1),
            candle('2026-06-05', 1, 1),
            candle('2026-06-08', 1, 30200), // 30200/30000 - 1 = 0.6667..%
        ];
        const r = computePerformance('2026-06-01', candles, '2026-06-10');
        expect(r.returnD5).toBe(0.67);
    });
});

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
