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
        const genreLogic = (searchParams.get('genreLogic') || 'OR') as GenreLogic
        const mediaType = (searchParams.get('mediaType') || 'movie') as MediaType

        // Validate required parameters
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

            // For TV shows or mixed content, apply content rating filter
            const hasTV = enrichedResults.some((item: any) => item.media_type === 'tv')
            if (hasTV && enrichedResults.length > 0) {
                enrichedResults = await filterMatureTVShows(enrichedResults, API_KEY)
            }

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
