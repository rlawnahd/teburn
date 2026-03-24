import axios from 'axios';

// 키움 REST API 설정
const KIWOOM_APP_KEY = process.env.KIWOOM_APP_KEY || '';
const KIWOOM_SECRET_KEY = process.env.KIWOOM_SECRET_KEY || '';
const KIWOOM_IS_MOCK = process.env.KIWOOM_IS_MOCK === 'true';

// 운영/모의투자 도메인
const BASE_URL = KIWOOM_IS_MOCK
    ? 'https://mockapi.kiwoom.com'
    : 'https://api.kiwoom.com';

// 인메모리 토큰 캐시
let kiwoomAccessToken: string | null = null;
let kiwoomTokenExpireTime: number = 0;
let kiwoomTokenRequestInProgress: Promise<string> | null = null;

/**
 * 키움 REST API 사용 가능 여부 확인
 */
export function isKiwoomConfigured(): boolean {
    return !!(KIWOOM_APP_KEY && KIWOOM_SECRET_KEY);
}

/**
 * 키움 REST API OAuth 토큰 발급 (au10001)
 * POST /oauth2/token
 */
export async function getKiwoomAccessToken(): Promise<string> {
    if (kiwoomAccessToken && Date.now() < kiwoomTokenExpireTime - 60000) {
        return kiwoomAccessToken;
    }

    if (kiwoomTokenRequestInProgress) {
        return kiwoomTokenRequestInProgress;
    }

    kiwoomTokenRequestInProgress = (async () => {
        try {
            const response = await axios.post(`${BASE_URL}/oauth2/token`, {
                grant_type: 'client_credentials',
                appkey: KIWOOM_APP_KEY,
                secretkey: KIWOOM_SECRET_KEY,
            }, {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'api-id': 'au10001',
                },
                timeout: 10000,
            });

            const data = response.data;
            if (data.return_code !== 0) {
                throw new Error(data.return_msg || '토큰 발급 실패');
            }

            kiwoomAccessToken = data.token;
            // expires_dt 형식: "20241107083713" (YYYYMMDDHHmmss)
            if (data.expires_dt) {
                const y = data.expires_dt.substring(0, 4);
                const m = data.expires_dt.substring(4, 6);
                const d = data.expires_dt.substring(6, 8);
                const h = data.expires_dt.substring(8, 10);
                const mi = data.expires_dt.substring(10, 12);
                const s = data.expires_dt.substring(12, 14);
                kiwoomTokenExpireTime = new Date(`${y}-${m}-${d}T${h}:${mi}:${s}+09:00`).getTime();
            } else {
                kiwoomTokenExpireTime = Date.now() + 23 * 60 * 60 * 1000;
            }

            console.log('✅ 키움 REST API 토큰 발급 완료');
            return kiwoomAccessToken!;
        } catch (error: any) {
            console.error('❌ 키움 REST API 토큰 발급 실패:', error.response?.data || error.message);
            throw new Error('키움 REST API 토큰 발급 실패');
        }
    })().finally(() => {
        kiwoomTokenRequestInProgress = null;
    });

    return kiwoomTokenRequestInProgress;
}

/**
 * 키움 REST API 공통 헤더
 * 모든 API는 Header에 api-id, authorization 필수
 */
async function getHeaders(apiId: string) {
    const token = await getKiwoomAccessToken();
    return {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': apiId,
        'authorization': `Bearer ${token}`,
    };
}

/**
 * 주식 매수주문 (kt10000)
 * POST /api/dostk/ordr
 * trde_tp: 0=보통, 3=시장가, 5=조건부지정가
 */
export async function placeBuyOrder(stockCode: string, quantity: number): Promise<{
    success: boolean;
    orderId: string | null;
    message: string;
}> {
    try {
        const headers = await getHeaders('kt10000');
        const response = await axios.post(`${BASE_URL}/api/dostk/ordr`, {
            dmst_stex_tp: 'KRX',
            stk_cd: stockCode,
            ord_qty: String(quantity),
            ord_uv: '',
            trde_tp: '3',       // 시장가
            cond_uv: '',
        }, { headers, timeout: 10000 });

        const data = response.data;
        return {
            success: data.return_code === 0,
            orderId: data.ord_no || null,
            message: data.return_msg || '주문 완료',
        };
    } catch (error: any) {
        console.error('❌ 키움 매수 주문 실패:', error.response?.data || error.message);
        return { success: false, orderId: null, message: error.response?.data?.return_msg || error.message };
    }
}

/**
 * 주식 매도주문 (kt10001)
 * POST /api/dostk/ordr
 */
export async function placeSellOrder(stockCode: string, quantity: number): Promise<{
    success: boolean;
    orderId: string | null;
    message: string;
}> {
    try {
        const headers = await getHeaders('kt10001');
        const response = await axios.post(`${BASE_URL}/api/dostk/ordr`, {
            dmst_stex_tp: 'KRX',
            stk_cd: stockCode,
            ord_qty: String(quantity),
            ord_uv: '',
            trde_tp: '3',       // 시장가
            cond_uv: '',
        }, { headers, timeout: 10000 });

        const data = response.data;
        return {
            success: data.return_code === 0,
            orderId: data.ord_no || null,
            message: data.return_msg || '주문 완료',
        };
    } catch (error: any) {
        console.error('❌ 키움 매도 주문 실패:', error.response?.data || error.message);
        return { success: false, orderId: null, message: error.response?.data?.return_msg || error.message };
    }
}

/**
 * 계좌평가잔고내역 조회 (kt00018)
 * POST /api/dostk/acnt
 */
export async function getAccountBalance(): Promise<{
    totalPurchaseAmount: number;
    totalEvalAmount: number;
    totalPnl: number;
    totalPnlRate: number;
    estimatedAsset: number;
    positions: Array<{
        stockCode: string;
        stockName: string;
        quantity: number;
        avgBuyPrice: number;
        currentPrice: number;
        pnl: number;
        pnlRate: number;
        tradeableQty: number;
    }>;
} | null> {
    try {
        const headers = await getHeaders('kt00018');
        const response = await axios.post(`${BASE_URL}/api/dostk/acnt`, {
            qry_tp: '1',           // 1:합산
            dmst_stex_tp: 'KRX',
        }, { headers, timeout: 10000 });

        const data = response.data;
        if (data.return_code !== 0) return null;

        const positions = (data.acnt_evlt_remn_indv_tot || []).map((item: any) => ({
            stockCode: (item.stk_cd || '').replace(/^A/, ''),  // "A005930" → "005930"
            stockName: item.stk_nm || '',
            quantity: parseInt(item.rmnd_qty) || 0,
            avgBuyPrice: parseInt(item.pur_pric) || 0,
            currentPrice: parseInt(item.cur_prc) || 0,
            pnl: parseInt(item.evltv_prft) || 0,
            pnlRate: parseFloat(item.prft_rt) || 0,
            tradeableQty: parseInt(item.trde_able_qty) || 0,
        }));

        return {
            totalPurchaseAmount: parseInt(data.tot_pur_amt) || 0,
            totalEvalAmount: parseInt(data.tot_evlt_amt) || 0,
            totalPnl: parseInt(data.tot_evlt_pl) || 0,
            totalPnlRate: parseFloat(data.tot_prft_rt) || 0,
            estimatedAsset: parseInt(data.prsm_dpst_aset_amt) || 0,
            positions,
        };
    } catch (error: any) {
        console.error('❌ 키움 잔고 조회 실패:', error.response?.data || error.message);
        return null;
    }
}

/**
 * 예수금 상세 현황 조회 (kt00001)
 * POST /api/dostk/acnt
 */
export async function getCashBalance(): Promise<number | null> {
    try {
        const headers = await getHeaders('kt00001');
        const response = await axios.post(`${BASE_URL}/api/dostk/acnt`, {
            qry_tp: '3',           // 3:추정조회
        }, { headers, timeout: 10000 });

        const data = response.data;
        if (data.return_code !== 0) return null;

        return parseInt(data.entr) || 0;  // 예수금
    } catch (error: any) {
        console.error('❌ 키움 예수금 조회 실패:', error.response?.data || error.message);
        return null;
    }
}

/**
 * 계좌별 주문체결내역 상세 조회 (kt00007)
 * POST /api/dostk/acnt
 * 수동 매매 + 자동매매 체결 내역 모두 조회
 */
export async function getTradeHistory(date?: string): Promise<Array<{
    orderNo: string;
    stockCode: string;
    stockName: string;
    tradeType: string;
    orderQty: number;
    filledQty: number;
    filledPrice: number;
    orderTime: string;
    ioBuySell: string;
}> | null> {
    try {
        const headers = await getHeaders('kt00007');
        const today = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');

        const response = await axios.post(`${BASE_URL}/api/dostk/acnt`, {
            ord_dt: today,
            qry_tp: '4',           // 4: 체결내역만
            stk_bond_tp: '1',      // 1: 주식
            sell_tp: '0',          // 0: 전체
            stk_cd: '',            // 전체 종목
            fr_ord_no: '',         // 전체 주문
            dmst_stex_tp: '%',     // 전체 거래소
        }, { headers, timeout: 10000 });

        const data = response.data;
        if (data.return_code !== 0) return null;

        return (data.acnt_ord_cntr_prps_dtl || []).map((item: any) => ({
            orderNo: item.ord_no || '',
            stockCode: (item.stk_cd || '').replace(/^A/, ''),
            stockName: item.stk_nm || '',
            tradeType: item.trde_tp || '',
            orderQty: parseInt(item.ord_qty) || 0,
            filledQty: parseInt(item.cntr_qty) || 0,
            filledPrice: parseInt(item.cntr_uv) || 0,
            orderTime: item.ord_tm || '',
            ioBuySell: item.io_tp_nm || '',
        })).filter((t: any) => t.filledQty > 0);
    } catch (error: any) {
        console.error('❌ 키움 체결내역 조회 실패:', error.response?.data || error.message);
        return null;
    }
}

/**
 * 주식기본정보 조회 (ka10001) — 현재가 포함
 * POST /api/dostk/stkinfo
 */
export async function getKiwoomStockPrice(stockCode: string): Promise<{
    currentPrice: number;
    changeRate: number;
    volume: number;
    highPrice: number;
    lowPrice: number;
    openPrice: number;
} | null> {
    try {
        const headers = await getHeaders('ka10001');
        const response = await axios.post(`${BASE_URL}/api/dostk/stkinfo`, {
            stk_cd: stockCode,
        }, { headers, timeout: 10000 });

        const data = response.data;
        if (data.return_code !== 0) return null;

        return {
            currentPrice: Math.abs(parseInt(data.cur_prc)) || 0,
            changeRate: parseFloat(data.flu_rt) || 0,
            volume: parseInt(data.trde_qty) || 0,
            highPrice: Math.abs(parseInt(data.high_pric)) || 0,
            lowPrice: Math.abs(parseInt(data.low_pric)) || 0,
            openPrice: Math.abs(parseInt(data.open_pric)) || 0,
        };
    } catch (error: any) {
        console.error('❌ 키움 현재가 조회 실패:', error.response?.data || error.message);
        return null;
    }
}
