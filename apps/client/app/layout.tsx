import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/provider/QueryProvider';
import ThemeProvider from '@/components/ui/ThemeProvider';

export const metadata: Metadata = {
    title: 'StockLight',
    description: 'AI 기반 주식 뉴스 분석 대시보드',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head>
                <link
                    rel="stylesheet"
                    as="style"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
                />
            </head>
            <body className="antialiased">
                <ThemeProvider>
                    <QueryProvider>{children}</QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
