import type { NextApiRequest, NextApiResponse } from 'next'
import { filterContentByAdultFlag } from '../../../utils/contentFilter'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    if (!API_KEY) {
        return res.status(500).json({ message: 'TMDB API key not configured' })
    }

    try {
        const { childSafetyMode } = req.query
        const childSafeMode = childSafetyMode === 'true'

        let url: string

        if (childSafeMode) {
            // In child safety mode, use discover with certification filtering instead of trending
            // This ensures only G/PG/PG-13 movies are returned
            url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=1&sort_by=popularity.desc&certification_country=US&certification.lte=PG-13`
        } else {
            // Normal mode - use trending endpoint for mixed content
            url = `${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=en-US&page=1`
        }

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Add media_type to results if not present (discover doesn't include it)
        const enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: item.media_type || 'movie',
        }))

        // Cache for 1 hour
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

        if (childSafeMode) {
            return res.status(200).json({
                ...data,
                results: enrichedResults,
                child_safety_enabled: true,
                hidden_count: 0, // No filtering needed - certification handles it
            })
        }

        res.status(200).json({
            ...data,
            results: enrichedResults,
        })
    } catch (error) {
        console.error('TMDB API error:', error)
        res.status(500).json({ message: 'Failed to fetch trending movies' })
    }
}
