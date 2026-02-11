import axios from 'axios';
import { getAccessToken } from './kisApi';

// 인터페이스 정의
export interface IndexChartPoint {
    time: string;
    price: number;
}

export type IndexCategory = 'index' | 'futures';

export interface IndexData {
    symbol: string;
    name: string;
    category: IndexCategory;
    currentPrice: number;
    previousClose: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    chartData: IndexChartPoint[];
    marketOpen: boolean;
    tradingHours: string;
}

// 인메모리 캐시 (60초 TTL)
const indexCache = new Map<string, { data: IndexData; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

// 차트 데이터 수집기 (매 조회마다 가격 기록, 당일분만 유지)
const chartHistory = new Map<string, IndexChartPoint[]>();
let chartDate = ''; // 현재 저장 중인 날짜 (YYYY-MM-DD)

// 차트 데이터 다운샘플링 (최대 MAX_CHART_POINTS 포인트)
const MAX_CHART_POINTS = 80;

function downsampleChart(points: IndexChartPoint[]): IndexChartPoint[] {
    if (points.length <= MAX_CHART_POINTS) return points;

    const result: IndexChartPoint[] = [points[0]]; // 첫 포인트 유지
    const step = (points.length - 1) / (MAX_CHART_POINTS - 1);

    for (let i = 1; i < MAX_CHART_POINTS - 1; i++) {
        result.push(points[Math.round(i * step)]);
    }

    result.push(points[points.length - 1]); // 마지막 포인트 유지
    return result;
}

function addChartPoint(cacheKey: string, price: number): IndexChartPoint[] {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 날짜가 바뀌면 초기화
    if (chartDate !== today) {
        chartDate = today;
        chartHistory.clear();
    }

    if (!chartHistory.has(cacheKey)) {
        chartHistory.set(cacheKey, []);
    }

    const history = chartHistory.get(cacheKey)!;
    const point: IndexChartPoint = { time: now.toISOString(), price };

    // 마지막 기록과 1분 이상 차이날 때만 추가
    const last = history[history.length - 1];
    if (!last || now.getTime() - new Date(last.time).getTime() >= 55000) {
        history.push(point);
    }

    // 클라이언트에는 다운샘플링된 데이터 반환
    return downsampleChart(history);
}

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
async function getKospiFuturesPrice(): Promise<IndexData | null> {
    // 캐시 확인
    const cached = indexCache.get('kospi');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        let token: string;
        try {
            token = await getAccessToken();
        } catch {
            // cooldown 중이면 잠시 대기 후 재시도
            await new Promise(resolve => setTimeout(resolve, 2000));
            token = await getAccessToken();
        }
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

        if (response.data.rt_cd !== '0') {
            console.error(`KOSPI 야간선물 조회 실패 (${futuresCode}):`, response.data);
            return null;
        }

        // KIS 선물 API: output1=개별종목, output3=KOSPI200 지수
        const output1 = response.data.output1;
        const output3 = response.data.output3;

        // output1에 선물 데이터가 있으면 사용, 없으면 output3(KOSPI200 지수) 사용
        const hasOutput1 = output1 && Object.keys(output1).length > 0 && output1.stck_prpr;

        let currentPrice: number, previousClose: number, change: number, changePercent: number;
        let high = 0, low = 0;

        if (hasOutput1) {
            currentPrice = parseFloat(output1.stck_prpr) || 0;
            previousClose = parseFloat(output1.stck_sdpr) || 0;
            change = parseFloat(output1.prdy_vrss) || 0;
            changePercent = parseFloat(output1.prdy_ctrt) || 0;
            high = parseFloat(output1.stck_hgpr) || 0;
            low = parseFloat(output1.stck_lwpr) || 0;
        } else if (output3 && output3.bstp_nmix_prpr) {
            // KOSPI200 지수 데이터로 대체
            currentPrice = parseFloat(output3.bstp_nmix_prpr) || 0;
            const sign = output3.prdy_vrss_sign === '2' ? 1 : output3.prdy_vrss_sign === '5' ? -1 : 0;
            change = sign * (parseFloat(output3.bstp_nmix_prdy_vrss) || 0);
            changePercent = sign * (parseFloat(output3.bstp_nmix_prdy_ctrt) || 0);
            previousClose = currentPrice - change;
        } else {
            console.error(`KOSPI 야간선물 데이터 없음 (${futuresCode})`);
            return null;
        }

        const chartData = addChartPoint('kospi', currentPrice);

        const result: IndexData = {
            symbol: futuresCode,
            name: hasOutput1 ? 'KOSPI 200 야간선물' : 'KOSPI 200',
            category: 'futures',
            currentPrice,
            previousClose,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            high,
            low,
            chartData,
            marketOpen: currentPrice > 0,
            tradingHours: '18:00 ~ 익일 05:00',
        };

        indexCache.set('kospi', { data: result, timestamp: Date.now() });
        return result;
    } catch (error: any) {
        console.error('KOSPI 야간선물 조회 에러:', error.response?.data || error.message);
        // 캐시된 데이터가 있으면 반환
        const stale = indexCache.get('kospi');
        return stale ? stale.data : null;
    }
}

// Yahoo Finance 공통 함수
async function getYahooFinanceData(
    ticker: string,
    cacheKey: string,
    name: string,
    category: IndexCategory,
    tradingHours: string,
): Promise<IndexData | null> {
    const cached = indexCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
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
            console.error(`${name} 데이터 없음`);
            return null;
        }

        const meta = result.meta;
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        const chartData: IndexChartPoint[] = [];
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

        const validCloses = closes.filter((c: number | null) => c != null) as number[];
        const high = validCloses.length > 0 ? Math.max(...validCloses) : 0;
        const low = validCloses.length > 0 ? Math.min(...validCloses) : 0;

        const data: IndexData = {
            symbol: ticker,
            name,
            category,
            currentPrice,
            previousClose,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            high,
            low,
            chartData,
            marketOpen: meta.marketState === 'REGULAR' || meta.marketState === 'PRE' || meta.marketState === 'POST',
            tradingHours,
        };

        indexCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    } catch (error: any) {
        console.error(`${name} 조회 에러:`, error.message);
        const stale = indexCache.get(cacheKey);
        return stale ? stale.data : null;
    }
}

// KIS API 업종 지수 공통 함수
async function getKisIndexData(
    indexCode: string,
    cacheKey: string,
    name: string,
    tradingHours: string,
): Promise<IndexData | null> {
    const cached = indexCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        let token: string;
        try {
            token = await getAccessToken();
        } catch {
            await new Promise(resolve => setTimeout(resolve, 2000));
            token = await getAccessToken();
        }

        const response = await axios.get(
            `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    authorization: `Bearer ${token}`,
                    appkey: KIS_APP_KEY,
                    appsecret: KIS_APP_SECRET,
                    tr_id: 'FHPUP02100000',
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'U',
                    FID_INPUT_ISCD: indexCode,
                },
                timeout: 5000,
            }
        );

        if (response.data.rt_cd !== '0') {
            console.error(`${name} 지수 조회 실패:`, response.data);
            return null;
        }

        const output = response.data.output;
        const currentPrice = parseFloat(output.bstp_nmix_prpr) || 0;
        const priceChange = parseFloat(output.bstp_nmix_prdy_vrss) || 0;
        const sign = output.prdy_vrss_sign;
        // 부호: 2=상승, 5=하락
        const signedChange = (sign === '5' || sign === '4') ? -Math.abs(priceChange) : priceChange;
        const pctChange = parseFloat(output.bstp_nmix_prdy_ctrt) || 0;
        const signedPct = (sign === '5' || sign === '4') ? -Math.abs(pctChange) : pctChange;
        const previousClose = currentPrice - signedChange;
        const high = parseFloat(output.bstp_nmix_hgpr) || 0;
        const low = parseFloat(output.bstp_nmix_lwpr) || 0;

        // 차트 데이터: 매 조회마다 가격 기록
        const chartData = addChartPoint(cacheKey, currentPrice);

        const result: IndexData = {
            symbol: indexCode,
            name,
            category: 'index',
            currentPrice,
            previousClose,
            change: Math.round(signedChange * 100) / 100,
            changePercent: Math.round(signedPct * 100) / 100,
            high,
            low,
            chartData,
            marketOpen: currentPrice > 0,
            tradingHours,
        };

        indexCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    } catch (error: any) {
        console.error(`${name} 지수 조회 에러:`, error.response?.data || error.message);
        const stale = indexCache.get(cacheKey);
        return stale ? stale.data : null;
    }
}

// KOSPI 지수 조회 (KIS API)
async function getKospiIndexData(): Promise<IndexData | null> {
    return getKisIndexData('0001', 'kospi-index', '코스피', '09:00 ~ 15:30');
}

// KOSDAQ 지수 조회 (KIS API)
async function getKosdaqIndexData(): Promise<IndexData | null> {
    return getKisIndexData('1001', 'kosdaq-index', '코스닥', '09:00 ~ 15:30');
}

// NASDAQ 100 선물 데이터 조회 (Yahoo Finance → KIS 해외지수)
async function getNasdaqIndexData(): Promise<IndexData | null> {
    const cached = indexCache.get('nasdaq');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        let token: string;
        try {
            token = await getAccessToken();
        } catch {
            await new Promise(resolve => setTimeout(resolve, 2000));
            token = await getAccessToken();
        }

        const response = await axios.get(
            `${BASE_URL}/uapi/overseas-price/v1/quotations/inquire-daily-chartprice`,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    authorization: `Bearer ${token}`,
                    appkey: KIS_APP_KEY,
                    appsecret: KIS_APP_SECRET,
                    tr_id: 'FHKST03030100',
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'N',
                    FID_INPUT_ISCD: 'NAS',
                    FID_INPUT_DATE_1: getDateStr(-7),
                    FID_INPUT_DATE_2: getDateStr(0),
                    FID_PERIOD_DIV_CODE: 'D',
                },
                timeout: 5000,
            }
        );

        if (response.data.rt_cd !== '0') {
            console.error('NASDAQ 조회 실패:', response.data);
            // Yahoo Finance 폴백
            return getYahooFinanceData('NQ=F', 'nasdaq', 'NASDAQ 100 선물', 'futures', '07:00 ~ 익일 06:00');
        }

        const output2 = response.data.output2;
        if (!output2 || output2.length === 0) {
            return getYahooFinanceData('NQ=F', 'nasdaq', 'NASDAQ 100 선물', 'futures', '07:00 ~ 익일 06:00');
        }

        // output2[0]이 최신 데이터
        const latest = output2[0];
        const currentPrice = parseFloat(latest.ovrs_nmix_prpr) || 0;
        const previousClose = parseFloat(latest.ovrs_nmix_prdy_clpr) || 0;
        const change = currentPrice - previousClose;
        const changePercent = previousClose ? (change / previousClose) * 100 : 0;
        const high = parseFloat(latest.ovrs_nmix_hgpr) || 0;
        const low = parseFloat(latest.ovrs_nmix_lwpr) || 0;

        const result: IndexData = {
            symbol: 'NASDAQ',
            name: 'NASDAQ',
            category: 'futures',
            currentPrice,
            previousClose,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            high,
            low,
            chartData: [],
            marketOpen: currentPrice > 0,
            tradingHours: '23:30 ~ 익일 06:00',
        };

        indexCache.set('nasdaq', { data: result, timestamp: Date.now() });
        return result;
    } catch (error: any) {
        console.error('NASDAQ KIS 조회 에러:', error.response?.data || error.message);
        // Yahoo Finance 폴백
        try {
            return await getYahooFinanceData('NQ=F', 'nasdaq', 'NASDAQ 100 선물', 'futures', '07:00 ~ 익일 06:00');
        } catch {
            const stale = indexCache.get('nasdaq');
            return stale ? stale.data : null;
        }
    }
}

// 날짜 문자열 헬퍼 (YYYYMMDD)
function getDateStr(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
}

// Yahoo Finance에서 당일 분봉 데이터를 가져와 차트 히스토리 백필
async function fetchYahooIntradayChart(ticker: string, cacheKey: string): Promise<number> {
    try {
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
            {
                params: {
                    interval: '1m',
                    range: '1d',
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                },
                timeout: 10000,
            }
        );

        const result = response.data.chart?.result?.[0];
        if (!result) return 0;

        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];

        const points: IndexChartPoint[] = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (closes[i] != null) {
                points.push({
                    time: new Date(timestamps[i] * 1000).toISOString(),
                    price: closes[i],
                });
            }
        }

        if (points.length > 0) {
            chartHistory.set(cacheKey, points);
            chartDate = new Date().toISOString().split('T')[0];
        }

        return points.length;
    } catch (error: any) {
        console.error(`⚠️ ${ticker} 차트 백필 실패:`, error.message);
        return 0;
    }
}

// 서버 시작 시 차트 히스토리 워밍업 (당일 분봉 데이터 백필)
export async function warmupChartHistory(): Promise<void> {
    console.log('📊 지수 차트 히스토리 워밍업 시작...');

    const targets: { ticker: string; cacheKey: string; name: string }[] = [
        { ticker: '^KS11', cacheKey: 'kospi-index', name: '코스피' },
        { ticker: '^KQ11', cacheKey: 'kosdaq-index', name: '코스닥' },
    ];

    const results = await Promise.all(
        targets.map(async ({ ticker, cacheKey, name }) => {
            const count = await fetchYahooIntradayChart(ticker, cacheKey);
            if (count > 0) {
                console.log(`  ✅ ${name} (${ticker}): ${count}개 포인트 백필 완료`);
            } else {
                console.log(`  ⚠️ ${name} (${ticker}): 백필 데이터 없음`);
            }
            return count;
        })
    );

    const total = results.reduce((a, b) => a + b, 0);
    console.log(`📊 지수 차트 워밍업 완료 (총 ${total}개 포인트)`);
}

// 전체 지수 병렬 조회
export async function getAllIndexData(): Promise<{
    nasdaq: IndexData | null;
    kospi: IndexData | null;
    kospiIndex: IndexData | null;
    kosdaqIndex: IndexData | null;
}> {
    const [nasdaq, kospi, kospiIndex, kosdaqIndex] = await Promise.all([
        getNasdaqIndexData(),
        getKospiFuturesPrice(),
        getKospiIndexData(),
        getKosdaqIndexData(),
    ]);
    return { nasdaq, kospi, kospiIndex, kosdaqIndex };
}

export { getNasdaqIndexData, getKospiFuturesPrice, getKospiIndexData, getKosdaqIndexData };
