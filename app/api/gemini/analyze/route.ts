import { NextRequest, NextResponse } from 'next/server'
import { consumeGeminiRateLimit } from '@/lib/geminiRateLimiter'
import { getRequestIdentity } from '@/lib/requestIdentity'
import { sanitizeInput } from '@/utils/inputSanitization'
import { apiError } from '@/utils/debugLogger'

/**
 * Gemini API endpoint for semantic analysis of user input
 */
export async function POST(request: NextRequest) {
    try {
        const { rateLimitKey } = await getRequestIdentity(request)
        const { text, mediaType } = await request.json()

        // Sanitize and validate input (allow queries with 1+ characters for smart search)
        const sanitizationResult = sanitizeInput(text, 1, 500)
        if (!sanitizationResult.isValid) {
            return NextResponse.json({ error: sanitizationResult.error }, { status: 400 })
        }

        const sanitizedText = sanitizationResult.sanitized

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            apiError('GEMINI_API_KEY not configured')
            return NextResponse.json({ error: 'AI analysis unavailable' }, { status: 503 })
        }

        const rateStatus = consumeGeminiRateLimit(rateLimitKey)
        if (!rateStatus.allowed) {
            return NextResponse.json(
                {
                    error: 'AI analysis limit reached. Please try again later.',
                    retryAfterMs: rateStatus.retryAfterMs,
                },
                { status: 429 }
            )
        }

        const prompt = buildAnalysisPrompt(sanitizedText, mediaType)

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1000,
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

        const cleanedText = analysisText
            .replace(/^```json\s*\n?/i, '')
            .replace(/\n?```\s*$/, '')
            .trim()

        const analysis = JSON.parse(cleanedText)

        return NextResponse.json({
            genreIds: analysis.genreIds || [],
            yearRange: analysis.yearRange || null,
            certification: analysis.certification || null,
            recommendations: analysis.recommendations || [],
            mediaType: analysis.mediaType || 'both',
            conceptQuery: analysis.conceptQuery || null,
            movieRecommendations: analysis.movieRecommendations || [],
        })
    } catch (error) {
        apiError('Gemini analysis error:', error)
        return NextResponse.json(
            { error: 'Failed to analyze text', details: (error as Error).message },
            { status: 500 }
        )
    }
}

function buildAnalysisPrompt(text: string, mediaType: string): string {
    return `You are an expert film/TV analyst. Analyze this user's description and map it to unified genre IDs.

User Input: "${text}"
Media Type: ${mediaType}

**IMPORTANT: You MUST use these exact unified genre IDs (they work for both movies and TV):**

UNIFIED GENRES:
- "action": Action
- "adventure": Adventure
- "animation": Animation
- "comedy": Comedy
- "crime": Crime
- "documentary": Documentary
- "drama": Drama
- "family": Family
- "fantasy": Fantasy
- "history": History
- "horror": Horror
- "kids": Kids (TV only)
- "music": Music
- "mystery": Mystery
- "news": News (TV only)
- "reality": Reality (TV only)
- "romance": Romance
- "scifi": Science Fiction
- "soap": Soap (TV only)
- "talk": Talk (TV only)
- "thriller": Thriller
- "war": War
- "politics": Politics (TV only)
- "western": Western

**NOTE**: Use lowercase string IDs, not numbers. The system automatically maps these to correct TMDB IDs based on media type.
Example: "romance" → Maps to genre 10749 for movies, genre 18 (Drama) for TV shows

Return ONLY this JSON structure with unified genre IDs:
{
  "mediaType": "movie"|"tv"|"both",
  "genreIds": ["crime", "drama"],
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
  "conceptQuery": string | null,
  "movieRecommendations": [
    {
      "title": "Clue",
      "year": 1985,
      "reason": "Murder mystery comedy with mistaken identities"
    }
  ]
}

Examples:
- "gangster movies" → {"genreIds": ["crime", "drama"]}
- "scary films" → {"genreIds": ["horror"]}
- "space adventures" → {"genreIds": ["scifi", "adventure"]}
- "action comedies" → {"genreIds": ["action", "comedy"]}
- "romantic dramas" → {"genreIds": ["romance", "drama"]}

CONCEPT QUERY Examples:

Pure Concept:
- "comedy of errors" → provide conceptQuery plus 10-15 titles and genreIds ["comedy"]

Hybrid Genre+Vibe:
- "dark scifi thriller" → conceptQuery + movieRecommendations + genreIds ["scifi", "thriller"]

Stay concise and return valid JSON only.`
}
