// apps/server/src/models/Theme.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IThemeStock {
    name: string;       // 종목명
    code: string;       // 종목코드
}

export interface ITheme extends Document {
    name: string;                   // 테마명
    naverCode: string;              // 네이버 테마 코드
    stocks: IThemeStock[];          // 관련 종목 목록
    keywords: string[];             // 관련 키워드 (커스텀 추가 가능)
    isCustom: boolean;              // 커스텀 테마 여부
    isActive: boolean;              // 활성화 여부
    lastCrawledAt: Date;            // 마지막 크롤링 시간
    createdAt: Date;
    updatedAt: Date;
}

const ThemeStockSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String, default: '' },  // JSON 마이그레이션 시 코드가 없을 수 있음
}, { _id: false });

const ThemeSchema: Schema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        naverCode: { type: String, default: '' },
        stocks: [ThemeStockSchema],
        keywords: [{ type: String }],
        isCustom: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        lastCrawledAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

// 인덱스
ThemeSchema.index({ name: 1 });
ThemeSchema.index({ naverCode: 1 });
ThemeSchema.index({ isActive: 1 });

export default mongoose.model<ITheme>('Theme', ThemeSchema);
