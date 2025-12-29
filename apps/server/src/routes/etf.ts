import express from 'express';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
const router = express.Router();

// 추적할 커버드콜 ETF 목록
const COVERED_CALL_ETFS = [
    {
        symbol: 'JEPI',
        name: 'JPMorgan Equity Premium Income ETF',
        korName: 'JP모건 에쿼티 프리미엄 인컴',
        strategy: 'Covered Call',
        underlying: 'S&P 500',
    },
    {
        symbol: 'JEPQ',
        name: 'JPMorgan Nasdaq Equity Premium Income ETF',
        korName: 'JP모건 나스닥 프리미엄 인컴',
        strategy: 'Covered Call',
        underlying: 'Nasdaq 100',
    },
    {
        symbol: 'QYLD',
        name: 'Global X NASDAQ 100 Covered Call ETF',
        korName: '글로벌X 나스닥100 커버드콜',
        strategy: 'Covered Call',
        underlying: 'Nasdaq 100',
    },
    {
        symbol: 'XYLD',
        name: 'Global X S&P 500 Covered Call ETF',
        korName: '글로벌X S&P500 커버드콜',
        strategy: 'Covered Call',
        underlying: 'S&P 500',
    },
    {
        symbol: 'DIVO',
        name: 'Amplify CWP Enhanced Dividend Income ETF',
        korName: '앰플리파이 배당강화',
        strategy: 'Covered Call + Dividend',
        underlying: 'Large Cap Dividend',
    },
    {
        symbol: 'RYLD',
        name: 'Global X Russell 2000 Covered Call ETF',
        korName: '글로벌X 러셀2000 커버드콜',
        strategy: 'Covered Call',
        underlying: 'Russell 2000',
    },
];

// ETF 상세 정보 캐시 (5분)
const etfCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

// Yahoo Finance 응답 타입
interface YahooQuoteResult {
    price?: {
        regularMarketPrice?: number;
        regularMarketPreviousClose?: number;
        regularMarketChangePercent?: number;
    };
    summaryDetail?: {
        yield?: number;
        totalAssets?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
    };
    defaultKeyStatistics?: {
        annualReportExpenseRatio?: number;
    };
}

// Yahoo Finance에서 ETF 정보 가져오기
async function getETFQuote(symbol: string) {
    const cached = etfCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const quote = await yahooFinance.quoteSummary(symbol, {
            modules: ['price', 'summaryDetail', 'defaultKeyStatistics'],
        }) as YahooQuoteResult;

        const data = {
            symbol,
            currentPrice: quote.price?.regularMarketPrice || 0,
            previousClose: quote.price?.regularMarketPreviousClose || 0,
            changePercent: quote.price?.regularMarketChangePercent || 0,
            yieldRate: (quote.summaryDetail?.yield || 0) * 100,
            expenseRatio: (quote.defaultKeyStatistics?.annualReportExpenseRatio || 0) * 100,
            aum: ((quote.summaryDetail?.totalAssets || 0) / 1e9).toFixed(2),
            fiftyTwoWeekHigh: quote.summaryDetail?.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: quote.summaryDetail?.fiftyTwoWeekLow || 0,
        };

        etfCache.set(symbol, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
        return null;
    }
}

// 배당 이력 가져오기
interface DividendEvent {
    date: Date;
    dividends: number;
}

async function getDividendHistory(symbol: string, months: number = 12) {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const result = await yahooFinance.historical(symbol, {
            period1: startDate.toISOString().split('T')[0],
            period2: endDate.toISOString().split('T')[0],
            events: 'dividends',
        }) as unknown as DividendEvent[];

        return result.map((d) => ({
            exDate: d.date.toISOString().split('T')[0],
            amount: d.dividends,
        }));
    } catch (error) {
        console.error(`Failed to fetch dividends for ${symbol}:`, error);
        return [];
    }
}

// GET /api/etf - 전체 ETF 목록
router.get('/', async (req, res) => {
    try {
        const etfPromises = COVERED_CALL_ETFS.map(async (etf) => {
            const quote = await getETFQuote(etf.symbol);
            const dividends = await getDividendHistory(etf.symbol, 3);

            // 다음 예상 배당일 (매월 초 기준)
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const nextExDate = nextMonth.toISOString().split('T')[0];

            // 최근 배당금 평균
            const recentDividends = dividends.slice(0, 3);
            const avgDividend = recentDividends.length > 0
                ? recentDividends.reduce((sum: number, d: any) => sum + d.amount, 0) / recentDividends.length
                : 0;

            return {
                ...etf,
                issuer: etf.name.split(' ')[0],
                currentPrice: quote?.currentPrice || 0,
                changePercent: quote?.changePercent || 0,
                yieldRate: quote?.yieldRate || 0,
                expenseRatio: quote?.expenseRatio || 0,
                aum: quote?.aum || '0',
                nextExDate,
                nextPayDate: null,
                nextAmount: avgDividend,
                lastAmount: dividends[0]?.amount || null,
            };
        });

        const etfs = await Promise.all(etfPromises);
        res.json(etfs);
    } catch (error) {
        console.error('ETF 목록 조회 실패:', error);
        res.status(500).json({ error: 'ETF 목록을 불러올 수 없습니다.' });
    }
});

// GET /api/etf/calendar - 캘린더용 전체 일정
router.get('/calendar', async (req, res) => {
    try {
        const calendarEvents: Array<{
            symbol: string;
            korName: string;
            type: 'exDate' | 'payDate';
            date: string;
            amount: number;
            status: string;
        }> = [];

        for (const etf of COVERED_CALL_ETFS) {
            const dividends = await getDividendHistory(etf.symbol, 12);

            for (const div of dividends) {
                calendarEvents.push({
                    symbol: etf.symbol,
                    korName: etf.korName,
                    type: 'exDate',
                    date: div.exDate,
                    amount: div.amount,
                    status: 'confirmed',
                });
            }

            // 예상 배당일 추가 (향후 3개월)
            const now = new Date();
            for (let i = 1; i <= 3; i++) {
                const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
                const avgAmount = dividends.length > 0
                    ? dividends.slice(0, 3).reduce((sum: number, d: any) => sum + d.amount, 0) / Math.min(3, dividends.length)
                    : 0;

                calendarEvents.push({
                    symbol: etf.symbol,
                    korName: etf.korName,
                    type: 'exDate',
                    date: futureDate.toISOString().split('T')[0],
                    amount: avgAmount,
                    status: 'estimated',
                });
            }
        }

        // 날짜순 정렬
        calendarEvents.sort((a, b) => a.date.localeCompare(b.date));
        res.json(calendarEvents);
    } catch (error) {
        console.error('캘린더 일정 조회 실패:', error);
        res.status(500).json({ error: '캘린더 일정을 불러올 수 없습니다.' });
    }
});

// GET /api/etf/:symbol - 특정 ETF 상세
router.get('/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const etfInfo = COVERED_CALL_ETFS.find(
            (e) => e.symbol.toUpperCase() === symbol.toUpperCase()
        );

        if (!etfInfo) {
            return res.status(404).json({ error: 'ETF를 찾을 수 없습니다.' });
        }

        const quote = await getETFQuote(symbol);
        const dividends = await getDividendHistory(symbol, 24);

        // 연간 배당금 합계
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const yearlyDividends = dividends.filter(
            (d: any) => new Date(d.exDate) >= oneYearAgo
        );
        const yearlyTotal = yearlyDividends.reduce(
            (sum: number, d: any) => sum + d.amount,
            0
        );

        // 다음 예상 배당
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const avgAmount = dividends.length > 0
            ? dividends.slice(0, 3).reduce((sum: number, d: any) => sum + d.amount, 0) / Math.min(3, dividends.length)
            : 0;

        const nextDividend = {
            exDate: nextMonth.toISOString().split('T')[0],
            payDate: new Date(nextMonth.getTime() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
            amount: avgAmount,
            status: 'estimated',
        };

        res.json({
            ...etfInfo,
            issuer: etfInfo.name.split(' ')[0],
            currentPrice: quote?.currentPrice || 0,
            changePercent: quote?.changePercent || 0,
            yieldRate: quote?.yieldRate || 0,
            expenseRatio: quote?.expenseRatio || 0,
            aum: quote?.aum || '0',
            fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: quote?.fiftyTwoWeekLow || 0,
            description: `${etfInfo.name}는 ${etfInfo.underlying} 지수를 기초로 커버드콜 전략을 사용하여 월배당을 지급하는 ETF입니다.`,
            dividends: dividends.map((d: any) => ({
                exDate: d.exDate,
                payDate: d.exDate,
                amount: d.amount,
                status: 'confirmed',
            })),
            yearlyTotal,
            nextDividend,
        });
    } catch (error) {
        console.error('ETF 상세 조회 실패:', error);
        res.status(500).json({ error: 'ETF 정보를 불러올 수 없습니다.' });
    }
});

// GET /api/etf/:symbol/dividends - 특정 ETF 배당 히스토리
router.get('/:symbol/dividends', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { months = '24' } = req.query;

        const dividends = await getDividendHistory(symbol, parseInt(months as string));

        res.json(
            dividends.map((d: any) => ({
                exDate: d.exDate,
                payDate: d.exDate,
                amount: d.amount,
                status: 'confirmed',
            }))
        );
    } catch (error) {
        console.error('배당 히스토리 조회 실패:', error);
        res.status(500).json({ error: '배당 히스토리를 불러올 수 없습니다.' });
    }
});

export default router;
