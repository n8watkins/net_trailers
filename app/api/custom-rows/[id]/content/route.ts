import { NextRequest, NextResponse } from 'next/server'
import { CustomRowsFirestore } from '../../../../../utils/firestore/customRows'
import { filterContentByAdultFlag } from '../../../../../utils/contentFilter'
import { filterMatureTVShows } from '../../../../../utils/tvContentRatings'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

/**
 * Helper to extract userId from request headers
 */
function getUserIdFromRequest(request: NextRequest): string | null {
    return request.headers.get('X-User-ID') || null
}

/**
 * GET /api/custom-rows/[id]/content
 *
 * Fetch TMDB content for a custom row based on its genre configuration.
 *
 * Headers:
 *   X-User-ID: string (required) - Firebase UID or Guest ID
 *
 * Query Parameters:
 *   - page: number (optional, default: 1)
 *   - childSafetyMode: boolean (optional, default: false)
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
        const { id: rowId } = await params
        const userId = getUserIdFromRequest(request)

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'User ID is required' },
                { status: 401 }
            )
        }

        if (!API_KEY) {
            return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 })
        }

        const searchParams = request.nextUrl.searchParams
        const page = searchParams.get('page') || '1'
        const childSafetyMode = searchParams.get('childSafetyMode')
        const childSafeMode = childSafetyMode === 'true'

        // Get the custom row configuration
        const row = await CustomRowsFirestore.getCustomRow(userId, rowId)

        if (!row) {
            return NextResponse.json(
                { error: 'Not found', message: 'Custom row not found' },
                { status: 404 }
            )
        }

        // Build TMDB discover URL based on row configuration
        const discoverEndpoint = row.mediaType === 'movie' ? 'discover/movie' : 'discover/tv'
        const url = new URL(`${BASE_URL}/${discoverEndpoint}`)
        url.searchParams.append('api_key', API_KEY)
        url.searchParams.append('language', 'en-US')
        url.searchParams.append('page', page)
        url.searchParams.append('sort_by', 'popularity.desc')

        // Apply genre logic
        // AND logic: with_genres=16,10402 (comma-separated)
        // OR logic: with_genres=35|53 (pipe-separated)
        const genreParam =
            row.genreLogic === 'AND'
                ? row.genres.join(',') // AND: comma-separated
                : row.genres.join('|') // OR: pipe-separated

        url.searchParams.append('with_genres', genreParam)

        // Apply child safety filtering
        if (childSafeMode) {
            if (row.mediaType === 'movie') {
                // For movies: filter by certification
                url.searchParams.append('certification_country', 'US')
                url.searchParams.append('certification.lte', 'PG-13')
            }
            // For TV shows: we'll filter after fetching using filterMatureTVShows
        }

        // Fetch from TMDB
        const response = await fetch(url.toString())

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // Enrich results with media_type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: row.mediaType,
        }))

        // Apply child safety filtering
        if (childSafeMode) {
            const beforeCount = enrichedResults.length

            // Filter by adult flag
            enrichedResults = filterContentByAdultFlag(enrichedResults, true)

            // For TV shows, apply content rating filter
            if (row.mediaType === 'tv' && enrichedResults.length > 0) {
                enrichedResults = await filterMatureTVShows(enrichedResults, API_KEY)
            }

            const hiddenCount = beforeCount - enrichedResults.length

            return NextResponse.json(
                {
                    results: enrichedResults,
                    page: parseInt(page),
                    total_pages: data.total_pages,
                    total_results: data.total_results,
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
                total_pages: data.total_pages,
                total_results: data.total_results,
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
