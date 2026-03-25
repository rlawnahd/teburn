import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import QueryProvider from '@/components/provider/QueryProvider';
import ThemeProvider from '@/components/ui/ThemeProvider';
import AuthProvider from '@/lib/auth/AuthProvider';
import RealtimeProvider from '@/components/provider/RealtimeProvider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import KakaoAdFit from '@/components/ad/KakaoAdFit';
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
                <link
                    rel="stylesheet"
                    as="style"
                    crossOrigin="anonymous"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
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
                    <AuthProvider>
                    <QueryProvider>
                    <RealtimeProvider>
                        <Header />
                        {children}
                        {/* 데스크톱: 오른쪽 여백에 고정 광고 (콘텐츠 중앙 정렬 유지) */}
                        <aside className="hidden xl:block fixed right-4 top-16 z-10">
                            <KakaoAdFit adUnit="DAN-wGcNGCgZbNV7h6Oa" width={160} height={600} />
                        </aside>
                        {/* 모바일 하단 광고 */}
                        <div className="xl:hidden flex justify-center py-4">
                            <KakaoAdFit adUnit="DAN-2f3e80wfJpcTWx5H" width={320} height={100} />
                        </div>
                        <Footer />
                    </RealtimeProvider>
                    </QueryProvider>
                    </AuthProvider>
                </ThemeProvider>
                <Script id="gtm" strategy="afterInteractive">
                    {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WLVG6WBJ');`}
                </Script>
                <Script
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8213713469516212"
                    strategy="afterInteractive"
                    crossOrigin="anonymous"
                />
                <Analytics />
                <GoogleAnalytics gaId="G-MMMVGBL8ZP" />
            </body>
        </html>
    );
}
