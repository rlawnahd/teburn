/**
 * 한국투자증권(KIS) WebSocket 실시간 시세
 * 키움 WebSocket 대체 — 인증이 간단하고 안정적
 */
import WebSocket from 'ws';
import { getMarketStatus } from '../utils/marketStatus';

const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_IS_MOCK = process.env.KIS_IS_MOCK === 'true';

const WS_URL = KIS_IS_MOCK
    ? 'ws://ops.koreainvestment.com:31000'
    : 'ws://ops.koreainvestment.com:21000';

type PriceCallback = (stockCode: string, price: number, changeRate: number, volume: number) => void;

let ws: WebSocket | null = null;
let subscribedStocks = new Set<string>();
let priceCallbacks: PriceCallback[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnecting = false;
let approvalKey: string | null = null;

export function isKisConfigured(): boolean {
    return !!(KIS_APP_KEY && KIS_APP_SECRET);
}

/**
 * 실시간 체결가 콜백 등록
 */
export function onRealtimePrice(callback: PriceCallback): void {
    priceCallbacks.push(callback);
}

/**
 * WebSocket 접속키 발급 (REST API)
 */
async function getApprovalKey(): Promise<string> {
    const axios = require('axios');
    const url = KIS_IS_MOCK
        ? 'https://openapivts.koreainvestment.com:29443/oauth2/Approval'
        : 'https://openapi.koreainvestment.com:9443/oauth2/Approval';

    const response = await axios.post(url, {
        grant_type: 'client_credentials',
        appkey: KIS_APP_KEY,
        secretkey: KIS_APP_SECRET,
    });

    return response.data.approval_key;
}

/**
 * WebSocket 연결
 */
async function connect(): Promise<void> {
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) return;
    if (!isKisConfigured()) return;

    isConnecting = true;

    try {
        // WebSocket 접속키 발급
        approvalKey = await getApprovalKey();
        console.log('🔑 KIS WebSocket 접속키 발급 완료');

        ws = new WebSocket(WS_URL);

        ws.on('open', () => {
            isConnecting = false;
            console.log('🔌 KIS WebSocket 연결 성공');

            // 기존 구독 종목 재등록
            if (subscribedStocks.size > 0) {
                for (const code of subscribedStocks) {
                    registerStock(code);
                }
            }
        });

        ws.on('message', (rawData: WebSocket.Data) => {
            try {
                const data = rawData.toString();

                // JSON 응답 (구독 응답 등)
                if (data.startsWith('{')) {
                    const msg = JSON.parse(data);
                    if (msg.header?.tr_id === 'PINGPONG') {
                        // PINGPONG 응답
                        ws?.send(data);
                        return;
                    }
                    if (msg.body?.msg_cd === 'OPSP0000') {
                        console.log('📡 KIS 실시간 구독 성공:', msg.body?.output?.iv_mksc_shrn_iscd || '');
                    } else if (msg.body?.msg1) {
                        console.log('📡 KIS 응답:', msg.body.msg1);
                    }
                    return;
                }

                // 파이프(|) 구분 실시간 데이터
                const parts = data.split('|');
                if (parts.length < 4) return;

                const trId = parts[1];
                const body = parts[3];

                if (trId === 'H0STCNT0') {
                    // 주식 체결 데이터
                    parseRealtimePrice(body);
                }
            } catch (error) {
                // 파싱 실패 무시
            }
        });

        ws.on('close', () => {
            isConnecting = false;
            console.log('🔌 KIS WebSocket 연결 종료');
            ws = null;

            const market = getMarketStatus();
            if (market.status === 'regular') {
                scheduleReconnect();
            }
        });

        ws.on('error', (error) => {
            isConnecting = false;
            console.error('❌ KIS WebSocket 에러:', error.message);
        });

    } catch (error: any) {
        isConnecting = false;
        console.error('❌ KIS WebSocket 연결 실패:', error.message);
        scheduleReconnect();
    }
}

/**
 * 실시간 체결 데이터 파싱 (H0STCNT0)
 * KIS 실시간 체결 데이터는 ^ 구분
 */
function parseRealtimePrice(body: string): void {
    const fields = body.split('^');
    if (fields.length < 30) return;

    const stockCode = fields[0];           // 종목코드
    const currentPrice = Math.abs(parseInt(fields[2]) || 0);  // 체결가
    const changeRate = parseFloat(fields[5]) || 0;             // 등락률
    const volume = parseInt(fields[12]) || 0;                  // 체결량

    if (currentPrice > 0) {
        for (const cb of priceCallbacks) {
            cb(stockCode, currentPrice, changeRate, volume);
        }
    }
}

function scheduleReconnect(): void {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, 5000);
}

/**
 * 개별 종목 실시간 등록
 */
function registerStock(stockCode: string): void {
    if (!ws || ws.readyState !== WebSocket.OPEN || !approvalKey) return;

    const msg = {
        header: {
            approval_key: approvalKey,
            custtype: 'P',
            tr_type: '1',  // 1: 등록
            'content-type': 'utf-8',
        },
        body: {
            input: {
                tr_id: 'H0STCNT0',  // 주식 실시간 체결
                tr_key: stockCode,
            },
        },
    };

    ws.send(JSON.stringify(msg));
}

/**
 * 개별 종목 실시간 해지
 */
function unregisterStock(stockCode: string): void {
    if (!ws || ws.readyState !== WebSocket.OPEN || !approvalKey) return;

    const msg = {
        header: {
            approval_key: approvalKey,
            custtype: 'P',
            tr_type: '2',  // 2: 해제
            'content-type': 'utf-8',
        },
        body: {
            input: {
                tr_id: 'H0STCNT0',
                tr_key: stockCode,
            },
        },
    };

    ws.send(JSON.stringify(msg));
}

/**
 * 종목 실시간 구독 시작
 */
const MAX_SUBSCRIBE = 40; // KIS 실시간 구독 최대 40개

export function subscribeStocks(stockCodes: string[]): void {
    // 40개 제한 적용
    const limitedCodes = stockCodes.slice(0, MAX_SUBSCRIBE);
    const newCodes = limitedCodes.filter(c => !subscribedStocks.has(c));
    const removedCodes = [...subscribedStocks].filter(c => !limitedCodes.includes(c));

    if (newCodes.length > 0) {
        // 40개 넘으면 기존 구독 해제 후 등록
        while (subscribedStocks.size + newCodes.length > MAX_SUBSCRIBE && subscribedStocks.size > 0) {
            const oldest = subscribedStocks.values().next().value;
            if (oldest && !limitedCodes.includes(oldest)) {
                subscribedStocks.delete(oldest);
                unregisterStock(oldest);
            } else break;
        }
        for (const code of newCodes) {
            if (subscribedStocks.size >= MAX_SUBSCRIBE) break;
            subscribedStocks.add(code);
            registerStock(code);
        }
        console.log(`📡 KIS 실시간 종목 등록: ${newCodes.length}개 (총 ${subscribedStocks.size}/${MAX_SUBSCRIBE})`);
    }

    if (removedCodes.length > 0) {
        for (const code of removedCodes) {
            subscribedStocks.delete(code);
            unregisterStock(code);
        }
    }
}

/**
 * WebSocket 시작
 */
export function startKisWebSocket(): void {
    if (!isKisConfigured()) {
        console.log('⚠️ KIS WebSocket 미설정 — 실시간 시세 비활성화');
        return;
    }

    console.log('🔌 KIS WebSocket 실시간 시세 시작');
    connect();
}

/**
 * WebSocket 중지
 */
export function stopKisWebSocket(): void {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
    subscribedStocks.clear();
    approvalKey = null;
    console.log('🔌 KIS WebSocket 중지');
}
