import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TEBURN 테마 분석';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: Promise<{ themeName: string }> }) {
    const { themeName } = await params;
    const decoded = decodeURIComponent(themeName);

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>TEBURN</div>
                    <div style={{ fontSize: 16, color: '#6b7280' }}>테마 분석</div>
                </div>

                <div style={{ fontSize: 60, fontWeight: 900, color: '#f0f0f0', letterSpacing: -1, marginBottom: 20 }}>
                    {decoded}
                </div>

                <div style={{ fontSize: 24, color: '#9ca3af' }}>
                    관련 종목 · 실시간 등락률 · 거래량
                </div>
            </div>
        ),
        { ...size },
    );
}
