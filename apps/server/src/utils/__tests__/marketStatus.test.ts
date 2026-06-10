import { describe, it, expect } from 'vitest';
import { getKSTParts } from '../marketStatus';

// getKSTParts: 임의의 UTC 시각을 KST(Asia/Seoul) 벽시계 기준으로 변환한다.
// 서버 TZ(UTC/KST 등)와 무관하게 동일 결과를 내야 한다.
describe('getKSTParts', () => {
    it('UTC 06:35 → KST 15:35 (장 마감 시각)으로 변환한다', () => {
        const p = getKSTParts(new Date('2026-06-10T06:35:00Z'));
        expect(p.hour).toBe(15);
        expect(p.minute).toBe(35);
        expect(p.dateString).toBe('2026-06-10');
        expect(p.dayOfWeek).toBe(3); // 수요일
    });

    it('자정을 넘기는 경우 KST 날짜로 올바르게 넘어간다 (UTC 06-09 16:00 → KST 06-10 01:00)', () => {
        const p = getKSTParts(new Date('2026-06-09T16:00:00Z'));
        expect(p.hour).toBe(1);
        expect(p.minute).toBe(0);
        expect(p.dateString).toBe('2026-06-10');
        expect(p.dayOfWeek).toBe(3);
    });

    it('토요일을 dayOfWeek=6 으로 판정한다', () => {
        const p = getKSTParts(new Date('2026-06-13T05:00:00Z')); // KST 토 14:00
        expect(p.dayOfWeek).toBe(6);
        expect(p.dateString).toBe('2026-06-13');
        expect(p.hour).toBe(14);
    });
});
