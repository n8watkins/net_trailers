/**
 * Server-side data fetching utilities for Next.js Server Components
 * These functions fetch data from TMDB API on the server
 */

import { Content } from '../typings'
import { selfFetch } from './selfFetch'
import { getChildSafetyMode } from './childSafetyCookieServer'
import { dedupeAndRandomize } from '../utils/contentDeduplication'

export interface HomeData {
    /** Trending movies and TV, deduplicated and shuffled. The home rows load their own data. */
    trending: Content[]
}

/**
 * Data the home page needs on the server: just the trending titles for the hero.
 * Every row below the hero fetches its own data on the client, so fetching
 * top-rated and four genre pairs here (as before) only made the HTML 240 kB
 * larger and the first byte slower.
 */
export async function fetchHomeData(): Promise<HomeData> {
    const childSafetyEnabled = await getChildSafetyMode()
    const childSafetyParam = childSafetyEnabled ? 'childSafetyMode=true' : ''

    const responses = await Promise.all([
        selfFetch(`/api/movies/trending?${childSafetyParam}`),
        selfFetch(`/api/tv/trending?${childSafetyParam}`),
    ])
    for (const response of responses) {
        if (!response.ok) {
            throw new Error(`Failed to fetch trending: ${response.status} ${response.statusText}`)
        }
    }
    const [movieTrendingData, tvTrendingData] = await Promise.all(responses.map((r) => r.json()))

    return {
        trending: dedupeAndRandomize([
            ...(movieTrendingData.results || []),
            ...(tvTrendingData.results || []),
        ]),
    }
}
