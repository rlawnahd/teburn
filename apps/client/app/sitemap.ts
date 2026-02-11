import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://tevurn.com',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 1,
        },
        {
            url: 'https://tevurn.com/?tab=hot',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.9,
        },
        {
            url: 'https://tevurn.com/?tab=stocks',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.8,
        },
        {
            url: 'https://tevurn.com/?tab=sectors',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.8,
        },
        {
            url: 'https://tevurn.com/news',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.7,
        },
    ];
}
