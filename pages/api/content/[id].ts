import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { id } = req.query

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Content ID is required' })
    }

    const contentId = parseInt(id)
    if (isNaN(contentId)) {
        return res.status(400).json({ error: 'Invalid content ID' })
    }

    const API_KEY = process.env.TMDB_API_KEY
    if (!API_KEY) {
        console.error('TMDB_API_KEY is not configured')
        return res.status(500).json({ error: 'API configuration error' })
    }

    try {
        // Try to fetch as a movie first
        const movieResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${contentId}?api_key=${API_KEY}&language=en-US`
        )

        if (movieResponse.ok) {
            const movieData = await movieResponse.json()
            // Add media_type to distinguish from TV shows
            const enrichedMovieData = {
                ...movieData,
                media_type: 'movie'
            }
            return res.status(200).json(enrichedMovieData)
        }

        // If movie fetch failed, try as a TV show
        const tvResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${contentId}?api_key=${API_KEY}&language=en-US`
        )

        if (tvResponse.ok) {
            const tvData = await tvResponse.json()
            // Add media_type and transform TV show data to match movie structure
            const enrichedTvData = {
                ...tvData,
                media_type: 'tv'
            }
            return res.status(200).json(enrichedTvData)
        }

        // If both failed, the content doesn't exist
        return res.status(404).json({ error: 'Content not found' })

    } catch (error) {
        console.error('Error fetching content details:', error)
        return res.status(500).json({ error: 'Failed to fetch content details' })
    }
}