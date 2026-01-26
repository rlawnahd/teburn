/**
 * 수급 데이터 수집 서비스
 * KIS API를 통해 외국인/기관 순매수 데이터 수집
 */
import axios from 'axios';
import StockSupplyHistory from '../models/StockSupplyHistory';
import { themePriceCache } from './themePriceCache';

// KIS API 설정
const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

// 토큰 캐시
let accessToken: string | null = null;
let tokenExpiry: Date | null = null;

/**
 * KIS API 액세스 토큰 발급
 */
async function getAccessToken(): Promise<string> {
    // 기존 토큰이 유효하면 재사용
    if (accessToken && tokenExpiry && new Date() < tokenExpiry) {
        return accessToken;
    }

    try {
        const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials',
            appkey: KIS_APP_KEY,
            appsecret: KIS_APP_SECRET,
        });

        accessToken = response.data.access_token;
        // 토큰 만료 1시간 전으로 설정
        tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

        return accessToken!;
    } catch (error) {
        console.error('❌ KIS 토큰 발급 실패:', error);
        throw error;
    }
}

/**
 * 특정 종목의 투자자별 매매동향 조회 (당일)
 */
async function getInvestorTrading(stockCode: string): Promise<{
    foreignNet: number;
    instNet: number;
    retailNet: number;
} | null> {
    try {
        const token = await getAccessToken();

        const response = await axios.get(
            `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    authorization: `Bearer ${token}`,
                    appkey: KIS_APP_KEY,
                    appsecret: KIS_APP_SECRET,
                    tr_id: 'FHKST01010900', // 주식현재가 투자자 API
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J', // 주식
                    FID_INPUT_ISCD: stockCode,
                },
            }
        );

        if (response.data.rt_cd !== '0') {
            return null;
        }

        const data = response.data.output;

        // 당일 순매수 금액 (원 단위)
        // 외국인: prsn_ntby_qty * 현재가 추정 또는 직접 금액 사용
        // API 응답 필드에 따라 조정 필요
        const foreignNet = parseInt(data.frgn_ntby_tr_pbmn || '0', 10); // 외국인 순매수 거래대금
        const instNet = parseInt(data.orgn_ntby_tr_pbmn || '0', 10);    // 기관 순매수 거래대금
        const retailNet = parseInt(data.prsn_ntby_tr_pbmn || '0', 10);  // 개인 순매수 거래대금

        return { foreignNet, instNet, retailNet };
    } catch (error) {
        // API 호출 실패 시 null 반환
        return null;
    }
}

/**
 * 네이버 금융에서 투자자별 매매동향 스크래핑 (백업 방법)
 */
async function scrapeNaverInvestorData(stockCode: string): Promise<{
    foreignNet: number;
    instNet: number;
    retailNet: number;
} | null> {
    try {
        // 네이버 금융 투자자별 매매동향 페이지
        const url = `https://finance.naver.com/item/frgn.naver?code=${stockCode}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        const html = response.data;

        // 외국인 순매수 추출 (정규식)
        const foreignMatch = html.match(/외국인<\/th>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*class="num"[^>]*>([+-]?[\d,]+)/);
        const instMatch = html.match(/기관<\/th>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*class="num"[^>]*>([+-]?[\d,]+)/);

        if (!foreignMatch && !instMatch) {
            return null;
        }

        // 수량 → 금액 변환을 위해 현재가 필요
        const priceData = themePriceCache.getStockPrice(stockCode);
        const price = priceData?.currentPrice || 0;

        const foreignQty = foreignMatch ? parseInt(foreignMatch[3].replace(/,/g, ''), 10) : 0;
        const instQty = instMatch ? parseInt(instMatch[3].replace(/,/g, ''), 10) : 0;

        return {
            foreignNet: foreignQty * price,
            instNet: instQty * price,
            retailNet: -(foreignQty + instQty) * price, // 개인 = -(외국인 + 기관)
        };
    } catch (error) {
        return null;
    }
}

/**
 * 오늘의 수급 데이터 일괄 수집
 */
export async function collectDailySupply(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 이미 오늘 데이터가 있는지 확인
    const existingCount = await StockSupplyHistory.countDocuments({ date: today });
    if (existingCount > 100) {
        console.log(`📊 오늘 수급 데이터 이미 수집됨 (${existingCount}건)`);
        return existingCount;
    }

    console.log('📊 수급 데이터 수집 시작...');

    // 캐시된 모든 종목 가져오기
    const allPrices = themePriceCache.getAllThemePrices();
    const stockSet = new Map<string, string>(); // code → name

    for (const theme of allPrices.themes) {
        for (const stock of theme.topStocks) {
            if (!stockSet.has(stock.stockCode)) {
                stockSet.set(stock.stockCode, stock.stockName);
            }
        }
    }

    const stockCodes = Array.from(stockSet.keys());
    console.log(`📋 총 ${stockCodes.length}개 종목 수급 데이터 수집...`);

    let savedCount = 0;
    let failCount = 0;

    for (let i = 0; i < stockCodes.length; i++) {
        const stockCode = stockCodes[i];
        const stockName = stockSet.get(stockCode) || '';

        try {
            // KIS API 먼저 시도
            let data = await getInvestorTrading(stockCode);

            // KIS API 실패 시 네이버 스크래핑 시도
            if (!data) {
                data = await scrapeNaverInvestorData(stockCode);
            }

            if (data) {
                await StockSupplyHistory.findOneAndUpdate(
                    { stockCode, date: today },
                    {
                        stockCode,
                        stockName,
                        date: today,
                        foreignNet: data.foreignNet,
                        instNet: data.instNet,
                        retailNet: data.retailNet,
                        updatedAt: new Date(),
                    },
                    { upsert: true }
                );
                savedCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            failCount++;
        }

        // 진행률 출력 (100개마다)
        if ((i + 1) % 100 === 0) {
            console.log(`  진행: ${i + 1}/${stockCodes.length} (${savedCount}개 저장)`);
        }

        // API rate limit 방지 (200ms 간격)
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`✅ 수급 데이터 수집 완료: ${savedCount}개 성공, ${failCount}개 실패`);
    return savedCount;
}

/**
 * 수동 수집 트리거 (어드민용)
 */
export async function manualCollectSupply(): Promise<{ success: number; fail: number }> {
    const saved = await collectDailySupply();
    return { success: saved, fail: 0 };
}
