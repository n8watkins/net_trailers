/**
 * The US certifications of a movie, as Child Safety Mode reads them
 * (utils/childSafetyRule.ts decides what they mean).
 *
 * One lookup per movie: TMDB's /movie/{id}/release_dates. Answers are kept in
 * Next's data cache (shared by every Worker isolate, keyed by the URL) and in
 * this isolate's memory (utils/certificationCache.ts, keyed by movie id);
 * concurrent lookups of the same movie share one request. A failed lookup is
 * never cached, so a rate limit hides the title for one request only.
 */

import { certificationCache } from './certificationCache'

interface UsReleaseDate {
    certification?: string
}

interface CountryReleaseDates {
    iso_3166_1: string
    release_dates?: UsReleaseDate[]
}

/** How long TMDB's release_dates answer is reused across isolates (seconds). */
const LOOKUP_REVALIDATE_SECONDS = 6 * 60 * 60

/**
 * Every non-blank US certification in a movie's release dates, in TMDB's
 * order (a premiere usually has none and is skipped).
 */
export function usCertificationsFrom(
    results: readonly CountryReleaseDates[] | undefined
): string[] {
    const us = (results ?? []).filter((r) => r && r.iso_3166_1 === 'US')
    const certifications = us.flatMap((r) =>
        (r.release_dates ?? []).map((d) => (d?.certification ?? '').trim())
    )
    return certifications.filter((c) => c !== '')
}

const inFlight = new Map<number, Promise<string[] | null>>()

async function lookUp(movieId: number, apiKey: string): Promise<string[] | null> {
    try {
        const url = `https://api.themoviedb.org/3/movie/${movieId}/release_dates?api_key=${apiKey}`
        const response = await fetch(url, { next: { revalidate: LOOKUP_REVALIDATE_SECONDS } })
        if (!response.ok) return null
        const data = (await response.json()) as { results?: CountryReleaseDates[] }
        const certifications = usCertificationsFrom(data.results)
        certificationCache.setMovie(movieId, certifications)
        return certifications
    } catch {
        return null
    }
}

/**
 * A movie's US certifications ([] when TMDB has none), or null when they could
 * not be looked up.
 */
export async function fetchMovieCertifications(
    movieId: number,
    apiKey: string
): Promise<string[] | null> {
    const cached = certificationCache.getMovie(movieId)
    if (cached !== undefined) return cached
    const pending = inFlight.get(movieId)
    if (pending) return pending
    const lookup = lookUp(movieId, apiKey).finally(() => inFlight.delete(movieId))
    inFlight.set(movieId, lookup)
    return lookup
}
