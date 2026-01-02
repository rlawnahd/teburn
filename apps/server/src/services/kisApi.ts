import axios from 'axios';
import stockCodesData from '../data/stockCodes.json';

// KIS API 설정
const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_ACCOUNT_NO = process.env.KIS_ACCOUNT_NO || '';
const KIS_IS_MOCK = process.env.KIS_IS_MOCK === 'true';

// API Base URL (모의투자 vs 실투자)
const BASE_URL = KIS_IS_MOCK
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443';

// 종목코드 매핑 (JSON 파일에서 로드)
const STOCK_CODE_MAP: Record<string, string> = stockCodesData as Record<string, string>;

// 토큰 캐시
let accessToken: string | null = null;
let tokenExpireTime: number = 0;

// OAuth 토큰 발급
export async function getAccessToken(): Promise<string> {
    // 캐시된 토큰이 유효하면 재사용
    if (accessToken && Date.now() < tokenExpireTime - 60000) {
        return accessToken;
    }

    try {
        const response = await axios.post(`${BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials',
            appkey: KIS_APP_KEY,
            appsecret: KIS_APP_SECRET,
        });

        accessToken = response.data.access_token;
        // 토큰 만료시간 설정 (보통 24시간, 여유를 두고 23시간으로)
        tokenExpireTime = Date.now() + 23 * 60 * 60 * 1000;

        console.log('✅ KIS API 토큰 발급 완료');
        return accessToken!;
    } catch (error: any) {
        console.error('❌ KIS API 토큰 발급 실패:', error.response?.data || error.message);
        throw new Error('KIS API 토큰 발급 실패');
    }
}

// 종목명으로 종목코드 조회
export function getStockCode(stockName: string): string | null {
    return STOCK_CODE_MAP[stockName] || null;
}

// 현재가 조회 결과 타입
export interface StockPrice {
    stockCode: string;
    stockName: string;
    currentPrice: number;      // 현재가
    changePrice: number;       // 전일대비
    changeRate: number;        // 등락률
    volume: number;            // 거래량
    high: number;              // 고가
    low: number;               // 저가
    open: number;              // 시가
}

// 국내주식 현재가 조회 (재시도 로직 포함)
export async function getStockPrice(stockCode: string, retries = 2): Promise<StockPrice | null> {
    try {
        const token = await getAccessToken();

        const response = await axios.get(
            `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'authorization': `Bearer ${token}`,
                    'appkey': KIS_APP_KEY,
                    'appsecret': KIS_APP_SECRET,
                    'tr_id': KIS_IS_MOCK ? 'FHKST01010100' : 'FHKST01010100',
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J',  // 시장구분 (J: 주식)
                    FID_INPUT_ISCD: stockCode,    // 종목코드
                },
                timeout: 5000,  // 5초 타임아웃
            }
        );

        const data = response.data.output;

        if (!data || response.data.rt_cd !== '0') {
            console.error(`주가 조회 실패: ${stockCode}`, response.data);
            return null;
        }

        return {
            stockCode,
            stockName: data.hts_kor_isnm || '',
            currentPrice: parseInt(data.stck_prpr) || 0,
            changePrice: parseInt(data.prdy_vrss) || 0,
            changeRate: parseFloat(data.prdy_ctrt) || 0,
            volume: parseInt(data.acml_vol) || 0,
            high: parseInt(data.stck_hgpr) || 0,
            low: parseInt(data.stck_lwpr) || 0,
            open: parseInt(data.stck_oprc) || 0,
        };
    } catch (error: any) {
        const errMsg = error.response?.data || error.message;

        // socket hang up 등 네트워크 에러 시 재시도
        if (retries > 0 && (error.code === 'ECONNRESET' || errMsg.includes('socket hang up'))) {
            await new Promise(resolve => setTimeout(resolve, 200));
            return getStockPrice(stockCode, retries - 1);
        }

        console.error(`주가 조회 에러 (${stockCode}):`, errMsg);
        return null;
    }
}

// 여러 종목 현재가 일괄 조회 (순차 호출, rate limit 고려)
export async function getMultipleStockPrices(stockCodes: string[]): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();

    for (const code of stockCodes) {
        const price = await getStockPrice(code);
        if (price) {
            results.set(code, price);
        }
        // API rate limit 방지 (초당 20건 제한, 여유있게 100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
}

// 종목명 목록으로 현재가 조회
export async function getStockPricesByNames(stockNames: string[]): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();

    for (const name of stockNames) {
        const code = getStockCode(name);
        if (!code) {
            console.log(`종목코드 없음: ${name}`);
            continue;
        }

        const price = await getStockPrice(code);
        if (price) {
            price.stockName = name;  // 원래 이름으로 덮어쓰기
            results.set(name, price);
        }

        // API rate limit 방지 (초당 20건 제한, 여유있게 100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
}
