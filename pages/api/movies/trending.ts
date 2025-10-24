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

        const response = await fetch(
            `${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=en-US&page=1`
        )

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Apply child safety filtering if enabled
        if (childSafeMode) {
            const beforeCount = data.results.length
            const filteredResults = filterContentByAdultFlag(data.results, true)
            const hiddenCount = beforeCount - filteredResults.length

            // Cache for 1 hour
            res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
            return res.status(200).json({
                ...data,
                results: filteredResults,
                child_safety_enabled: true,
                hidden_count: hiddenCount,
            })
        }

        // Keep original mixed data with existing media_type from TMDB
        // Cache for 1 hour
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
        res.status(200).json(data)
    } catch (error) {
        console.error('TMDB API error:', error)
        res.status(500).json({ message: 'Failed to fetch trending movies' })
    }
}
