// WebSocket 서버 — JWT 인증, 구독 관리, ping/keepalive, 장마감 정리

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyToken } from '../middleware/auth';
import { subscribeStocks } from './kisWebSocket';

const AUTH_TIMEOUT_MS = 5000;
const PING_INTERVAL_MS = 30000;

interface ClientInfo {
    ws: WebSocket;
    userId: string;
    authenticated: boolean;
    subscriptions: Set<string>;  // individual stock subscriptions (stock detail page)
    authTimer?: ReturnType<typeof setTimeout>;
}

// Global state
let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, ClientInfo>();
let globalSubscriptions = new Set<string>();  // hot stocks TOP 30
const stockRefCounts = new Map<string, number>();  // reference counting for individual subs
let pingTimer: ReturnType<typeof setInterval> | null = null;

/**
 * WebSocket 서버 초기화
 */
export function initWebSocketServer(server: HTTPServer): void {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        const client: ClientInfo = {
            ws,
            userId: '',
            authenticated: false,
            subscriptions: new Set(),
        };

        // 5초 내 인증 안 되면 close
        client.authTimer = setTimeout(() => {
            if (!client.authenticated) {
                ws.close(4001, 'Authentication timeout');
            }
        }, AUTH_TIMEOUT_MS);

        clients.set(ws, client);

        ws.on('message', (data: Buffer) => {
            try {
                const msg = JSON.parse(data.toString());
                handleMessage(client, msg);
            } catch {
                // JSON 파싱 실패 무시
            }
        });

        ws.on('close', () => {
            // 개별 구독 해제
            for (const code of client.subscriptions) {
                decrementRefCount(code);
            }
            if (client.authTimer) clearTimeout(client.authTimer);
            clients.delete(ws);
        });

        ws.on('error', () => {
            // error 후 close 이벤트가 자동 발생하므로 여기서는 별도 처리 불필요
        });
    });

    // Ping/keepalive
    pingTimer = setInterval(() => {
        for (const [ws, client] of clients) {
            if (!client.authenticated) continue;
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            }
        }
    }, PING_INTERVAL_MS);

    console.log('🔌 WebSocket 서버 초기화 완료 (path: /ws)');
}

/**
 * 메시지 핸들러
 */
function handleMessage(client: ClientInfo, msg: any): void {
    // 첫 메시지: JWT 인증
    if (!client.authenticated) {
        if (msg.type === 'auth' && msg.token) {
            const payload = verifyToken(msg.token);
            if (payload) {
                client.authenticated = true;
                client.userId = payload.userId;
                if (client.authTimer) {
                    clearTimeout(client.authTimer);
                    client.authTimer = undefined;
                }
                client.ws.send(JSON.stringify({ type: 'auth', status: 'ok' }));
            } else {
                client.ws.close(4001, 'Invalid token');
            }
        } else {
            client.ws.close(4001, 'First message must be auth');
        }
        return;
    }

    // 인증 후 메시지 처리
    switch (msg.type) {
        case 'subscribe':
            if (msg.stockCode && typeof msg.stockCode === 'string') {
                client.subscriptions.add(msg.stockCode);
                incrementRefCount(msg.stockCode);
                syncKiwoomSubscriptions();
            }
            break;

        case 'unsubscribe':
            if (msg.stockCode && client.subscriptions.has(msg.stockCode)) {
                client.subscriptions.delete(msg.stockCode);
                decrementRefCount(msg.stockCode);
                syncKiwoomSubscriptions();
            }
            break;
    }
}

/**
 * Reference counting for individual subscriptions
 */
function incrementRefCount(code: string): void {
    stockRefCounts.set(code, (stockRefCounts.get(code) || 0) + 1);
}

function decrementRefCount(code: string): void {
    const count = (stockRefCounts.get(code) || 0) - 1;
    if (count <= 0) {
        stockRefCounts.delete(code);
    } else {
        stockRefCounts.set(code, count);
    }
}

/**
 * 키움 WebSocket 구독 동기화
 * global subscriptions + individual subscriptions(refCount > 0) 합산
 *
 * TODO: tradingBot도 subscribeStocks를 호출하므로, tradingBot 포지션이
 * 재활성화되면 구독 목록이 서로 덮어쓰는 문제가 발생할 수 있음.
 * 현재는 tradingBot이 비활성화 상태이므로 문제 없음.
 */
function syncKiwoomSubscriptions(): void {
    const allCodes = new Set([...globalSubscriptions, ...stockRefCounts.keys()]);
    subscribeStocks([...allCodes]);
}

/**
 * 특정 종목 구독자에게 메시지 전송
 * (global subscription 포함)
 */
export function broadcastToSubscribers(stockCode: string, message: string): void {
    for (const [ws, client] of clients) {
        if (!client.authenticated) continue;
        if (ws.readyState !== WebSocket.OPEN) continue;

        // global subscription이거나 개별 구독 중인 경우
        if (globalSubscriptions.has(stockCode) || client.subscriptions.has(stockCode)) {
            ws.send(message);
        }
    }
}

/**
 * 모든 인증된 클라이언트에게 메시지 전송
 */
export function broadcastAll(message: string): void {
    for (const [ws, client] of clients) {
        if (!client.authenticated) continue;
        if (ws.readyState !== WebSocket.OPEN) continue;
        ws.send(message);
    }
}

/**
 * 장마감 시 모든 연결 종료
 */
export function closeAllConnections(): void {
    const closedMsg = JSON.stringify({ type: 'marketClosed' });
    for (const [ws, client] of clients) {
        if (client.authenticated && ws.readyState === WebSocket.OPEN) {
            ws.send(closedMsg);
        }
        ws.close(1000, 'Market closed');
    }
    clients.clear();
    stockRefCounts.clear();
    console.log('🔌 WebSocket 장마감 — 모든 연결 종료');
}

/**
 * 글로벌 구독 종목 업데이트 (hot stocks TOP 30)
 */
export function updateGlobalSubscriptions(stockCodes: string[]): void {
    globalSubscriptions = new Set(stockCodes);
    syncKiwoomSubscriptions();
    console.log(`📡 글로벌 구독 업데이트: ${stockCodes.length}개 종목`);
}

/**
 * 연결된 클라이언트 수 반환
 */
export function getConnectedClientCount(): number {
    let count = 0;
    for (const [, client] of clients) {
        if (client.authenticated) count++;
    }
    return count;
}
