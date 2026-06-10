import crypto from 'crypto';

/**
 * 트레이딩 일지 비밀번호 가드 (fail-closed, 상수시간 비교).
 * - 기대 비밀번호가 미설정(빈 문자열)이면 무조건 거부한다.
 * - 비교는 timing attack 방지를 위해 crypto.timingSafeEqual 사용.
 */
export function isTradingAuthorized(provided: string | undefined, expected: string): boolean {
    if (!expected) return false;   // 비밀번호 미설정 → 항상 차단 (절대 통과 금지)
    if (!provided) return false;

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}
