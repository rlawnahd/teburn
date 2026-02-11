import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/provider/QueryProvider';
import ThemeProvider from '@/components/ui/ThemeProvider';
import Header from '@/components/layout/Header';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
    title: 'TEBURN - 오늘의 주도주를 찾아라',
    description: '거래대금, 등락률, 거래량, 뉴스, 테마 집중도까지 — 실시간 주도주 분석 서비스',
    verification: {
        other: {
            'naver-site-verification': 'c2743785cd38a455bdd975b9a7e56b8fa202a3dd',
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
