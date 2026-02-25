/**
 * KIS Open API 주문 모듈
 * 기존 TEBURN의 kisApi.ts를 확장하여 매수/매도 기능 추가
 *
 * 모의투자 tr_id:
 *   매수: VTTC0802U
 *   매도: VTTC0801U
 *
 * 실투자 tr_id:
 *   매수: TTTC0802U
 *   매도: TTTC0801U
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── 토큰 관리 (기존 kisApi.ts 로직 재사용) ─────────

const CACHE_DIR = path.join(__dirname, '../../.cache');
const TOKEN_CACHE_FILE = path.join(CACHE_DIR, 'kis-bot-token.json');

let accessToken: string | null = null;
let tokenExpireTime: number = 0;
let tokenRequestInProgress: Promise<string> | null = null;

interface TokenCache {
  accessToken: string;
  expireTime: number;
}

function loadTokenFromFile(): boolean {
  try {
    if (!fs.existsSync(TOKEN_CACHE_FILE)) return false;
    const data: TokenCache = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8'));
    if (data.accessToken && Date.now() < data.expireTime - 60000) {
      accessToken = data.accessToken;
      tokenExpireTime = data.expireTime;
      console.log('✅ 캐시에서 KIS 토큰 로드');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function saveTokenToFile(): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ accessToken, expireTime: tokenExpireTime }));
  } catch {}
}

export async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpireTime - 60000) return accessToken;
  if (loadTokenFromFile()) return accessToken!;
  if (tokenRequestInProgress) return tokenRequestInProgress;

  tokenRequestInProgress = (async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data } = await axios.post(`${config.kis.baseUrl}/oauth2/tokenP`, {
          grant_type: 'client_credentials',
          appkey: config.kis.appKey,
          appsecret: config.kis.appSecret,
        }, { timeout: 10000 });

        accessToken = data.access_token;
        tokenExpireTime = Date.now() + 23 * 60 * 60 * 1000;
        saveTokenToFile();
        console.log('✅ KIS 토큰 발급 완료');
        return accessToken!;
      } catch (error: any) {
        console.error(`❌ 토큰 발급 실패 (${attempt}/3):`, error.message);
        if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
        else throw new Error('KIS 토큰 발급 실패');
      }
    }
    throw new Error('KIS 토큰 발급 실패');
  })().finally(() => { tokenRequestInProgress = null; });

  return tokenRequestInProgress;
}

// ─── 공통 헤더 ──────────────────────────

function getHeaders(trId: string) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    authorization: `Bearer ${accessToken}`,
    appkey: config.kis.appKey,
    appsecret: config.kis.appSecret,
    tr_id: trId,
  };
}

// ─── 현재가 조회 ────────────────────────

export interface StockPrice {
  stockCode: string;
  currentPrice: number;
  changeRate: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

export async function getStockPrice(stockCode: string): Promise<StockPrice | null> {
  try {
    const token = await getAccessToken();

    const { data } = await axios.get(
      `${config.kis.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`,
      {
        headers: getHeaders('FHKST01010100'),
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: stockCode,
        },
        timeout: 5000,
      }
    );

    if (data.rt_cd !== '0' || !data.output) return null;
    const d = data.output;

    return {
      stockCode,
      currentPrice: parseInt(d.stck_prpr) || 0,
      changeRate: parseFloat(d.prdy_ctrt) || 0,
      volume: parseInt(d.acml_vol) || 0,
      high: parseInt(d.stck_hgpr) || 0,
      low: parseInt(d.stck_lwpr) || 0,
      open: parseInt(d.stck_oprc) || 0,
    };
  } catch (error: any) {
    console.error(`현재가 조회 실패 (${stockCode}):`, error.message);
    return null;
  }
}

// ─── 주문 실행 ──────────────────────────

export interface OrderResult {
  success: boolean;
  orderId: string | null;
  message: string;
  price: number;
  qty: number;
}

/**
 * 매수 주문 (시장가)
 */
export async function buyStock(stockCode: string, qty: number): Promise<OrderResult> {
  const trId = config.kis.isMock ? 'VTTC0802U' : 'TTTC0802U';

  try {
    await getAccessToken();

    const [acntNoPrefix, acntNoSuffix] = config.kis.accountNo.split('-');

    const { data } = await axios.post(
      `${config.kis.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
      {
        CANO: acntNoPrefix,                    // 계좌번호 앞 8자리
        ACNT_PRDT_CD: acntNoSuffix || config.kis.accountProductCode,  // 뒤 2자리
        PDNO: stockCode,                       // 종목코드
        ORD_DVSN: '01',                        // 주문구분 (01: 시장가)
        ORD_QTY: String(qty),                  // 주문수량
        ORD_UNPR: '0',                         // 주문단가 (시장가는 0)
      },
      {
        headers: getHeaders(trId),
        timeout: 10000,
      }
    );

    if (data.rt_cd === '0') {
      const orderId = data.output?.ODNO || data.output?.KRX_FWDG_ORD_ORGNO || '';
      console.log(`✅ 매수 체결: ${stockCode} x ${qty}주 (주문번호: ${orderId})`);
      return {
        success: true,
        orderId,
        message: '매수 주문 성공',
        price: 0, // 시장가는 체결 후 확인
        qty,
      };
    } else {
      console.error(`❌ 매수 실패: ${data.msg1}`);
      return { success: false, orderId: null, message: data.msg1 || '매수 실패', price: 0, qty };
    }
  } catch (error: any) {
    const msg = error.response?.data?.msg1 || error.message;
    console.error(`❌ 매수 에러 (${stockCode}):`, msg);
    return { success: false, orderId: null, message: msg, price: 0, qty };
  }
}

/**
 * 매도 주문 (시장가)
 */
export async function sellStock(stockCode: string, qty: number): Promise<OrderResult> {
  const trId = config.kis.isMock ? 'VTTC0801U' : 'TTTC0801U';

  try {
    await getAccessToken();

    const [acntNoPrefix, acntNoSuffix] = config.kis.accountNo.split('-');

    const { data } = await axios.post(
      `${config.kis.baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
      {
        CANO: acntNoPrefix,
        ACNT_PRDT_CD: acntNoSuffix || config.kis.accountProductCode,
        PDNO: stockCode,
        ORD_DVSN: '01',       // 시장가
        ORD_QTY: String(qty),
        ORD_UNPR: '0',
      },
      {
        headers: getHeaders(trId),
        timeout: 10000,
      }
    );

    if (data.rt_cd === '0') {
      const orderId = data.output?.ODNO || '';
      console.log(`✅ 매도 체결: ${stockCode} x ${qty}주 (주문번호: ${orderId})`);
      return { success: true, orderId, message: '매도 주문 성공', price: 0, qty };
    } else {
      console.error(`❌ 매도 실패: ${data.msg1}`);
      return { success: false, orderId: null, message: data.msg1 || '매도 실패', price: 0, qty };
    }
  } catch (error: any) {
    const msg = error.response?.data?.msg1 || error.message;
    console.error(`❌ 매도 에러 (${stockCode}):`, msg);
    return { success: false, orderId: null, message: msg, price: 0, qty };
  }
}

// ─── 잔고 조회 ──────────────────────────

export interface BalanceItem {
  stockCode: string;
  stockName: string;
  qty: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlRate: number;
}

export interface AccountBalance {
  totalDeposit: number;       // 예수금
  totalEvaluation: number;    // 총평가금액
  totalPnl: number;           // 총손익
  holdings: BalanceItem[];    // 보유 종목
}

/**
 * 잔고 및 보유종목 조회
 */
export async function getAccountBalance(): Promise<AccountBalance | null> {
  const trId = config.kis.isMock ? 'VTTC8434R' : 'TTTC8434R';

  try {
    await getAccessToken();

    const [acntNoPrefix, acntNoSuffix] = config.kis.accountNo.split('-');

    const { data } = await axios.get(
      `${config.kis.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance`,
      {
        headers: getHeaders(trId),
        params: {
          CANO: acntNoPrefix,
          ACNT_PRDT_CD: acntNoSuffix || config.kis.accountProductCode,
          AFHR_FLPR_YN: 'N',
          OFL_YN: '',
          INQR_DVSN: '02',
          UNPR_DVSN: '01',
          FUND_STTL_ICLD_YN: 'N',
          FNCG_AMT_AUTO_RDPT_YN: 'N',
          PRCS_DVSN: '01',
          CTX_AREA_FK100: '',
          CTX_AREA_NK100: '',
        },
        timeout: 10000,
      }
    );

    if (data.rt_cd !== '0') {
      console.error('잔고 조회 실패:', data.msg1);
      return null;
    }

    const holdings: BalanceItem[] = (data.output1 || [])
      .filter((h: any) => parseInt(h.hldg_qty) > 0)
      .map((h: any) => ({
        stockCode: h.pdno,
        stockName: h.prdt_name,
        qty: parseInt(h.hldg_qty) || 0,
        avgPrice: parseInt(h.pchs_avg_pric) || 0,
        currentPrice: parseInt(h.prpr) || 0,
        pnl: parseInt(h.evlu_pfls_amt) || 0,
        pnlRate: parseFloat(h.evlu_pfls_rt) || 0,
      }));

    const summary = data.output2?.[0] || {};

    return {
      totalDeposit: parseInt(summary.dnca_tot_amt) || 0,
      totalEvaluation: parseInt(summary.tot_evlu_amt) || 0,
      totalPnl: parseInt(summary.evlu_pfls_smtl_amt) || 0,
      holdings,
    };
  } catch (error: any) {
    console.error('잔고 조회 에러:', error.message);
    return null;
  }
}

/**
 * 투자금(KRW)에 해당하는 매수 수량 계산
 */
export function calculateBuyQty(currentPrice: number, investAmount: number): number {
  if (currentPrice <= 0) return 0;
  return Math.floor(investAmount / currentPrice);
}
