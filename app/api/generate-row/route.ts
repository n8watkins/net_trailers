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
        console.log('=== GENERATE ROW REQUEST ===')
        console.log('User Query:', query)
        console.log('Prompt sent to Gemini:', prompt)
        console.log('============================')

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
                        maxOutputTokens: 4000, // Increased to handle full response with row name
                        responseMimeType: 'application/json',
                    },
                }),
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Gemini API error response:', errorText)
            throw new Error(`Gemini API error: ${response.status}`)
        }

        const data = await response.json()
        console.log('\n=== GEMINI RESPONSE ===')
        console.log('Finish Reason:', data.candidates?.[0]?.finishReason)
        console.log('Raw response:', JSON.stringify(data, null, 2))
        console.log('======================\n')

        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!resultText) {
            console.error('❌ Gemini response structure:', data)
            throw new Error('No response from Gemini')
        }

        console.log('📝 Gemini result text:', resultText)

        // Parse JSON response
        const cleanedText = resultText
            .replace(/^```json\s*\n?/i, '')
            .replace(/\n?```\s*$/, '')
            .trim()

        console.log('🧹 Cleaned text for parsing:', cleanedText)

        const geminiResult = JSON.parse(cleanedText)
        console.log('✅ Parsed successfully:', {
            movieCount: geminiResult.movies?.length,
            rowName: geminiResult.rowName,
            mediaType: geminiResult.mediaType,
        })

        // Validate and enrich with TMDB data
        console.log('🎬 Enriching movies with TMDB data...')
        const enrichedMovies = await enrichMoviesWithTMDB(
            geminiResult.movies || [],
            geminiResult.mediaType || 'movie'
        )
        console.log(`✅ Enriched ${enrichedMovies.length} movies successfully`)

        const finalResult = {
            movies: enrichedMovies,
            rowName: geminiResult.rowName || 'Custom Row',
            mediaType: geminiResult.mediaType || 'movie',
            genreFallback: geminiResult.genreFallback || [],
        }

        console.log('\n=== FINAL RESULT ===')
        console.log('Row Name:', finalResult.rowName)
        console.log('Media Type:', finalResult.mediaType)
        console.log('Movies:', enrichedMovies.length)
        console.log('Movies List:', enrichedMovies.map((m) => `${m.title} (${m.year})`).join(', '))
        console.log('====================\n')

        return NextResponse.json(finalResult)
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
      "year": 1982
    }
  ],
  "rowName": "Dystopian Futures",
  "mediaType": "movie"|"tv"|"both",
  "genreFallback": [878, 53]
}

**CRITICAL RULES:**

1. **Title and Year Only:** Provide exact movie/TV show titles and release years. We will search TMDB to find the correct IDs.

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

5. **Quality:** Only recommend titles you're confident match the query. Use exact titles as they appear in TMDB.

Examples:

Query: "dark scifi thriller"
{
  "movies": [
    {"title": "Blade Runner", "year": 1982},
    {"title": "Ex Machina", "year": 2014},
    {"title": "Moon", "year": 2009},
    {"title": "Annihilation", "year": 2018}
  ],
  "rowName": "Dystopian Nightmares",
  "mediaType": "movie",
  "genreFallback": [878, 53]
}

Query: "best denzel washington movies"
{
  "movies": [
    {"title": "Training Day", "year": 2001},
    {"title": "Malcolm X", "year": 1992},
    {"title": "Glory", "year": 1989},
    {"title": "Remember the Titans", "year": 2000}
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
            let tmdbId: number | null = null
            let tmdbData: any = null

            // Search TMDB by title + year
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
                    reason: tmdbData.overview?.substring(0, 100) || '',
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
