import { NextRequest, NextResponse } from 'next/server'
import { filterContentByAdultFlag } from '../../../../../utils/contentFilter'
import { filterMatureTVShows } from '../../../../../utils/tvContentRatings'
import { apiError, apiWarn } from '../../../../../utils/debugLogger'
import {
    translateToTMDBGenres,
    translateToTMDBGenresForBoth,
} from '../../../../../utils/genreMapping'
import { verifyIdToken, getAdminDb } from '../../../../../lib/firebase-admin'
import { Content } from '../../../../../typings'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'
const MAX_CURATED_CONTENT_IDS = 30

type MediaType = 'movie' | 'tv' | 'both'
type GenreLogic = 'AND' | 'OR'

/**
 * GET /api/custom-rows/[id]/content
 *
 * Fetch TMDB content for a custom row based on its genre configuration.
 *
 * Query Parameters (required):
 *   - genres: string (comma-separated genre IDs, e.g., "28,12")
 *   - genreLogic: 'AND' | 'OR'
 *   - mediaType: 'movie' | 'tv' | 'both'
 *
 * Query Parameters (optional):
 *   - page: number (default: 1)
 *   - childSafetyMode: boolean (default: false)
 *
 * Response: {
 *   results: Content[],
 *   page: number,
 *   total_pages: number,
 *   total_results: number,
 *   child_safety_enabled?: boolean,
 *   hidden_count?: number
 * }
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await params // Consume params to satisfy Next.js requirements

        // Fetch user's hidden movies based on auth context (optional - this is a public endpoint)
        let hiddenMovieIds: number[] = []

        try {
            // Check for optional Authorization header
            const authHeader = request.headers.get('authorization')

            if (authHeader && authHeader.startsWith('Bearer ')) {
                const idToken = authHeader.substring(7) // Remove 'Bearer ' prefix

                try {
                    // Verify token with Firebase Admin SDK
                    const decodedToken = await verifyIdToken(idToken)
                    const userId = decodedToken.uid

                    // Fetch user's hidden movies from Firestore
                    const db = getAdminDb()
                    const userDoc = await db.collection('users').doc(userId).get()

                    if (userDoc.exists) {
                        const userData = userDoc.data()
                        const hiddenMovies = (userData?.hiddenMovies || []) as Content[]
                        hiddenMovieIds = hiddenMovies.map((m) => m.id)
                    }
                } catch (authError) {
                    apiWarn('Auth verification failed:', authError)
                    // Continue without filtering - not critical for public endpoint
                }
            }

            // Note: Guest users won't have server-side filtering
            // They already get client-side filtering via Row.tsx
        } catch (error) {
            apiWarn('Error fetching hidden movies:', error)
            // Continue without filtering - client-side safety net will handle it
        }

        const hiddenIdsSet = new Set(hiddenMovieIds)

        if (!API_KEY) {
            return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 })
        }

        const searchParams = request.nextUrl.searchParams
        const page = searchParams.get('page') || '1'
        const parsedPage = parseInt(page, 10)
        const pageNumber = Number.isNaN(parsedPage) ? 1 : parsedPage
        const childSafetyMode = searchParams.get('childSafetyMode')
        const childSafeMode = childSafetyMode === 'true'

        // Get row configuration from query params
        const genresParam = searchParams.get('genres')
        const contentIdsParam = searchParams.get('contentIds') // Gemini-curated content list
        const baseGenreLogic = (searchParams.get('genreLogic') || 'OR') as GenreLogic
        const fallbackGenreLogicParam = searchParams.get('fallbackGenreLogic')
        const fallbackGenreLogic =
            fallbackGenreLogicParam === 'AND' || fallbackGenreLogicParam === 'OR'
                ? (fallbackGenreLogicParam as GenreLogic)
                : null
        const genreLogic =
            fallbackGenreLogic && pageNumber > 1 ? fallbackGenreLogic : baseGenreLogic
        const mediaType = (searchParams.get('mediaType') || 'movie') as MediaType

        // Handle curated content lists (Gemini recommendations)
        // Page 1: Show curated content
        // Page 2+: Fall back to genre-based discovery (if genres exist)
        if (contentIdsParam && page === '1') {
            const uniqueContentIds = Array.from(
                new Set(
                    contentIdsParam
                        .split(',')
                        .map((id) => parseInt(id.trim(), 10))
                        .filter((id) => Number.isFinite(id) && id > 0)
                )
            )

            if (uniqueContentIds.length === 0) {
                return NextResponse.json(
                    { error: 'Bad Request', message: 'contentIds must contain valid TMDB IDs' },
                    { status: 400 }
                )
            }

            if (uniqueContentIds.length > MAX_CURATED_CONTENT_IDS) {
                return NextResponse.json(
                    {
                        error: 'Too many curated IDs',
                        message: `A maximum of ${MAX_CURATED_CONTENT_IDS} curated items is supported.`,
                    },
                    { status: 400 }
                )
            }

            // Fetch specific content by IDs using parallel fetching for better performance
            const fetchPromises = uniqueContentIds.map(async (tmdbId) => {
                try {
                    // For "both" media type, try movie first, then TV if it fails
                    if (mediaType === 'both') {
                        // Try movie endpoint first
                        const movieUrl = `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=en-US`

                        const movieResponse = await fetch(movieUrl)
                        if (movieResponse.ok) {
                            const item = await movieResponse.json()
                            return { ...item, media_type: 'movie' }
                        }

                        // If movie fails, try TV endpoint
                        const tvUrl = `${BASE_URL}/tv/${tmdbId}?api_key=${API_KEY}&language=en-US`

                        const tvResponse = await fetch(tvUrl)
                        if (tvResponse.ok) {
                            const item = await tvResponse.json()
                            return { ...item, media_type: 'tv' }
                        }

                        // Both failed
                        return null
                    }

                    // For single media type, fetch directly
                    const endpoint =
                        mediaType === 'tv'
                            ? `${BASE_URL}/tv/${tmdbId}`
                            : `${BASE_URL}/movie/${tmdbId}`

                    const url = `${endpoint}?api_key=${API_KEY}&language=en-US`

                    const response = await fetch(url)
                    if (!response.ok) return null

                    const item = await response.json()
                    return {
                        ...item,
                        media_type: mediaType,
                    }
                } catch (error) {
                    apiWarn(`Failed to fetch content ${tmdbId}:`, error)
                    return null
                }
            })

            const results = await Promise.all(fetchPromises)
            let enrichedResults = results.filter((item) => item !== null)

            // Apply child safety filtering if needed
            if (childSafeMode) {
                const beforeCount = enrichedResults.length
                const filteredByAdultFlag = filterContentByAdultFlag(enrichedResults, true)

                const tvItems = filteredByAdultFlag.filter((item: any) => item.media_type === 'tv')
                let safeTvIds: Set<number> | null = null
                if (tvItems.length > 0) {
                    const safeTv = await filterMatureTVShows(tvItems, API_KEY)
                    safeTvIds = new Set(safeTv.map((item: any) => item.id))
                }

                enrichedResults = filteredByAdultFlag.filter((item: any) => {
                    if (item.media_type === 'tv') {
                        return safeTvIds?.has(item.id)
                    }
                    return true
                })

                const hiddenCount = beforeCount - enrichedResults.length

                return NextResponse.json(
                    {
                        results: enrichedResults,
                        page: 1,
                        total_pages: 1,
                        total_results: enrichedResults.length,
                        child_safety_enabled: true,
                        hidden_count: hiddenCount,
                    },
                    {
                        status: 200,
                        headers: {
                            'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                        },
                    }
                )
            }

            // Check if genres exist for infinite pagination
            const hasGenresFallback = genresParam && genresParam.length > 0

            return NextResponse.json(
                {
                    results: enrichedResults,
                    page: 1,
                    total_pages: hasGenresFallback ? 999 : 1, // Indicate more pages if genres exist
                    total_results: enrichedResults.length,
                    is_curated: true, // Mark as curated content
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                    },
                }
            )
        }

        // Page 2+ for curated rows: Fall back to genre-based content
        // This happens when user scrolls past curated content (if infinite is enabled)
        if (contentIdsParam && pageNumber > 1 && genresParam) {
            // Continue with genre-based discovery below
            // (fall through to genre logic)
        }

        // Validate required parameters for genre-based filtering
        if (!genresParam) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'genres parameter is required' },
                { status: 400 }
            )
        }

        // Parse unified genre IDs (e.g., "action,fantasy,scifi")
        const unifiedGenreIds = genresParam.split(',').map((g) => g.trim())

        let enrichedResults: any[] = []
        let totalPages = 0
        let totalResults = 0

        // Handle "both" media type by fetching from both endpoints
        if (mediaType === 'both') {
            // Translate unified genres to TMDB IDs for both media types
            const { movieIds, tvIds } = translateToTMDBGenresForBoth(unifiedGenreIds)

            // Format genres for TMDB API
            // AND logic: with_genres=16,10402 (comma-separated)
            // OR logic: with_genres=35|53 (pipe-separated)
            const movieGenreParam =
                genreLogic === 'AND'
                    ? movieIds.join(',') // AND: comma-separated
                    : movieIds.join('|') // OR: pipe-separated

            const tvGenreParam =
                genreLogic === 'AND'
                    ? tvIds.join(',') // AND: comma-separated
                    : tvIds.join('|') // OR: pipe-separated

            // Build movie URL
            let movieUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=${page}&sort_by=popularity.desc&with_genres=${movieGenreParam}`
            if (childSafeMode) {
                movieUrl += '&certification_country=US&certification.lte=PG-13'
            }

            // Build TV URL
            const tvUrl = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&page=${page}&sort_by=popularity.desc&with_genres=${tvGenreParam}`

            // Fetch both in parallel
            const [movieResponse, tvResponse] = await Promise.all([fetch(movieUrl), fetch(tvUrl)])

            if (!movieResponse.ok || !tvResponse.ok) {
                apiError('[Custom Rows API] TMDB fetch error:', {
                    movieStatus: movieResponse.status,
                    movieOk: movieResponse.ok,
                    tvStatus: tvResponse.status,
                    tvOk: tvResponse.ok,
                    movieUrl: movieUrl.replace(/api_key=[^&]+/, 'api_key=[REDACTED]'),
                    tvUrl: tvUrl.replace(/api_key=[^&]+/, 'api_key=[REDACTED]'),
                })
                throw new Error(
                    `TMDB API error while fetching both media types: movie=${movieResponse.status}, tv=${tvResponse.status}`
                )
            }

            const [movieData, tvData] = await Promise.all([movieResponse.json(), tvResponse.json()])

            // Merge and enrich results
            const movieResults = movieData.results.map((item: any) => ({
                ...item,
                media_type: 'movie',
            }))
            const tvResults = tvData.results.map((item: any) => ({
                ...item,
                media_type: 'tv',
            }))

            // Interleave results for better variety
            enrichedResults = []
            const maxLength = Math.max(movieResults.length, tvResults.length)
            for (let i = 0; i < maxLength; i++) {
                if (i < movieResults.length) enrichedResults.push(movieResults[i])
                if (i < tvResults.length) enrichedResults.push(tvResults[i])
            }

            // Combine totals
            totalPages = Math.max(movieData.total_pages, tvData.total_pages)
            totalResults = movieData.total_results + tvData.total_results
        } else {
            // Single media type (movie or tv)
            // Translate unified genres to TMDB IDs
            const tmdbGenreIds = translateToTMDBGenres(unifiedGenreIds, mediaType)

            // Format genres for TMDB API
            const genreParam =
                genreLogic === 'AND'
                    ? tmdbGenreIds.join(',') // AND: comma-separated
                    : tmdbGenreIds.join('|') // OR: pipe-separated

            const discoverEndpoint = mediaType === 'movie' ? 'discover/movie' : 'discover/tv'
            let url = `${BASE_URL}/${discoverEndpoint}?api_key=${API_KEY}&language=en-US&page=${page}&sort_by=popularity.desc&with_genres=${genreParam}`

            // Apply child safety filtering
            if (childSafeMode && mediaType === 'movie') {
                url += '&certification_country=US&certification.lte=PG-13'
            }

            // Fetch from TMDB
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()

            // Enrich results with media_type
            enrichedResults = data.results.map((item: any) => ({
                ...item,
                media_type: mediaType,
            }))

            totalPages = data.total_pages
            totalResults = data.total_results
        }

        // Apply child safety filtering
        if (childSafeMode) {
            const beforeCount = enrichedResults.length

            // Filter by adult flag
            const filteredByAdultFlag = filterContentByAdultFlag(enrichedResults, true)

            const tvItems = filteredByAdultFlag.filter((item: any) => item.media_type === 'tv')
            let safeTvIds: Set<number> | null = null
            if (tvItems.length > 0) {
                const safeTv = await filterMatureTVShows(tvItems, API_KEY)
                safeTvIds = new Set(safeTv.map((item: any) => item.id))
            }

            enrichedResults = filteredByAdultFlag.filter((item: any) => {
                if (item.media_type === 'tv') {
                    return safeTvIds?.has(item.id)
                }
                return true
            })

            const childSafetyHiddenCount = beforeCount - enrichedResults.length

            // Filter out user's hidden movies
            let userHiddenCount = 0
            if (hiddenIdsSet.size > 0) {
                const beforeUserFilter = enrichedResults.length
                enrichedResults = enrichedResults.filter((item: any) => !hiddenIdsSet.has(item.id))
                userHiddenCount = beforeUserFilter - enrichedResults.length
            }

            const totalHiddenCount = childSafetyHiddenCount + userHiddenCount

            return NextResponse.json(
                {
                    results: enrichedResults,
                    page: pageNumber,
                    total_pages: totalPages,
                    total_results: totalResults,
                    child_safety_enabled: true,
                    hidden_count: totalHiddenCount,
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                    },
                }
            )
        }

        // Filter out user's hidden movies (for normal mode)
        let filteredResults = enrichedResults
        let userHiddenCount = 0
        if (hiddenIdsSet.size > 0) {
            const beforeUserFilter = enrichedResults.length
            filteredResults = enrichedResults.filter((item: any) => !hiddenIdsSet.has(item.id))
            userHiddenCount = beforeUserFilter - filteredResults.length
        }

        // Return normal results
        return NextResponse.json(
            {
                results: filteredResults,
                page: pageNumber,
                total_pages: totalPages,
                total_results: totalResults,
                hidden_count: userHiddenCount > 0 ? userHiddenCount : undefined,
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                },
            }
        )
    } catch (error) {
        apiError('[Custom Rows API] GET content error:', error)

        const errorMessage = (error as Error).message

        // Handle specific errors
        if (errorMessage.includes('not found')) {
            return NextResponse.json({ error: 'Not found', message: errorMessage }, { status: 404 })
        }

        if (errorMessage.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Unauthorized', message: errorMessage },
                { status: 403 }
            )
        }

        return NextResponse.json(
            {
                error: 'Internal server error',
                message:
                    process.env.NODE_ENV === 'development'
                        ? errorMessage
                        : 'Failed to fetch custom row content',
            },
            { status: 500 }
        )
    }
}
