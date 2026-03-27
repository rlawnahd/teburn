import OpenAI from 'openai';
import { getHotStocksCache } from './hotnessService';
import News from '../models/News';
import MarketThemeAnalysis, { IThemeItem } from '../models/MarketThemeAnalysis';
import { getMarketStatus } from '../utils/marketStatus';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let cache: { themes: IThemeItem[]; date: string; analyzedAt: Date } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30분

export async function analyzeMarketThemes(): Promise<IThemeItem[]> {
    try {
        const hotStocks = getHotStocksCache();
        if (hotStocks.length === 0) {
            console.log('시장 테마 분석: 주도주 데이터 없음, 스킵');
            return [];
        }

        const stockList = hotStocks.slice(0, 20).map((s, i) =>
            `${i + 1}. ${s.stockName} (${s.totalScore}점, ${s.grade}등급)`
        ).join('\n');

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const news = await News.find({ crawledAt: { $gte: since } })
            .sort({ crawledAt: -1 })
            .limit(80)
            .select('title summary')
            .lean();

        const newsList = news.map(n =>
            n.title + (n.summary ? ' — ' + n.summary.slice(0, 150) : '')
        ).join('\n');

        console.log('시장 테마 분석 시작...');

        const response = await openai.chat.completions.create({
            model: 'gpt-5.4-nano',
            max_completion_tokens: 1500,
            messages: [
                {
                    role: 'system',
                    content: '한국 주식시장 전문 애널리스트. 주도주와 뉴스를 분석하여 오늘의 시장 테마를 추출한다. 규칙: 1) 동반 상승하는 종목들을 실제 이유 기반으로 그룹핑 2) 상승 배경은 반드시 제공된 뉴스에서 근거를 찾을 것 3) 뉴스에 근거가 없으면 "시장 수급에 의한 동반 상승으로 추정, 구체적 뉴스 미확인"이라고 정직하게 쓸 것 4) 절대 없는 뉴스를 지어내지 말 것',
                },
                {
                    role: 'user',
                    content: `오늘 한국 주식시장 주도주 TOP 20과 최근 24시간 뉴스를 분석해서 "오늘의 시장 테마"를 3~5개 추출해주세요.\n\n각 테마:\n- name: 테마명 (4~8글자)\n- stocks: 관련 종목 (주도주 목록에서만)\n- reason: 상승 배경 (2~3문장, 구체적 이벤트/수치 포함. 뻔한 말 금지)\n\n[오늘 주도주 TOP 20]\n${stockList}\n\n[최근 24시간 뉴스]\n${newsList}\n\nJSON만:\n{ "themes": [{ "name": "테마명", "stocks": ["종목1"], "reason": "구체적 배경" }] }`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('AI 응답 없음');

        const parsed = JSON.parse(content);
        const themes: IThemeItem[] = parsed.themes || [];

        // KST 오늘 날짜
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstToday = new Date(Date.now() + kstOffset).toISOString().split('T')[0];

        // DB 저장 (upsert)
        await MarketThemeAnalysis.findOneAndUpdate(
            { date: kstToday },
            { date: kstToday, themes, analyzedAt: new Date(), model: 'gpt-5.4-nano' },
            { upsert: true }
        );

        // 캐시 갱신
        cache = { themes, date: kstToday, analyzedAt: new Date() };

        console.log(`시장 테마 분석 완료: ${themes.length}개 테마 (토큰: ${response.usage?.total_tokens})`);
        return themes;
    } catch (err) {
        console.error('시장 테마 분석 실패:', err);
        return [];
    }
}

export async function getLatestThemeAnalysis(): Promise<{ themes: IThemeItem[]; date: string; analyzedAt: Date } | null> {
    // 캐시 유효하면 반환
    if (cache && Date.now() - cache.analyzedAt.getTime() < CACHE_TTL) {
        return cache;
    }

    // DB에서 오늘 분석 조회
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstToday = new Date(Date.now() + kstOffset).toISOString().split('T')[0];

    const analysis = await MarketThemeAnalysis.findOne({ date: kstToday }).lean();
    if (analysis) {
        cache = { themes: analysis.themes, date: analysis.date, analyzedAt: analysis.analyzedAt };
        return cache;
    }

    return null;
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startThemeAnalysisScheduler(): void {
    // 서버 시작 5분 후 첫 분석
    setTimeout(() => {
        const market = getMarketStatus();
        if (market.isOpen) {
            analyzeMarketThemes();
        }
    }, 5 * 60 * 1000);

    // 1분마다 체크하여 정해진 시간에 실행
    const targetTimes = ['09:30', '12:00', '15:00'];
    let lastRun = '';

    schedulerInterval = setInterval(() => {
        const market = getMarketStatus();
        if (!market.isOpen) return;

        const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (targetTimes.includes(timeStr) && lastRun !== timeStr) {
            lastRun = timeStr;
            analyzeMarketThemes();
        }
    }, 60 * 1000);

    console.log('📊 시장 테마 AI 분석 스케줄러 시작 (09:30, 12:00, 15:00 KST)');
}
