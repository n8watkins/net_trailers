import { NextRequest, NextResponse } from 'next/server'
import { filterContentByAdultFlag } from '../../../utils/contentFilter'
import { filterMatureTVShows } from '../../../utils/tvContentRatings'
import { searchCache } from '../../../utils/apiCache'
import type { Content } from '../../../typings'
import { apiError } from '../../../utils/debugLogger'

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
        const childSafetyMode = searchParams.get('childSafetyMode')
        const childSafeMode = childSafetyMode === 'true'

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

            // First filter movies by adult flag (cast to Content[] for filter function)
            filteredResults = filterContentByAdultFlag(
                filteredResults as unknown as Content[],
                true
            ) as unknown as TMDBSearchResult[]

            // Separate TV shows and movies
            const tvShows = filteredResults.filter((item) => item.media_type === 'tv')
            const movies = filteredResults.filter((item) => item.media_type === 'movie')

            // Filter TV shows by content rating (server-side)
            const filteredTVShows =
                tvShows.length > 0
                    ? await filterMatureTVShows(tvShows as unknown as Content[], apiKey!)
                    : []

            // Combine filtered movies and TV shows
            filteredResults = [...movies, ...filteredTVShows]

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

            return NextResponse.json(childSafeResponse, { status: 200 })
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

        return NextResponse.json(normalResponse, { status: 200 })
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
