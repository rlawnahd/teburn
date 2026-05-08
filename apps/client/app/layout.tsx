import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import QueryProvider from '@/components/provider/QueryProvider';
import ThemeProvider from '@/components/ui/ThemeProvider';
import AuthProvider from '@/lib/auth/AuthProvider';
import RealtimeProvider from '@/components/provider/RealtimeProvider';
import AuthLayout from '@/components/layout/AuthLayout';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
    title: 'TEBURN - 오늘의 주도주 실시간 순위',
    description: '오늘의 주도주 TOP 10을 실시간으로. 거래대금, 등락률, 거래량, 뉴스, 테마 집중도 5가지 지표로 주도주를 분석합니다. 무료 주도주 랭킹 서비스.',
    openGraph: {
        title: 'TEBURN - 오늘의 주도주 실시간 순위',
        description: '오늘의 주도주 TOP 10을 실시간으로. 거래대금, 등락률, 거래량, 뉴스, 테마 집중도 5가지 지표로 주도주를 분석합니다.',
        url: 'https://teburn.com',
        siteName: 'TEBURN',
        locale: 'ko_KR',
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: 'TEBURN - 오늘의 주도주 실시간 순위',
        description: '오늘의 주도주 TOP 10을 실시간으로. 거래대금, 등락률, 거래량, 뉴스, 테마 집중도 5가지 지표로 주도주를 분석합니다.',
    },
    alternates: {
        canonical: 'https://teburn.com',
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
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <link rel="apple-touch-icon" href="/icon-192.png" />
                <link
                    rel="stylesheet"
                    as="style"
                    crossOrigin="anonymous"
                    href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
                />
            </head>
            <body className="antialiased">
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebApplication',
                        name: 'TEBURN',
                        url: 'https://teburn.com',
                        description: '거래대금, 등락률, 거래량, 뉴스, 테마 집중도까지 — 실시간 주도주 분석 서비스',
                        applicationCategory: 'FinanceApplication',
                        operatingSystem: 'Web',
                        inLanguage: 'ko',
                        offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
                        publisher: { '@type': 'Organization', name: 'TEBURN', url: 'https://teburn.com' },
                    }) }}
                />
                {/* 카카오톡/네이버/인스타 인앱 브라우저 → 외부 브라우저로 리다이렉트 */}
                <Script id="inapp-bounce" strategy="beforeInteractive">{`
(function(){
  var ua = navigator.userAgent || '';
  if (/KAKAOTALK|NAVER|Instagram|FB_IAB|FBAN|Line\\//i.test(ua)) {
    var url = location.href;
    if (/iPhone|iPad/i.test(ua)) {
      location.href = 'x-safari-' + url;
      setTimeout(function(){ location.href = url; }, 300);
    } else {
      location.href = 'intent://' + url.replace(/https?:\\/\\//, '') +
        '#Intent;scheme=https;package=com.android.chrome;end';
    }
  }
})();
`}</Script>
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
                        <AuthLayout>
                            {children}
                        </AuthLayout>
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
                <Script id="sw-register" strategy="afterInteractive">{`
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}
`}</Script>
                <Analytics />
                <GoogleAnalytics gaId="G-MMMVGBL8ZP" />
            </body>
        </html>
    );
}
