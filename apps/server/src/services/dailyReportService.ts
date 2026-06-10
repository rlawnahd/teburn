// 일별 마감 리포트 — 데이터 수집 + GPT 요약 + DB 저장 (forward-only, 멱등)
import OpenAI from 'openai';
import DailyReport from '../models/DailyReport';
import DailyLeadingTheme from '../models/DailyLeadingTheme';
import { getHotStocksCache } from './hotnessService';
import { toReportStocks, toReportThemes, buildReportPrompt, legacyStocksToReport, DailyThemeLike, HotStockLike, LegacyStockLike } from './dailyReportBuilder';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TOP_STOCKS = 10;
const TOP_THEMES = 8;

// KST 'YYYY-MM-DD' → 해당 날짜의 KST 자정 구간 [start, end)
function kstDayRange(date: string): { start: Date; end: Date } {
    const start = new Date(`${date}T00:00:00+09:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
}

async function generateSummary(date: string, themes: DailyThemeLike[], stocks: HotStockLike[]): Promise<string> {
    const prompt = buildReportPrompt(date, themes, stocks);
    const response = await openai.chat.completions.create({
        model: 'gpt-5.4-nano',
        max_completion_tokens: 1200,
        messages: [
            { role: 'system', content: '한국 주식시장 전문 애널리스트. 제공된 데이터에만 근거해 객관적으로 시장을 요약한다. 없는 사실을 지어내지 않는다.' },
            { role: 'user', content: prompt },
        ],
    });
    return response.choices[0]?.message?.content?.trim() || '';
}

/**
 * 그날 리포트 생성 (이미 있으면 skip — 멱등, GPT 재호출 없음)
 */
export async function generateDailyReport(date: string): Promise<void> {
    const existing = await DailyReport.findOne({ date }).lean();
    if (existing) {
        console.log(`📄 일별 리포트 이미 존재: ${date} — skip`);
        return;
    }

    // 주도주: 현재 캐시(그날 장마감 시점) — 1회 캡처
    const hot = getHotStocksCache();
    const topStocks = toReportStocks(hot, TOP_STOCKS);

    // 주도테마: 그날 DailyLeadingTheme 최신 레코드
    const { start, end } = kstDayRange(date);
    const dailyTheme = await DailyLeadingTheme.findOne({ date: { $gte: start, $lt: end } })
        .sort({ date: -1 })
        .lean();
    const topThemes = toReportThemes((dailyTheme?.topThemes as DailyThemeLike[]) ?? [], TOP_THEMES);

    if (topStocks.length === 0 && topThemes.length === 0) {
        console.log(`📄 일별 리포트: ${date} 데이터 없음 — skip`);
        return;
    }

    let aiSummary = '';
    try {
        const rawThemes = (dailyTheme?.topThemes as DailyThemeLike[]) ?? [];
        aiSummary = await generateSummary(date, rawThemes.slice(0, TOP_THEMES), hot.slice(0, TOP_STOCKS));
    } catch (err: any) {
        console.error(`📄 일별 리포트 GPT 요약 실패 (${date}):`, err.message);
    }

    await DailyReport.findOneAndUpdate(
        { date },
        { $set: { date, aiSummary, topThemes, topStocks, generatedAt: new Date() } },
        { upsert: true },
    );
    console.log(`📄 일별 리포트 생성 완료: ${date} (테마 ${topThemes.length}, 종목 ${topStocks.length}, 요약 ${aiSummary ? 'O' : 'X'})`);
}

// KST 기준 Date → 'YYYY-MM-DD' 문자열
function kstDateString(d: Date): string {
    return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

let backfillStarted = false;

/**
 * 과거 DailyLeadingTheme(최대 90일) 데이터로 리포트 소급 생성 (data-only, AI 요약 없음).
 * 이미 리포트가 있는 날(오늘 등 AI 요약 포함분)은 건드리지 않음 — 멱등.
 */
export async function backfillDailyReports(): Promise<void> {
    if (backfillStarted) return;
    backfillStarted = true;

    const days = await DailyLeadingTheme.find({}).sort({ date: -1 }).lean();
    if (days.length === 0) {
        console.log('📄 리포트 백필: DailyLeadingTheme 데이터 없음 — skip');
        return;
    }

    // 기존 리포트 날짜를 1회 조회해 Set으로 (N+1 회피)
    const existingDates = new Set(
        (await DailyReport.find({}, { date: 1 }).lean()).map((r: any) => r.date),
    );

    let created = 0;
    for (const day of days) {
        const dateStr = kstDateString(new Date(day.date));

        if (existingDates.has(dateStr)) continue; // 오늘(AI 요약 포함) 등 기존 리포트 보존

        const topThemes = toReportThemes((day.topThemes as DailyThemeLike[]) ?? [], TOP_THEMES);
        const topStocks = legacyStocksToReport((day.topStocks as LegacyStockLike[]) ?? [], TOP_STOCKS);
        if (topThemes.length === 0 && topStocks.length === 0) continue;

        await DailyReport.findOneAndUpdate(
            { date: dateStr },
            { $setOnInsert: { date: dateStr, aiSummary: '', topThemes, topStocks, generatedAt: new Date() } },
            { upsert: true },
        );
        created++;
    }
    console.log(`📄 리포트 백필 완료: ${created}일 생성 (DailyLeadingTheme ${days.length}일 검토)`);
}

/** 단일 리포트 조회 */
export async function getDailyReport(date: string) {
    return DailyReport.findOne({ date }).lean();
}

/** 최근 리포트 목록 (date desc, 최대 90) */
export async function listRecentReports(limit: number) {
    const capped = Math.min(Math.max(limit, 1), 90);
    return DailyReport.find({}, { date: 1, aiSummary: 1, topThemes: 1, topStocks: 1 })
        .sort({ date: -1 })
        .limit(capped)
        .lean();
}
