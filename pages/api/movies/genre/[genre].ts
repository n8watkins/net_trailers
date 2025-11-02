import type { NextApiRequest, NextApiResponse } from 'next'
import { filterContentByAdultFlag } from '../../../../utils/contentFilter'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Genre mapping
const genreMap: Record<string, number> = {
    action: 28,
    comedy: 35,
    horror: 27,
    romance: 10749,
    documentary: 99,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    if (!API_KEY) {
        return res.status(500).json({ message: 'TMDB API key not configured' })
    }

    const { genre, childSafetyMode } = req.query
    const pageParam = req.query.page
    const page = Array.isArray(pageParam) ? pageParam[0] : pageParam || '1'
    const childSafeMode = childSafetyMode === 'true'

    if (typeof genre !== 'string' || !genreMap[genre.toLowerCase()]) {
        return res.status(400).json({
            message:
                'Invalid genre. Available genres: action, comedy, horror, romance, documentary',
        })
    }

    const genreId = genreMap[genre.toLowerCase()]

    try {
        // Build URL with certification filtering for child safety mode
        const url = new URL(`${BASE_URL}/discover/movie`)
        url.searchParams.append('api_key', API_KEY)
        url.searchParams.append('language', 'en-US')
        url.searchParams.append('with_genres', genreId.toString())
        url.searchParams.append('page', page)

        // Server-side filtering: Use TMDB's certification.lte for US ratings
        if (childSafeMode) {
            url.searchParams.append('certification_country', 'US')
            url.searchParams.append('certification.lte', 'PG-13')
        }

        const response = await fetch(url.toString())

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Add media_type to each item for consistency

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: 'movie',
        }))

        // Apply additional client-side filtering for adult flag
        // (Server-side certification.lte already filtered by rating)
        if (childSafeMode) {
            const beforeCount = enrichedResults.length
            enrichedResults = filterContentByAdultFlag(enrichedResults, true)
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
        res.status(500).json({ message: `Failed to fetch ${genre} movies` })
    }
}
