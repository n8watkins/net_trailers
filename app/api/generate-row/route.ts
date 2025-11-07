import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified Smart Row Generator - Single API call does everything
 *
 * Flow:
 * 1. User provides query
 * 2. Gemini returns movies with TMDB IDs + row name + metadata
 * 3. Frontend displays preview immediately
 *
 * This replaces the complex multi-step flow with instant results.
 */
export async function POST(request: NextRequest) {
    try {
        const { query } = await request.json()

        // Validate input
        if (!query || query.trim().length < 3) {
            return NextResponse.json({ error: 'Query too short' }, { status: 400 })
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured')
            return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
        }

        // Build prompt for Gemini
        const prompt = buildGenerateRowPrompt(query)

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.4, // Balanced creativity
                        maxOutputTokens: 2000,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        )

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`)
        }

        const data = await response.json()
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!resultText) {
            throw new Error('No response from Gemini')
        }

        // Parse JSON response
        const cleanedText = resultText
            .replace(/^```json\s*\n?/i, '')
            .replace(/\n?```\s*$/, '')
            .trim()

        const geminiResult = JSON.parse(cleanedText)

        // Validate and enrich with TMDB data
        const enrichedMovies = await enrichMoviesWithTMDB(
            geminiResult.movies || [],
            geminiResult.mediaType || 'movie'
        )

        return NextResponse.json({
            movies: enrichedMovies,
            rowName: geminiResult.rowName || 'Custom Row',
            mediaType: geminiResult.mediaType || 'movie',
            genreFallback: geminiResult.genreFallback || [],
        })
    } catch (error) {
        console.error('Generate row error:', error)
        return NextResponse.json(
            { error: 'Failed to generate row', details: (error as Error).message },
            { status: 500 }
        )
    }
}

/**
 * Build Gemini prompt for movie recommendations
 */
function buildGenerateRowPrompt(query: string): string {
    return `You are a movie/TV recommendation expert with deep knowledge of TMDB (The Movie Database).

User Query: "${query}"

Generate 10-15 movie/TV recommendations that match this query. Return ONLY this JSON structure:

{
  "movies": [
    {
      "title": "Blade Runner",
      "year": 1982,
      "tmdbId": 78,
      "reason": "Neo-noir sci-fi with dark atmosphere"
    }
  ],
  "rowName": "Dystopian Futures",
  "mediaType": "movie"|"tv"|"both",
  "genreFallback": [878, 53]
}

**CRITICAL RULES:**

1. **TMDB IDs:** Provide exact TMDB IDs for popular/well-known titles. For obscure titles, set tmdbId to null (we'll search by title+year).

2. **Row Name:** Create a creative, catchy name (1-4 words):
   - Use internet slang, pop culture references
   - Examples: "Peak Sci-Fi", "Certified Bangers", "Chef's Kiss", "No Skips"
   - Make it surprising and delightful!

3. **Media Type:**
   - "series/show/tv" → "tv"
   - "film/movie" → "movie"
   - Mixed or unclear → "both"

4. **Genre Fallback:** Provide 1-3 TMDB genre IDs as backup:

MOVIE GENRES:
- 28: Action, 12: Adventure, 16: Animation, 35: Comedy, 80: Crime
- 99: Documentary, 18: Drama, 10751: Family, 14: Fantasy, 36: History
- 27: Horror, 10402: Music, 9648: Mystery, 10749: Romance
- 878: Science Fiction, 53: Thriller, 10752: War, 37: Western

TV GENRES:
- 10759: Action & Adventure, 16: Animation, 35: Comedy, 80: Crime
- 99: Documentary, 18: Drama, 10751: Family, 10762: Kids
- 9648: Mystery, 10765: Sci-Fi & Fantasy, 10768: War & Politics

5. **Quality:** Only recommend titles you're confident match the query. Prioritize well-known titles for TMDB ID accuracy.

Examples:

Query: "dark scifi thriller"
{
  "movies": [
    {"title": "Blade Runner", "year": 1982, "tmdbId": 78, "reason": "Dystopian noir atmosphere"},
    {"title": "Ex Machina", "year": 2014, "tmdbId": 264660, "reason": "AI thriller with tension"},
    {"title": "Moon", "year": 2009, "tmdbId": 17431, "reason": "Psychological isolation"}
  ],
  "rowName": "Dystopian Nightmares",
  "mediaType": "movie",
  "genreFallback": [878, 53]
}

Query: "best denzel washington movies"
{
  "movies": [
    {"title": "Training Day", "year": 2001, "tmdbId": 2567, "reason": "Oscar-winning performance"},
    {"title": "Malcolm X", "year": 1992, "tmdbId": 488, "reason": "Powerful biographical drama"}
  ],
  "rowName": "THE GOAT",
  "mediaType": "movie",
  "genreFallback": [18, 80]
}

Return ONLY valid JSON, no additional text.`
}

/**
 * Enrich movie data with TMDB information
 * Falls back to search if tmdbId not provided
 */
async function enrichMoviesWithTMDB(
    movies: Array<{
        title: string
        year?: number
        tmdbId?: number | null
        reason?: string
    }>,
    mediaType: string
): Promise<
    Array<{
        title: string
        year: number
        tmdbId: number
        posterPath: string | null
        rating: number
        reason: string
    }>
> {
    const API_KEY = process.env.TMDB_API_KEY
    if (!API_KEY) {
        throw new Error('TMDB API key not configured')
    }

    const enrichedMovies: Array<{
        title: string
        year: number
        tmdbId: number
        posterPath: string | null
        rating: number
        reason: string
    }> = []

    // Process movies in parallel
    const promises = movies.map(async (movie) => {
        try {
            let tmdbId = movie.tmdbId
            let tmdbData: any = null

            // If Gemini provided TMDB ID, fetch directly
            if (tmdbId) {
                const endpoint =
                    mediaType === 'tv'
                        ? `https://api.themoviedb.org/3/tv/${tmdbId}`
                        : `https://api.themoviedb.org/3/movie/${tmdbId}`

                const response = await fetch(`${endpoint}?api_key=${API_KEY}`)
                if (response.ok) {
                    tmdbData = await response.json()
                }
            }

            // Fallback: Search by title + year
            if (!tmdbData) {
                const searchEndpoint =
                    mediaType === 'tv'
                        ? 'https://api.themoviedb.org/3/search/tv'
                        : 'https://api.themoviedb.org/3/search/movie'

                const searchUrl = `${searchEndpoint}?api_key=${API_KEY}&query=${encodeURIComponent(movie.title)}`
                const searchResponse = await fetch(searchUrl)

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json()
                    const results = searchData.results || []

                    // Find best match by year
                    let bestMatch = results[0]
                    if (movie.year && results.length > 1) {
                        for (const result of results) {
                            const releaseYear = parseInt(
                                (result.release_date || result.first_air_date || '').split('-')[0]
                            )
                            if (releaseYear === movie.year) {
                                bestMatch = result
                                break
                            }
                        }
                    }

                    if (bestMatch) {
                        tmdbData = bestMatch
                        tmdbId = bestMatch.id
                    }
                }
            }

            // Return enriched data
            if (tmdbData && tmdbId) {
                return {
                    title: tmdbData.title || tmdbData.name || movie.title,
                    year:
                        parseInt(
                            (tmdbData.release_date || tmdbData.first_air_date || '').split('-')[0]
                        ) ||
                        movie.year ||
                        0,
                    tmdbId,
                    posterPath: tmdbData.poster_path || null,
                    rating: tmdbData.vote_average || 0,
                    reason: movie.reason || '',
                }
            }

            return null
        } catch (error) {
            console.warn(`Failed to enrich movie "${movie.title}":`, error)
            return null
        }
    })

    const results = await Promise.all(promises)
    enrichedMovies.push(...results.filter((m): m is NonNullable<typeof m> => m !== null))

    return enrichedMovies
}
