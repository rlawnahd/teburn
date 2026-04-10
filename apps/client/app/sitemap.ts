import type { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function fetchDynamicUrls(): Promise<MetadataRoute.Sitemap> {
    const urls: MetadataRoute.Sitemap = [];
    try {
        // 주도주 TOP 종목
        const hotRes = await fetch(`${API_URL}/leading/hot?limit=30`, { next: { revalidate: 3600 } });
        if (hotRes.ok) {
            const hotJson = await hotRes.json();
            const stocks: { stockCode: string }[] = hotJson.data?.stocks ?? [];
            for (const s of stocks) {
                urls.push({
                    url: `https://teburn.com/stocks/${s.stockCode}`,
                    lastModified: new Date(),
                    changeFrequency: 'daily',
                    priority: 0.7,
                });
            }
        }
    } catch { /* API down → 정적 URL만 */ }

    try {
        // 테마 목록
        const themeRes = await fetch(`${API_URL}/themes`, { next: { revalidate: 3600 } });
        if (themeRes.ok) {
            const themeJson = await themeRes.json();
            const themes: { name: string }[] = themeJson.data?.themes ?? [];
            for (const t of themes) {
                urls.push({
                    url: `https://teburn.com/themes/${encodeURIComponent(t.name)}`,
                    lastModified: new Date(),
                    changeFrequency: 'daily',
                    priority: 0.6,
                });
            }
        }
    } catch { /* API down → 정적 URL만 */ }

    return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticUrls: MetadataRoute.Sitemap = [
        { url: 'https://teburn.com', lastModified: new Date(), changeFrequency: 'always', priority: 1 },
        { url: 'https://teburn.com/?tab=hot', lastModified: new Date(), changeFrequency: 'always', priority: 0.9 },
        { url: 'https://teburn.com/?tab=stocks', lastModified: new Date(), changeFrequency: 'always', priority: 0.8 },
        { url: 'https://teburn.com/?tab=sectors', lastModified: new Date(), changeFrequency: 'always', priority: 0.8 },
        { url: 'https://teburn.com/terms', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
        { url: 'https://teburn.com/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
        { url: 'https://teburn.com/guide', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
        { url: 'https://teburn.com/faq', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
        { url: 'https://teburn.com/articles', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
        { url: 'https://teburn.com/articles/what-is-leading-stock', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: 'https://teburn.com/articles/how-hotness-score-works', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: 'https://teburn.com/articles/theme-investing-basics', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: 'https://teburn.com/articles/volume-surge-meaning', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: 'https://teburn.com/articles/how-to-use-teburn', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ];

    const dynamicUrls = await fetchDynamicUrls();
    return [...staticUrls, ...dynamicUrls];
}
