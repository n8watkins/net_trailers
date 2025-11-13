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
        // TMDB API v3 requires api_key as query parameter
        url.searchParams.set('api_key', this.apiKey)
        url.searchParams.set('language', 'en-US')

        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, String(value))
        })

        return url.toString()
    }

    public async fetch<T>(
        endpoint: string,
        params: Record<string, string | number> = {}
    ): Promise<T> {
        const url = this.buildUrl(endpoint, params)

        try {
            // TMDB API v3 uses api_key query parameter (not Bearer token)
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                const error: TMDBError = new Error(
                    `TMDB API error: ${response.status} ${response.statusText}`
                )
                error.status = response.status
                throw error
            }

            return await response.json()
        } catch (error) {
            if (error instanceof Error && 'status' in error) {
                throw error
            }

            const tmdbError: TMDBError = new Error(
                'Network error occurred while fetching from TMDB API'
            )
            tmdbError.code = 'NETWORK_ERROR'
            throw tmdbError
        }
    }

    // Specific API methods
    public async getMovieDetails(id: string | number, mediaType: 'movie' | 'tv' = 'movie') {
        return this.fetch(`/${mediaType}/${id}`, {
            append_to_response: 'videos,credits,external_ids,release_dates,content_ratings',
        })
    }

    public async getTrending(_timeWindow: 'day' | 'week' = 'week', page: number = 1) {
        return this.fetch('/trending/all/week', { page })
    }

    public async getTopRated(page: number = 1) {
        return this.fetch('/movie/top_rated', { page })
    }

    public async getMoviesByGenre(genreId: number, page: number = 1) {
        return this.fetch('/discover/movie', { with_genres: genreId, page })
    }
}

/**
 * Set HTTP cache headers for API responses
 *
 * Configures Cache-Control headers for optimal CDN caching and stale-while-revalidate behavior.
 * Use this for all TMDB proxy API routes to reduce API calls and improve performance.
 *
 * @param res - Next.js API response object
 * @param maxAge - Maximum age in seconds for fresh cache
 * @param staleWhileRevalidate - Time in seconds to serve stale content while revalidating (defaults to maxAge * 2)
 *
 * @example
 * ```tsx
 * // In API route handler
 * export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   const data = await fetchFromTMDB()
 *   setCacheHeaders(res, 3600) // Cache for 1 hour
 *   res.status(200).json(data)
 * }
 * ```
 */
export function setCacheHeaders(
    res: NextApiResponse,
    maxAge: number,
    staleWhileRevalidate: number = maxAge * 2
) {
    res.setHeader(
        'Cache-Control',
        `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    )
}

/**
 * Handle TMDB API errors with consistent error responses
 *
 * Converts TMDB API errors into appropriate HTTP responses with user-friendly messages.
 * Handles common error cases like 404, 429 (rate limiting), and 5xx server errors.
 *
 * @param res - Next.js API response object
 * @param error - The error object from TMDB API call
 * @param context - Description of the operation for error messages (e.g., "fetch movies")
 *
 * @example
 * ```tsx
 * try {
 *   const data = await tmdbClient.fetch('/movie/popular')
 *   res.status(200).json(data)
 * } catch (error) {
 *   handleApiError(res, error, 'fetch popular movies')
 * }
 * ```
 */
export function handleApiError(res: NextApiResponse, error: unknown, context: string) {
    console.error(`TMDB API error (${context}):`, error)

    if (error instanceof Error && 'status' in error) {
        const tmdbError = error as TMDBError

        switch (tmdbError.status) {
            case 404:
                return res.status(404).json({ message: 'Resource not found' })
            case 429:
                return res
                    .status(429)
                    .json({ message: 'Too many requests. Please try again later.' })
            case 500:
            case 502:
            case 503:
                return res
                    .status(503)
                    .json({ message: 'Service temporarily unavailable. Please try again later.' })
            default:
                return res.status(500).json({ message: `Failed to ${context}` })
        }
    }

    return res.status(500).json({ message: `Failed to ${context}` })
}
