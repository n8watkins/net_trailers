import type { NextApiRequest, NextApiResponse } from 'next'
import { filterContentByAdultFlag } from '../../utils/contentFilter'
import { filterMatureTVShows } from '../../utils/tvContentRatings'
import { searchCache } from '../../utils/apiCache'
import type { Content } from '../../typings'

interface SearchParams {
    query: string
    page?: string
    childSafetyMode?: string
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    try {
        const {
            query,
            page = '1',
            childSafetyMode,
        } = req.query as Partial<SearchParams> & { query: string }
        const childSafeMode = childSafetyMode === 'true'

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({ message: 'Query parameter is required' })
        }

        const apiKey = process.env.TMDB_API_KEY
        if (!apiKey) {
            return res.status(500).json({ message: 'API key not configured' })
        }

        // Create cache key including all relevant parameters
        const cacheKey = `search-${query.trim()}-page-${page}-childSafe-${childSafeMode}`

        // Check cache first
        const cachedData = searchCache.get(cacheKey)
        if (cachedData) {
            return res.status(200).json(cachedData)
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

            return res.status(200).json(childSafeResponse)
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

        return res.status(200).json(normalResponse)
    } catch (error) {
        console.error('Search API error:', error)
        return res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        })
    }
}
