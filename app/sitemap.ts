import { MetadataRoute } from 'next'

const BASE_URL = 'https://net-trailers.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
    const currentDate = new Date().toISOString()

    // Static public pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/search`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/smartsearch`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/community`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/community/rankings`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/community/threads`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/community/polls`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/community/forums`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/changelog`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/privacy`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${BASE_URL}/terms`,
            lastModified: currentDate,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ]

    // Note: Dynamic pages like /rankings/[id], /users/[userId], etc.
    // could be added here by fetching from Firestore, but that would
    // require database access at build time. For now, we only include
    // static routes. Search engines will discover dynamic pages through
    // internal links.

    return staticPages
}
