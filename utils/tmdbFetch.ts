/**
 * Secure TMDB API fetch utility
 *
 * This utility ensures API keys are passed in Authorization headers
 * instead of URL query parameters, preventing exposure in logs and browser history.
 *
 * @example
 * ```typescript
 * const data = await tmdbFetch('/trending/movie/week', { page: '1' })
 * ```
 */

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

export interface TMDBFetchOptions {
    method?: 'GET' | 'POST'
    headers?: Record<string, string>
}

/**
 * Fetch data from TMDB API with secure authentication
 *
 * @param endpoint - API endpoint (e.g., '/movie/popular')
 * @param params - Query parameters
 * @param options - Fetch options
 * @returns Promise with response data
 */
export async function tmdbFetch<T = unknown>(
    endpoint: string,
    params: Record<string, string | number> = {},
    options: TMDBFetchOptions = {}
): Promise<T> {
    if (!API_KEY) {
        throw new Error('TMDB API key not configured')
    }

    // Build URL with query parameters (NO API KEY)
    const url = new URL(`${BASE_URL}${endpoint}`)

    // Add language by default
    url.searchParams.set('language', 'en-US')

    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
    })

    // Secure fetch with Authorization header
    const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    })

    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

/**
 * Build a TMDB URL string (legacy support)
 * @deprecated Use tmdbFetch() instead for secure API calls
 */
export function buildTMDBUrl(endpoint: string, params: Record<string, string> = {}): string {
    if (!API_KEY) {
        throw new Error('TMDB API key not configured')
    }

    const url = new URL(`${BASE_URL}${endpoint}`)
    url.searchParams.set('language', 'en-US')

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
    })

    return url.toString()
}

/**
 * Get secure fetch headers for TMDB API
 */
export function getTMDBHeaders(): HeadersInit {
    if (!API_KEY) {
        throw new Error('TMDB API key not configured')
    }

    return {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
    }
}
