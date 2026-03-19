import axios from 'axios';
import stockCodesData from '../data/stockCodes.json';
import { getKiwoomAccessToken } from './kiwoomApi';

// 키움 REST API 설정
const KIWOOM_IS_MOCK = process.env.KIWOOM_IS_MOCK === 'true';

const BASE_URL = KIWOOM_IS_MOCK
    ? 'https://mockapi.kiwoom.com'
    : 'https://api.kiwoom.com';

// 종목코드 매핑 (JSON 파일에서 로드)
const STOCK_CODE_MAP: Record<string, string> = stockCodesData as Record<string, string>;

// OAuth 토큰 발급 — kiwoomApi에 위임
export async function getAccessToken(): Promise<string> {
    return getKiwoomAccessToken();
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

// 주식기본정보 조회 — 키움 ka10001 (POST /api/dostk/stkinfo)
export async function getStockPrice(stockCode: string, retries = 2): Promise<StockPrice | null> {
    try {
        const token = await getAccessToken();

        const response = await axios.post(
            `${BASE_URL}/api/dostk/stkinfo`,
            { stk_cd: stockCode },
            {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'api-id': 'ka10001',
                    'authorization': `Bearer ${token}`,
                },
                timeout: 5000,
            }
        );

        const data = response.data;

        if (data.return_code !== 0) {
            console.error(`주가 조회 실패: ${stockCode}`, data);
            return null;
        }

        return {
            stockCode,
            stockName: data.stk_nm || '',
            currentPrice: Math.abs(parseInt(data.cur_prc)) || 0,
            changePrice: parseInt(data.pred_pre) || 0,
            changeRate: parseFloat(data.flu_rt) || 0,
            volume: parseInt(data.trde_qty) || 0,
            high: Math.abs(parseInt(data.high_pric)) || 0,
            low: Math.abs(parseInt(data.low_pric)) || 0,
            open: Math.abs(parseInt(data.open_pric)) || 0,
        };
    } catch (error: any) {
        const errMsg = error.response?.data || error.message;

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
        // API rate limit 방지 (여유있게 100ms)
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

        // API rate limit 방지 (여유있게 100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
}
