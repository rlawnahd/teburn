import { describe, it, expect } from 'vitest';
import { computeSurgeRate } from '../volumeSurgeService';

const d = (s: string) => new Date(s);
const todayMidnight = d('2026-06-10T00:00:00Z');

// computeSurgeRate: 오늘을 제외한 과거 N일 평균 대비 오늘 거래량 배수
describe('computeSurgeRate', () => {
    it('오늘(당일) 레코드를 평균 분모에서 제외한다 (자기오염 차단)', () => {
        const history = [
            { date: d('2026-06-09T00:00:00Z'), volume: 100 },
            { date: d('2026-06-08T00:00:00Z'), volume: 100 },
            // 오늘 레코드 — 제외되어야 함. 포함되면 평균이 올라가 surge가 희석됨
            { date: d('2026-06-10T00:00:00Z'), volume: 1000 },
        ];
        // 과거 평균 = (100+100)/2 = 100, 오늘 거래량 1000 → 10배
        expect(computeSurgeRate(history, todayMidnight, 1000)).toBe(10);
    });

    it('과거 데이터가 없으면 null 을 반환한다 (점수 산정에서 제외)', () => {
        const history = [{ date: d('2026-06-10T00:00:00Z'), volume: 500 }]; // 오늘뿐
        expect(computeSurgeRate(history, todayMidnight, 500)).toBeNull();
        expect(computeSurgeRate([], todayMidnight, 500)).toBeNull();
    });

    it('가장 최근 20개 표본만 사용한다', () => {
        // 과거 25일치: 최근 20일은 모두 100, 그 이전 5일은 매우 큰 값(평균을 왜곡할 값)
        const history = [];
        for (let i = 1; i <= 20; i++) {
            history.push({ date: d(`2026-06-${String(10 - 0).padStart(2, '0')}T00:00:00Z`), volume: 100 });
        }
        // 날짜를 실제로 다르게 (최근순 정렬 검증)
        const hist2 = [];
        for (let i = 1; i <= 20; i++) hist2.push({ date: new Date(todayMidnight.getTime() - i * 86400000), volume: 100 });
        for (let i = 21; i <= 25; i++) hist2.push({ date: new Date(todayMidnight.getTime() - i * 86400000), volume: 100000 });
        // 최근 20개(모두 100)만 평균 → 100, 오늘 200 → 2배
        expect(computeSurgeRate(hist2, todayMidnight, 200)).toBe(2);
    });

    it('소수 둘째 자리까지 반올림한다', () => {
        const history = [{ date: d('2026-06-09T00:00:00Z'), volume: 300 }];
        // 1000/300 = 3.333... → 3.33
        expect(computeSurgeRate(history, todayMidnight, 1000)).toBe(3.33);
    });
});
