/**
 * Server-side data fetching utilities for Next.js Server Components
 * These functions fetch data from TMDB API on the server
 */

import { Content } from '../typings'
import { getChildSafetyMode } from './childSafetyCookieServer'
import {
    deduplicateContent,
    randomizeArray,
    dedupeAndRandomize,
} from '../utils/contentDeduplication'

const API_KEY = process.env.TMDB_API_KEY

/**
 * Get the base URL for internal API calls
 * Uses Vercel URL in production, localhost in development
 */
function getBaseUrl(): string {
    // In production on Vercel, use the deployment URL
    // VERCEL_PROJECT_PRODUCTION_URL is more stable for production deployments
    // VERCEL_URL works for both production and preview deployments
    if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    }
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
    genre4: Content[] // Romance+Drama (movies) | Animation (TV)
    documentaries: Content[]
}

/**
 * Fetch home page data on the server
 * Always fetches mixed content (movies + TV shows)
 * @returns Home page data with all content categories
 */
export async function fetchHomeData(): Promise<HomeData> {
    if (!API_KEY) {
        throw new Error('TMDB API key not configured')
    }

    const childSafetyEnabled = await getChildSafetyMode()
    const childSafetyParam = childSafetyEnabled ? 'childSafetyMode=true' : ''
    const baseUrl = getBaseUrl()

    // Always fetch mixed content (both movies and TV shows)
    // In child safety mode, use family-friendly genres only
    const fetchPromises: Promise<Response>[] = childSafetyEnabled
        ? [
              // Fetch both movie and TV trending
              fetch(`${baseUrl}/api/movies/trending?${childSafetyParam}`),
              fetch(`${baseUrl}/api/tv/trending?${childSafetyParam}`),
              // Fetch both movie and TV top rated
              fetch(`${baseUrl}/api/movies/top-rated?page=1&${childSafetyParam}`),
              fetch(`${baseUrl}/api/tv/top-rated?page=1&${childSafetyParam}`),
              // Mixed genres - Animation (movies + TV)
              fetch(`${baseUrl}/api/genres/movie/16?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/16?${childSafetyParam}`),
              // Mixed genres - Family/Comedy (movies + TV)
              fetch(`${baseUrl}/api/genres/movie/10751?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/35?${childSafetyParam}`),
              // Mixed genres - Adventure (movies + TV Action & Adventure)
              fetch(`${baseUrl}/api/genres/movie/12?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/10759?${childSafetyParam}`),
              // Mixed genres - Romance+Drama (movies) + Sci-Fi & Fantasy (TV)
              fetch(`${baseUrl}/api/genres/movie/10749,18?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/10765?${childSafetyParam}`),
              // Documentary (both)
              fetch(`${baseUrl}/api/genres/movie/99?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/99?${childSafetyParam}`),
          ]
        : [
              // Fetch both movie and TV trending
              fetch(`${baseUrl}/api/movies/trending?${childSafetyParam}`),
              fetch(`${baseUrl}/api/tv/trending?${childSafetyParam}`),
              // Fetch both movie and TV top rated
              fetch(`${baseUrl}/api/movies/top-rated?page=1&${childSafetyParam}`),
              fetch(`${baseUrl}/api/tv/top-rated?page=1&${childSafetyParam}`),
              // Mixed genres - Action (movies + TV Action & Adventure)
              fetch(`${baseUrl}/api/genres/movie/28?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/10759?${childSafetyParam}`),
              // Mixed genres - Comedy (both)
              fetch(`${baseUrl}/api/genres/movie/35?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/35?${childSafetyParam}`),
              // Mixed genres - Horror (movies) + Sci-Fi & Fantasy (TV)
              fetch(`${baseUrl}/api/genres/movie/27?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/10765?${childSafetyParam}`),
              // Mixed genres - Romance+Drama (movies) + Animation (TV)
              fetch(`${baseUrl}/api/genres/movie/10749,18?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/16?${childSafetyParam}`),
              // Documentary (both)
              fetch(`${baseUrl}/api/genres/movie/99?${childSafetyParam}`),
              fetch(`${baseUrl}/api/genres/tv/99?${childSafetyParam}`),
          ]

    const responses = await Promise.all(fetchPromises)

    // Check if all responses are ok and log which endpoint failed
    for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
            const failedUrl = responses[i].url
            const status = responses[i].status
            console.error(`Failed to fetch from ${failedUrl}: ${status}`)
            throw new Error(
                `Failed to fetch content from ${failedUrl}: ${status} ${responses[i].statusText}`
            )
        }
    }

    const jsonData = await Promise.all(responses.map((r) => r.json()))

    // Process mixed content (movies + TV) - pairs of results
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
