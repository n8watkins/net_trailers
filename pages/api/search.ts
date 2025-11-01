import type { NextApiRequest, NextApiResponse } from 'next'
import { filterContentByAdultFlag } from '../../utils/contentFilter'
import { filterMatureTVShows } from '../../utils/tvContentRatings'

interface SearchParams {
    query: string
    page?: string
    childSafetyMode?: string
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

        const data = await response.json()

        // Filter out person results (keep only movies and TV shows)
        let filteredResults = data.results.filter(
            (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
        )

        // Apply child safety filtering if enabled
        if (childSafeMode) {
            const beforeCount = filteredResults.length

            // First filter movies by adult flag
            filteredResults = filterContentByAdultFlag(filteredResults, true)

            // Separate TV shows and movies
            const tvShows = filteredResults.filter((item: any) => item.media_type === 'tv')
            const movies = filteredResults.filter((item: any) => item.media_type === 'movie')

            // Filter TV shows by content rating (server-side)
            const filteredTVShows =
                tvShows.length > 0 ? await filterMatureTVShows(tvShows, apiKey!) : []

            // Combine filtered movies and TV shows
            filteredResults = [...movies, ...filteredTVShows]

            const hiddenCount = beforeCount - filteredResults.length

            return res.status(200).json({
                results: filteredResults,
                total_results: data.total_results,
                total_pages: data.total_pages,
                page: parseInt(page),
                child_safety_enabled: true,
                hidden_count: hiddenCount,
            })
        }

        // Return normal results if child safety is off
        return res.status(200).json({
            results: filteredResults,
            total_results: data.total_results,
            total_pages: data.total_pages,
            page: parseInt(page),
        })
    } catch (error) {
        console.error('Search API error:', error)
        return res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        })
    }
}
