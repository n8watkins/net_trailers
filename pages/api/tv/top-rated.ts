import type { NextApiRequest, NextApiResponse } from 'next'
import { filterMatureTVShows } from '../../../utils/tvContentRatings'

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
        const { page = '1', childSafetyMode } = req.query
        const childSafeMode = childSafetyMode === 'true'

        const response = await fetch(
            `${BASE_URL}/tv/top_rated?api_key=${API_KEY}&language=en-US&page=${page}`
        )

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Add media_type to each item for consistency
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: 'tv',
        }))

        // Apply child safety filtering if enabled
        if (childSafeMode) {
            const beforeCount = enrichedResults.length

            // Filter TV shows by content rating (server-side)
            enrichedResults = await filterMatureTVShows(enrichedResults, API_KEY!)

            const hiddenCount = beforeCount - enrichedResults.length

            // Cache for 30 minutes
            res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
            return res.status(200).json({
                ...data,
                results: enrichedResults,
                child_safety_enabled: true,
                hidden_count: hiddenCount,
            })
        }

        // Cache for 30 minutes
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
        res.status(200).json({
            ...data,
            results: enrichedResults,
        })
    } catch (error) {
        console.error('TMDB API error:', error)
        res.status(500).json({ message: 'Failed to fetch top-rated TV shows' })
    }
}
