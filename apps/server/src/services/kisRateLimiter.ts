// KIS REST API 글로벌 rate limiter (토큰 버킷)
// 여러 서비스에서 병렬로 호출해도 전체 호출 속도를 초당 N건으로 강제.

// 실전 초당 5건 제한, 안전 마진으로 3건
export const MAX_TOKENS = 3;
const REFILL_INTERVAL_MS = 1000; // 1초에 MAX_TOKENS개 보충

// 대기열 상한 + acquire 타임아웃 — 무한 적체로 인한 메모리 누수 차단.
// (요청 유입이 드레인 속도를 초과하면 대기 Promise가 caller의 async 프레임을 붙들어 힙 누수)
export const MAX_QUEUE = 500;
export const ACQUIRE_TIMEOUT_MS = 15000;

interface Waiter {
    resolve: () => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

let tokens = MAX_TOKENS;
const waiters: Waiter[] = [];

// 토큰 주기적 보충
setInterval(() => {
    tokens = MAX_TOKENS;
    while (tokens > 0 && waiters.length > 0) {
        const next = waiters.shift();
        if (next) {
            clearTimeout(next.timer);
            tokens--;
            next.resolve();
        }
    }
}, REFILL_INTERVAL_MS);

/**
 * 다음 KIS API 호출을 위한 토큰 획득. 토큰 없으면 대기.
 * 호출 코드는 await acquireKisToken() 후 실제 API 호출.
 *
 * 대기열이 가득 찼거나(MAX_QUEUE) 일정 시간(ACQUIRE_TIMEOUT_MS) 내 토큰을 못 받으면 reject한다.
 * 호출처는 reject를 catch해 해당 요청을 스킵해야 한다 (무한 적체 방지).
 */
export function acquireKisToken(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (tokens > 0) {
            tokens--;
            resolve();
            return;
        }

        // 백프레셔: 대기열 상한 초과 시 즉시 거부 (메모리 누수 차단)
        if (waiters.length >= MAX_QUEUE) {
            reject(new Error('KIS rate limiter 대기열이 가득 찼습니다 (백프레셔)'));
            return;
        }

        const waiter: Waiter = {
            resolve,
            reject,
            timer: setTimeout(() => {
                const idx = waiters.indexOf(waiter);
                if (idx !== -1) waiters.splice(idx, 1);
                reject(new Error('KIS rate limiter acquire 타임아웃'));
            }, ACQUIRE_TIMEOUT_MS),
        };
        waiters.push(waiter);
    });
}

/**
 * 대기 중인 요청 수 (모니터링용)
 */
export function getKisQueueLength(): number {
    return waiters.length;
}
