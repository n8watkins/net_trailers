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
        const { text, entities, mediaType } = await request.json()

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

        const prompt = buildAnalysisPrompt(sanitizedText, entities, mediaType)

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
  "genreIds": [80, 18],
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
- "gangster movies" → {"genreIds": [80, 18]}
- "scary films" → {"genreIds": [27]}
- "space adventures" → {"genreIds": [878, 12]}
- "action comedies" → {"genreIds": [28, 35]}

CONCEPT QUERY Examples:

Pure Concept:
- "comedy of errors" → provide conceptQuery plus 10-15 titles and genreIds [35]

Hybrid Genre+Vibe:
- "dark scifi thriller" → conceptQuery + movieRecommendations + genreIds [878, 53]

Stay concise and return valid JSON only.`
}
