import axios from 'axios';
import { getAccessToken } from './kisApi';

// 인터페이스 정의
export interface FuturesChartPoint {
    time: string;
    price: number;
}

export interface FuturesData {
    symbol: string;
    name: string;
    currentPrice: number;
    previousClose: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    chartData: FuturesChartPoint[];
    marketOpen: boolean;
}

// 인메모리 캐시 (60초 TTL)
const futuresCache = new Map<string, { data: FuturesData; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

// KIS API 설정
const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_IS_MOCK = process.env.KIS_IS_MOCK === 'true';
const BASE_URL = KIS_IS_MOCK
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443';

// KOSPI 200 야간선물 근월물 종목코드 자동 계산
function getKospiFuturesCode(): string {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1; // 1~12

    // 선물 만기월: 3, 6, 9, 12 (분기물)
    const expiryMonths = [3, 6, 9, 12];

    // 현재 월 이후 가장 가까운 만기월 찾기
    // 만기일은 보통 둘째 목요일이므로 만기월 15일 이후면 다음 만기월로
    let targetMonth = expiryMonths.find((m) => m > month) || expiryMonths[0];
    if (targetMonth <= month) {
        year += 1;
    }

    // 만기월인 경우, 15일 이후면 다음 만기월로
    if (month === targetMonth && now.getDate() > 15) {
        const idx = expiryMonths.indexOf(targetMonth);
        if (idx < expiryMonths.length - 1) {
            targetMonth = expiryMonths[idx + 1];
        } else {
            targetMonth = expiryMonths[0];
            year += 1;
        }
    }

    // 월 코드 매핑 (KIS 선물 종목코드 형식)
    const monthCodeMap: Record<number, string> = {
        1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6',
        7: '7', 8: '8', 9: '9', 10: 'A', 11: 'B', 12: 'C',
    };

    const yearSuffix = String(year).slice(-2);
    const monthCode = monthCodeMap[targetMonth];

    // 101V + 연도2자리 + 월코드 (e.g. 101V2503)
    return `101V${yearSuffix}0${monthCode}`;
}

// KOSPI 200 야간선물 현재가 조회
async function getKospiFuturesPrice(): Promise<FuturesData | null> {
    // 캐시 확인
    const cached = futuresCache.get('kospi');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const token = await getAccessToken();
        const futuresCode = getKospiFuturesCode();

        const response = await axios.get(
            `${BASE_URL}/uapi/domestic-futureoption/v1/quotations/inquire-price`,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    authorization: `Bearer ${token}`,
                    appkey: KIS_APP_KEY,
                    appsecret: KIS_APP_SECRET,
                    tr_id: 'FHMIF10000000',
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'F',
                    FID_INPUT_ISCD: futuresCode,
                },
                timeout: 5000,
            }
        );

        const data = response.data.output;

        if (!data || response.data.rt_cd !== '0') {
            console.error(`KOSPI 야간선물 조회 실패 (${futuresCode}):`, response.data);
            return null;
        }

        const currentPrice = parseFloat(data.stck_prpr) || 0;
        const previousClose = parseFloat(data.stck_sdpr) || 0;
        const change = parseFloat(data.prdy_vrss) || 0;
        const changePercent = parseFloat(data.prdy_ctrt) || 0;

        const result: FuturesData = {
            symbol: futuresCode,
            name: 'KOSPI 200 야간선물',
            currentPrice,
            previousClose,
            change,
            changePercent,
            high: parseFloat(data.stck_hgpr) || 0,
            low: parseFloat(data.stck_lwpr) || 0,
            chartData: [],
            marketOpen: currentPrice > 0,
        };

        futuresCache.set('kospi', { data: result, timestamp: Date.now() });
        return result;
    } catch (error: any) {
        console.error('KOSPI 야간선물 조회 에러:', error.response?.data || error.message);
        // 캐시된 데이터가 있으면 반환
        const stale = futuresCache.get('kospi');
        return stale ? stale.data : null;
    }
}

// NASDAQ 100 선물 데이터 조회 (Yahoo Finance)
async function getNasdaqFuturesData(): Promise<FuturesData | null> {
    // 캐시 확인
    const cached = futuresCache.get('nasdaq');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const response = await axios.get(
            'https://query1.finance.yahoo.com/v8/finance/chart/NQ%3DF',
            {
                params: {
                    interval: '5m',
                    range: '1d',
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                },
                timeout: 10000,
            }
        );

        const result = response.data.chart?.result?.[0];
        if (!result) {
            console.error('NASDAQ 선물 데이터 없음');
            return null;
        }

        const meta = result.meta;
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        // 차트 데이터 생성
        const chartData: FuturesChartPoint[] = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (closes[i] != null) {
                const date = new Date(timestamps[i] * 1000);
                chartData.push({
                    time: date.toISOString(),
                    price: closes[i],
                });
            }
        }

        const currentPrice = meta.regularMarketPrice || 0;
        const previousClose = meta.chartPreviousClose || meta.previousClose || 0;
        const change = currentPrice - previousClose;
        const changePercent = previousClose ? (change / previousClose) * 100 : 0;

        // 고가/저가 계산
        const validCloses = closes.filter((c: number | null) => c != null) as number[];
        const high = validCloses.length > 0 ? Math.max(...validCloses) : 0;
        const low = validCloses.length > 0 ? Math.min(...validCloses) : 0;

        const data: FuturesData = {
            symbol: 'NQ=F',
            name: 'NASDAQ 100 선물',
            currentPrice,
            previousClose,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            high,
            low,
            chartData,
            marketOpen: meta.marketState === 'REGULAR' || meta.marketState === 'PRE' || meta.marketState === 'POST',
        };

        futuresCache.set('nasdaq', { data, timestamp: Date.now() });
        return data;
    } catch (error: any) {
        console.error('NASDAQ 선물 조회 에러:', error.message);
        const stale = futuresCache.get('nasdaq');
        return stale ? stale.data : null;
    }
}

// 두 지수 병렬 조회
export async function getAllFuturesData(): Promise<{
    nasdaq: FuturesData | null;
    kospi: FuturesData | null;
}> {
    const [nasdaq, kospi] = await Promise.all([
        getNasdaqFuturesData(),
        getKospiFuturesPrice(),
    ]);
    return { nasdaq, kospi };
}

export { getNasdaqFuturesData, getKospiFuturesPrice };
