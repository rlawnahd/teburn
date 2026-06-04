import mongoose, { Document, Schema } from 'mongoose';

export type PerformanceStatus = 'pending' | 'partial' | 'complete' | 'excluded';

export interface IGradePerformance extends Document {
    stockCode: string;
    stockName: string;
    grade: 'S' | 'A';
    totalScore: number;
    date: string; // 등급일 D (YYYY-MM-DD)
    entryPrice: number | null;  // D+1 거래일 시가
    d1Close: number | null;     // D+1 거래일 종가
    d5Close: number | null;     // 진입일 포함 5거래일째 종가
    returnD1: number | null;    // %
    returnD5: number | null;    // %
    status: PerformanceStatus;
    createdAt: Date;
}

const GradePerformanceSchema: Schema = new Schema({
    stockCode: { type: String, required: true },
    stockName: { type: String, required: true },
    grade: { type: String, enum: ['S', 'A'], required: true },
    totalScore: { type: Number, required: true },
    date: { type: String, required: true },
    entryPrice: { type: Number, default: null },
    d1Close: { type: Number, default: null },
    d5Close: { type: Number, default: null },
    returnD1: { type: Number, default: null },
    returnD5: { type: Number, default: null },
    status: {
        type: String,
        enum: ['pending', 'partial', 'complete', 'excluded'],
        default: 'pending',
    },
    createdAt: { type: Date, default: Date.now },
});

// 종목별 날짜 유니크 (하루에 한 번만)
GradePerformanceSchema.index({ stockCode: 1, date: 1 }, { unique: true });
// 날짜 범위 조회 최적화 (summary/daily API)
GradePerformanceSchema.index({ date: -1 });

export default mongoose.model<IGradePerformance>('GradePerformance', GradePerformanceSchema);
