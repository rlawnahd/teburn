import axios from 'axios';

const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_IS_MOCK = process.env.KIS_IS_MOCK === 'true';
const BASE_URL = KIS_IS_MOCK
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443';

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getKisToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
        return cachedToken.token;
    }
    const { data } = await axios.post(`${BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: KIS_APP_KEY,
        appsecret: KIS_APP_SECRET,
    });
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token;
}

export interface DailyCandle {
    date: string;       // YYYYMMDD
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/**
 * 분봉 조회 (당일)
 * KIS API: 주식당일분봉조회 (FHKST03010200)
 */
export async function getMinuteChart(stockCode: string, period: number = 1): Promise<DailyCandle[]> {
    const token = await getKisToken();

    const { data } = await axios.get(
        `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice`,
        {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                authorization: `Bearer ${token}`,
                appkey: KIS_APP_KEY,
                appsecret: KIS_APP_SECRET,
                tr_id: 'FHKST03010200',
            },
            params: {
                FID_ETC_CLS_CODE: '',
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: stockCode,
                FID_INPUT_HOUR_1: '160000',
                FID_PW_DATA_INCU_YN: 'Y',
            },
            timeout: 10000,
        }
    );

    if (data.rt_cd !== '0') {
        console.error('KIS 분봉 조회 실패:', data.msg1);
        return [];
    }

    return (data.output2 || [])
        .map((item: any) => {
            const hour = item.stck_cntg_hour || '';
            return {
                date: `${item.stck_bsop_date}${hour}`,
                open: parseInt(item.stck_oprc) || 0,
                high: parseInt(item.stck_hgpr) || 0,
                low: parseInt(item.stck_lwpr) || 0,
                close: parseInt(item.stck_prpr) || 0,
                volume: parseInt(item.cntg_vol) || 0,
            };
        })
        .filter((c: DailyCandle) => c.close > 0 && c.volume > 0)
        .reverse();
}

/**
 * 주봉/월봉 조회
 * period: W(주봉), M(월봉)
 */
export async function getPeriodChart(stockCode: string, period: 'W' | 'M', days: number = 120): Promise<DailyCandle[]> {
    const token = await getKisToken();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.ceil(days * (period === 'M' ? 3 : 1.5)));

    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

    const { data } = await axios.get(
        `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
        {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                authorization: `Bearer ${token}`,
                appkey: KIS_APP_KEY,
                appsecret: KIS_APP_SECRET,
                tr_id: 'FHKST03010100',
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: stockCode,
                FID_INPUT_DATE_1: fmt(startDate),
                FID_INPUT_DATE_2: fmt(endDate),
                FID_PERIOD_DIV_CODE: period,
                FID_ORG_ADJ_PRC: '0',
            },
            timeout: 10000,
        }
    );

    if (data.rt_cd !== '0') {
        console.error(`KIS ${period === 'W' ? '주봉' : '월봉'} 조회 실패:`, data.msg1);
        return [];
    }

    return (data.output2 || [])
        .map((item: any) => ({
            date: item.stck_bsop_date,
            open: parseInt(item.stck_oprc) || 0,
            high: parseInt(item.stck_hgpr) || 0,
            low: parseInt(item.stck_lwpr) || 0,
            close: parseInt(item.stck_clpr) || 0,
            volume: parseInt(item.acml_vol) || 0,
        }))
        .filter((c: DailyCandle) => c.close > 0)
        .reverse();
}

/**
 * 일봉 조회
 */
export async function getDailyChart(stockCode: string, days: number = 60): Promise<DailyCandle[]> {
    const token = await getKisToken();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.ceil(days * 1.5)); // 주말 고려

    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

    const { data } = await axios.get(
        `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
        {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                authorization: `Bearer ${token}`,
                appkey: KIS_APP_KEY,
                appsecret: KIS_APP_SECRET,
                tr_id: 'FHKST03010100',
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: stockCode,
                FID_INPUT_DATE_1: fmt(startDate),
                FID_INPUT_DATE_2: fmt(endDate),
                FID_PERIOD_DIV_CODE: 'D',
                FID_ORG_ADJ_PRC: '0',
            },
            timeout: 10000,
        }
    );

    if (data.rt_cd !== '0') {
        console.error('KIS 일봉 조회 실패:', data.msg1);
        return [];
    }

    return (data.output2 || [])
        .map((item: any) => ({
            date: item.stck_bsop_date,
            open: parseInt(item.stck_oprc) || 0,
            high: parseInt(item.stck_hgpr) || 0,
            low: parseInt(item.stck_lwpr) || 0,
            close: parseInt(item.stck_clpr) || 0,
            volume: parseInt(item.acml_vol) || 0,
        }))
        .filter((c: DailyCandle) => c.close > 0)
        .reverse(); // 오래된 순서로
}
