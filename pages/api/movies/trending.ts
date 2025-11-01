import type { NextApiRequest, NextApiResponse } from 'next'
import { filterContentByAdultFlag } from '../../../utils/contentFilter'
import { filterMatureMovies } from '../../../utils/movieCertifications'

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
            // ✅ RATING-BASED FILTERING STRATEGY
            // Use discover endpoint with certification filter for all movies
            // certification.lte=PG-13 ensures only G, PG, and PG-13 rated movies
            // Sorted by popularity for trending content
            url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&page=1&sort_by=popularity.desc&certification_country=US&certification.lte=PG-13&include_adult=false&vote_count.gte=100`
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
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: item.media_type || 'movie',
        }))

        // Cache for 1 hour
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

        if (childSafeMode) {
            // Apply post-fetch certification filtering for maximum safety
            const beforeCount = enrichedResults.length
            enrichedResults = await filterMatureMovies(enrichedResults, API_KEY!)
            const hiddenCount = beforeCount - enrichedResults.length

            return res.status(200).json({
                ...data,
                results: enrichedResults,
                child_safety_enabled: true,
                hidden_count: hiddenCount,
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
