import { describe, it, expect } from 'vitest';
import {
    toReportStocks,
    toReportThemes,
    buildReportPrompt,
    HotStockLike,
    DailyThemeLike,
} from '../dailyReportBuilder';

function hot(over: Partial<HotStockLike>): HotStockLike {
    return {
        stockCode: '005930', stockName: '삼성전자', changeRate: 3.1,
        tradingValue: 1000, grade: 'A', totalScore: 55, themes: ['반도체'],
        ...over,
    };
}

describe('toReportStocks', () => {
    it('HotStock 배열을 rank 부여하며 ReportStock으로 변환하고 limit으로 자른다', () => {
        const input: HotStockLike[] = [
            hot({ stockCode: 'A1', stockName: '에이', grade: 'S', totalScore: 80 }),
            hot({ stockCode: 'A2', stockName: '비', grade: 'A', totalScore: 50 }),
            hot({ stockCode: 'A3', stockName: '씨' }),
        ];
        const out = toReportStocks(input, 2);
        expect(out.length).toBe(2);
        expect(out[0]).toEqual({
            rank: 1, stockCode: 'A1', stockName: '에이', changeRate: 3.1,
            tradingValue: 1000, grade: 'S', score: 80, themes: ['반도체'],
        });
        expect(out[1].rank).toBe(2);
        expect(out[1].stockName).toBe('비');
    });

    it('빈 배열이면 빈 배열을 반환한다', () => {
        expect(toReportStocks([], 10)).toEqual([]);
    });
});

describe('toReportThemes', () => {
    it('DailyTheme 배열을 ReportTheme으로 변환하고 limit으로 자른다 (불필요 필드 제거)', () => {
        const input: DailyThemeLike[] = [
            { rank: 1, themeName: '반도체', avgChangeRate: 4.2, totalTradingValue: 999, topStock: '삼성전자', topStockRate: 5.1 },
            { rank: 2, themeName: '2차전지', avgChangeRate: 2.0, totalTradingValue: 500, topStock: '에코프로', topStockRate: 3.0 },
        ];
        const out = toReportThemes(input, 1);
        expect(out.length).toBe(1);
        expect(out[0]).toEqual({
            rank: 1, themeName: '반도체', avgChangeRate: 4.2, topStock: '삼성전자', topStockRate: 5.1,
        });
        expect((out[0] as any).totalTradingValue).toBeUndefined();
    });
});

describe('buildReportPrompt', () => {
    const themes: DailyThemeLike[] = [
        { rank: 1, themeName: '반도체', avgChangeRate: 4.2, totalTradingValue: 999, topStock: '삼성전자', topStockRate: 5.1 },
    ];
    const stocks: HotStockLike[] = [
        hot({ stockName: '에이', changeRate: 19.5, themes: ['반도체'] }),
    ];

    it('날짜·테마명·종목명을 포함한 프롬프트를 만든다', () => {
        const p = buildReportPrompt('2026-06-09', themes, stocks);
        expect(p).toContain('2026-06-09');
        expect(p).toContain('반도체');
        expect(p).toContain('에이');
    });

    it('테마/종목이 비어도 문자열을 반환한다 (throw 안 함)', () => {
        const p = buildReportPrompt('2026-06-09', [], []);
        expect(typeof p).toBe('string');
        expect(p).toContain('2026-06-09');
    });
});
