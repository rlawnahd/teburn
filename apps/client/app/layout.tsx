import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/provider/QueryProvider';
import ThemeProvider from '@/components/ui/ThemeProvider';
import Header from '@/components/layout/Header';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
    title: 'TEBURN - 오늘의 주도주를 찾아라',
    description: '거래대금, 등락률, 거래량, 뉴스, 테마 집중도까지 — 실시간 주도주 분석 서비스',
    openGraph: {
        title: 'TEBURN - 오늘의 주도주를 찾아라',
        description: '거래대금, 등락률, 거래량, 뉴스, 테마 집중도까지 — 실시간 주도주 분석 서비스',
        url: 'https://teburn.com',
        siteName: 'TEBURN',
        locale: 'ko_KR',
        type: 'website',
    },
    verification: {
        other: {
            'naver-site-verification': '72e602ddfe3c7bd2e3b1398dc2a52605edb88a3b',
        },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head>
                <Script
                    async
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8213713469516212"
                    crossOrigin="anonymous"
                    strategy="beforeInteractive"
                />
            </head>
            <body className="antialiased">
                <ThemeProvider>
                    <QueryProvider>
                        <Header />
                        {children}
                    </QueryProvider>
                </ThemeProvider>
                <Analytics />
                <GoogleAnalytics gaId="G-3EZD3GJYNY" />
            </body>
        </html>
    );
}
