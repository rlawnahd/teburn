import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface AIAnalysisResult {
    sentiment: 'positive' | 'negative' | 'neutral';
    reason: string;
    stocks: string[];      // 수혜주 (직접 언급 + 연관 종목)
    negativeStocks: string[]; // 피해주 (있을 경우)
    themes: string[];
    score: number;
}

export async function analyzeNews(title: string, summary: string): Promise<AIAnalysisResult> {
    try {
        const prompt = `당신은 국내 주식시장 전문 애널리스트입니다. 다음 금융 뉴스를 깊이 분석해주세요.

제목: ${title}
본문: ${summary}

## 분석 요청사항
1. 뉴스의 핵심 내용과 시장 영향을 파악하세요
2. **직접 언급된 종목** + **연관 수혜주/피해주**를 모두 도출하세요
3. 산업 밸류체인, 경쟁사, 협력사 관계를 고려하세요

## 종목 분류 기준 (매우 중요!)
- **stocks (수혜주)**: 뉴스로 인해 주가 상승이 예상되는 종목만
- **negativeStocks (피해주)**: 뉴스로 인해 주가 하락이 예상되는 종목 (실적 부진 당사자, 악재 대상 기업 포함)

## 종목 분석 예시
- "삼성전자 HBM 수주 확대" → 수혜주: 삼성전자, 한미반도체, 리노공업 / 피해주: 없음
- "전기차 배터리 화재" → 수혜주: 소방 관련주 / 피해주: LG에너지솔루션, 삼성SDI
- "오라클 실적 충격으로 급락" → 수혜주: 없음 / 피해주: 오라클, 관련 기술주
- "테슬라 판매량 급감" → 수혜주: 현대차, 기아 / 피해주: 테슬라
- "금리 인상 발표" → 수혜주: 은행주 / 피해주: 성장주, 부동산주

⚠️ 주의: 악재의 원인이 되는 기업은 반드시 negativeStocks에 넣으세요. 단순히 기사에 언급되었다고 stocks에 넣지 마세요.

아래 JSON 형식으로만 응답해주세요:
{
  "sentiment": "positive" | "negative" | "neutral",
  "reason": "핵심 분석 (2-3문장, 투자 관점에서 왜 중요한지)",
  "stocks": ["수혜 예상 종목 (주가 상승 예상되는 기업만, 최대 5개)"],
  "negativeStocks": ["피해 예상 종목 (주가 하락 예상되는 기업, 악재 당사자 포함)"],
  "themes": ["관련 투자테마 (예: HBM, 2차전지, AI반도체, 바이오, 방산, 조선 등)"],
  "score": 1-100
}

## 점수 기준
- 30-50: 개별 종목 뉴스, 단기 이슈
- 50-70: 산업/섹터 뉴스, 수급 변화
- 70-90: 정책/규제, 대형 수주, 실적 서프라이즈
- 90-100: 거시경제, 시장 전체 영향`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: '당신은 금융 뉴스 분석 전문가입니다. JSON 형식으로만 응답하세요.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
            max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('AI 응답이 비어있습니다.');
        }

        // JSON 파싱 (마크다운 코드블록 제거)
        const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr) as AIAnalysisResult;

        // 유효성 검증
        if (!['positive', 'negative', 'neutral'].includes(result.sentiment)) {
            result.sentiment = 'neutral';
        }
        if (typeof result.score !== 'number' || result.score < 1 || result.score > 100) {
            result.score = 50;
        }
        if (!Array.isArray(result.stocks)) {
            result.stocks = [];
        }
        if (!Array.isArray(result.themes)) {
            result.themes = [];
        }
        if (!Array.isArray(result.negativeStocks)) {
            result.negativeStocks = [];
        }

        return result;
    } catch (error) {
        console.error('❌ AI 분석 실패:', error);
        // 실패 시 기본값 반환
        return {
            sentiment: 'neutral',
            reason: 'AI 분석 실패',
            stocks: [],
            negativeStocks: [],
            themes: [],
            score: 50,
        };
    }
}

// 여러 뉴스를 배치로 분석 (비용 절감을 위해 상위 N개만)
export async function analyzeNewsArray(
    newsItems: { title: string; summary: string }[],
    limit: number = 5
): Promise<AIAnalysisResult[]> {
    const targetItems = newsItems.slice(0, limit);

    console.log(`🤖 AI 분석 시작: ${targetItems.length}개 뉴스`);

    const results = await Promise.all(
        targetItems.map((item) => analyzeNews(item.title, item.summary))
    );

    console.log(`✅ AI 분석 완료`);

    return results;
}
