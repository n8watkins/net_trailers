import { NextRequest, NextResponse } from 'next/server'

/**
 * Gemini API endpoint for semantic analysis of user input
 *
 * Analyzes natural language text to extract:
 * - Genre mentions (sci-fi, thriller, comedy, etc.)
 * - Style/tone (dark, lighthearted, gritty, family-friendly)
 * - Themes (revenge, coming-of-age, time travel)
 * - Era/time period (80s, modern, classic)
 * - Rating preferences (R-rated, family-friendly)
 * - Smart recommendations based on context
 */
export async function POST(request: NextRequest) {
    try {
        const { text, entities, mediaType } = await request.json()

        // Validate input
        if (!text || text.trim().length < 5) {
            return NextResponse.json({ error: 'Text too short for analysis' }, { status: 400 })
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured')
            return NextResponse.json({ error: 'AI analysis unavailable' }, { status: 503 })
        }

        // Build the prompt for Gemini
        const prompt = buildAnalysisPrompt(text, entities, mediaType)

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3, // Lower for more consistent results
                        maxOutputTokens: 1000,
                        responseMimeType: 'application/json', // Force JSON output without markdown
                    },
                }),
            }
        )

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`)
        }

        const data = await response.json()
        const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!analysisText) {
            throw new Error('No analysis returned from Gemini')
        }

        // Strip markdown code blocks if present (Gemini 2.5 wraps JSON in ```json...```)
        const cleanedText = analysisText
            .replace(/^```json\s*\n?/i, '') // Remove opening ```json
            .replace(/\n?```\s*$/, '') // Remove closing ```
            .trim()

        // Parse the JSON response from Gemini
        const analysis = JSON.parse(cleanedText)

        return NextResponse.json({
            genreIds: analysis.genreIds || [], // Array of TMDB genre IDs (numbers)
            yearRange: analysis.yearRange || null,
            certification: analysis.certification || null,
            recommendations: analysis.recommendations || [],
            mediaType: analysis.mediaType || 'both',
            conceptQuery: analysis.conceptQuery || null, // For vibe-based queries like "comedy of errors"
            movieRecommendations: analysis.movieRecommendations || [], // Specific movie titles to search for
        })
    } catch (error) {
        console.error('Gemini analysis error:', error)
        return NextResponse.json(
            { error: 'Failed to analyze text', details: (error as Error).message },
            { status: 500 }
        )
    }
}

/**
 * Build the prompt for Gemini to analyze user input
 */
function buildAnalysisPrompt(text: string, entities: any[], mediaType: string): string {
    const taggedPeople = entities.filter((e) => e.type === 'person').map((e) => e.name)
    const taggedContent = entities
        .filter((e) => e.type === 'movie' || e.type === 'tv')
        .map((e) => e.name)

    return `You are an expert film/TV analyst. Analyze this user's description and map it to TMDB genre IDs.

User Input: "${text}"
Media Type: ${mediaType}
${taggedPeople.length > 0 ? `Tagged People: ${taggedPeople.join(', ')}` : ''}
${taggedContent.length > 0 ? `Tagged Titles: ${taggedContent.join(', ')}` : ''}

**IMPORTANT: You MUST use these exact TMDB genre IDs:**

MOVIE GENRES:
- 28: Action
- 12: Adventure
- 16: Animation
- 35: Comedy
- 80: Crime
- 99: Documentary
- 18: Drama
- 10751: Family
- 14: Fantasy
- 36: History
- 27: Horror
- 10402: Music
- 9648: Mystery
- 10749: Romance
- 878: Science Fiction
- 10770: TV Movie
- 53: Thriller
- 10752: War
- 37: Western

TV GENRES:
- 10759: Action & Adventure
- 16: Animation
- 35: Comedy
- 80: Crime
- 99: Documentary
- 18: Drama
- 10751: Family
- 10762: Kids
- 9648: Mystery
- 10763: News
- 10764: Reality
- 10765: Sci-Fi & Fantasy
- 10766: Soap
- 10767: Talk
- 10768: War & Politics
- 37: Western

Return ONLY this JSON structure with TMDB genre IDs:
{
  "mediaType": "movie"|"tv"|"both",
  "genreIds": [80, 18],  // ARRAY OF NUMBERS ONLY - TMDB genre IDs from the lists above
  "yearRange": { "min": 1980, "max": 1989 } | null,
  "certification": ["R", "PG-13"] | null,
  "recommendations": [
    {
      "type": "rating"|"year_range",
      "value": any,
      "reason": "brief reason",
      "confidence": 0-100
    }
  ],
  "conceptQuery": string | null,  // If user describes a VIBE/CONCEPT (like "comedy of errors", "fish out of water", "heist gone wrong"), provide a search-friendly description
  "movieRecommendations": [  // If conceptQuery exists, provide 10-15 specific movie/show titles that match
    {
      "title": "Clue",  // Exact title for TMDB search
      "year": 1985,     // Release year for disambiguation
      "reason": "Classic comedy of errors with mistaken identity"
    }
  ]
}

Examples:
- "gangster movies" → {"genreIds": [80, 18]} (Crime + Drama)
- "scary films" → {"genreIds": [27]} (Horror)
- "space adventures" → {"genreIds": [878, 12]} (Sci-Fi + Adventure)
- "action comedies" → {"genreIds": [28, 35]} (Action + Comedy)

CONCEPT QUERY Examples (populate movieRecommendations instead of just genres):
- "comedy of errors" → {
    "conceptQuery": "Comedy films with mistaken identities, misunderstandings, and escalating chaos",
    "movieRecommendations": [
      {"title": "Clue", "year": 1985, "reason": "Murder mystery comedy with mistaken identities"},
      {"title": "Noises Off", "year": 1992, "reason": "Farce with cascading misunderstandings"},
      {"title": "A Fish Called Wanda", "year": 1988, "reason": "Heist comedy with double-crosses and confusion"},
      {"title": "The Pink Panther", "year": 1963, "reason": "Slapstick comedy with bumbling detective"},
      {"title": "Arsenic and Old Lace", "year": 1944, "reason": "Dark comedy with mounting confusion"},
      // ... 10-15 total
    ],
    "genreIds": [35]  // Still include genre for filtering
  }
- "fish out of water" → Provide movies about characters in unfamiliar situations
- "heist gone wrong" → Provide heist films where plans fall apart
- "coming of age" → Provide films about growing up and self-discovery

Rules:
- MediaType: "series/show/tv" → "tv", "film/movie" → "movie", unclear → "both"
- Detect CONCEPT queries (vibes, tropes, narrative structures) vs simple genre requests
- For concept queries: provide 10-15 specific titles with years and reasons
- For simple genres: just use genreIds
- Return 1-3 genre IDs maximum
- ONLY use IDs from the lists above
- Be precise - don't add extra genres
- Return ONLY valid JSON

Return ONLY valid JSON, no markdown formatting.`
}
