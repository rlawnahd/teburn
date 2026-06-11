import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TEBURN - 실시간 주도주 분석';
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
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    padding: '0 100px',
                    background: '#09090b',
                    backgroundImage:
                        'radial-gradient(circle at 85% 15%, rgba(249,115,22,0.18) 0%, rgba(9,9,11,0) 45%)',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
                    <div
                        style={{
                            fontSize: 76,
                            fontWeight: 900,
                            color: '#fafafa',
                            letterSpacing: -3,
                        }}
                    >
                        TEBURN
                    </div>
                    <div
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: 16,
                            background: '#f97316',
                            marginTop: 18,
                        }}
                    />
                </div>

                <div
                    style={{
                        display: 'flex',
                        fontSize: 52,
                        fontWeight: 800,
                        color: '#fafafa',
                        letterSpacing: -1,
                        marginBottom: 20,
                    }}
                >
                    실시간{' '}
                    <span style={{ color: '#f97316', marginLeft: 16 }}>주도주</span> 분석
                </div>

                <div style={{ display: 'flex', fontSize: 26, color: '#a1a1aa', lineHeight: 1.5 }}>
                    돈이 몰리는 종목을 실시간으로 — 거래대금 · 등락률 · 거래량 · 뉴스 · 테마 집중도
                </div>
            </div>
        ),
        { ...size },
    );
}
