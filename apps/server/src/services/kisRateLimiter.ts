// KIS REST API 글로벌 rate limiter (토큰 버킷)
// 여러 서비스에서 병렬로 호출해도 전체 호출 속도를 초당 N건으로 강제.

// 실전 초당 5건 제한, 안전 마진으로 3건
const MAX_TOKENS = 3;
const REFILL_INTERVAL_MS = 1000; // 1초에 MAX_TOKENS개 보충

let tokens = MAX_TOKENS;
const waiters: Array<() => void> = [];

// 토큰 주기적 보충
setInterval(() => {
    tokens = MAX_TOKENS;
    while (tokens > 0 && waiters.length > 0) {
        const next = waiters.shift();
        if (next) {
            tokens--;
            next();
        }
    }
}, REFILL_INTERVAL_MS);

/**
 * 다음 KIS API 호출을 위한 토큰 획득. 토큰 없으면 대기.
 * 호출 코드는 await acquireKisToken() 후 실제 API 호출.
 */
export function acquireKisToken(): Promise<void> {
    return new Promise((resolve) => {
        if (tokens > 0) {
            tokens--;
            resolve();
        } else {
            waiters.push(resolve);
        }
    });
}

/**
 * 대기 중인 요청 수 (모니터링용)
 */
export function getKisQueueLength(): number {
    return waiters.length;
}
