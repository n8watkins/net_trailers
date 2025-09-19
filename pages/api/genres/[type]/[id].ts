import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { type, id, page = '1' } = req.query

    if (!id || typeof id !== 'string' || !type || typeof type !== 'string') {
        return res.status(400).json({ error: 'Genre ID and type are required' })
    }

    const genreId = parseInt(id)
    if (isNaN(genreId)) {
        return res.status(400).json({ error: 'Invalid genre ID' })
    }

    const pageNum = parseInt(Array.isArray(page) ? page[0] : page)
    if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({ error: 'Invalid page number' })
    }

    if (type !== 'movie' && type !== 'tv') {
        return res.status(400).json({ error: 'Type must be either "movie" or "tv"' })
    }

    const API_KEY = process.env.TMDB_API_KEY
    if (!API_KEY) {
        console.error('TMDB_API_KEY is not configured')
        return res.status(500).json({ error: 'API configuration error' })
    }

    try {
        const endpoint = type === 'movie'
            ? `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&page=${pageNum}&sort_by=popularity.desc`
            : `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&with_genres=${genreId}&page=${pageNum}&sort_by=popularity.desc`

        const response = await fetch(endpoint)

        if (!response.ok) {
            console.error(`TMDB API error: ${response.status} ${response.statusText}`)
            return res.status(response.status).json({ error: 'Failed to fetch content from TMDB' })
        }

        const data = await response.json()

        // Add media_type to each item for consistency
        const enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: type
        }))

        return res.status(200).json({
            ...data,
            results: enrichedResults
        })

    } catch (error) {
        console.error('Error fetching genre content:', error)
        return res.status(500).json({ error: 'Failed to fetch genre content' })
    }
}