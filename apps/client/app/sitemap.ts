import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://teburn.com',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 1,
        },
        {
            url: 'https://teburn.com/?tab=hot',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.9,
        },
        {
            url: 'https://teburn.com/?tab=stocks',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.8,
        },
        {
            url: 'https://teburn.com/?tab=sectors',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.8,
        },
        {
            url: 'https://teburn.com/news',
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 0.7,
        },
        {
            url: 'https://teburn.com/terms',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.4,
        },
        {
            url: 'https://teburn.com/about',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: 'https://teburn.com/guide',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: 'https://teburn.com/faq',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: 'https://teburn.com/articles',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: 'https://teburn.com/articles/what-is-leading-stock',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: 'https://teburn.com/articles/how-hotness-score-works',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: 'https://teburn.com/articles/theme-investing-basics',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: 'https://teburn.com/articles/volume-surge-meaning',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: 'https://teburn.com/articles/how-to-use-teburn',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];
}
