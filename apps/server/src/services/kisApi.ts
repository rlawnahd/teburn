import axios from 'axios';
import stockCodesData from '../data/stockCodes.json';
import { getKisToken, invalidateKisToken } from './kisRestApi';

// KIS REST API 설정
const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_IS_MOCK = process.env.KIS_IS_MOCK === 'true';
const BASE_URL = KIS_IS_MOCK
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443';

// 종목코드 매핑 (JSON 파일에서 로드)
const STOCK_CODE_MAP: Record<string, string> = stockCodesData as Record<string, string>;

// OAuth 토큰 발급 — kisRestApi의 캐시된 토큰 사용
export async function getAccessToken(): Promise<string> {
    return getKisToken();
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
    marketCap: number;         // 시가총액 (억 단위)
}

// 주식현재가 조회 — KIS REST API (FHKST01010100)
export async function getStockPrice(stockCode: string, retries = 2): Promise<StockPrice | null> {
    try {
        const token = await getAccessToken();

        const response = await axios.get(
            `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    authorization: `Bearer ${token}`,
                    appkey: KIS_APP_KEY,
                    appsecret: KIS_APP_SECRET,
                    tr_id: 'FHKST01010100',
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J',
                    FID_INPUT_ISCD: stockCode,
                },
                timeout: 5000,
            }
        );

        const data = response.data;

        if (data.rt_cd !== '0') {
            console.error(`주가 조회 실패: ${stockCode}`, data.msg1);
            return null;
        }

        const output = data.output;

        return {
            stockCode,
            stockName: output.hts_kor_isnm || '',
            currentPrice: Math.abs(parseInt(output.stck_prpr)) || 0,
            changePrice: parseInt(output.prdy_vrss) || 0,
            changeRate: parseFloat(output.prdy_ctrt) || 0,
            volume: parseInt(output.acml_vol) || 0,
            high: Math.abs(parseInt(output.stck_hgpr)) || 0,
            low: Math.abs(parseInt(output.stck_lwpr)) || 0,
            open: Math.abs(parseInt(output.stck_oprc)) || 0,
            marketCap: parseInt(output.hts_avls_amt) || 0,
        };
    } catch (error: any) {
        const errMsg = error.response?.data || error.message;

        // 토큰 만료 시 캐시 초기화 후 재시도
        if (retries > 0 && (String(errMsg).includes('만료된 token') || String(errMsg).includes('EGW00123'))) {
            invalidateKisToken();
            await new Promise(resolve => setTimeout(resolve, 200));
            return getStockPrice(stockCode, retries - 1);
        }

        // 네트워크 에러 시 재시도
        if (retries > 0 && (error.code === 'ECONNRESET' || String(errMsg).includes('socket hang up'))) {
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
        // KIS 실전 초당 5건 제한 → 250ms로 초당 4건 유지
        await new Promise(resolve => setTimeout(resolve, 250));
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

        // KIS 실전 초당 5건 제한 → 250ms로 초당 4건 유지
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    return results;
}
