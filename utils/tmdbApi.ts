import type { NextApiResponse } from 'next'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

export interface TMDBError extends Error {
    status?: number
    code?: string
}

export class TMDBApiClient {
    private static instance: TMDBApiClient
    private baseUrl: string
    private apiKey: string

    private constructor() {
        if (!API_KEY) {
            throw new Error('TMDB API key not configured')
        }
        this.baseUrl = BASE_URL
        this.apiKey = API_KEY
    }

    public static getInstance(): TMDBApiClient {
        if (!TMDBApiClient.instance) {
            TMDBApiClient.instance = new TMDBApiClient()
        }
        return TMDBApiClient.instance
    }

    private buildUrl(endpoint: string, params: Record<string, string | number> = {}): string {
        const url = new URL(`${this.baseUrl}${endpoint}`)
        url.searchParams.set('api_key', this.apiKey)
        url.searchParams.set('language', 'en-US')

        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, String(value))
        })

        return url.toString()
    }

    public async fetch<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
        const url = this.buildUrl(endpoint, params)

        try {
            const response = await fetch(url)

            if (!response.ok) {
                const error: TMDBError = new Error(`TMDB API error: ${response.status} ${response.statusText}`)
                error.status = response.status
                throw error
            }

            return await response.json()
        } catch (error) {
            if (error instanceof Error && 'status' in error) {
                throw error
            }

            const tmdbError: TMDBError = new Error('Network error occurred while fetching from TMDB API')
            tmdbError.code = 'NETWORK_ERROR'
            throw tmdbError
        }
    }

    // Specific API methods
    public async getMovieDetails(id: string | number, mediaType: 'movie' | 'tv' = 'movie') {
        return this.fetch(`/${mediaType}/${id}`, { append_to_response: 'videos' })
    }

    public async getTrending(timeWindow: 'day' | 'week' = 'week', page: number = 1) {
        return this.fetch('/trending/all/week', { page })
    }

    public async getTopRated(page: number = 1) {
        return this.fetch('/movie/top_rated', { page })
    }

    public async getMoviesByGenre(genreId: number, page: number = 1) {
        return this.fetch('/discover/movie', { with_genres: genreId, page })
    }
}

// Utility function to handle API responses with consistent caching
export function setCacheHeaders(res: NextApiResponse, maxAge: number, staleWhileRevalidate: number = maxAge * 2) {
    res.setHeader('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`)
}

// Error response utility
export function handleApiError(res: NextApiResponse, error: unknown, context: string) {
    console.error(`TMDB API error (${context}):`, error)

    if (error instanceof Error && 'status' in error) {
        const tmdbError = error as TMDBError

        switch (tmdbError.status) {
            case 404:
                return res.status(404).json({ message: 'Resource not found' })
            case 429:
                return res.status(429).json({ message: 'Too many requests. Please try again later.' })
            case 500:
            case 502:
            case 503:
                return res.status(503).json({ message: 'Service temporarily unavailable. Please try again later.' })
            default:
                return res.status(500).json({ message: `Failed to ${context}` })
        }
    }

    return res.status(500).json({ message: `Failed to ${context}` })
}