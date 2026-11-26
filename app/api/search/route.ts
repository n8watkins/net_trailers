import { NextRequest, NextResponse } from 'next/server'
import { searchCache } from '../../../utils/apiCache'
import { childSafetyForRequest } from '@/lib/childSafetyServer'
import { filterChildSafe } from '@/utils/childSafetyFilter'
import { apiError } from '../../../utils/debugLogger'

// Cache this route for 10 minutes
export const revalidate = 600

interface TMDBSearchResult {
    id: number
    media_type: 'movie' | 'tv' | 'person'
    adult?: boolean
    title?: string
    name?: string
    poster_path?: string
    backdrop_path?: string
}

interface TMDBSearchResponse {
    results: TMDBSearchResult[]
    total_results: number
    total_pages: number
    page: number
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get('query')
        const page = searchParams.get('page') || '1'
        // The server decides (lib/childSafetyServer.ts); the parameter can only add filtering.
        const childSafeMode = await childSafetyForRequest(request)

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ message: 'Query parameter is required' }, { status: 400 })
        }

        const apiKey = process.env.TMDB_API_KEY
        if (!apiKey) {
            return NextResponse.json({ message: 'API key not configured' }, { status: 500 })
        }

        // Create cache key including all relevant parameters
        const cacheKey = `search-${query.trim()}-page-${page}-childSafe-${childSafeMode}`

        // Check cache first
        const cachedData = searchCache.get(cacheKey)
        if (cachedData) {
            return NextResponse.json(cachedData, { status: 200 })
        }

        // Build the TMDB search URL
        const searchUrl = new URL('https://api.themoviedb.org/3/search/multi')
        searchUrl.searchParams.append('api_key', apiKey)
        searchUrl.searchParams.append('query', query.trim())
        searchUrl.searchParams.append('page', page)
        searchUrl.searchParams.append('include_adult', 'false')

        const response = await fetch(searchUrl.toString())

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
        }

        const data: TMDBSearchResponse = await response.json()

        // Filter out person results (keep only movies and TV shows)
        let filteredResults = data.results.filter(
            (item: TMDBSearchResult) => item.media_type === 'movie' || item.media_type === 'tv'
        )

        // Apply child safety filtering if enabled
        if (childSafeMode) {
            const beforeCount = filteredResults.length

            // Search answers are not pre-rated, so movies get their
            // certification checked too (before, only the adult flag was).
            filteredResults = await filterChildSafe(filteredResults, apiKey)

            const hiddenCount = beforeCount - filteredResults.length

            const childSafeResponse = {
                results: filteredResults,
                total_results: data.total_results,
                total_pages: data.total_pages,
                page: parseInt(page),
                child_safety_enabled: true,
                hidden_count: hiddenCount,
            }

            // Cache the result (10 minutes TTL from searchCache settings)
            searchCache.set(cacheKey, childSafeResponse)

            return NextResponse.json(childSafeResponse, {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
                },
            })
        }

        // Return normal results if child safety is off
        const normalResponse = {
            results: filteredResults,
            total_results: data.total_results,
            total_pages: data.total_pages,
            page: parseInt(page),
        }

        // Cache the result (10 minutes TTL from searchCache settings)
        searchCache.set(cacheKey, normalResponse)

        return NextResponse.json(normalResponse, {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
            },
        })
    } catch (error) {
        apiError('Search API error:', error)
        return NextResponse.json(
            {
                message: 'Internal server error',
                error:
                    process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
            },
            { status: 500 }
        )
    }
}
