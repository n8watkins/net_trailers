/**
 * Unified Cascading Fetch Utility
 *
 * Implements progressive cascading for actors, directors, and genres:
 * - Priority: ALL actors → ANY actor → NO actors (for each director/genre combination)
 * - Director modes: With director → Without director
 * - Genre cascading: 3 genres → 2 genres → 1 genre
 * - Infinite content determines if we continue beyond actor/director tiers
 *
 * Example tier priority (2 actors, 1 director, 3 genres):
 * 1. ALL actors + director + 3 genres (most specific)
 * 2. ANY actor + director + 3 genres
 * 3. director + 3 genres (no actors)
 * 4. ALL actors + 3 genres (no director)
 * 5. ANY actor + 3 genres (no director)
 * 6. 3 genres only (if infinite enabled)
 * 7. 2 genres only (if infinite enabled)
 * 8. 1 genre only (if infinite enabled)
 */

const BASE_URL = 'https://api.themoviedb.org/3'

type GenreLogic = 'AND' | 'OR'
type ActorMode = 'all' | 'any' | 'none'
type DirectorMode = 'present' | 'absent'

export interface CascadingConfig {
    actorIds: number[] // TMDB person IDs for actors
    directorId?: number // TMDB person ID for director
    genres: string[] // Unified genre IDs
    mediaType: 'movie' | 'tv' | 'both'
    genreLogic?: GenreLogic
    childSafeMode?: boolean
    infiniteEnabled?: boolean // If false, stop at actor/director tiers
}

export interface TMDBResponse {
    results: any[]
    page: number
    total_pages: number
    total_results: number
}

interface FilterTier {
    actorMode: ActorMode
    directorMode: DirectorMode
    genreCount: number
    totalPages: number
}

/**
 * Cache for tier metadata (total_pages for each filter combination)
 * Key format: "actorIds:directorId:genres:mediaType:childSafe:genreLogic:infinite"
 */
const tierCache = new Map<string, FilterTier[]>()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours in milliseconds

/**
 * Generate cache key for tier metadata
 */
function generateCacheKey(config: CascadingConfig): string {
    return [
        [...config.actorIds].sort().join(','),
        config.directorId || 'none',
        [...config.genres].sort().join(','),
        config.mediaType,
        config.genreLogic || 'OR',
        config.childSafeMode || false,
        config.infiniteEnabled || false,
    ].join(':')
}

/**
 * Build TMDB API parameters for a specific tier
 */
async function buildTMDBParams(
    tier: FilterTier,
    config: CascadingConfig,
    page: number
): Promise<Record<string, string>> {
    const { translateToTMDBGenres } = await import('./genreMapping')

    const params: Record<string, string> = {
        api_key: '', // Will be set by caller
        language: 'en-US',
        page: page.toString(),
        sort_by: 'popularity.desc',
    }

    // Actor filtering
    if (tier.actorMode === 'all' && config.actorIds.length > 0) {
        params.with_cast = config.actorIds.join(',') // Comma = AND
    } else if (tier.actorMode === 'any' && config.actorIds.length > 0) {
        params.with_cast = config.actorIds.join('|') // Pipe = OR
    }

    // Director filtering (Option A - no role verification)
    if (tier.directorMode === 'present' && config.directorId) {
        params.with_crew = config.directorId.toString()
    }

    // Genre filtering
    const currentGenres = config.genres.slice(0, tier.genreCount)
    // Handle 'both' mediaType by defaulting to 'movie' for genre translation
    // (When fetching 'both', we make separate calls for movies and TV anyway)
    const mediaTypeForGenres: 'movie' | 'tv' =
        config.mediaType === 'both' ? 'movie' : config.mediaType
    const tmdbGenreIds = translateToTMDBGenres(currentGenres, mediaTypeForGenres)

    if (tmdbGenreIds.length > 0) {
        params.with_genres =
            config.genreLogic === 'AND' ? tmdbGenreIds.join(',') : tmdbGenreIds.join('|')
    }

    // Child safety filters
    if (config.childSafeMode && config.mediaType === 'movie') {
        params.certification_country = 'US'
        params['certification.lte'] = 'PG-13'
        params.include_adult = 'false'
    } else if (config.childSafeMode) {
        params.include_adult = 'false'
    }

    return params
}

/**
 * Fetch tier metadata (total_pages) for a specific tier configuration
 */
async function fetchTierMetadata(
    tier: Omit<FilterTier, 'totalPages'>,
    config: CascadingConfig,
    apiKey: string
): Promise<FilterTier | null> {
    try {
        const params = await buildTMDBParams({ ...tier, totalPages: 0 }, config, 1)
        params.api_key = apiKey

        const url = `${BASE_URL}/discover/${config.mediaType === 'both' ? 'movie' : config.mediaType}?${new URLSearchParams(params).toString()}`

        const response = await fetch(url)
        if (!response.ok) {
            console.error(`Failed to fetch tier metadata:`, response.status)
            return null
        }

        const data: TMDBResponse = await response.json()

        return {
            ...tier,
            totalPages: data.total_pages,
        }
    } catch (error) {
        console.error('Error fetching tier metadata:', error)
        return null
    }
}

/**
 * Generate all possible tier combinations based on config
 */
function generateTierCombinations(config: CascadingConfig): Omit<FilterTier, 'totalPages'>[] {
    const tiers: Omit<FilterTier, 'totalPages'>[] = []

    // Determine actor modes to use
    const actorModes: ActorMode[] = []
    if (config.actorIds.length > 1) {
        actorModes.push('all', 'any') // Multiple actors: try ALL then ANY
    } else if (config.actorIds.length === 1) {
        actorModes.push('any') // Single actor: just "any"
    }
    // Always include 'none' if infinite enabled
    if (config.infiniteEnabled) {
        actorModes.push('none')
    }

    // Determine director modes to use
    const directorModes: DirectorMode[] = []
    if (config.directorId) {
        directorModes.push('present')
    }
    directorModes.push('absent') // Always include "no director"

    // Determine genre counts to use
    const genreCounts: number[] = []
    for (let count = config.genres.length; count >= 1; count--) {
        genreCounts.push(count)
    }

    // Generate combinations in priority order
    // Priority: Actor specificity → Director presence → Genre count
    for (const actorMode of actorModes) {
        for (const directorMode of directorModes) {
            for (const genreCount of genreCounts) {
                // Skip genre-only tiers if infinite is disabled and we have actors/director
                if (actorMode === 'none' && directorMode === 'absent' && !config.infiniteEnabled) {
                    continue
                }

                tiers.push({
                    actorMode,
                    directorMode,
                    genreCount,
                })
            }
        }
    }

    return tiers
}

/**
 * Calculate all tier metadata in parallel
 */
async function calculateAllTiers(config: CascadingConfig, apiKey: string): Promise<FilterTier[]> {
    const tierCombinations = generateTierCombinations(config)

    // Fetch all tier metadata in parallel
    const tierPromises = tierCombinations.map((tier) => fetchTierMetadata(tier, config, apiKey))

    const results = await Promise.all(tierPromises)

    // Filter out failed tiers and those with 0 pages
    return results.filter((tier): tier is FilterTier => tier !== null && tier.totalPages > 0)
}

/**
 * Get cached tier info or calculate and cache it
 */
async function getTiers(config: CascadingConfig, apiKey: string): Promise<FilterTier[]> {
    const cacheKey = generateCacheKey(config)

    // Check cache
    const cached = tierCache.get(cacheKey)
    if (cached) {
        return cached
    }

    // Calculate and cache (parallel fetches)
    const tiers = await calculateAllTiers(config, apiKey)
    tierCache.set(cacheKey, tiers)

    // Auto-clear cache after TTL
    setTimeout(() => {
        tierCache.delete(cacheKey)
    }, CACHE_TTL)

    return tiers
}

/**
 * Find which tier to use for a requested page number
 */
function findTierForPage(
    requestedPage: number,
    tiers: FilterTier[]
): { tier: FilterTier; adjustedPage: number } {
    let cumulativePages = 0

    for (const tier of tiers) {
        if (requestedPage <= cumulativePages + tier.totalPages) {
            // This is the right tier!
            return {
                tier,
                adjustedPage: requestedPage - cumulativePages,
            }
        }

        cumulativePages += tier.totalPages
    }

    // Fallback to last tier if we somehow exceed all pages
    const lastTier = tiers[tiers.length - 1]
    return {
        tier: lastTier,
        adjustedPage: 1,
    }
}

/**
 * Fetch content for a specific tier
 */
async function fetchContentForTier(
    tier: FilterTier,
    page: number,
    config: CascadingConfig,
    apiKey: string
): Promise<TMDBResponse> {
    const params = await buildTMDBParams(tier, config, page)
    params.api_key = apiKey

    const url = `${BASE_URL}/discover/${config.mediaType === 'both' ? 'movie' : config.mediaType}?${new URLSearchParams(params).toString()}`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
    }

    return response.json()
}

/**
 * Main export: Fetch with unified cascading (actors, directors, genres)
 *
 * @param config - Cascading configuration (actors, director, genres, media type, etc.)
 * @param page - Requested page number
 * @param apiKey - TMDB API key
 * @returns TMDB API response with content
 */
export async function fetchWithUnifiedCascading(
    config: CascadingConfig,
    page: number,
    apiKey: string
): Promise<TMDBResponse> {
    // Special case: No filters at all
    if (config.actorIds.length === 0 && !config.directorId && config.genres.length === 0) {
        return fetchWithoutFilters(config, page, apiKey)
    }

    // Handle "both" media type by interleaving movie and TV results
    if (config.mediaType === 'both') {
        return fetchBothMediaTypes(config, page, apiKey)
    }

    // Get tier structure
    const tiers = await getTiers(config, apiKey)

    if (tiers.length === 0) {
        // No results in any tier
        return {
            results: [],
            page: 1,
            total_pages: 0,
            total_results: 0,
        }
    }

    // Find appropriate tier for requested page
    const { tier, adjustedPage } = findTierForPage(page, tiers)

    // Fetch content for this tier
    return fetchContentForTier(tier, adjustedPage, config, apiKey)
}

/**
 * Fetch without any filters (all content)
 */
async function fetchWithoutFilters(
    config: CascadingConfig,
    page: number,
    apiKey: string
): Promise<TMDBResponse> {
    const params: Record<string, string> = {
        api_key: apiKey,
        language: 'en-US',
        page: page.toString(),
        sort_by: 'popularity.desc',
    }

    if (config.childSafeMode && config.mediaType === 'movie') {
        params.certification_country = 'US'
        params['certification.lte'] = 'PG-13'
        params.include_adult = 'false'
    } else if (config.childSafeMode) {
        params.include_adult = 'false'
    }

    const url = `${BASE_URL}/discover/${config.mediaType === 'both' ? 'movie' : config.mediaType}?${new URLSearchParams(params).toString()}`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
    }

    return response.json()
}

/**
 * Fetch content for "both" media type by interleaving movies and TV shows
 */
async function fetchBothMediaTypes(
    config: CascadingConfig,
    page: number,
    apiKey: string
): Promise<TMDBResponse> {
    // For "both", fetch from both movie and TV with half the items each
    const movieConfig = { ...config, mediaType: 'movie' as const }
    const tvConfig = { ...config, mediaType: 'tv' as const }

    const [movieData, tvData] = await Promise.all([
        fetchWithUnifiedCascading(movieConfig, page, apiKey),
        fetchWithUnifiedCascading(tvConfig, page, apiKey),
    ])

    // Interleave results: movie, tv, movie, tv, ...
    const interleavedResults = []
    const maxLength = Math.max(movieData.results.length, tvData.results.length)

    for (let i = 0; i < maxLength; i++) {
        if (i < movieData.results.length) {
            interleavedResults.push(movieData.results[i])
        }
        if (i < tvData.results.length) {
            interleavedResults.push(tvData.results[i])
        }
    }

    return {
        results: interleavedResults,
        page,
        total_pages: Math.max(movieData.total_pages, tvData.total_pages),
        total_results: movieData.total_results + tvData.total_results,
    }
}

/**
 * Build initial cache (first 50 items) for a collection
 * Used when creating a new collection with actor/director filters
 */
export async function buildInitialCache(
    config: CascadingConfig,
    apiKey: string
): Promise<number[]> {
    const cachedIds: number[] = []

    // Fetch first 3 pages (50 items total)
    for (let page = 1; page <= 3; page++) {
        const data = await fetchWithUnifiedCascading(config, page, apiKey)

        for (const item of data.results) {
            if (cachedIds.length >= 50) break
            cachedIds.push(item.id)
        }

        if (cachedIds.length >= 50) break
    }

    return cachedIds.slice(0, 50)
}
