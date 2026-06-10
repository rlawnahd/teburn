import axios from 'axios';
import { getKisToken } from './kisRestApi';

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

// 지수 조회 실패 로그 스팸 방지 — cacheKey별 30분에 1회만 출력 (Map은 지수 수만큼 bounded)
const lastErrorLogAt = new Map<string, number>();
const ERROR_LOG_INTERVAL = 30 * 60 * 1000;

function logIndexErrorThrottled(cacheKey: string, message: string): void {
    const now = Date.now();
    if (now - (lastErrorLogAt.get(cacheKey) || 0) >= ERROR_LOG_INTERVAL) {
        console.error(message);
        lastErrorLogAt.set(cacheKey, now);
    }
}

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

// KIS REST API 설정
const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_IS_MOCK = process.env.KIS_IS_MOCK === 'true';
const KIS_BASE_URL = KIS_IS_MOCK
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443';

// KIS API 업종현재가 조회 (FHPUP02100000)
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
        const token = await getKisToken();

        const response = await axios.get(
            `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`,
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
            console.error(`${name} 지수 조회 실패:`, response.data.msg1);
            return null;
        }

        const output = response.data.output;
        const currentPrice = parseFloat(output.bstp_nmix_prpr) || 0;
        const signedChange = parseFloat(output.bstp_nmix_prdy_vrss) || 0;
        const signedPct = parseFloat(output.bstp_nmix_prdy_ctrt) || 0;
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

// KOSPI 200 선물 데이터 조회 (Yahoo Finance)
async function getKospiFuturesPrice(): Promise<IndexData | null> {
    return getYahooFinanceData('^KS200', 'kospi', 'KOSPI 200', 'futures', '18:00 ~ 익일 05:00');
}

// NASDAQ 100 선물 데이터 조회 (Yahoo Finance)
async function getNasdaqIndexData(): Promise<IndexData | null> {
    return getYahooFinanceData('NQ=F', 'nasdaq', 'NASDAQ 100 선물', 'futures', '07:00 ~ 익일 06:00');
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
            logIndexErrorThrottled(cacheKey, `${name} 데이터 없음`);
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
        logIndexErrorThrottled(cacheKey, `${name} 조회 에러: ${error.message}`);
        const stale = indexCache.get(cacheKey);
        return stale ? stale.data : null;
    }
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

/** 메모리 진단용 — 차트 히스토리/지수 캐시 크기 */
export function getChartHistoryStats(): { keys: number; totalPoints: number; indexCacheSize: number } {
    let totalPoints = 0;
    for (const points of chartHistory.values()) totalPoints += points.length;
    return { keys: chartHistory.size, totalPoints, indexCacheSize: indexCache.size };
}
