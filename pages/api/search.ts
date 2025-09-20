import type { NextApiRequest, NextApiResponse } from 'next'

interface SearchParams {
    query: string
    page?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    try {
        const { query, page = '1' } = req.query as Partial<SearchParams> & { query: string }

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
        const filteredResults = data.results
            .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')

        return res.status(200).json({
            results: filteredResults,
            total_results: data.total_results,
            total_pages: data.total_pages,
            page: parseInt(page)
        })

    } catch (error) {
        console.error('Search API error:', error)
        return res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        })
    }
}

