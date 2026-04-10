import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TEBURN 종목 분석';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default async function OgImage({ params }: { params: Promise<{ stockCode: string }> }) {
    const { stockCode } = await params;

    let stockName = stockCode;
    let price = '';
    let changeRate = 0;
    let grade = '';
    let score = 0;
    let themes: string[] = [];

    try {
        const res = await fetch(`${API_URL}/stocks/${encodeURIComponent(stockCode)}`);
        if (res.ok) {
            const json = await res.json();
            const d = json.data;
            stockName = d.stockName;
            price = d.currentPrice.toLocaleString();
            changeRate = d.changeRate;
            grade = d.hotness?.grade ?? '';
            score = d.hotness?.totalScore ?? 0;
            themes = d.themes?.slice(0, 3) ?? [];
        }
    } catch { /* fallback to defaults */ }

    const isPositive = changeRate > 0;
    const changeColor = isPositive ? '#f23645' : '#2962ff';
    const gradeColors: Record<string, string> = {
        S: '#ef4444', A: '#f97316', B: '#787b86', C: '#2962ff', D: '#a3a6af',
    };

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '60px 80px',
                    background: 'linear-gradient(135deg, #0f1629 0%, #131722 50%, #1a1f2e 100%)',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>TEBURN</div>
                    <div style={{ fontSize: 16, color: '#6b7280' }}>주도주 분석</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 56, fontWeight: 900, color: '#f0f0f0', letterSpacing: -1 }}>
                        {stockName}
                    </div>
                    {grade && (
                        <div
                            style={{
                                fontSize: 28,
                                fontWeight: 900,
                                color: '#fff',
                                background: gradeColors[grade] ?? '#787b86',
                                padding: '4px 14px',
                                borderRadius: 8,
                            }}
                        >
                            {grade}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginBottom: 24 }}>
                    {price && (
                        <div style={{ fontSize: 40, fontWeight: 700, color: '#f0f0f0' }}>
                            {price}원
                        </div>
                    )}
                    <div style={{ fontSize: 32, fontWeight: 700, color: changeColor }}>
                        {isPositive ? '+' : ''}{changeRate.toFixed(2)}%
                    </div>
                    {score > 0 && (
                        <div style={{ fontSize: 24, color: '#9ca3af' }}>
                            점수 {score.toFixed(0)}점
                        </div>
                    )}
                </div>

                {themes.length > 0 && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        {themes.map((t) => (
                            <div
                                key={t}
                                style={{
                                    fontSize: 18,
                                    color: '#93c5fd',
                                    background: 'rgba(41,98,255,0.15)',
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                }}
                            >
                                {t}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ),
        { ...size },
    );
}
