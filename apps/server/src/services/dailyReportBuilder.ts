// 일별 리포트 — 순수 변환·프롬프트 함수 (I/O 없음, 단위 테스트 대상)
import { ReportTheme, ReportStock } from '../models/DailyReport';

export interface HotStockLike {
    stockCode: string;
    stockName: string;
    changeRate: number;
    tradingValue: number;
    grade: string;
    totalScore: number;
    themes: string[];
}

export interface DailyThemeLike {
    rank: number;
    themeName: string;
    avgChangeRate: number;
    totalTradingValue: number;
    topStock: string;
    topStockRate: number;
}

export function toReportStocks(stocks: HotStockLike[], limit: number): ReportStock[] {
    return stocks.slice(0, limit).map((s, i) => ({
        rank: i + 1,
        stockCode: s.stockCode,
        stockName: s.stockName,
        changeRate: s.changeRate,
        tradingValue: s.tradingValue,
        grade: s.grade,
        score: s.totalScore,
        themes: s.themes,
    }));
}

export function toReportThemes(themes: DailyThemeLike[], limit: number): ReportTheme[] {
    return themes.slice(0, limit).map((t) => ({
        rank: t.rank,
        themeName: t.themeName,
        avgChangeRate: t.avgChangeRate,
        topStock: t.topStock,
        topStockRate: t.topStockRate,
    }));
}

/**
 * 그날 데이터로 GPT 시장 요약 프롬프트 생성 (한국어 2~3문단 요청)
 */
export function buildReportPrompt(
    date: string,
    themes: DailyThemeLike[],
    stocks: HotStockLike[],
): string {
    const themeLines = themes.length > 0
        ? themes.map(t => `- ${t.themeName} (평균 ${t.avgChangeRate.toFixed(1)}%, 대장주 ${t.topStock} ${t.topStockRate.toFixed(1)}%)`).join('\n')
        : '(주도테마 데이터 없음)';

    const stockLines = stocks.length > 0
        ? stocks.map((s, i) => `${i + 1}. ${s.stockName} ${s.changeRate.toFixed(1)}% (${s.grade}등급, 테마: ${s.themes.join('/') || '-'})`).join('\n')
        : '(주도주 데이터 없음)';

    return [
        `${date} 한국 주식시장 마감 데이터를 바탕으로 "오늘의 시장 요약"을 작성해줘.`,
        ``,
        `규칙:`,
        `- 한국어 2~3문단, 각 문단 2~4문장.`,
        `- 제공된 데이터(주도테마/주도주)에 근거할 것. 없는 사실/뉴스를 지어내지 말 것.`,
        `- 첫 문단: 오늘 시장을 이끈 핵심 테마와 대장주. 둘째 문단: 주목할 종목 흐름. (선택) 셋째 문단: 한 줄 시사점.`,
        `- 투자 권유/매수 추천 표현 금지. 사실 서술 위주.`,
        `- 마크다운 없이 평문으로.`,
        ``,
        `[주도테마]`,
        themeLines,
        ``,
        `[주도주 TOP]`,
        stockLines,
    ].join('\n');
}
