import type { Metadata } from 'next';
import ThemeDetailPage from './ThemeDetailClient';

type Props = {
    params: Promise<{ themeName: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { themeName } = await params;
    const decoded = decodeURIComponent(themeName);
    const title = `${decoded} 테마 — 종목 목록 & 등락률 | TEBURN`;
    const description = `${decoded} 테마 관련 종목들의 실시간 가격, 등락률, 거래량을 확인하세요.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `https://teburn.com/themes/${themeName}`,
            siteName: 'TEBURN',
            locale: 'ko_KR',
            type: 'website',
        },
        twitter: { card: 'summary', title, description },
        alternates: { canonical: `https://teburn.com/themes/${themeName}` },
    };
}

export default function Page() {
    return <ThemeDetailPage />;
}
