import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/provider/QueryProvider';
import ThemeProvider from '@/components/ui/ThemeProvider';
import Header from '@/components/layout/Header';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
    title: 'TEBURN - 지금 타오르는 테마를 찾아라',
    description: '오늘 불붙은 테마를 가장 빠르게, 실시간 테마 주식 모니터링',
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
