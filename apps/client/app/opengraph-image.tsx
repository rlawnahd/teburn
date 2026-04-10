import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TEBURN - 오늘의 주도주를 찾아라';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0f1629 0%, #131722 50%, #1a1f2e 100%)',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{ fontSize: 64, fontWeight: 900, color: '#ef4444', letterSpacing: -2 }}>TEBURN</div>
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#f0f0f0', marginBottom: 12 }}>
                    돈이 몰리는 종목을 실시간으로
                </div>
                <div style={{ fontSize: 20, color: '#9ca3af' }}>
                    거래대금 · 등락률 · 거래량 · 뉴스 · 테마 집중도
                </div>
            </div>
        ),
        { ...size },
    );
}
