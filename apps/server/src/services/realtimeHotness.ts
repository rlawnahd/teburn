// 실시간 주도주 점수 하이브리드 계산
// 배치 점수(volume, news, themeConcentration)는 유지하고
// 실시간 체결 데이터로 tradingValue, momentum만 재계산

import {
    HotnessScore,
    getGrade,
    calculateTradingValueScore,
    calculateMomentumScore,
} from './hotnessService';

interface RealtimeScore {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changeRate: number;
    tradingValue: number;
    themes: string[];

    // 점수 상세
    totalScore: number;
    tradingValueScore: number;
    momentumScore: number;
    volumeScore: number;
    newsScore: number;
    themeConcentrationScore: number;
    streakScore: number;
    streakDays: number;

    // 원본 데이터 (배치에서 유지)
    volumeSurgeRate: number | null;
    newsCount: number;
    latestNews: string | null;
    themeConcentration: number;

    grade: HotnessScore['grade'];
}

// 실시간 점수 캐시
const realtimeScores = new Map<string, RealtimeScore>();

/**
 * 배치 점수로 초기화
 */
export function initRealtimeScores(batchScores: HotnessScore[]): void {
    realtimeScores.clear();
    for (const s of batchScores) {
        realtimeScores.set(s.stockCode, { ...s });
    }
    console.log(`📡 실시간 주도주 점수 초기화: ${batchScores.length}개 종목`);
}

/**
 * 배치 점수 병합 (5분마다 배치 갱신 시 호출)
 * 배치에서 새로 계산된 volume, news, themeConcentration 점수를 반영
 */
export function mergeBatchScores(batchScores: HotnessScore[]): void {
    const batchMap = new Map(batchScores.map(s => [s.stockCode, s]));

    // 배치에 있는 종목: 배치 점수로 덮어쓰기
    for (const s of batchScores) {
        realtimeScores.set(s.stockCode, { ...s });
    }

    // 배치에서 사라진 종목 제거
    for (const code of realtimeScores.keys()) {
        if (!batchMap.has(code)) {
            realtimeScores.delete(code);
        }
    }

    console.log(`📡 실시간 점수 배치 병합: ${batchScores.length}개 종목`);
}

/**
 * 실시간 체결 데이터로 점수 재계산
 * tradingValue와 momentum만 실시간 업데이트
 * 점수가 변경된 경우에만 업데이트된 점수 반환
 */
export function realtimeHotnessUpdate(
    stockCode: string,
    price: number,
    changeRate: number,
    volume: number,
): RealtimeScore | null {
    const existing = realtimeScores.get(stockCode);
    if (!existing) return null;

    // 실시간 거래대금 추정: 기존 거래대금 + (체결가 * 체결량)
    const newTradingValue = existing.tradingValue + (price * volume);

    // 점수 재계산 (tradingValue, momentum만)
    const newTradingValueScore = calculateTradingValueScore(newTradingValue);
    const newMomentumScore = calculateMomentumScore(changeRate);

    // 배치에서 가져온 점수는 유지
    const newTotalScore = newTradingValueScore + newMomentumScore +
        existing.volumeScore + existing.newsScore + existing.themeConcentrationScore + existing.streakScore;

    // 점수 변화 없으면 skip
    if (newTotalScore === existing.totalScore) {
        // 가격/거래대금만 업데이트 (점수 변화 없으므로 broadcast 불필요)
        existing.currentPrice = price;
        existing.changeRate = changeRate;
        existing.tradingValue = newTradingValue;
        return null;
    }

    // 점수 변경 — 업데이트
    existing.currentPrice = price;
    existing.changeRate = changeRate;
    existing.tradingValue = newTradingValue;
    existing.tradingValueScore = newTradingValueScore;
    existing.momentumScore = newMomentumScore;
    existing.totalScore = newTotalScore;
    existing.grade = getGrade(newTotalScore);

    return { ...existing };
}

/**
 * 현재 실시간 점수 조회
 */
export function getRealtimeScores(): RealtimeScore[] {
    return Array.from(realtimeScores.values())
        .sort((a, b) => b.totalScore - a.totalScore);
}
