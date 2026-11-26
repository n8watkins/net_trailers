/**
 * The content ratings of a show, as Child Safety Mode reads them
 * (utils/childSafetyRule.ts decides what they mean).
 *
 * One lookup per show: TMDB's /tv/{id}/content_ratings. Cached the same way as
 * movie certifications (utils/movieCertifications.ts): Next's data cache across
 * isolates, this isolate's memory by show id, one request for concurrent
 * lookups of the same show, and never a failed lookup.
 */

import { certificationCache } from './certificationCache'
import type { CountryRating } from './childSafetyRule'

export type ContentRating = CountryRating

/** How long TMDB's content_ratings answer is reused across isolates (seconds). */
const LOOKUP_REVALIDATE_SECONDS = 6 * 60 * 60

const inFlight = new Map<number, Promise<ContentRating[] | null>>()

async function lookUp(tvId: number, apiKey: string): Promise<ContentRating[] | null> {
    try {
        const url = `https://api.themoviedb.org/3/tv/${tvId}/content_ratings?api_key=${apiKey}`
        const response = await fetch(url, { next: { revalidate: LOOKUP_REVALIDATE_SECONDS } })
        if (!response.ok) return null
        const data = (await response.json()) as { results?: ContentRating[] }
        const ratings = Array.isArray(data.results) ? data.results : []
        certificationCache.setTV(tvId, ratings)
        return ratings
    } catch {
        return null
    }
}

/**
 * A show's content ratings in every country ([] when TMDB has none), or null
 * when they could not be looked up.
 */
export async function fetchTVContentRatings(
    tvId: number,
    apiKey: string
): Promise<ContentRating[] | null> {
    const cached = certificationCache.getTV(tvId)
    if (cached !== undefined) return cached
    const pending = inFlight.get(tvId)
    if (pending) return pending
    const lookup = lookUp(tvId, apiKey).finally(() => inFlight.delete(tvId))
    inFlight.set(tvId, lookup)
    return lookup
}
