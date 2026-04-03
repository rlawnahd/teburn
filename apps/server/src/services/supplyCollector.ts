/**
 * 수급 데이터 수집 서비스
 * 네이버 금융 스크래핑을 통해 투자자별 매매동향 수집
 */
import axios from 'axios';
import StockSupplyHistory from '../models/StockSupplyHistory';
import { themePriceCache } from './themePriceCache';

/**
 * 외국인 순매수 수량 조회 (Kiwoom API 제거됨 — 네이버 fallback 사용)
 */
async function getKiwoomForeignNetBuy(_stockCode: string): Promise<number | null> {
    return null;
}

/**
 * 특정 종목의 투자자별 매매동향 조회 (당일)
 * - 외국인: Kiwoom ka10008 API
 * - 기관: 네이버 금융 스크래핑
 * - 개인: -(외국인 + 기관)
 */
async function getInvestorTrading(stockCode: string): Promise<{
    foreignNet: number;
    instNet: number;
    retailNet: number;
} | null> {
    try {
        const priceData = themePriceCache.getStockPrice(stockCode);
        const price = priceData?.currentPrice || 0;

        // 외국인 순매수: Kiwoom API
        const foreignNetQty = await getKiwoomForeignNetBuy(stockCode);

        // 기관 순매수: 네이버 금융 스크래핑
        const naverData = await scrapeNaverInvestorData(stockCode);

        // 외국인 데이터가 있으면 Kiwoom 우선, 없으면 네이버 fallback
        const foreignNet = foreignNetQty !== null
            ? foreignNetQty * price
            : (naverData?.foreignNet ?? 0);

        const instNet = naverData?.instNet ?? 0;

        // 개인 = -(외국인 + 기관)
        const retailNet = -(foreignNet + instNet);

        if (foreignNetQty === null && !naverData) {
            return null;
        }

        return { foreignNet, instNet, retailNet };
    } catch (error) {
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
    const stockSet = new Map<string, string>(
        themePriceCache.getAllStockPrices().map((stock) => [stock.stockCode, stock.stockName])
    );

    const stockCodes = Array.from(stockSet.keys());
    console.log(`📋 총 ${stockCodes.length}개 종목 수급 데이터 수집...`);

    let savedCount = 0;
    let failCount = 0;

    for (let i = 0; i < stockCodes.length; i++) {
        const stockCode = stockCodes[i];
        const stockName = stockSet.get(stockCode) || '';

        try {
            const data = await getInvestorTrading(stockCode);

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
