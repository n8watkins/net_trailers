import { NextRequest, NextResponse } from 'next/server'
import { filterContentByAdultFlag } from '../../../../../utils/contentFilter'
import { filterMatureTVShows } from '../../../../../utils/tvContentRatings'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

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

        if (!API_KEY) {
            return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 })
        }

        const searchParams = request.nextUrl.searchParams
        const page = searchParams.get('page') || '1'
        const childSafetyMode = searchParams.get('childSafetyMode')
        const childSafeMode = childSafetyMode === 'true'

        // Get row configuration from query params
        const genresParam = searchParams.get('genres')
        const contentIdsParam = searchParams.get('contentIds') // Gemini-curated content list
        const genreLogic = (searchParams.get('genreLogic') || 'OR') as GenreLogic
        const mediaType = (searchParams.get('mediaType') || 'movie') as MediaType

        // Handle curated content lists (Gemini recommendations)
        // Page 1: Show curated content
        // Page 2+: Fall back to genre-based discovery (if genres exist)
        if (contentIdsParam && page === '1') {
            const contentIds = contentIdsParam.split(',').map((id) => parseInt(id.trim(), 10))

            // Fetch specific content by IDs using parallel fetching for better performance
            const fetchPromises = contentIds.map(async (tmdbId) => {
                try {
                    // For "both" media type, try movie first, then TV if it fails
                    if (mediaType === 'both') {
                        // Try movie endpoint first
                        const movieUrl = new URL(`${BASE_URL}/movie/${tmdbId}`)
                        movieUrl.searchParams.append('api_key', API_KEY)
                        movieUrl.searchParams.append('language', 'en-US')

                        const movieResponse = await fetch(movieUrl.toString())
                        if (movieResponse.ok) {
                            const item = await movieResponse.json()
                            return { ...item, media_type: 'movie' }
                        }

                        // If movie fails, try TV endpoint
                        const tvUrl = new URL(`${BASE_URL}/tv/${tmdbId}`)
                        tvUrl.searchParams.append('api_key', API_KEY)
                        tvUrl.searchParams.append('language', 'en-US')

                        const tvResponse = await fetch(tvUrl.toString())
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

                    const url = new URL(endpoint)
                    url.searchParams.append('api_key', API_KEY)
                    url.searchParams.append('language', 'en-US')

                    const response = await fetch(url.toString())
                    if (!response.ok) return null

                    const item = await response.json()
                    return {
                        ...item,
                        media_type: mediaType,
                    }
                } catch (error) {
                    console.warn(`Failed to fetch content ${tmdbId}:`, error)
                    return null
                }
            })

            const results = await Promise.all(fetchPromises)
            let enrichedResults = results.filter((item) => item !== null)

            // Apply child safety filtering if needed
            if (childSafeMode) {
                const beforeCount = enrichedResults.length
                enrichedResults = filterContentByAdultFlag(enrichedResults, true)

                const tvItems = enrichedResults.filter((item: any) => item.media_type === 'tv')
                const movieItems = enrichedResults.filter((item: any) => item.media_type !== 'tv')
                let filteredTvItems = tvItems

                if (tvItems.length > 0) {
                    filteredTvItems = await filterMatureTVShows(tvItems, API_KEY)
                }

                enrichedResults = [...movieItems, ...filteredTvItems]

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
        if (contentIdsParam && parseInt(page) > 1 && genresParam) {
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

        const genres = genresParam.split(',').map((g) => parseInt(g.trim(), 10))

        // Apply genre logic parameter
        // AND logic: with_genres=16,10402 (comma-separated)
        // OR logic: with_genres=35|53 (pipe-separated)
        const genreParam =
            genreLogic === 'AND'
                ? genres.join(',') // AND: comma-separated
                : genres.join('|') // OR: pipe-separated

        let enrichedResults: any[] = []
        let totalPages = 0
        let totalResults = 0

        // Handle "both" media type by fetching from both endpoints
        if (mediaType === 'both') {
            // Fetch movies
            const movieUrl = new URL(`${BASE_URL}/discover/movie`)
            movieUrl.searchParams.append('api_key', API_KEY)
            movieUrl.searchParams.append('language', 'en-US')
            movieUrl.searchParams.append('page', page)
            movieUrl.searchParams.append('sort_by', 'popularity.desc')
            movieUrl.searchParams.append('with_genres', genreParam)
            if (childSafeMode) {
                movieUrl.searchParams.append('certification_country', 'US')
                movieUrl.searchParams.append('certification.lte', 'PG-13')
            }

            // Fetch TV shows
            const tvUrl = new URL(`${BASE_URL}/discover/tv`)
            tvUrl.searchParams.append('api_key', API_KEY)
            tvUrl.searchParams.append('language', 'en-US')
            tvUrl.searchParams.append('page', page)
            tvUrl.searchParams.append('sort_by', 'popularity.desc')
            tvUrl.searchParams.append('with_genres', genreParam)

            // Fetch both in parallel
            const [movieResponse, tvResponse] = await Promise.all([
                fetch(movieUrl.toString()),
                fetch(tvUrl.toString()),
            ])

            if (!movieResponse.ok || !tvResponse.ok) {
                throw new Error('TMDB API error while fetching both media types')
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
            const discoverEndpoint = mediaType === 'movie' ? 'discover/movie' : 'discover/tv'
            const url = new URL(`${BASE_URL}/${discoverEndpoint}`)
            url.searchParams.append('api_key', API_KEY)
            url.searchParams.append('language', 'en-US')
            url.searchParams.append('page', page)
            url.searchParams.append('sort_by', 'popularity.desc')
            url.searchParams.append('with_genres', genreParam)

            // Apply child safety filtering
            if (childSafeMode && mediaType === 'movie') {
                url.searchParams.append('certification_country', 'US')
                url.searchParams.append('certification.lte', 'PG-13')
            }

            // Fetch from TMDB
            const response = await fetch(url.toString())

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
            enrichedResults = filterContentByAdultFlag(enrichedResults, true)

            const tvItems = enrichedResults.filter((item: any) => item.media_type === 'tv')
            const movieItems = enrichedResults.filter((item: any) => item.media_type !== 'tv')
            let filteredTvItems = tvItems

            if (tvItems.length > 0) {
                filteredTvItems = await filterMatureTVShows(tvItems, API_KEY)
            }

            enrichedResults = [...movieItems, ...filteredTvItems]

            const hiddenCount = beforeCount - enrichedResults.length

            return NextResponse.json(
                {
                    results: enrichedResults,
                    page: parseInt(page),
                    total_pages: totalPages,
                    total_results: totalResults,
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

        // Return normal results
        return NextResponse.json(
            {
                results: enrichedResults,
                page: parseInt(page),
                total_pages: totalPages,
                total_results: totalResults,
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                },
            }
        )
    } catch (error) {
        console.error('[Custom Rows API] GET content error:', error)

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
