// 환경변수 접근 단일 출처.
// 모든 값은 "지연(lazy)"으로 읽는다 — server.ts의 dotenv.config()가 import 이후에 실행되므로,
// 모듈 로드 시점이 아니라 호출 시점에 process.env를 읽어야 dev(.env)/prod(환경변수) 모두 안전하다.

/** JWT 서명 시크릿. 미설정이면 throw (하드코딩 폴백 금지 — 토큰 위조 방지). */
export function jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }
    return secret;
}

/** 트레이딩 일지 비밀번호. 미설정이면 빈 문자열 → 가드는 fail-closed로 전원 차단. */
export function tradingPassword(): string {
    return process.env.TRADING_PASSWORD || '';
}

/** 서버 부팅 시 필수 환경변수 검증 (fail-fast). dotenv.config() 직후 호출. */
export function assertRequiredEnv(): void {
    jwtSecret(); // JWT_SECRET 미설정이면 throw
}
