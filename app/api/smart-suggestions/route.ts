import { NextRequest, NextResponse } from 'next/server'
import { generateSmartSuggestions } from '../../../utils/smartRowSuggestions'
import { consumeGeminiRateLimit } from '@/lib/geminiRateLimiter'
import { getRequestIdentity } from '@/lib/requestIdentity'
import { TMDBApiClient } from '@/utils/tmdbApi'
import { sanitizeInput } from '@/utils/inputSanitization'
import { apiError, apiWarn } from '@/utils/debugLogger'

export async function POST(request: NextRequest) {
    try {
        const { rateLimitKey } = await getRequestIdentity(request)
        const body = await request.json()
        const { entities, rawText, seed } = body
        let mediaType = body.mediaType || 'both'

        if (!entities || !Array.isArray(entities)) {
            return NextResponse.json({ error: 'Invalid entities' }, { status: 400 })
        }

        // Sanitize rawText if present
        let sanitizedRawText = ''
        if (rawText && rawText.trim().length >= 5) {
            const textResult = sanitizeInput(rawText, 5, 500)
            if (!textResult.isValid) {
                return NextResponse.json({ error: textResult.error }, { status: 400 })
            }
            sanitizedRawText = textResult.sanitized
        }

        let geminiInsights = null
        if (sanitizedRawText) {
            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                const authHeader = request.headers.get('authorization')
                if (authHeader) {
                    headers.Authorization = authHeader
                }

                const geminiResponse = await fetch(`${request.nextUrl.origin}/api/gemini/analyze`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        text: sanitizedRawText,
                        entities,
                        mediaType,
                    }),
                })

                if (geminiResponse.ok) {
                    geminiInsights = await geminiResponse.json()
                    if (geminiInsights.mediaType) {
                        mediaType = geminiInsights.mediaType
                    }
                }
            } catch (error) {
                apiWarn('Gemini analysis failed, continuing with TMDB only:', error)
            }
        }

        if (!['movie', 'tv', 'both'].includes(mediaType)) {
            mediaType = 'both'
        }

        const inputData = { entities, mediaType, rawText: sanitizedRawText }
        const tmdbResult = await generateSmartSuggestions(inputData, seed)

        const mergedResult = geminiInsights
            ? await mergeGeminiInsights(
                  tmdbResult,
                  geminiInsights,
                  mediaType,
                  request.nextUrl.origin
              )
            : { ...tmdbResult, mediaType }

        try {
            const rateStatus = consumeGeminiRateLimit(rateLimitKey)
            if (!rateStatus.allowed) {
                return NextResponse.json(
                    {
                        ...mergedResult,
                        error: 'AI naming limit reached. Please try again later.',
                        retryAfterMs: rateStatus.retryAfterMs,
                    },
                    { status: 429 }
                )
            }

            const nameResult = await generateCreativeRowName(
                request.nextUrl.origin,
                entities,
                sanitizedRawText,
                mediaType,
                geminiInsights
            )
            if (nameResult) {
                mergedResult.rowNames = [nameResult, ...(mergedResult.rowNames || [])].slice(0, 3)
            }
        } catch (error) {
            apiWarn('Failed to generate creative name, using defaults:', error)
        }

        return NextResponse.json(mergedResult)
    } catch (error) {
        apiError('Smart suggestions error:', error)
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }
}

async function generateCreativeRowName(
    origin: string,
    entities: any[],
    rawText: string,
    mediaType: string,
    geminiInsights: any
): Promise<string | null> {
    const people = entities.filter((e: any) => e.type === 'person')

    if (people.length === 0 && !rawText) {
        return null
    }

    let context = rawText || ''
    if (people.length > 0) {
        context += ` featuring ${people.map((p: any) => p.name).join(', ')}`
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return null

    const prompt = `You are the COOLEST content curator who creates row names that SHOCK and DELIGHT users.

Context: "${context}"
Media Type: ${mediaType}

Create ONE ultra-creative, surprisingly witty row name (1-3 words MAX) that:
- Makes people go "WOW that's so cool!"
- Uses internet slang, memes, pop culture
- Sounds like a cool friend, not corporate marketing

Examples of the vibe:
- "THE GOAT"
- "Peak Scorsese"
- "Certified Bangers"
- "Chef's Kiss"
- "Built Different"
- "No Skips"
- "Unhinged Energy"

For this selection, create a name that's SO surprisingly cool it delights the user.

Response: Just the name, nothing else.`

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.95,
                        maxOutputTokens: 50,
                    },
                }),
            }
        )

        if (!response.ok) return null

        const data = await response.json()
        const name = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

        return name
            ? name
                  .replace(/^["']|["']$/g, '')
                  .replace(/\*\*/g, '')
                  .trim()
            : null
    } catch (error) {
        apiError('Creative name generation error:', error)
        return null
    }
}

async function mergeGeminiInsights(
    tmdbResult: any,
    geminiInsights: any,
    mediaType: string,
    origin: string
): Promise<any> {
    const { suggestions, rowNames } = tmdbResult
    const mergedSuggestions = [...suggestions]

    if (geminiInsights.genreIds && geminiInsights.genreIds.length > 0) {
        mergedSuggestions.push({
            type: 'genre',
            value: geminiInsights.genreIds,
            confidence: 95,
            reason: 'AI detected these genres from your description',
            source: 'gemini',
        })
    }

    if (geminiInsights.movieRecommendations && geminiInsights.movieRecommendations.length > 0) {
        try {
            const tmdbIds = await searchTMDBForTitles(
                geminiInsights.movieRecommendations,
                mediaType
            )

            if (tmdbIds.length > 0) {
                mergedSuggestions.push({
                    type: 'content_list',
                    value: tmdbIds,
                    source: 'gemini',
                    confidence: 90,
                    reason: 'AI-recommended titles based on your vibe',
                })
            }
        } catch (error) {
            apiWarn('Failed to merge Gemini movie recommendations:', error)
        }
    }

    return {
        ...tmdbResult,
        suggestions: mergedSuggestions,
        rowNames,
        mediaType,
    }
}

async function searchTMDBForTitles(recommendations: any[], mediaType: string): Promise<number[]> {
    const tmdb = TMDBApiClient.getInstance()
    const ids: number[] = []

    for (const rec of recommendations.slice(0, 10)) {
        try {
            const searchEndpoint =
                mediaType === 'tv'
                    ? '/search/tv'
                    : mediaType === 'movie'
                      ? '/search/movie'
                      : '/search/multi'

            const result = (await tmdb.fetch(searchEndpoint, {
                query: rec.title,
                year: rec.year,
            })) as any

            const match = result?.results?.[0]
            if (match?.id) {
                ids.push(match.id)
            }
        } catch (error) {
            apiWarn('TMDB title lookup failed for', rec.title, error)
        }
    }

    return ids
}
