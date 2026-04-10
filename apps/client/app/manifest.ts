import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'TEBURN - 오늘의 주도주를 찾아라',
        short_name: '테번',
        description: '거래대금, 등락률, 거래량, 뉴스, 테마 집중도까지 — 실시간 주도주 분석 서비스',
        start_url: '/',
        display: 'standalone',
        background_color: '#131722',
        theme_color: '#131722',
        orientation: 'portrait',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    };
}
