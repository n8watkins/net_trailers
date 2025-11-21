import { Content } from '../../typings'
import { getAllEmojis, AVAILABLE_COLORS } from '../../config/constants'

/**
 * Parses and enriches Gemini AI responses for smart search
 */

// Get valid emojis and colors for validation (cast to string[] for includes() compatibility)
const VALID_EMOJIS: string[] = getAllEmojis()
const VALID_COLORS: string[] = [...AVAILABLE_COLORS]

// Default fallbacks
const DEFAULT_EMOJI = '🎬'
const DEFAULT_COLOR = '#ef4444'

interface GeminiMovieResponse {
    title: string
    year: number
}

interface GeminiResponse {
    movies: GeminiMovieResponse[]
    rowName: string
    mediaType: 'movie' | 'tv' | 'both'
    genreFallback: number[]
    emoji: string
    color: string
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
 * Validates emoji is from our allowed list
 */
function validateEmoji(emoji: string | undefined): string {
    if (!emoji || !VALID_EMOJIS.includes(emoji)) {
        console.warn(`[ResponseParser] Invalid emoji "${emoji}", using default`)
        return DEFAULT_EMOJI
    }
    return emoji
}

/**
 * Validates color is from our allowed list
 */
function validateColor(color: string | undefined): string {
    if (!color || !VALID_COLORS.includes(color)) {
        console.warn(`[ResponseParser] Invalid color "${color}", using default`)
        return DEFAULT_COLOR
    }
    return color
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

        // Validate emoji and color (with fallbacks)
        const emoji = validateEmoji(parsed.emoji)
        const color = validateColor(parsed.color)

        return {
            movies: parsed.movies,
            rowName: parsed.rowName,
            mediaType: parsed.mediaType,
            genreFallback: parsed.genreFallback || [],
            emoji,
            color,
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
        const apiKey = process.env.TMDB_API_KEY
        if (!apiKey) {
            console.error('TMDB_API_KEY not configured')
            return null
        }

        // Try movie first if mediaType allows
        if (mediaType === 'movie' || mediaType === 'both') {
            const movieResponse = await fetch(
                `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}`
            )

            if (movieResponse.ok) {
                const movieData = await movieResponse.json()
                // Find best match by year
                const match = movieData.results.find((m: any) => {
                    const releaseYear = m.release_date
                        ? parseInt(m.release_date.substring(0, 4))
                        : 0
                    return Math.abs(releaseYear - year) <= 1
                })
                if (match) {
                    return {
                        ...match,
                        media_type: 'movie',
                    } as Content
                }
            }
        }

        // Try TV if movie failed or if mediaType allows
        if (mediaType === 'tv' || mediaType === 'both') {
            const tvResponse = await fetch(
                `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(title)}`
            )

            if (tvResponse.ok) {
                const tvData = await tvResponse.json()
                // Find best match by year
                const match = tvData.results.find((t: any) => {
                    const airYear = t.first_air_date
                        ? parseInt(t.first_air_date.substring(0, 4))
                        : 0
                    return Math.abs(airYear - year) <= 1
                })
                if (match) {
                    return {
                        ...match,
                        media_type: 'tv',
                    } as Content
                }
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
