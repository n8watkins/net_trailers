/**
 * Prioritized Genre Fetch Utility
 *
 * Implements progressive cascading: Use all genres until exhausted, then drop least important.
 * - Pages 1-X: All 3 genres (most specific)
 * - Pages X+1 to Y: Top 2 genres (medium specific)
 * - Pages Y+1+: Top 1 genre (broad, infinite)
 *
 * IMPORTANT: TMDB's /trending endpoint does NOT support genre filtering.
 * For "trending" with genres, we use /discover with sort_by=popularity.desc
 */

const BASE_URL = 'https://api.themoviedb.org/3'

type GenreLogic = 'AND' | 'OR'

interface TMDBResponse {
    results: any[]
    page: number
    total_pages: number
    total_results: number
}

interface GenreTierInfo {
    genreCount: number
    totalPages: number
}

/**
 * Cache for genre tier metadata (total_pages for each genre combo)
 * Key format: "endpoint:genres:mediaType:childSafe:genreLogic"
 * Value: Array of tier info [{ genreCount: 3, totalPages: 5 }, { genreCount: 2, totalPages: 8 }, ...]
 */
const tierCache = new Map<string, GenreTierInfo[]>()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours in milliseconds

/**
 * Calculate total pages for each genre tier combination
 * Fetches all tiers in parallel for better performance
 */
async function calculateGenreTiers(
    genres: string[],
    mediaType: 'movie' | 'tv',
    endpoint: 'discover' | 'trending' | 'top-rated',
    apiKey: string,
    childSafeMode: boolean = false,
    genreLogic: GenreLogic = 'OR'
): Promise<GenreTierInfo[]> {
    // Import genre mapping utilities
    const { translateToTMDBGenres } = await import('./genreMapping')

    // Create parallel fetch promises for all tiers
    const tierPromises = []
    for (let genreCount = genres.length; genreCount >= 1; genreCount--) {
        tierPromises.push(
            (async () => {
                const currentGenres = genres.slice(0, genreCount)
                const tmdbGenreIds = translateToTMDBGenres(currentGenres, mediaType)

                // Build TMDB URL for this tier
                let url: string

                // CRITICAL: TMDB /trending endpoint does NOT support genre filtering
                // For trending with genres, use discover with popularity sort
                if (endpoint === 'trending') {
                    // Use discover endpoint sorted by popularity (effectively "trending")
                    const genreParam =
                        genreLogic === 'AND' ? tmdbGenreIds.join(',') : tmdbGenreIds.join('|')
                    url = `${BASE_URL}/discover/${mediaType}?api_key=${apiKey}&language=en-US&page=1&sort_by=popularity.desc&with_genres=${genreParam}&vote_count.gte=100`
                } else if (endpoint === 'top-rated') {
                    // Use discover with vote_average sort
                    const genreParam =
                        genreLogic === 'AND' ? tmdbGenreIds.join(',') : tmdbGenreIds.join('|')
                    url = `${BASE_URL}/discover/${mediaType}?api_key=${apiKey}&language=en-US&page=1&sort_by=vote_average.desc&vote_count.gte=${mediaType === 'movie' ? '300' : '100'}&with_genres=${genreParam}`
                } else {
                    // Standard discover endpoint
                    const genreParam =
                        genreLogic === 'AND' ? tmdbGenreIds.join(',') : tmdbGenreIds.join('|')
                    url = `${BASE_URL}/discover/${mediaType}?api_key=${apiKey}&language=en-US&page=1&sort_by=popularity.desc&with_genres=${genreParam}`
                }

                // Add child safety filters
                if (childSafeMode && mediaType === 'movie') {
                    url += '&certification_country=US&certification.lte=PG-13&include_adult=false'
                } else if (childSafeMode) {
                    url += '&include_adult=false'
                }

                // Fetch to get total_pages
                const response = await fetch(url)
                if (!response.ok) {
                    console.error(
                        `Failed to fetch tier info for ${genreCount} genres:`,
                        response.status
                    )
                    return null
                }

                const data: TMDBResponse = await response.json()
                return {
                    genreCount,
                    totalPages: data.total_pages,
                }
            })()
        )
    }

    // Wait for all tier fetches in parallel
    const results = await Promise.all(tierPromises)
    return results.filter((tier): tier is GenreTierInfo => tier !== null)
}

/**
 * Get cached tier info or calculate and cache it
 */
async function getGenreTiers(
    genres: string[],
    mediaType: 'movie' | 'tv',
    endpoint: 'discover' | 'trending' | 'top-rated',
    apiKey: string,
    childSafeMode: boolean = false,
    genreLogic: GenreLogic = 'OR'
): Promise<GenreTierInfo[]> {
    const cacheKey = `${endpoint}:${genres.join(',')}:${mediaType}:${childSafeMode}:${genreLogic}`

    // Check cache
    const cached = tierCache.get(cacheKey)
    if (cached) {
        return cached
    }

    // Calculate and cache (parallel fetches)
    const tiers = await calculateGenreTiers(
        genres,
        mediaType,
        endpoint,
        apiKey,
        childSafeMode,
        genreLogic
    )
    tierCache.set(cacheKey, tiers)

    // Auto-clear cache after TTL
    setTimeout(() => {
        tierCache.delete(cacheKey)
    }, CACHE_TTL)

    return tiers
}

/**
 * Determine which genre tier to use based on requested page
 * Returns the genre count and adjusted page number for that tier
 */
function findGenreTier(
    requestedPage: number,
    tiers: GenreTierInfo[]
): { genreCount: number; adjustedPage: number } | null {
    let cumulativePages = 0

    for (const tier of tiers) {
        if (requestedPage <= cumulativePages + tier.totalPages) {
            // This is the right tier!
            return {
                genreCount: tier.genreCount,
                adjustedPage: requestedPage - cumulativePages,
            }
        }

        cumulativePages += tier.totalPages
    }

    // Shouldn't happen, but fallback to 1 genre
    return {
        genreCount: 1,
        adjustedPage: requestedPage - cumulativePages,
    }
}

/**
 * Fetch content with progressive genre cascading
 *
 * @param genres - Prioritized genres (array order = priority)
 * @param mediaType - 'movie' or 'tv'
 * @param endpoint - TMDB endpoint type
 * @param page - Requested page number
 * @param apiKey - TMDB API key
 * @param childSafeMode - Apply child safety filters
 * @param genreLogic - 'AND' (comma) or 'OR' (pipe) for combining genres
 */
export async function fetchWithPrioritizedGenres(
    genres: string[],
    mediaType: 'movie' | 'tv',
    endpoint: 'discover' | 'trending' | 'top-rated',
    page: number,
    apiKey: string,
    childSafeMode: boolean = false,
    genreLogic: GenreLogic = 'OR'
): Promise<TMDBResponse> {
    // No genres: fetch without genre filter
    if (genres.length === 0) {
        return fetchWithoutGenres(mediaType, endpoint, page, apiKey, childSafeMode)
    }

    // Single genre: no cascading needed
    if (genres.length === 1) {
        return fetchSingleGenre(
            genres[0],
            mediaType,
            endpoint,
            page,
            apiKey,
            childSafeMode,
            genreLogic
        )
    }

    // Multiple genres: use cascading logic
    const tiers = await getGenreTiers(
        genres,
        mediaType,
        endpoint,
        apiKey,
        childSafeMode,
        genreLogic
    )
    const tierInfo = findGenreTier(page, tiers)

    if (!tierInfo) {
        throw new Error(`Could not determine genre tier for page ${page}`)
    }

    // Fetch using the appropriate genre count
    const currentGenres = genres.slice(0, tierInfo.genreCount)

    return fetchWithGenres(
        currentGenres,
        mediaType,
        endpoint,
        tierInfo.adjustedPage,
        apiKey,
        childSafeMode,
        genreLogic
    )
}

/**
 * Fetch without any genre filtering
 */
async function fetchWithoutGenres(
    mediaType: 'movie' | 'tv',
    endpoint: 'discover' | 'trending' | 'top-rated',
    page: number,
    apiKey: string,
    childSafeMode: boolean
): Promise<TMDBResponse> {
    let url: string

    if (endpoint === 'trending') {
        // Use real trending endpoint (no genre support)
        url = `${BASE_URL}/trending/${mediaType}/week?api_key=${apiKey}&language=en-US&page=${page}`
    } else if (endpoint === 'top-rated') {
        url = `${BASE_URL}/discover/${mediaType}?api_key=${apiKey}&language=en-US&page=${page}&sort_by=vote_average.desc&vote_count.gte=${mediaType === 'movie' ? '300' : '100'}`
    } else {
        url = `${BASE_URL}/discover/${mediaType}?api_key=${apiKey}&language=en-US&page=${page}&sort_by=popularity.desc`
    }

    if (childSafeMode && mediaType === 'movie') {
        url += '&certification_country=US&certification.lte=PG-13&include_adult=false'
    } else if (childSafeMode) {
        url += '&include_adult=false'
    }

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
    }

    return response.json()
}

/**
 * Fetch with a single genre
 */
async function fetchSingleGenre(
    genre: string,
    mediaType: 'movie' | 'tv',
    endpoint: 'discover' | 'trending' | 'top-rated',
    page: number,
    apiKey: string,
    childSafeMode: boolean,
    genreLogic: GenreLogic = 'OR'
): Promise<TMDBResponse> {
    return fetchWithGenres([genre], mediaType, endpoint, page, apiKey, childSafeMode, genreLogic)
}

/**
 * Fetch with specific genres (internal helper)
 */
async function fetchWithGenres(
    genres: string[],
    mediaType: 'movie' | 'tv',
    endpoint: 'discover' | 'trending' | 'top-rated',
    page: number,
    apiKey: string,
    childSafeMode: boolean,
    genreLogic: GenreLogic = 'OR'
): Promise<TMDBResponse> {
    const { translateToTMDBGenres } = await import('./genreMapping')
    const tmdbGenreIds = translateToTMDBGenres(genres, mediaType)

    let url: string
    const genreParam = genreLogic === 'AND' ? tmdbGenreIds.join(',') : tmdbGenreIds.join('|')

    // CRITICAL: TMDB /trending endpoint does NOT support genre filtering
    // For trending with genres, use discover with popularity sort
    if (endpoint === 'trending') {
        url = `${BASE_URL}/discover/${mediaType}?api_key=${apiKey}&language=en-US&page=${page}&sort_by=popularity.desc&with_genres=${genreParam}&vote_count.gte=100`
    } else if (endpoint === 'top-rated') {
        url = `${BASE_URL}/discover/${mediaType}?api_key=${apiKey}&language=en-US&page=${page}&sort_by=vote_average.desc&vote_count.gte=${mediaType === 'movie' ? '300' : '100'}&with_genres=${genreParam}`
    } else {
        // Standard discover
        url = `${BASE_URL}/discover/${mediaType}?api_key=${apiKey}&language=en-US&page=${page}&sort_by=popularity.desc&with_genres=${genreParam}`
    }

    if (childSafeMode && mediaType === 'movie') {
        url += '&certification_country=US&certification.lte=PG-13&include_adult=false'
    } else if (childSafeMode) {
        url += '&include_adult=false'
    }

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
    }

    return response.json()
}
