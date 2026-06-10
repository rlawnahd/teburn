import { describe, it, expect } from 'vitest';
import { isTradingAuthorized } from '../auth';

// isTradingAuthorized: 트레이딩 일지 비밀번호 가드 (fail-closed)
describe('isTradingAuthorized', () => {
    it('기대 비밀번호가 미설정(빈 문자열)이면 무조건 거부한다 (fail-closed)', () => {
        expect(isTradingAuthorized('anything', '')).toBe(false);
        expect(isTradingAuthorized('', '')).toBe(false);
        expect(isTradingAuthorized(undefined, '')).toBe(false);
    });

    it('비밀번호가 정확히 일치하면 허용한다', () => {
        expect(isTradingAuthorized('s3cret', 's3cret')).toBe(true);
    });

    it('비밀번호가 틀리거나 누락되면 거부한다', () => {
        expect(isTradingAuthorized('wrong', 's3cret')).toBe(false);
        expect(isTradingAuthorized(undefined, 's3cret')).toBe(false);
        expect(isTradingAuthorized('s3cre', 's3cret')).toBe(false); // 길이 다름
    });
});
