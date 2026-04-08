// apps/server/src/services/themePriceCache.ts
import { getStockPrice, StockPrice } from './kisApi';
import Theme from '../models/Theme';
import PriceCache from '../models/PriceCache';
import { getMarketStatus, MarketStatusInfo } from '../utils/marketStatus';
import stockCodesData from '../data/stockCodes.json';

// 종목명 → 종목코드 매핑 (stockCodes.json에서 로드)
const STOCK_CODE_MAP: Record<string, string> = stockCodesData as Record<string, string>;

// 캐시된 주가 정보
export interface CachedStockPrice {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    tradingValue: number;
    marketCap: number;         // 시가총액 (억 단위)
    intradayHigh: number;      // 당일 장중 최고가 (시세 패턴 분석용)
    intradayHighRate: number;  // 당일 최고가 등락률 (장 시작 대비)
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
    private readonly STOCKS_PER_THEME = 10;

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

            // 2. 모든 고유 종목 코드 수집 (DB 코드 + stockCodes.json 폴백)
            const stockCodeSet = new Set<string>();
            const stockCodeToName = new Map<string, string>();
            let foundFromJson = 0;

            for (const theme of themes) {
                // 각 테마에서 상위 N개 종목만 (API 호출 최적화)
                const stocks = theme.stocks.slice(0, this.STOCKS_PER_THEME);
                for (const stock of stocks) {
                    let code = stock.code;

                    // DB에 코드가 없으면 stockCodes.json에서 찾기
                    if (!code || code.length !== 6) {
                        const lookupCode = STOCK_CODE_MAP[stock.name];
                        if (lookupCode) {
                            code = lookupCode;
                            foundFromJson++;
                        }
                    }

                    if (code && code.length === 6) {
                        stockCodeSet.add(code);
                        stockCodeToName.set(code, stock.name);
                    }
                }
            }


            const stockCodes = Array.from(stockCodeSet);

            // 3. 종목별 주가 조회 (rate limit 고려)
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < stockCodes.length; i++) {
                const code = stockCodes[i];
                try {
                    const price = await getStockPrice(code);
                    if (price) {
                        // 기존 캐시에서 intraday high 가져오기 (날짜 바뀌면 리셋)
                        const prev = this.stockPriceCache.get(code);
                        const todayKST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
                        const prevDate = prev?.updatedAt
                            ? new Date(prev.updatedAt.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
                            : null;
                        const isSameDay = prevDate === todayKST;

                        const intradayHigh = isSameDay && prev
                            ? Math.max(prev.intradayHigh, price.currentPrice)
                            : price.currentPrice;
                        const intradayHighRate = isSameDay && prev
                            ? Math.max(prev.intradayHighRate, price.changeRate)
                            : price.changeRate;

                        const cached: CachedStockPrice = {
                            stockCode: code,
                            stockName: stockCodeToName.get(code) || price.stockName,
                            currentPrice: price.currentPrice,
                            changePrice: price.changePrice,
                            changeRate: price.changeRate,
                            volume: price.volume,
                            tradingValue: price.currentPrice * price.volume,
                            marketCap: price.marketCap || 0,
                            intradayHigh,
                            intradayHighRate,
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
                // API rate limit 방지 (초당 20건, 100ms 간격)
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`✅ 종목 주가 조회 완료: ${successCount}개 성공, ${failCount}개 실패`);

            // 4. 테마별 가격 계산
            for (const theme of themes) {
                const themeStocks = theme.stocks.slice(0, this.STOCKS_PER_THEME);
                const prices: CachedStockPrice[] = [];

                for (const stock of themeStocks) {
                    // DB 코드 또는 JSON 폴백
                    let code = stock.code;
                    if (!code || code.length !== 6) {
                        code = STOCK_CODE_MAP[stock.name] || '';
                    }

                    if (code) {
                        const cached = this.stockPriceCache.get(code);
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

            // DB에 캐시 저장 (비동기)
            this.saveCacheToDb().catch(err => {
                console.error('❌ 캐시 DB 저장 실패:', err);
            });

        } catch (error) {
            console.error('❌ 테마 주가 배치 업데이트 실패:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * 캐시를 DB에 저장
     */
    async saveCacheToDb(): Promise<void> {
        try {
            const stockPrices = Array.from(this.stockPriceCache.values());
            const themePrices = Array.from(this.themePriceCache.values());

            await PriceCache.findOneAndUpdate(
                { key: 'main' },
                {
                    key: 'main',
                    stockPrices,
                    themePrices,
                    lastUpdateTime: this.lastUpdateTime,
                    savedAt: new Date(),
                },
                { upsert: true }
            );

        } catch (error) {
            console.error('❌ 캐시 DB 저장 실패:', error);
        }
    }

    /**
     * DB에서 캐시 복원
     */
    async restoreCacheFromDb(): Promise<boolean> {
        try {
            const cached = await PriceCache.findOne({ key: 'main' }).lean();

            if (!cached || !cached.stockPrices || cached.stockPrices.length === 0) {
                console.log('📭 저장된 캐시 없음');
                return false;
            }

            // 캐시가 너무 오래됐으면 (24시간 이상) 사용하지 않음
            const cacheAge = Date.now() - new Date(cached.savedAt).getTime();
            const maxAge = 24 * 60 * 60 * 1000; // 24시간

            if (cacheAge > maxAge) {
                console.log('📭 캐시가 너무 오래됨 (24시간 초과), 새로 로드 필요');
                return false;
            }

            // 종목 캐시 복원
            for (const stock of cached.stockPrices) {
                this.stockPriceCache.set(stock.stockCode, {
                    ...stock,
                    marketCap: (stock as any).marketCap || 0,
                    intradayHigh: (stock as any).intradayHigh || stock.currentPrice,
                    intradayHighRate: (stock as any).intradayHighRate || stock.changeRate,
                    updatedAt: new Date(stock.updatedAt),
                });
            }

            // 테마 캐시 복원
            for (const theme of cached.themePrices) {
                this.themePriceCache.set(theme.themeName, {
                    ...theme,
                    topStocks: theme.topStocks.map(s => ({
                        ...s,
                        marketCap: (s as any).marketCap || 0,
                        intradayHigh: (s as any).intradayHigh || s.currentPrice,
                        intradayHighRate: (s as any).intradayHighRate || s.changeRate,
                        updatedAt: new Date(s.updatedAt),
                    })),
                    updatedAt: new Date(theme.updatedAt),
                });
            }

            this.lastUpdateTime = new Date(cached.lastUpdateTime);

            const ageMinutes = Math.round(cacheAge / 60000);
            console.log(`✅ 캐시 DB에서 복원: ${cached.stockPrices.length}개 종목, ${cached.themePrices.length}개 테마 (${ageMinutes}분 전 데이터)`);

            return true;
        } catch (error) {
            console.error('❌ 캐시 DB 복원 실패:', error);
            return false;
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
     * 종목 검색 (종목명 or 종목코드)
     */
    searchStocks(query: string, limit: number = 10): CachedStockPrice[] {
        const q = query.toLowerCase();
        const results: CachedStockPrice[] = [];
        for (const stock of this.stockPriceCache.values()) {
            if (stock.stockName.toLowerCase().includes(q) || stock.stockCode.includes(q)) {
                results.push(stock);
                if (results.length >= limit) break;
            }
        }
        return results;
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
    async startScheduler(): Promise<void> {
        console.log(`⏰ 테마 주가 캐시 스케줄러 시작 (${this.UPDATE_INTERVAL / 60000}분 주기)`);

        // 1. 먼저 DB에서 캐시 복원 시도
        const restored = await this.restoreCacheFromDb();

        if (restored) {
            // 캐시 복원 성공 → 백그라운드에서 새로 업데이트
            this.updateAllPrices().catch(err => {
                console.error('❌ 백그라운드 업데이트 실패:', err);
            });
        } else {
            // 캐시 없음 → 즉시 업데이트
            await this.updateAllPrices();
        }

        // 이후 주기적 업데이트
        this.updateTimer = setInterval(async () => {
            await this.updateAllPrices();
        }, this.UPDATE_INTERVAL);
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
