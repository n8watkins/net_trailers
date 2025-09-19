import type { NextApiRequest, NextApiResponse } from 'next'

interface SearchParams {
    query: string
    page?: string
    with_genres?: string
    'primary_release_date.gte'?: string
    'primary_release_date.lte'?: string
    'vote_average.gte'?: string
    'vote_average.lte'?: string
    sort_by?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    try {
        const {
            query,
            page = '1',
            with_genres,
            'primary_release_date.gte': yearFrom,
            'primary_release_date.lte': yearTo,
            'vote_average.gte': ratingFrom,
            'vote_average.lte': ratingTo,
            sort_by
        } = req.query as SearchParams

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ message: 'Query parameter is required' })
        }

        const apiKey = process.env.TMDB_API_KEY
        if (!apiKey) {
            return res.status(500).json({ message: 'API key not configured' })
        }

        // Build the TMDB search URL
        const searchUrl = new URL('https://api.themoviedb.org/3/search/multi')
        searchUrl.searchParams.append('api_key', apiKey)
        searchUrl.searchParams.append('query', query)
        searchUrl.searchParams.append('page', page)
        searchUrl.searchParams.append('include_adult', 'false')

        // If we have filters, we need to use discover endpoints instead
        let movieResults = []
        let tvResults = []

        if (with_genres || yearFrom || yearTo || ratingFrom || ratingTo || sort_by) {
            // Use discover endpoints for filtered search
            const [movieResponse, tvResponse] = await Promise.all([
                fetchDiscoverMovies(apiKey, query, {
                    page,
                    with_genres,
                    'primary_release_date.gte': yearFrom,
                    'primary_release_date.lte': yearTo,
                    'vote_average.gte': ratingFrom,
                    'vote_average.lte': ratingTo,
                    sort_by
                }),
                fetchDiscoverTV(apiKey, query, {
                    page,
                    with_genres,
                    'first_air_date.gte': yearFrom,
                    'first_air_date.lte': yearTo,
                    'vote_average.gte': ratingFrom,
                    'vote_average.lte': ratingTo,
                    sort_by
                })
            ])

            movieResults = movieResponse.results.map((movie: any) => ({
                ...movie,
                media_type: 'movie'
            }))

            tvResults = tvResponse.results.map((show: any) => ({
                ...show,
                media_type: 'tv'
            }))

            // Combine and sort results
            const allResults = [...movieResults, ...tvResults]

            // Apply sorting if specified
            if (sort_by) {
                const [sortField, sortOrder] = sort_by.split('.')
                allResults.sort((a, b) => {
                    let aValue = a[sortField] || 0
                    let bValue = b[sortField] || 0

                    if (sortField === 'title') {
                        aValue = a.title || a.name || ''
                        bValue = b.title || b.name || ''
                    }

                    if (typeof aValue === 'string') {
                        return sortOrder === 'asc'
                            ? aValue.localeCompare(bValue)
                            : bValue.localeCompare(aValue)
                    }

                    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
                })
            }

            return res.status(200).json({
                results: allResults.slice(0, 20), // Limit to 20 results per page
                total_results: allResults.length,
                total_pages: Math.ceil(allResults.length / 20),
                page: parseInt(page)
            })
        } else {
            // Use regular search for simple queries
            const response = await fetch(searchUrl.toString())

            if (!response.ok) {
                throw new Error('Failed to fetch from TMDB')
            }

            const data = await response.json()

            // Filter out person results (keep only movies and TV shows)
            const filteredResults = data.results
                .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')

            return res.status(200).json({
                ...data,
                results: filteredResults
            })
        }

    } catch (error) {
        console.error('Search API error:', error)
        return res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

async function fetchDiscoverMovies(apiKey: string, query: string, params: any) {
    const url = new URL('https://api.themoviedb.org/3/discover/movie')
    url.searchParams.append('api_key', apiKey)
    url.searchParams.append('include_adult', 'false')

    // Add search query as keyword filter (approximate)
    if (query) {
        url.searchParams.append('with_keywords', query)
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value && key !== 'page') {
            url.searchParams.append(key, value as string)
        }
    })

    if (params.page) {
        url.searchParams.append('page', params.page)
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
        throw new Error('Failed to fetch movies from TMDB')
    }

    return response.json()
}

async function fetchDiscoverTV(apiKey: string, query: string, params: any) {
    const url = new URL('https://api.themoviedb.org/3/discover/tv')
    url.searchParams.append('api_key', apiKey)
    url.searchParams.append('include_adult', 'false')

    // Add search query as keyword filter (approximate)
    if (query) {
        url.searchParams.append('with_keywords', query)
    }

    Object.entries(params).forEach(([key, value]) => {
        if (value && key !== 'page') {
            // Convert movie-specific params to TV params
            if (key.startsWith('primary_release_date')) {
                const tvKey = key.replace('primary_release_date', 'first_air_date')
                url.searchParams.append(tvKey, value as string)
            } else {
                url.searchParams.append(key, value as string)
            }
        }
    })

    if (params.page) {
        url.searchParams.append('page', params.page)
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
        throw new Error('Failed to fetch TV shows from TMDB')
    }

    return response.json()
}