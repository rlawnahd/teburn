// 등급 성적표 — KIS 일봉 조회 + 레코드 생성/채움 배치
import axios from 'axios';
import GradePerformance from '../models/GradePerformance';
import HotnessHistory from '../models/HotnessHistory';
import { getKisToken } from './kisRestApi';
import { acquireKisToken } from './kisRateLimiter';
import { computePerformance, DailyCandle } from './performanceCalc';

const KIS_APP_KEY = process.env.KIS_APP_KEY || '';
const KIS_APP_SECRET = process.env.KIS_APP_SECRET || '';
const KIS_IS_MOCK = process.env.KIS_IS_MOCK === 'true';
const BASE_URL = KIS_IS_MOCK
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443';

function kstTodayStr(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * KIS 기간별 일봉 조회 (FHKST03010100) — 시가/종가, 오름차순 반환
 */
export async function fetchDailyCandles(
    stockCode: string,
    startDate: string, // YYYY-MM-DD
    endDate: string,
): Promise<DailyCandle[]> {
    await acquireKisToken();

    try {
        const token = await getKisToken();
        const response = await axios.get(
            `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    authorization: `Bearer ${token}`,
                    appkey: KIS_APP_KEY,
                    appsecret: KIS_APP_SECRET,
                    tr_id: 'FHKST03010100',
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J',
                    FID_INPUT_ISCD: stockCode,
                    FID_INPUT_DATE_1: startDate.replace(/-/g, ''),
                    FID_INPUT_DATE_2: endDate.replace(/-/g, ''),
                    FID_PERIOD_DIV_CODE: 'D',
                    FID_ORG_ADJ_PRC: '0', // 수정주가
                },
                timeout: 8000,
            },
        );

        if (response.data.rt_cd !== '0') {
            console.error(`일봉 조회 실패 (${stockCode}):`, response.data.msg1);
            return [];
        }

        const rows: any[] = response.data.output2 || [];
        return rows
            .filter(r => r && r.stck_bsop_date)
            .map(r => ({
                date: `${r.stck_bsop_date.slice(0, 4)}-${r.stck_bsop_date.slice(4, 6)}-${r.stck_bsop_date.slice(6, 8)}`,
                open: parseInt(r.stck_oprc) || 0,
                close: parseInt(r.stck_clpr) || 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error: any) {
        console.error(`일봉 조회 에러 (${stockCode}):`, error.response?.data || error.message);
        return [];
    }
}

export interface GradeRecordInput {
    stockCode: string;
    stockName: string;
    grade: string; // S/A만 저장됨
    totalScore: number;
    date: string; // YYYY-MM-DD
}

/**
 * S/A등급 레코드 생성 (이미 있으면 건드리지 않음 — $setOnInsert)
 */
export async function upsertGradeRecords(records: GradeRecordInput[]): Promise<number> {
    let created = 0;
    for (const r of records) {
        if (r.grade !== 'S' && r.grade !== 'A') continue;
        try {
            const result = await GradePerformance.findOneAndUpdate(
                { stockCode: r.stockCode, date: r.date },
                {
                    $setOnInsert: {
                        stockCode: r.stockCode,
                        stockName: r.stockName,
                        grade: r.grade,
                        totalScore: r.totalScore,
                        date: r.date,
                        status: 'pending',
                    },
                },
                { upsert: true, new: false },
            );
            if (!result) created++; // null이면 신규 생성
        } catch {
            // unique index 충돌 무시
        }
    }
    return created;
}

/**
 * 미완성(pending/partial) 레코드를 일봉으로 채움.
 * 종목별로 묶어 일봉 1콜로 해당 종목의 모든 날짜를 처리.
 */
export async function fillPerformanceRecords(): Promise<void> {
    const incomplete = await GradePerformance.find({
        status: { $in: ['pending', 'partial'] },
    }).lean();

    if (incomplete.length === 0) return;

    const byCode = new Map<string, typeof incomplete>();
    for (const rec of incomplete) {
        if (!byCode.has(rec.stockCode)) byCode.set(rec.stockCode, []);
        byCode.get(rec.stockCode)!.push(rec);
    }

    const today = kstTodayStr();
    let updated = 0;

    for (const [code, recs] of byCode) {
        const minDate = recs.map(r => r.date).sort()[0];
        const candles = await fetchDailyCandles(code, minDate, today);
        if (candles.length === 0) continue; // KIS 장애 등 — 다음 배치에서 재시도

        for (const rec of recs) {
            const result = computePerformance(rec.date, candles, today);
            if (result.status === 'pending') continue; // 변화 없음
            await GradePerformance.updateOne({ _id: rec._id }, { $set: result });
            updated++;
        }
    }

    console.log(`📈 성적표 채움 완료: ${updated}개 레코드 (${byCode.size}개 종목 조회)`);
}

/**
 * 컬렉션이 비어 있으면 HotnessHistory 90일치 S/A를 소급 백필 (배포 후 1회)
 */
export async function backfillPerformanceIfEmpty(): Promise<void> {
    const count = await GradePerformance.estimatedDocumentCount();
    if (count > 0) return;

    console.log('📈 성적표 백필 시작 (HotnessHistory 90일치 S/A)...');
    const hist = await HotnessHistory.find({ grade: { $in: ['S', 'A'] } }).lean();
    if (hist.length === 0) {
        console.log('📈 백필할 히스토리 없음');
        return;
    }

    await upsertGradeRecords(
        hist.map(h => ({
            stockCode: h.stockCode,
            stockName: h.stockName,
            grade: h.grade,
            totalScore: h.totalScore,
            date: h.date,
        })),
    );
    await fillPerformanceRecords();
    console.log(`📈 성적표 백필 완료: ${hist.length}개 히스토리 처리`);
}
