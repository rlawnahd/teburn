// apps/server/src/services/themePriceCache.ts
import { getStockPrice, StockPrice } from './kisApi';
import Theme from '../models/Theme';
import { getMarketStatus, MarketStatusInfo } from '../utils/marketStatus';

// 캐시된 주가 정보
export interface CachedStockPrice {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    tradingValue: number;
    updatedAt: Date;
}

// 테마별 캐시된 가격 정보
export interface CachedThemePrice {
    themeName: string;
    avgChangeRate: number;
    stockCount: number;
    topStocks: CachedStockPrice[];  // 상위 4개 종목
    updatedAt: Date;
}

// 전체 테마 가격 응답
export interface AllThemePricesResponse {
    themes: CachedThemePrice[];
    marketStatus: MarketStatusInfo;
    lastUpdateTime: Date | null;
    totalThemes: number;
    cachedStockCount: number;
}

class ThemePriceCacheService {
    // 종목 코드 → 주가 캐시
    private stockPriceCache: Map<string, CachedStockPrice> = new Map();
    // 테마별 계산된 가격 캐시
    private themePriceCache: Map<string, CachedThemePrice> = new Map();
    // 마지막 업데이트 시간
    private lastUpdateTime: Date | null = null;
    // 업데이트 진행 중 플래그
    private isUpdating = false;
    // 스케줄러 타이머
    private updateTimer: NodeJS.Timeout | null = null;

    // 캐시 업데이트 주기 (5분)
    private readonly UPDATE_INTERVAL = 5 * 60 * 1000;
    // 각 테마당 가져올 종목 수
    private readonly STOCKS_PER_THEME = 4;

    /**
     * 모든 테마의 주가 배치 업데이트
     */
    async updateAllPrices(): Promise<void> {
        if (this.isUpdating) {
            console.log('⏳ 주가 배치 업데이트 이미 진행 중...');
            return;
        }

        this.isUpdating = true;
        const startTime = Date.now();

        try {
            console.log('📊 테마 주가 배치 업데이트 시작...');

            // 1. DB에서 모든 활성 테마 조회
            const themes = await Theme.find({ isActive: true }).lean();
            console.log(`📋 총 ${themes.length}개 테마 발견`);

            // 2. 모든 고유 종목 코드 수집
            const stockCodeSet = new Set<string>();
            const stockCodeToName = new Map<string, string>();

            for (const theme of themes) {
                // 각 테마에서 상위 N개 종목만 (API 호출 최적화)
                const stocks = theme.stocks.slice(0, this.STOCKS_PER_THEME);
                for (const stock of stocks) {
                    if (stock.code && stock.code.length === 6) {
                        stockCodeSet.add(stock.code);
                        stockCodeToName.set(stock.code, stock.name);
                    }
                }
            }

            const stockCodes = Array.from(stockCodeSet);
            console.log(`🔢 총 ${stockCodes.length}개 고유 종목 주가 조회 시작...`);

            // 3. 종목별 주가 조회 (rate limit 고려)
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < stockCodes.length; i++) {
                const code = stockCodes[i];
                try {
                    const price = await getStockPrice(code);
                    if (price) {
                        const cached: CachedStockPrice = {
                            stockCode: code,
                            stockName: stockCodeToName.get(code) || price.stockName,
                            currentPrice: price.currentPrice,
                            changePrice: price.changePrice,
                            changeRate: price.changeRate,
                            volume: price.volume,
                            tradingValue: price.currentPrice * price.volume,
                            updatedAt: new Date(),
                        };
                        this.stockPriceCache.set(code, cached);
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    failCount++;
                }

                // 진행률 로그 (100개마다)
                if ((i + 1) % 100 === 0) {
                    console.log(`📈 진행: ${i + 1}/${stockCodes.length} (${Math.round((i + 1) / stockCodes.length * 100)}%)`);
                }

                // API rate limit 방지 (초당 20건, 100ms 간격)
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`✅ 종목 주가 조회 완료: ${successCount}개 성공, ${failCount}개 실패`);

            // 4. 테마별 가격 계산
            for (const theme of themes) {
                const themeStocks = theme.stocks.slice(0, this.STOCKS_PER_THEME);
                const prices: CachedStockPrice[] = [];

                for (const stock of themeStocks) {
                    if (stock.code) {
                        const cached = this.stockPriceCache.get(stock.code);
                        if (cached) {
                            prices.push(cached);
                        }
                    }
                }

                // 거래대금 기준 정렬
                prices.sort((a, b) => b.tradingValue - a.tradingValue);

                const avgChangeRate = prices.length > 0
                    ? prices.reduce((sum, p) => sum + p.changeRate, 0) / prices.length
                    : 0;

                const themePrice: CachedThemePrice = {
                    themeName: theme.name,
                    avgChangeRate: Math.round(avgChangeRate * 100) / 100,
                    stockCount: prices.length,
                    topStocks: prices,
                    updatedAt: new Date(),
                };

                this.themePriceCache.set(theme.name, themePrice);
            }

            this.lastUpdateTime = new Date();
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ 테마 주가 배치 업데이트 완료: ${themes.length}개 테마, ${elapsed}초 소요`);

        } catch (error) {
            console.error('❌ 테마 주가 배치 업데이트 실패:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * 특정 테마의 캐시된 가격 조회
     */
    getThemePrice(themeName: string): CachedThemePrice | undefined {
        return this.themePriceCache.get(themeName);
    }

    /**
     * 모든 테마의 캐시된 가격 조회
     */
    getAllThemePrices(): AllThemePricesResponse {
        const themes = Array.from(this.themePriceCache.values());

        // 등락률 기준 정렬
        themes.sort((a, b) => b.avgChangeRate - a.avgChangeRate);

        return {
            themes,
            marketStatus: getMarketStatus(),
            lastUpdateTime: this.lastUpdateTime,
            totalThemes: themes.length,
            cachedStockCount: this.stockPriceCache.size,
        };
    }

    /**
     * 특정 종목의 캐시된 가격 조회
     */
    getStockPrice(stockCode: string): CachedStockPrice | undefined {
        return this.stockPriceCache.get(stockCode);
    }

    /**
     * 캐시 통계
     */
    getStats(): {
        themeCount: number;
        stockCount: number;
        lastUpdateTime: Date | null;
        isUpdating: boolean;
    } {
        return {
            themeCount: this.themePriceCache.size,
            stockCount: this.stockPriceCache.size,
            lastUpdateTime: this.lastUpdateTime,
            isUpdating: this.isUpdating,
        };
    }

    /**
     * 배치 업데이트 스케줄러 시작
     */
    startScheduler(): void {
        console.log(`⏰ 테마 주가 캐시 스케줄러 시작 (${this.UPDATE_INTERVAL / 60000}분 주기)`);

        // 서버 시작 1분 후 첫 업데이트 (KIS WebSocket 초기화 후)
        setTimeout(async () => {
            await this.updateAllPrices();

            // 이후 주기적 업데이트
            this.updateTimer = setInterval(async () => {
                await this.updateAllPrices();
            }, this.UPDATE_INTERVAL);
        }, 60 * 1000);
    }

    /**
     * 스케줄러 중지
     */
    stopScheduler(): void {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
}

// 싱글톤 인스턴스
export const themePriceCache = new ThemePriceCacheService();
