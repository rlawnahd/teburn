/**
 * 종목별 "왜 주도주인가" AI 요약 서비스
 * 뉴스 + hotness 지표를 바탕으로 GPT가 1~2문장으로 요약
 */
import OpenAI from 'openai';
import { fetchNaverNewsApi } from './naverApi';
import StockReasonCache from '../models/StockReasonCache';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 메모리 캐시 (30분)
const memoryCache = new Map<string, { reason: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function todayKST(): string {
    const kstOffset = 9 * 60 * 60 * 1000;
    return new Date(Date.now() + kstOffset).toISOString().split('T')[0];
}

interface StockReasonInput {
    stockCode: string;
    stockName: string;
    changeRate: number;
    tradingValue: number;
    grade: string;
    themes: string[];
    volumeSurgeRate?: number | null;
    relativeStrengthScore?: number;
}

/**
 * 단일 종목 AI 요약 생성 (캐시 우선)
 */
export async function getStockAiReason(stock: StockReasonInput): Promise<string | null> {
    const cacheKey = `${todayKST()}:${stock.stockCode}`;

    // 1. 메모리 캐시
    const mem = memoryCache.get(cacheKey);
    if (mem && Date.now() - mem.timestamp < CACHE_TTL) {
        return mem.reason;
    }

    // 2. DB 캐시
    try {
        const dbCache = await StockReasonCache.findOne({ cacheKey }).lean();
        if (dbCache) {
            memoryCache.set(cacheKey, { reason: dbCache.reason, timestamp: Date.now() });
            return dbCache.reason;
        }
    } catch (err) {
        // DB 조회 실패 무시
    }

    // 3. 뉴스 가져오기
    let newsList = '';
    try {
        const news = await fetchNaverNewsApi(stock.stockName);
        const recent = news.slice(0, 5);
        if (recent.length > 0) {
            newsList = recent.map((n) => `- ${n.title}`).join('\n');
        }
    } catch {
        // 뉴스 조회 실패해도 진행
    }

    if (!newsList) {
        // 뉴스 없으면 기본 이유만 반환 (AI 호출 생략)
        const fallback = generateFallbackReason(stock);
        memoryCache.set(cacheKey, { reason: fallback, timestamp: Date.now() });
        return fallback;
    }

    // 4. GPT 호출
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-5.4-nano',
            max_completion_tokens: 120,
            messages: [
                {
                    role: 'system',
                    content: '한국 주식시장 애널리스트. 종목의 상승 이유를 뉴스 기반으로 간결하게 설명한다. 규칙: 1) 반드시 1~2문장, 최대 60자 이내 2) 구체적 이벤트/키워드 포함 3) 없는 내용 지어내지 말 것 4) "상승세 지속" 같은 뻔한 말 금지',
                },
                {
                    role: 'user',
                    content: `종목: ${stock.stockName} (${stock.changeRate.toFixed(1)}%)\n테마: ${stock.themes.slice(0, 2).join(', ') || '없음'}\n\n[최신 뉴스]\n${newsList}\n\n이 종목이 오늘 오른 구체적인 이유를 1~2문장으로 요약하세요. JSON: {"reason": "..."}`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return generateFallbackReason(stock);

        const parsed = JSON.parse(content);
        const reason: string = (parsed.reason || '').trim();
        if (!reason) return generateFallbackReason(stock);

        // 캐시 저장 (메모리 + DB)
        memoryCache.set(cacheKey, { reason, timestamp: Date.now() });
        try {
            await StockReasonCache.findOneAndUpdate(
                { cacheKey },
                { cacheKey, stockCode: stock.stockCode, reason, createdAt: new Date() },
                { upsert: true }
            );
        } catch {
            // DB 저장 실패 무시
        }

        return reason;
    } catch (err) {
        console.error(`❌ AI 이유 생성 실패 (${stock.stockName}):`, err);
        return generateFallbackReason(stock);
    }
}

/**
 * AI 호출 실패 시 폴백: 지표 기반 기계적 이유
 */
function generateFallbackReason(stock: StockReasonInput): string {
    const parts: string[] = [];

    if (stock.themes[0]) parts.push(`${stock.themes[0]} 테마`);
    if (stock.volumeSurgeRate && stock.volumeSurgeRate >= 3) {
        parts.push(`거래량 ${Math.round(stock.volumeSurgeRate)}배 급증`);
    }
    if (stock.changeRate >= 10) parts.push('강한 매수세');

    return parts.slice(0, 2).join(', ') || '시장 관심 집중';
}

/**
 * 여러 종목 병렬 AI 요약
 */
export async function getBatchStockAiReasons(
    stocks: StockReasonInput[]
): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    // 동시 5개씩 처리 (OpenAI rate limit 고려)
    const BATCH = 5;
    for (let i = 0; i < stocks.length; i += BATCH) {
        const batch = stocks.slice(i, i + BATCH);
        const reasons = await Promise.all(
            batch.map((s) => getStockAiReason(s).catch(() => null))
        );
        batch.forEach((s, idx) => {
            if (reasons[idx]) result.set(s.stockCode, reasons[idx]!);
        });
    }

    return result;
}
