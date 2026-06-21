/**
 * GET /api/custom-rows/[id]/content
 *
 * Fetch TMDB content for a custom row based on its genre configuration.
 *
 * Auth: Optional Auth.js session.  When a valid session is present the handler
 *   (a) server-filters hidden movies from the user's preferences blob, and
 *   (b) loads the matching UserList from userCreatedWatchlists so it can serve
 *       pages 1-3 from the actor/director cache (zero TMDB calls).
 * When there is no session (guest or unauthenticated) the same logic runs but
 * without personal filtering.
 *
 * Query Parameters (required unless using contentIds):
 *   genres        – comma-separated unified genre IDs, e.g. "action,fantasy"
 *   genreLogic    – "AND" | "OR" (default: "OR")
 *   mediaType     – "movie" | "tv" | "both" (default: "movie")
 *
 * Query Parameters (optional):
 *   page           – number (default: 1)
 *   childSafetyMode – "true" | "false" (default: "false")
 *   contentIds     – comma-separated TMDB IDs for curated/AI-generated rows
 *   fallbackGenreLogic – "AND" | "OR"  (used on page 2+ of curated rows)
 *
 * Response contract (unchanged from the Firebase version):
 * {
 *   results: Content[]
 *   page: number
 *   total_pages: number
 *   total_results: number
 *   from_cache?: boolean
 *   is_curated?: boolean
 *   child_safety_enabled?: boolean
 *   hidden_count?: number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

import { filterContentByAdultFlag } from '@/utils/contentFilter'
import { filterMatureTVShows } from '@/utils/tvContentRatings'
import { apiError, apiWarn } from '@/utils/debugLogger'
import { fetchWithPrioritizedGenres } from '@/utils/prioritizedGenreFetch'
import { fetchWithUnifiedCascading } from '@/utils/unifiedCascadingFetch'
import { verifyAuthentication } from '@/lib/auth-middleware'
import { loadUserPreferences } from '@/db/queries/userPreferences'
import type { UserList } from '@/types/collections'
import type { Content } from '@/typings'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'
const MAX_CURATED_CONTENT_IDS = 30

type MediaType = 'movie' | 'tv' | 'both'
type GenreLogic = 'AND' | 'OR'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params
        const collectionId = resolvedParams.id

        if (!API_KEY) {
            return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 })
        }

        // ----------------------------------------------------------------
        // Optional authentication: derive userId from Auth.js session.
        // This is NOT enforced — guests and unauthenticated callers still
        // get genre-based results without personal filtering.
        // ----------------------------------------------------------------
        let userId: string | null = null
        try {
            const authResult = await verifyAuthentication(request)
            if (authResult.authenticated && authResult.userId) {
                userId = authResult.userId
            }
        } catch {
            // Session read failure is non-fatal — continue as guest
        }

        // Load user preferences once (both for hiddenMovies and collection lookup)
        let hiddenMovieIds: number[] = []
        let collection: UserList | null = null

        if (userId) {
            try {
                const preferences = await loadUserPreferences(userId)

                // Resolve hidden movie IDs for server-side filtering
                const hiddenMovies = (preferences.hiddenMovies ?? []) as Content[]
                hiddenMovieIds = hiddenMovies.map((m) => m.id)

                // Find the matching collection in the user's watchlists
                const match = (preferences.userCreatedWatchlists ?? []).find(
                    (list) => list.id === collectionId
                )
                if (match) {
                    collection = match
                }
            } catch (prefError) {
                // Non-fatal: log and continue without personal data
                apiWarn('Could not load user preferences for content route:', prefError)
            }
        }

        const hiddenIdsSet = new Set(hiddenMovieIds)

        // ----------------------------------------------------------------
        // Parse query parameters
        // ----------------------------------------------------------------
        const searchParams = request.nextUrl.searchParams
        const page = searchParams.get('page') || '1'
        const parsedPage = parseInt(page, 10)
        const pageNumber = Number.isNaN(parsedPage) ? 1 : parsedPage

        const childSafetyMode = searchParams.get('childSafetyMode')
        const childSafeMode = childSafetyMode === 'true'

        const genresParam = searchParams.get('genres')
        const contentIdsParam = searchParams.get('contentIds') // Gemini-curated content list
        const baseGenreLogic = (searchParams.get('genreLogic') || 'OR') as GenreLogic
        const fallbackGenreLogicParam = searchParams.get('fallbackGenreLogic')
        const fallbackGenreLogic: GenreLogic | null =
            fallbackGenreLogicParam === 'AND' || fallbackGenreLogicParam === 'OR'
                ? (fallbackGenreLogicParam as GenreLogic)
                : null
        const genreLogic =
            fallbackGenreLogic && pageNumber > 1 ? fallbackGenreLogic : baseGenreLogic
        const mediaType = (searchParams.get('mediaType') || 'movie') as MediaType

        // ----------------------------------------------------------------
        // Actor/director cache path (pages 1-3, zero TMDB calls)
        // ----------------------------------------------------------------
        const hasActorOrDirectorFilters =
            (collection?.advancedFilters?.withCastIds?.length ?? 0) > 0 ||
            !!collection?.advancedFilters?.withDirectorId
        const hasCache = (collection?.cachedContentIds?.length ?? 0) > 0
        const isWithinCacheRange = pageNumber <= 3

        if (hasActorOrDirectorFilters && hasCache && isWithinCacheRange) {
            const startIndex = (pageNumber - 1) * 20
            const endIndex = startIndex + 20
            const pageContentIds = collection!.cachedContentIds!.slice(startIndex, endIndex)

            const fetchPromises = pageContentIds.map(async (tmdbId) => {
                try {
                    if (mediaType === 'both') {
                        const movieUrl = `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=en-US`
                        const movieResponse = await fetch(movieUrl)
                        if (movieResponse.ok) {
                            const item = await movieResponse.json()
                            return { ...item, media_type: 'movie' }
                        }
                        const tvUrl = `${BASE_URL}/tv/${tmdbId}?api_key=${API_KEY}&language=en-US`
                        const tvResponse = await fetch(tvUrl)
                        if (tvResponse.ok) {
                            const item = await tvResponse.json()
                            return { ...item, media_type: 'tv' }
                        }
                        return null
                    }

                    const endpoint =
                        mediaType === 'tv'
                            ? `${BASE_URL}/tv/${tmdbId}`
                            : `${BASE_URL}/movie/${tmdbId}`
                    const url = `${endpoint}?api_key=${API_KEY}&language=en-US`
                    const response = await fetch(url)
                    if (!response.ok) return null
                    const item = await response.json()
                    return { ...item, media_type: mediaType }
                } catch (err) {
                    apiWarn(`Failed to fetch cached content ${tmdbId}:`, err)
                    return null
                }
            })

            let cachedResults = (await Promise.all(fetchPromises)).filter((item) => item !== null)
            const totalCached = collection!.cachedContentIds!.length || 50

            if (childSafeMode) {
                const beforeCount = cachedResults.length
                const filteredByAdultFlag = filterContentByAdultFlag(cachedResults, true)

                const tvItems = filteredByAdultFlag.filter((item: any) => item.media_type === 'tv')
                let safeTvIds: Set<number> | null = null
                if (tvItems.length > 0) {
                    const safeTv = await filterMatureTVShows(tvItems, API_KEY)
                    safeTvIds = new Set(safeTv.map((item: any) => item.id))
                }

                cachedResults = filteredByAdultFlag.filter((item: any) => {
                    if (item.media_type === 'tv') return safeTvIds?.has(item.id)
                    return true
                })

                const hiddenCount = beforeCount - cachedResults.length

                return NextResponse.json(
                    {
                        results: cachedResults,
                        page: pageNumber,
                        total_pages: Math.ceil(totalCached / 20),
                        total_results: totalCached,
                        from_cache: true,
                        child_safety_enabled: true,
                        hidden_count: hiddenCount,
                    },
                    {
                        status: 200,
                        headers: {
                            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
                        },
                    }
                )
            }

            // Filter user hidden movies
            let filteredResults = cachedResults
            let userHiddenCount = 0
            if (hiddenIdsSet.size > 0) {
                const before = cachedResults.length
                filteredResults = cachedResults.filter((item: any) => !hiddenIdsSet.has(item.id))
                userHiddenCount = before - filteredResults.length
            }

            return NextResponse.json(
                {
                    results: filteredResults,
                    page: pageNumber,
                    total_pages: Math.ceil(totalCached / 20),
                    total_results: totalCached,
                    from_cache: true,
                    hidden_count: userHiddenCount > 0 ? userHiddenCount : undefined,
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
                    },
                }
            )
        }

        // ----------------------------------------------------------------
        // Curated content path (AI / Gemini content IDs, page 1 only)
        // ----------------------------------------------------------------
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

            const fetchPromises = uniqueContentIds.map(async (tmdbId) => {
                try {
                    if (mediaType === 'both') {
                        const movieUrl = `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=en-US`
                        const movieResponse = await fetch(movieUrl)
                        if (movieResponse.ok) {
                            const item = await movieResponse.json()
                            return { ...item, media_type: 'movie' }
                        }
                        const tvUrl = `${BASE_URL}/tv/${tmdbId}?api_key=${API_KEY}&language=en-US`
                        const tvResponse = await fetch(tvUrl)
                        if (tvResponse.ok) {
                            const item = await tvResponse.json()
                            return { ...item, media_type: 'tv' }
                        }
                        return null
                    }

                    const endpoint =
                        mediaType === 'tv'
                            ? `${BASE_URL}/tv/${tmdbId}`
                            : `${BASE_URL}/movie/${tmdbId}`
                    const url = `${endpoint}?api_key=${API_KEY}&language=en-US`
                    const response = await fetch(url)
                    if (!response.ok) return null
                    const item = await response.json()
                    return { ...item, media_type: mediaType }
                } catch (err) {
                    apiWarn(`Failed to fetch content ${tmdbId}:`, err)
                    return null
                }
            })

            let enrichedResults = (await Promise.all(fetchPromises)).filter((item) => item !== null)

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
                    if (item.media_type === 'tv') return safeTvIds?.has(item.id)
                    return true
                })

                return NextResponse.json(
                    {
                        results: enrichedResults,
                        page: 1,
                        total_pages: 1,
                        total_results: enrichedResults.length,
                        child_safety_enabled: true,
                        hidden_count: beforeCount - enrichedResults.length,
                    },
                    {
                        status: 200,
                        headers: {
                            'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                        },
                    }
                )
            }

            const hasGenresFallback = genresParam && genresParam.length > 0

            return NextResponse.json(
                {
                    results: enrichedResults,
                    page: 1,
                    total_pages: hasGenresFallback ? 999 : 1,
                    total_results: enrichedResults.length,
                    is_curated: true,
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                    },
                }
            )
        }

        // For curated rows on page 2+: fall through to genre-based discovery below
        // (contentIdsParam && pageNumber > 1 && genresParam)

        // ----------------------------------------------------------------
        // Genre-based TMDB discovery path
        // ----------------------------------------------------------------
        if (!genresParam) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'genres parameter is required' },
                { status: 400 }
            )
        }

        // Unified genre IDs (e.g. "action,fantasy,scifi") — translation to TMDB
        // numeric IDs is handled inside fetchWithPrioritizedGenres /
        // fetchWithUnifiedCascading (utils/genreMapping.ts).  We never modify
        // those utilities here.
        const unifiedGenreIds = genresParam.split(',').map((g) => g.trim())

        let enrichedResults: any[] = []
        let totalPages = 0
        let totalResults = 0

        const shouldUseUnifiedCascading =
            hasActorOrDirectorFilters && (collection?.advancedFilters?.withCastIds?.length ?? 0) > 0

        // When pages 1-3 are served from cache, shift live-fetch pages down by 3
        const adjustedPageNumber = hasCache && pageNumber > 3 ? pageNumber - 3 : pageNumber

        if (mediaType === 'both') {
            if (shouldUseUnifiedCascading) {
                const data = await fetchWithUnifiedCascading(
                    {
                        actorIds: collection!.advancedFilters!.withCastIds || [],
                        directorId: collection!.advancedFilters!.withDirectorId,
                        genres: unifiedGenreIds,
                        mediaType: 'both',
                        genreLogic,
                        childSafeMode,
                        infiniteEnabled: collection!.canGenerateMore ?? false,
                    },
                    adjustedPageNumber,
                    API_KEY!
                )
                enrichedResults = data.results
                totalPages = data.total_pages
                totalResults = data.total_results
            } else {
                const [movieData, tvData] = await Promise.all([
                    fetchWithPrioritizedGenres(
                        unifiedGenreIds,
                        'movie',
                        'discover',
                        pageNumber,
                        API_KEY!,
                        childSafeMode,
                        genreLogic
                    ),
                    fetchWithPrioritizedGenres(
                        unifiedGenreIds,
                        'tv',
                        'discover',
                        pageNumber,
                        API_KEY!,
                        childSafeMode,
                        genreLogic
                    ),
                ])

                const movieResults = movieData.results.map((item: any) => ({
                    ...item,
                    media_type: 'movie',
                }))
                const tvResults = tvData.results.map((item: any) => ({
                    ...item,
                    media_type: 'tv',
                }))

                enrichedResults = []
                const maxLength = Math.max(movieResults.length, tvResults.length)
                for (let i = 0; i < maxLength; i++) {
                    if (i < movieResults.length) enrichedResults.push(movieResults[i])
                    if (i < tvResults.length) enrichedResults.push(tvResults[i])
                }

                totalPages = Math.max(movieData.total_pages, tvData.total_pages)
                totalResults = movieData.total_results + tvData.total_results
            }
        } else {
            if (shouldUseUnifiedCascading) {
                const data = await fetchWithUnifiedCascading(
                    {
                        actorIds: collection!.advancedFilters!.withCastIds || [],
                        directorId: collection!.advancedFilters!.withDirectorId,
                        genres: unifiedGenreIds,
                        mediaType,
                        genreLogic,
                        childSafeMode,
                        infiniteEnabled: collection!.canGenerateMore ?? false,
                    },
                    adjustedPageNumber,
                    API_KEY!
                )
                enrichedResults = data.results.map((item: any) => ({
                    ...item,
                    media_type: mediaType,
                }))
                totalPages = data.total_pages
                totalResults = data.total_results
            } else {
                const data = await fetchWithPrioritizedGenres(
                    unifiedGenreIds,
                    mediaType,
                    'discover',
                    pageNumber,
                    API_KEY!,
                    childSafeMode,
                    genreLogic
                )
                enrichedResults = data.results.map((item: any) => ({
                    ...item,
                    media_type: mediaType,
                }))
                totalPages = data.total_pages
                totalResults = data.total_results
            }
        }

        // ----------------------------------------------------------------
        // Apply child safety and hidden-movie filtering
        // ----------------------------------------------------------------
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
                if (item.media_type === 'tv') return safeTvIds?.has(item.id)
                return true
            })

            const childSafetyHiddenCount = beforeCount - enrichedResults.length

            let userHiddenCount = 0
            if (hiddenIdsSet.size > 0) {
                const before = enrichedResults.length
                enrichedResults = enrichedResults.filter((item: any) => !hiddenIdsSet.has(item.id))
                userHiddenCount = before - enrichedResults.length
            }

            return NextResponse.json(
                {
                    results: enrichedResults,
                    page: pageNumber,
                    total_pages: totalPages,
                    total_results: totalResults,
                    child_safety_enabled: true,
                    hidden_count: childSafetyHiddenCount + userHiddenCount,
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                    },
                }
            )
        }

        // Normal (non-child-safe) path
        let filteredResults = enrichedResults
        let userHiddenCount = 0
        if (hiddenIdsSet.size > 0) {
            const before = enrichedResults.length
            filteredResults = enrichedResults.filter((item: any) => !hiddenIdsSet.has(item.id))
            userHiddenCount = before - filteredResults.length
        }

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
                headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
            }
        )
    } catch (error) {
        apiError('[Custom Rows API] GET content error:', error)

        const errorMessage = (error as Error).message

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
