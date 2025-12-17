import WebSocket from 'ws';
import { getAccessToken, getStockPrice } from './kisApi';
import stockCodesData from '../data/stockCodes.json';
import themesData from '../data/themes.json';
import { getMarketStatus, MarketStatusInfo } from '../utils/marketStatus';

const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_IS_MOCK = process.env.KIS_IS_MOCK === 'true';

// WebSocket URL
const WS_URL = KIS_IS_MOCK
    ? 'ws://ops.koreainvestment.com:31000'
    : 'ws://ops.koreainvestment.com:21000';

// 종목코드 매핑
const STOCK_CODE_MAP: Record<string, string> = stockCodesData as Record<string, string>;
const STOCK_NAME_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(STOCK_CODE_MAP).map(([name, code]) => [code, name])
);

// 테마 데이터
interface ThemeData {
    stocks: string[];
    keywords: string[];
}
const themes: Record<string, ThemeData> = themesData as Record<string, ThemeData>;

// 실시간 가격 데이터
export interface RealtimePrice {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    tradingValue: number;  // 거래대금 (currentPrice × volume)
    tradeTime: string;
}

// 테마별 실시간 가격
export interface ThemeRealtimePrice {
    themeName: string;
    avgChangeRate: number;
    prices: RealtimePrice[];
    updatedAt: Date;
}

// 테마 가격 응답 (장 상태 포함)
export interface ThemePricesResponse {
    themes: ThemeRealtimePrice[];
    marketStatus: MarketStatusInfo;
    lastUpdateTime: Date | null;
    cachedStockCount: number;
}

// 이벤트 콜백 타입
type PriceUpdateCallback = (data: RealtimePrice) => void;

class KISWebSocketService {
    private ws: WebSocket | null = null;
    private isConnected = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private subscribedStocks: Set<string> = new Set();
    private priceCache: Map<string, RealtimePrice> = new Map();
    private callbacks: PriceUpdateCallback[] = [];
    private approvalKey: string | null = null;
    private lastUpdateTime: Date | null = null;

    // themes.json과 동일하게 맞춤 (24개 테마)
    private readonly priorityThemes = [
        '반도체', '2차전지', '바이오', '자동차', '조선',
        '방산', 'AI', '게임', '엔터', '금융',
        '로봇', '원전', '클라우드', '화장품', '음식료',
        '건설', '철강', '정유/화학', '항공', '해운',
        '통신', '유틸리티', '증권', '신재생에너지'
    ];

    // 구독할 종목 선정 (25개 테마 × 4개 대장주 = 100개)
    private getStocksToSubscribe(): string[] {
        const stocks: string[] = [];

        for (const themeName of this.priorityThemes) {
            const themeData = themes[themeName];
            if (!themeData) continue;

            // 각 테마 상위 4개 대장주
            const themeStocks = themeData.stocks.slice(0, 4);
            for (const stockName of themeStocks) {
                const code = STOCK_CODE_MAP[stockName];
                if (code && !stocks.includes(code)) {
                    stocks.push(code);
                }
            }
        }

        console.log(`📊 실시간 구독: ${this.priorityThemes.length}개 테마, ${stocks.length}개 종목`);
        return stocks;
    }

    // WebSocket 승인키 발급
    private async getApprovalKey(): Promise<string> {
        const axios = (await import('axios')).default;
        const baseUrl = KIS_IS_MOCK
            ? 'https://openapivts.koreainvestment.com:29443'
            : 'https://openapi.koreainvestment.com:9443';

        const response = await axios.post(`${baseUrl}/oauth2/Approval`, {
            grant_type: 'client_credentials',
            appkey: KIS_APP_KEY,
            secretkey: KIS_APP_SECRET,
        });

        return response.data.approval_key;
    }

    // WebSocket 연결
    async connect(): Promise<void> {
        if (this.isConnected) {
            console.log('이미 WebSocket 연결됨');
            return;
        }

        try {
            // 승인키 발급
            this.approvalKey = await this.getApprovalKey();
            console.log('✅ WebSocket 승인키 발급 완료');

            // WebSocket 연결
            this.ws = new WebSocket(WS_URL);

            this.ws.on('open', async () => {
                console.log('✅ KIS WebSocket 연결됨');
                this.isConnected = true;

                // 종목 구독
                const stocks = this.getStocksToSubscribe();
                stocks.forEach((code) => this.subscribe(code));

                // 초기 캐시 채우기 (REST API로 현재가 조회)
                this.initializeCache(stocks);
            });

            this.ws.on('message', (data: Buffer) => {
                this.handleMessage(data.toString());
            });

            this.ws.on('close', () => {
                console.log('❌ KIS WebSocket 연결 끊김');
                this.isConnected = false;
                this.scheduleReconnect();
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket 에러:', error.message);
            });
        } catch (error: any) {
            console.error('WebSocket 연결 실패:', error.message);
            this.scheduleReconnect();
        }
    }

    // 재연결 스케줄링
    private scheduleReconnect(): void {
        if (this.reconnectTimer) return;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            console.log('🔄 WebSocket 재연결 시도...');
            this.connect();
        }, 5000);
    }

    // 초기 캐시 채우기 (REST API로 현재가 조회)
    private async initializeCache(stockCodes: string[]): Promise<void> {
        console.log(`📊 초기 캐시 로딩 시작... (${stockCodes.length}개 종목)`);

        let loaded = 0;
        let failed = 0;

        for (const code of stockCodes) {
            // 이미 캐시된 종목은 건너뛰기
            if (this.priceCache.has(code)) {
                continue;
            }

            try {
                const price = await getStockPrice(code);
                if (price) {
                    const priceData: RealtimePrice = {
                        stockCode: code,
                        stockName: STOCK_NAME_MAP[code] || price.stockName,
                        currentPrice: price.currentPrice,
                        changePrice: price.changePrice,
                        changeRate: price.changeRate,
                        volume: price.volume,
                        tradingValue: price.currentPrice * price.volume,  // 거래대금 계산
                        tradeTime: '',
                    };
                    this.priceCache.set(code, priceData);
                    loaded++;
                } else {
                    failed++;
                }
            } catch (error) {
                failed++;
            }

            // API rate limit 방지 (초당 20건 제한)
            await new Promise(resolve => setTimeout(resolve, 55));
        }

        this.lastUpdateTime = new Date();
        console.log(`✅ 초기 캐시 로딩 완료: ${loaded}개 성공, ${failed}개 실패, 총 ${this.priceCache.size}개 캐시됨`);
    }

    // 종목 구독
    private subscribe(stockCode: string): void {
        if (!this.ws || !this.isConnected || !this.approvalKey) return;
        if (this.subscribedStocks.has(stockCode)) return;

        const message = JSON.stringify({
            header: {
                approval_key: this.approvalKey,
                custtype: 'P',
                tr_type: '1', // 등록
                'content-type': 'utf-8',
            },
            body: {
                input: {
                    tr_id: 'H0STCNT0', // 실시간 체결가
                    tr_key: stockCode,
                },
            },
        });

        this.ws.send(message);
        this.subscribedStocks.add(stockCode);
    }

    // 메시지 처리
    private handleMessage(data: string): void {
        try {
            // 암호화된 데이터인지 확인
            if (data.startsWith('0|') || data.startsWith('1|')) {
                this.parseRealtimeData(data);
            } else {
                // JSON 응답 (구독 확인 등)
                const json = JSON.parse(data);
                if (json.header?.tr_id === 'PINGPONG') {
                    // PONG 응답
                    this.ws?.send(data);
                }
            }
        } catch (error) {
            // 파싱 실패 무시
        }
    }

    // 실시간 데이터 파싱 (H0STCNT0 - 실시간 체결가)
    private parseRealtimeData(data: string): void {
        try {
            const parts = data.split('|');
            if (parts.length < 4) return;

            const encrypted = parts[0] === '1';
            const trId = parts[1];
            const dataCount = parseInt(parts[2]);
            const body = parts[3];

            if (trId !== 'H0STCNT0') return;

            // 체결 데이터 파싱 (^ 구분자)
            const fields = body.split('^');
            if (fields.length < 20) return;

            const stockCode = fields[0];
            const tradeTime = fields[1];
            const currentPrice = parseInt(fields[2]) || 0;
            const changeSign = fields[3]; // 1:상한, 2:상승, 3:보합, 4:하한, 5:하락
            const changePrice = parseInt(fields[4]) || 0;
            const changeRate = parseFloat(fields[5]) || 0;
            // fields[12]는 체결거래량(단일), fields[13]은 누적거래량
            const accumulatedVolume = parseInt(fields[13]) || 0;

            // 등락 부호 처리
            // KIS API는 changeRate를 항상 양수로 보내고, changeSign으로 방향을 알려줌
            // changeSign: 1=상한, 2=상승, 3=보합, 4=하한, 5=하락
            const isDecline = ['4', '5'].includes(changeSign);
            const signedChangePrice = isDecline ? -Math.abs(changePrice) : Math.abs(changePrice);
            const signedChangeRate = isDecline ? -Math.abs(changeRate) : Math.abs(changeRate);

            const priceData: RealtimePrice = {
                stockCode,
                stockName: STOCK_NAME_MAP[stockCode] || stockCode,
                currentPrice,
                changePrice: signedChangePrice,
                changeRate: signedChangeRate,
                volume: accumulatedVolume,
                tradingValue: currentPrice * accumulatedVolume,  // 거래대금 계산 (누적거래량 기준)
                tradeTime,
            };

            // 캐시 업데이트
            this.priceCache.set(stockCode, priceData);

            // 마지막 업데이트 시간 갱신
            this.lastUpdateTime = new Date();

            // 콜백 호출
            this.callbacks.forEach((cb) => cb(priceData));
        } catch (error) {
            // 파싱 에러 무시
        }
    }

    // 가격 업데이트 콜백 등록
    onPriceUpdate(callback: PriceUpdateCallback): void {
        this.callbacks.push(callback);
    }

    // 콜백 제거
    offPriceUpdate(callback: PriceUpdateCallback): void {
        this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    }

    // 현재 캐시된 가격 조회
    getCachedPrice(stockCode: string): RealtimePrice | undefined {
        return this.priceCache.get(stockCode);
    }

    // 모든 캐시된 가격 조회
    getAllCachedPrices(): Map<string, RealtimePrice> {
        return this.priceCache;
    }

    // 테마별 실시간 가격 계산 (구독 중인 테마만)
    getThemePrices(): ThemePricesResponse {
        const results: ThemeRealtimePrice[] = [];

        // priorityThemes만 순회 (구독 중인 테마)
        for (const themeName of this.priorityThemes) {
            const themeData = themes[themeName];
            if (!themeData) continue;

            const prices: RealtimePrice[] = [];

            // 구독 중인 4개 종목만 조회
            for (const stockName of themeData.stocks.slice(0, 4)) {
                const code = STOCK_CODE_MAP[stockName];
                if (code) {
                    const cached = this.priceCache.get(code);
                    if (cached) {
                        prices.push(cached);
                    }
                }
            }

            // 거래대금 기준 내림차순 정렬 (대장주 자동 선정)
            prices.sort((a, b) => b.tradingValue - a.tradingValue);

            const avgChangeRate =
                prices.length > 0
                    ? prices.reduce((sum, p) => sum + p.changeRate, 0) / prices.length
                    : 0;

            results.push({
                themeName,
                avgChangeRate: Math.round(avgChangeRate * 100) / 100,
                prices,
                updatedAt: new Date(),
            });
        }

        return {
            themes: results,
            marketStatus: getMarketStatus(),
            lastUpdateTime: this.lastUpdateTime,
            cachedStockCount: this.priceCache.size,
        };
    }

    // 마지막 업데이트 시간 조회
    getLastUpdateTime(): Date | null {
        return this.lastUpdateTime;
    }

    // 연결 상태
    get connected(): boolean {
        return this.isConnected;
    }

    // 연결 해제
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.subscribedStocks.clear();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

// 싱글톤 인스턴스
export const kisWebSocket = new KISWebSocketService();
