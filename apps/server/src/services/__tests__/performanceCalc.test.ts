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
