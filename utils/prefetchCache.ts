import { Content } from '../typings'

// Simple in-memory cache for prefetched movie details
interface PrefetchCache {
    [key: string]: {
        data: Content
        timestamp: number
    }
}

const prefetchCache: PrefetchCache = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Track in-flight requests to avoid duplicate fetches
const inFlightRequests = new Map<string, Promise<Content | null>>()

/**
 * Prefetch movie/TV show details and store in cache
 * Returns the fetched data (useful for chaining) but doesn't require awaiting
 */
export async function prefetchMovieDetails(
    id: number,
    mediaType: 'movie' | 'tv'
): Promise<Content | null> {
    const cacheKey = `${mediaType}-${id}`

    // Check if already cached and fresh
    const cached = prefetchCache[cacheKey]
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
    }

    // Check if already fetching
    const inFlight = inFlightRequests.get(cacheKey)
    if (inFlight) {
        return inFlight
    }

    // Start new fetch
    const fetchPromise = fetch(`/api/movies/details/${id}?media_type=${mediaType}`)
        .then((res) => {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`)
            }
            return res.json()
        })
        .then((data) => {
            // Store in cache
            prefetchCache[cacheKey] = {
                data: { ...data, media_type: mediaType },
                timestamp: Date.now(),
            }
            // Remove from in-flight
            inFlightRequests.delete(cacheKey)
            return prefetchCache[cacheKey].data
        })
        .catch((error) => {
            console.error(`Prefetch failed for ${cacheKey}:`, error)
            // Remove from in-flight on error
            inFlightRequests.delete(cacheKey)
            return null
        })

    // Store promise in in-flight map
    inFlightRequests.set(cacheKey, fetchPromise)

    return fetchPromise
}

/**
 * Get cached movie details if available
 */
export function getCachedMovieDetails(id: number, mediaType: 'movie' | 'tv'): Content | null {
    const cacheKey = `${mediaType}-${id}`
    const cached = prefetchCache[cacheKey]

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
    }

    return null
}

/**
 * Clear expired cache entries (can be called periodically)
 */
export function clearExpiredCache() {
    const now = Date.now()
    Object.keys(prefetchCache).forEach((key) => {
        if (now - prefetchCache[key].timestamp > CACHE_TTL) {
            delete prefetchCache[key]
        }
    })
}
