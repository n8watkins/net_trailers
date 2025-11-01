import type { NextApiRequest, NextApiResponse } from 'next'
import { TMDBApiClient, setCacheHeaders, handleApiError } from '../../../../utils/tmdbApi'
import { fetchTVContentRatings, hasMatureRating } from '../../../../utils/tvContentRatings'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    const { id, media_type = 'movie', childSafetyMode } = req.query
    const childSafeMode = childSafetyMode === 'true'

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

        // Apply child safety filtering
        if (childSafeMode) {
            if (media_type === 'movie') {
                // Check adult flag for movies
                if ((data as any).adult === true) {
                    return res.status(403).json({
                        message: 'Content blocked by child safety mode',
                        reason: 'adult_content',
                    })
                }
            } else if (media_type === 'tv') {
                // Check content ratings for TV shows
                const API_KEY = process.env.TMDB_API_KEY
                if (API_KEY) {
                    const contentId = typeof id === 'string' ? parseInt(id) : id
                    const ratings = await fetchTVContentRatings(contentId as number, API_KEY)
                    if (ratings && hasMatureRating(ratings)) {
                        return res.status(403).json({
                            message: 'Content blocked by child safety mode',
                            reason: 'mature_rating',
                        })
                    }
                }
            }
        }

        // Cache for 6 hours (movie/TV details don't change often)
        setCacheHeaders(res, 21600, 86400)
        res.status(200).json(data)
    } catch (error) {
        return handleApiError(res, error, 'fetch movie/TV show details')
    }
}
