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
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WLVG6WBJ');`,
                    }}
                />
                <script
                    async
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8213713469516212"
                    crossOrigin="anonymous"
                />
            </head>
            <body className="antialiased">
                <noscript>
                    <iframe
                        src="https://www.googletagmanager.com/ns.html?id=GTM-WLVG6WBJ"
                        height="0"
                        width="0"
                        style={{ display: 'none', visibility: 'hidden' }}
                    />
                </noscript>
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
