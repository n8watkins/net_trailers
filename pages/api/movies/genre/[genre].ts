import type { NextApiRequest, NextApiResponse } from 'next'

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

    const { genre } = req.query
    const { page = '1' } = req.query

    if (typeof genre !== 'string' || !genreMap[genre.toLowerCase()]) {
        return res.status(400).json({
            message: 'Invalid genre. Available genres: action, comedy, horror, romance, documentary'
        })
    }

    const genreId = genreMap[genre.toLowerCase()]

    try {
        const response = await fetch(
            `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=${genreId}&page=${page}`
        )

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Cache for 30 minutes
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
        res.status(200).json(data)
    } catch (error) {
        console.error('TMDB API error:', error)
        res.status(500).json({ message: `Failed to fetch ${genre} movies` })
    }
}