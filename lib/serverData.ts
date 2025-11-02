/**
 * Server-side data fetching utilities for Next.js Server Components
 * These functions fetch data from TMDB API on the server
 */

import { Content } from '../typings'
import { getChildSafetyMode } from './childSafetyCookieServer'

const API_KEY = process.env.TMDB_API_KEY

/**
 * Get the base URL for internal API calls
 * Uses Vercel URL in production, localhost in development
 */
function getBaseUrl(): string {
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
    }
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

export interface HomeData {
    trending: Content[]
    topRated: Content[]
    genre1: Content[] // Action (movies) | Action & Adventure (TV)
    genre2: Content[] // Comedy (both)
    genre3: Content[] // Horror (movies) | Sci-Fi & Fantasy (TV)
    genre4: Content[] // Animation (both)
    documentaries: Content[]
}

/**
 * Helper to deduplicate content by media_type and id
 * Prevents duplicate keys in React rendering
 */
function deduplicateContent(content: Content[]): Content[] {
    const seen = new Set<string>()
    return content.filter((item) => {
        const key = `${item.media_type || 'unknown'}-${item.id}`
        if (seen.has(key)) {
            return false
        }
        seen.add(key)
        return true
    })
}

/**
 * Helper to randomize array (Fisher-Yates shuffle)
 */
function randomizeArray<T>(arr: T[]): T[] {
    const shuffled = [...arr]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

/**
 * Helper to deduplicate and randomize content
 */
function dedupeAndRandomize(content: Content[]): Content[] {
    return randomizeArray(deduplicateContent(content))
}

/**
 * Fetch home page data on the server
 * @param filter - Content filter: 'movies' | 'tv' | undefined (all)
 * @returns Home page data with all content categories
 */
export async function fetchHomeData(filter?: string): Promise<HomeData> {
    if (!API_KEY) {
        throw new Error('TMDB API key not configured')
    }

    const childSafetyEnabled = await getChildSafetyMode()
    const childSafetyParam = childSafetyEnabled ? 'childSafetyMode=true' : ''
    const baseUrl = getBaseUrl()

    let fetchPromises: Promise<Response>[]

    if (filter === 'tv') {
        // Fetch TV-specific content
        fetchPromises = [
            fetch(`${baseUrl}/api/tv/trending?${childSafetyParam}`, {
                cache: 'no-store',
            }),
            fetch(`${baseUrl}/api/tv/top-rated?page=1&${childSafetyParam}`, { cache: 'no-store' }),
            fetch(`${baseUrl}/api/tv/top-rated?page=2&${childSafetyParam}`, { cache: 'no-store' }),
            fetch(`${baseUrl}/api/genres/tv/10759?${childSafetyParam}`, {
                cache: 'no-store',
            }), // Action & Adventure
            fetch(`${baseUrl}/api/genres/tv/35?${childSafetyParam}`, {
                cache: 'no-store',
            }), // Comedy
            fetch(`${baseUrl}/api/genres/tv/10765?${childSafetyParam}`, {
                cache: 'no-store',
            }), // Sci-Fi & Fantasy
            fetch(`${baseUrl}/api/genres/tv/16?${childSafetyParam}`, {
                cache: 'no-store',
            }), // Animation
            fetch(`${baseUrl}/api/genres/tv/99?${childSafetyParam}`, {
                cache: 'no-store',
            }), // Documentary
        ]
    } else if (filter === 'movies') {
        // Fetch movie-specific content
        // In child safety mode, use family-friendly genres only
        if (childSafetyEnabled) {
            fetchPromises = [
                fetch(`${baseUrl}/api/movies/trending?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/movies/top-rated?page=1&${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                fetch(`${baseUrl}/api/movies/top-rated?page=2&${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                fetch(`${baseUrl}/api/genres/movie/16?${childSafetyParam}`, { cache: 'no-store' }), // Animation
                fetch(`${baseUrl}/api/genres/movie/10751?${childSafetyParam}`, {
                    cache: 'no-store',
                }), // Family
                fetch(`${baseUrl}/api/genres/movie/12?${childSafetyParam}`, { cache: 'no-store' }), // Adventure
                fetch(`${baseUrl}/api/genres/movie/14?${childSafetyParam}`, { cache: 'no-store' }), // Fantasy
                fetch(`${baseUrl}/api/genres/movie/99?${childSafetyParam}`, { cache: 'no-store' }), // Documentary
            ]
        } else {
            fetchPromises = [
                fetch(`${baseUrl}/api/movies/trending?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/movies/top-rated?page=1&${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                fetch(`${baseUrl}/api/movies/top-rated?page=2&${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                fetch(`${baseUrl}/api/genres/movie/28?${childSafetyParam}`, { cache: 'no-store' }), // Action
                fetch(`${baseUrl}/api/genres/movie/35?${childSafetyParam}`, { cache: 'no-store' }), // Comedy
                fetch(`${baseUrl}/api/genres/movie/27?${childSafetyParam}`, { cache: 'no-store' }), // Horror
                fetch(`${baseUrl}/api/genres/movie/10749?${childSafetyParam}`, {
                    cache: 'no-store',
                }), // Romance
                fetch(`${baseUrl}/api/genres/movie/99?${childSafetyParam}`, { cache: 'no-store' }), // Documentary
            ]
        }
    } else {
        // Default mixed content (both movies and TV shows)
        // In child safety mode, use family-friendly genres only
        if (childSafetyEnabled) {
            fetchPromises = [
                // Fetch both movie and TV trending
                fetch(`${baseUrl}/api/movies/trending?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/tv/trending?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                // Fetch both movie and TV top rated
                fetch(`${baseUrl}/api/movies/top-rated?page=1&${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                fetch(`${baseUrl}/api/tv/top-rated?page=1&${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                // Mixed genres - Animation (movies + TV)
                fetch(`${baseUrl}/api/genres/movie/16?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/genres/tv/16?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                // Mixed genres - Family/Comedy (movies + TV)
                fetch(`${baseUrl}/api/genres/movie/10751?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                fetch(`${baseUrl}/api/genres/tv/35?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                // Mixed genres - Adventure (movies + TV Action & Adventure)
                fetch(`${baseUrl}/api/genres/movie/12?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/genres/tv/10759?${childSafetyParam}`, { cache: 'no-store' }),
                // Mixed genres - Fantasy (movies + TV Sci-Fi & Fantasy)
                fetch(`${baseUrl}/api/genres/movie/14?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/genres/tv/10765?${childSafetyParam}`, { cache: 'no-store' }),
                // Documentary (both)
                fetch(`${baseUrl}/api/genres/movie/99?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/genres/tv/99?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
            ]
        } else {
            fetchPromises = [
                // Fetch both movie and TV trending
                fetch(`${baseUrl}/api/movies/trending?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/tv/trending?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                // Fetch both movie and TV top rated
                fetch(`${baseUrl}/api/movies/top-rated?page=1&${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                fetch(`${baseUrl}/api/tv/top-rated?page=1&${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                // Mixed genres - Action (movies + TV Action & Adventure)
                fetch(`${baseUrl}/api/genres/movie/28?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/genres/tv/10759?${childSafetyParam}`, { cache: 'no-store' }),
                // Mixed genres - Comedy (both)
                fetch(`${baseUrl}/api/genres/movie/35?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/genres/tv/35?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                // Mixed genres - Horror (movies) + Sci-Fi & Fantasy (TV)
                fetch(`${baseUrl}/api/genres/movie/27?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/genres/tv/10765?${childSafetyParam}`, { cache: 'no-store' }),
                // Mixed genres - Animation (movies + TV)
                fetch(`${baseUrl}/api/genres/movie/16?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                fetch(`${baseUrl}/api/genres/tv/16?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
                // Documentary (both)
                fetch(`${baseUrl}/api/genres/movie/99?${childSafetyParam}`, { cache: 'no-store' }),
                fetch(`${baseUrl}/api/genres/tv/99?${childSafetyParam}`, {
                    cache: 'no-store',
                }),
            ]
        }
    }

    const responses = await Promise.all(fetchPromises)

    // Check if all responses are ok
    const failedResponse = responses.find((r) => !r.ok)
    if (failedResponse) {
        throw new Error(`Failed to fetch content: ${failedResponse.status}`)
    }

    const jsonData = await Promise.all(responses.map((r) => r.json()))

    // Process data based on filter type
    if (filter === 'tv' || filter === 'movies') {
        // Single content type (existing behavior)
        const [
            trendingData,
            topRated1Data,
            topRated2Data,
            actionData,
            comedyData,
            horrorData,
            romanceData,
            documentariesData,
        ] = jsonData

        return {
            trending: dedupeAndRandomize(trendingData.results || []),
            topRated: dedupeAndRandomize([
                ...(topRated1Data.results || []),
                ...(topRated2Data.results || []),
            ]),
            genre1: dedupeAndRandomize(actionData.results || []),
            genre2: dedupeAndRandomize(comedyData.results || []),
            genre3: dedupeAndRandomize(horrorData.results || []),
            genre4: dedupeAndRandomize(romanceData.results || []),
            documentaries: dedupeAndRandomize(documentariesData.results || []),
        }
    } else {
        // Mixed content (movies + TV) - pairs of results
        const [
            movieTrendingData,
            tvTrendingData,
            movieTopRatedData,
            tvTopRatedData,
            genre1MovieData,
            genre1TvData,
            genre2MovieData,
            genre2TvData,
            genre3MovieData,
            genre3TvData,
            genre4MovieData,
            genre4TvData,
            movieDocData,
            tvDocData,
        ] = jsonData

        return {
            trending: dedupeAndRandomize([
                ...(movieTrendingData.results || []),
                ...(tvTrendingData.results || []),
            ]),
            topRated: dedupeAndRandomize([
                ...(movieTopRatedData.results || []),
                ...(tvTopRatedData.results || []),
            ]),
            genre1: dedupeAndRandomize([
                ...(genre1MovieData.results || []),
                ...(genre1TvData.results || []),
            ]),
            genre2: dedupeAndRandomize([
                ...(genre2MovieData.results || []),
                ...(genre2TvData.results || []),
            ]),
            genre3: dedupeAndRandomize([
                ...(genre3MovieData.results || []),
                ...(genre3TvData.results || []),
            ]),
            genre4: dedupeAndRandomize([
                ...(genre4MovieData.results || []),
                ...(genre4TvData.results || []),
            ]),
            documentaries: dedupeAndRandomize([
                ...(movieDocData.results || []),
                ...(tvDocData.results || []),
            ]),
        }
    }
}
