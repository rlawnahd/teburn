import type { Metadata } from 'next';
import StockDetailPage from './StockDetailClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type Props = {
    params: Promise<{ stockCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { stockCode } = await params;

    try {
        const res = await fetch(`${API_URL}/stocks/${encodeURIComponent(stockCode)}`, {
            next: { revalidate: 300 },
        });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        const stock = json.data;
        const sign = stock.changeRate > 0 ? '+' : '';
        const title = `${stock.stockName} (${stockCode}) ${stock.currentPrice.toLocaleString()}원 ${sign}${stock.changeRate.toFixed(2)}% | TEBURN`;
        const description = stock.themes.length > 0
            ? `${stock.stockName} 주도주 분석 — 테마: ${stock.themes.slice(0, 3).join(', ')}. 실시간 거래대금·등락률·거래량·뉴스 종합 점수.`
            : `${stock.stockName} 실시간 주도주 점수 분석 | TEBURN`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                url: `https://teburn.com/stocks/${stockCode}`,
                siteName: 'TEBURN',
                locale: 'ko_KR',
                type: 'website',
            },
            twitter: { card: 'summary', title, description },
            alternates: { canonical: `https://teburn.com/stocks/${stockCode}` },
        };
    } catch {
        return {
            title: `종목 분석 | TEBURN`,
            description: '실시간 주도주 분석 서비스',
        };
    }
}

export default function Page() {
    return <StockDetailPage />;
}
