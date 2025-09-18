import type { NextApiRequest, NextApiResponse } from 'next'
import { TMDBApiClient, setCacheHeaders, handleApiError } from '../../../../utils/tmdbApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    const { id, media_type = 'movie' } = req.query

    if (!id) {
        return res.status(400).json({ message: 'Movie/TV show ID is required' })
    }

    // Validate media_type
    if (media_type !== 'movie' && media_type !== 'tv') {
        return res.status(400).json({ message: 'media_type must be either "movie" or "tv"' })
    }

    try {
        const tmdbClient = TMDBApiClient.getInstance()
        const data = await tmdbClient.getMovieDetails(id as string, media_type as 'movie' | 'tv')

        // Cache for 6 hours (movie/TV details don't change often)
        setCacheHeaders(res, 21600, 86400)
        res.status(200).json(data)
    } catch (error) {
        return handleApiError(res, error, 'fetch movie/TV show details')
    }
}