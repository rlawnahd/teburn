import WebSocket from 'ws';
import { getKiwoomAccessToken, isKiwoomConfigured } from './kiwoomApi';
import { getMarketStatus } from '../utils/marketStatus';

const KIWOOM_IS_MOCK = process.env.KIWOOM_IS_MOCK === 'true';
const WS_URL = KIWOOM_IS_MOCK
    ? 'wss://mockapi.kiwoom.com:10000/api/dostk/websocket'
    : 'wss://api.kiwoom.com:10000/api/dostk/websocket';

type PriceCallback = (stockCode: string, price: number, changeRate: number, volume: number) => void;

let ws: WebSocket | null = null;
let subscribedStocks = new Set<string>();
let priceCallbacks: PriceCallback[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnecting = false;

/**
 * 실시간 체결가 콜백 등록
 */
export function onRealtimePrice(callback: PriceCallback): void {
    priceCallbacks.push(callback);
}

/**
 * WebSocket 연결
 */
async function connect(): Promise<void> {
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) return;
    if (!isKiwoomConfigured()) return;

    isConnecting = true;

    try {
        const token = await getKiwoomAccessToken();

        ws = new WebSocket(WS_URL, {
            headers: {
                'api-id': '0B',
                'authorization': `Bearer ${token}`,
                'Content-Type': 'application/json;charset=UTF-8',
            },
        });

        ws.on('open', () => {
            isConnecting = false;
            console.log('🔌 키움 WebSocket 연결 성공');

            // 키움 서버 인증 처리 대기 후 구독 종목 등록
            setTimeout(() => {
                if (subscribedStocks.size > 0) {
                    registerStocks([...subscribedStocks]);
                }
            }, 1000);
        });

        ws.on('message', (rawData: WebSocket.Data) => {
            try {
                const msg = JSON.parse(rawData.toString());

                // 실시간 체결 데이터 수신
                if (msg.trnm === 'REAL' && msg.data) {
                    for (const item of msg.data) {
                        if (item.type === '0B' && item.values) {
                            const stockCode = item.item;
                            const currentPrice = Math.abs(parseInt(item.values['10']) || 0);
                            const changeRate = parseFloat(item.values['12']) || 0;
                            const volume = Math.abs(parseInt(item.values['15']) || 0);

                            if (currentPrice > 0) {
                                for (const cb of priceCallbacks) {
                                    cb(stockCode, currentPrice, changeRate, volume);
                                }
                            }
                        }
                    }
                }

                // 등록/해지 응답
                if (msg.trnm === 'REG' || msg.trnm === 'REMOVE') {
                    if (msg.return_code === 0) {
                        console.log(`📡 실시간 ${msg.trnm}: 성공`);
                    } else {
                        console.error(`❌ 실시간 ${msg.trnm} 실패:`, msg.return_msg);
                    }
                }
            } catch (error) {
                // JSON 파싱 실패 무시
            }
        });

        ws.on('close', () => {
            isConnecting = false;
            console.log('🔌 키움 WebSocket 연결 종료');
            ws = null;

            // 장 중이면 5초 후 재연결
            const market = getMarketStatus();
            if (market.status === 'regular') {
                scheduleReconnect();
            }
        });

        ws.on('error', (error) => {
            isConnecting = false;
            console.error('❌ 키움 WebSocket 에러:', error.message);
        });

    } catch (error: any) {
        isConnecting = false;
        console.error('❌ 키움 WebSocket 연결 실패:', error.message);
        scheduleReconnect();
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
 * 종목 실시간 등록 (0B: 주식체결)
 */
function registerStocks(stockCodes: string[]): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (stockCodes.length === 0) return;

    const msg = {
        trnm: 'REG',
        grp_no: '1',
        refresh: '1',
        data: [{
            item: stockCodes,
            type: ['0B'],
        }],
    };

    ws.send(JSON.stringify(msg));
    console.log(`📡 실시간 종목 등록: ${stockCodes.join(', ')}`);
}

/**
 * 종목 실시간 해지
 */
function unregisterStocks(stockCodes: string[]): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (stockCodes.length === 0) return;

    const msg = {
        trnm: 'REMOVE',
        grp_no: '1',
        refresh: '0',
        data: [{
            item: stockCodes,
            type: ['0B'],
        }],
    };

    ws.send(JSON.stringify(msg));
}

/**
 * 보유 종목 실시간 구독 시작
 */
export function subscribeStocks(stockCodes: string[]): void {
    const newCodes = stockCodes.filter(c => !subscribedStocks.has(c));
    const removedCodes = [...subscribedStocks].filter(c => !stockCodes.includes(c));

    // 새로 추가된 종목 등록
    if (newCodes.length > 0) {
        for (const code of newCodes) subscribedStocks.add(code);
        registerStocks(newCodes);
    }

    // 더 이상 보유하지 않는 종목 해지
    if (removedCodes.length > 0) {
        for (const code of removedCodes) subscribedStocks.delete(code);
        unregisterStocks(removedCodes);
    }
}

/**
 * WebSocket 시작 (서버 시작 시 호출)
 */
export function startKiwoomWebSocket(): void {
    if (!isKiwoomConfigured()) {
        console.log('⚠️ 키움 WebSocket 미설정 — 실시간 시세 비활성화');
        return;
    }

    console.log('🔌 키움 WebSocket 실시간 시세 시작');
    connect();
}

/**
 * WebSocket 중지
 */
export function stopKiwoomWebSocket(): void {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
    subscribedStocks.clear();
    console.log('🔌 키움 WebSocket 중지');
}
