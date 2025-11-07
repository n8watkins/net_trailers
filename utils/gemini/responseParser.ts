import { Content } from '../../types/atoms'

/**
 * Parses and enriches Gemini AI responses for smart search
 */

interface GeminiMovieResponse {
    title: string
    year: number
}

interface GeminiResponse {
    movies: GeminiMovieResponse[]
    rowName: string
    mediaType: 'movie' | 'tv' | 'both'
    genreFallback: number[]
}

/**
 * Strips markdown code blocks from Gemini response
 */
export function stripMarkdown(text: string): string {
    return text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
}

/**
 * Parses Gemini JSON response
 */
export function parseGeminiResponse(responseText: string): GeminiResponse {
    const cleaned = stripMarkdown(responseText)

    try {
        const parsed = JSON.parse(cleaned)

        // Validate required fields
        if (!parsed.movies || !Array.isArray(parsed.movies)) {
            throw new Error('Invalid response: missing movies array')
        }

        if (!parsed.rowName || typeof parsed.rowName !== 'string') {
            throw new Error('Invalid response: missing rowName')
        }

        if (!parsed.mediaType || !['movie', 'tv', 'both'].includes(parsed.mediaType)) {
            throw new Error('Invalid response: invalid mediaType')
        }

        return {
            movies: parsed.movies,
            rowName: parsed.rowName,
            mediaType: parsed.mediaType,
            genreFallback: parsed.genreFallback || [],
        }
    } catch (error) {
        console.error('Failed to parse Gemini response:', error)
        console.error('Raw response:', responseText)
        throw new Error('Failed to parse AI response')
    }
}

/**
 * Searches TMDB for a movie/show by title and year
 */
async function searchTMDB(
    title: string,
    year: number,
    mediaType: 'movie' | 'tv' | 'both'
): Promise<Content | null> {
    try {
        // Try movie first if mediaType allows
        if (mediaType === 'movie' || mediaType === 'both') {
            const movieResponse = await fetch(
                `/api/search?query=${encodeURIComponent(title)}&mediaType=movie`
            )

            if (movieResponse.ok) {
                const movieData = await movieResponse.json()
                // Find best match by year
                const match = movieData.results.find(
                    (m: Content) => Math.abs((m as any).release_date?.substring(0, 4) - year) <= 1
                )
                if (match) return match
            }
        }

        // Try TV if movie failed or if mediaType allows
        if (mediaType === 'tv' || mediaType === 'both') {
            const tvResponse = await fetch(
                `/api/search?query=${encodeURIComponent(title)}&mediaType=tv`
            )

            if (tvResponse.ok) {
                const tvData = await tvResponse.json()
                // Find best match by year
                const match = tvData.results.find(
                    (t: Content) => Math.abs((t as any).first_air_date?.substring(0, 4) - year) <= 1
                )
                if (match) return match
            }
        }

        return null
    } catch (error) {
        console.error(`Failed to search TMDB for ${title} (${year}):`, error)
        return null
    }
}

/**
 * Enriches Gemini movie list with full TMDB data
 */
export async function enrichWithTMDB(
    movies: GeminiMovieResponse[],
    mediaType: 'movie' | 'tv' | 'both'
): Promise<Content[]> {
    const enrichedResults: Content[] = []

    // Search TMDB for each movie in parallel (batched)
    const batchSize = 5
    for (let i = 0; i < movies.length; i += batchSize) {
        const batch = movies.slice(i, i + batchSize)

        const results = await Promise.all(
            batch.map((movie) => searchTMDB(movie.title, movie.year, mediaType))
        )

        // Filter out nulls and add to results
        enrichedResults.push(...results.filter((r): r is Content => r !== null))
    }

    return enrichedResults
}
