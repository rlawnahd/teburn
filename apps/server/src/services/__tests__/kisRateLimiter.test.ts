import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 토큰버킷 + 큐. 모듈 레벨 setInterval 때문에 fake timer + resetModules로 격리.
describe('kisRateLimiter', () => {
    let mod: typeof import('../kisRateLimiter');

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.resetModules();
        mod = await import('../kisRateLimiter');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('큐가 상한(MAX_QUEUE)에 도달하면 추가 요청을 즉시 reject한다 (백프레셔)', async () => {
        const { acquireKisToken, getKisQueueLength, MAX_TOKENS, MAX_QUEUE } = mod;

        // 초기 토큰 소진 — 즉시 resolve
        for (let i = 0; i < MAX_TOKENS; i++) {
            await expect(acquireKisToken()).resolves.toBeUndefined();
        }

        // 큐를 상한까지 채움 (모두 pending) — 이후 unhandled rejection 방지로 catch 부착
        const pending: Promise<unknown>[] = [];
        for (let i = 0; i < MAX_QUEUE; i++) {
            pending.push(acquireKisToken().catch(() => 'rejected'));
        }
        expect(getKisQueueLength()).toBe(MAX_QUEUE);

        // 상한 초과 → 즉시 reject, 큐 길이는 상한 유지 (무한 증가 차단)
        await expect(acquireKisToken()).rejects.toThrow();
        expect(getKisQueueLength()).toBe(MAX_QUEUE);
    });

    it('드레인되지 않은 대기 요청은 타임아웃 후 큐에서 제거된다 (무한 적체 차단)', async () => {
        const { acquireKisToken, getKisQueueLength, MAX_TOKENS, ACQUIRE_TIMEOUT_MS } = mod;

        for (let i = 0; i < MAX_TOKENS; i++) await acquireKisToken();

        // refill이 타임아웃 내에 다 빼지 못할 만큼 enqueue (드레인 레이트와 무관하게 견고)
        const drainableWithinTimeout = MAX_TOKENS * (ACQUIRE_TIMEOUT_MS / 1000);
        const N = drainableWithinTimeout + 20;
        const results: Promise<string>[] = [];
        for (let i = 0; i < N; i++) {
            results.push(acquireKisToken().then(() => 'ok', () => 'timeout'));
        }
        expect(getKisQueueLength()).toBe(N);

        // 타임아웃 + refill 여유 경과 → 큐가 0으로 비워짐 (resolve 또는 timeout)
        await vi.advanceTimersByTimeAsync(ACQUIRE_TIMEOUT_MS + 2000);
        expect(getKisQueueLength()).toBe(0);

        const settled = await Promise.all(results);
        expect(settled).toContain('timeout'); // 일부는 타임아웃되어 큐에서 제거됨
        expect(settled).toContain('ok');      // 일부는 refill로 통과
    });
});
