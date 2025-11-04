import { NextRequest, NextResponse } from 'next/server'
import { generateSmartSuggestions } from '../../../utils/smartRowSuggestions'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { entities, rawText, seed } = body
        let mediaType = body.mediaType || 'both'

        // Validate input
        if (!entities || !Array.isArray(entities)) {
            return NextResponse.json({ error: 'Invalid entities' }, { status: 400 })
        }

        // Call Gemini for semantic analysis if there's text (to infer media type)
        let geminiInsights = null
        if (rawText && rawText.trim().length >= 5) {
            try {
                const geminiResponse = await fetch(`${request.nextUrl.origin}/api/gemini/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: rawText,
                        entities,
                        mediaType,
                    }),
                })

                if (geminiResponse.ok) {
                    geminiInsights = await geminiResponse.json()
                    // Use Gemini's inferred media type if available
                    if (geminiInsights.mediaType) {
                        mediaType = geminiInsights.mediaType
                    }
                }
            } catch (error) {
                console.warn('Gemini analysis failed, continuing with TMDB only:', error)
            }
        }

        // Validate media type
        if (!['movie', 'tv', 'both'].includes(mediaType)) {
            mediaType = 'both'
        }

        // Generate TMDB-based suggestions (people/content analysis)
        const inputData = { entities, mediaType, rawText }
        const tmdbResult = await generateSmartSuggestions(inputData, seed)

        // Merge Gemini insights with TMDB suggestions
        const mergedResult = geminiInsights
            ? mergeGeminiInsights(tmdbResult, geminiInsights, mediaType)
            : { ...tmdbResult, mediaType }

        // Generate creative row names using Gemini
        try {
            const nameResult = await generateCreativeRowName(
                request.nextUrl.origin,
                entities,
                rawText,
                mediaType,
                geminiInsights
            )
            if (nameResult) {
                mergedResult.rowNames = [nameResult, ...mergedResult.rowNames].slice(0, 3)
            }
        } catch (error) {
            console.warn('Failed to generate creative name, using defaults:', error)
        }

        return NextResponse.json(mergedResult)
    } catch (error) {
        console.error('Smart suggestions error:', error)
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }
}

/**
 * Generate super creative row name using Gemini
 */
async function generateCreativeRowName(
    origin: string,
    entities: any[],
    rawText: string,
    mediaType: string,
    geminiInsights: any
): Promise<string | null> {
    // Build context for name generation
    const people = entities.filter((e) => e.type === 'person')

    if (people.length === 0 && !rawText) {
        return null // Need at least something to work with
    }

    // Build a smart prompt for Gemini using raw text and people
    let context = rawText || ''
    if (people.length > 0) {
        context += ` featuring ${people.map((p: any) => p.name).join(', ')}`
    }

    // Call Gemini directly with a specialized creative naming prompt
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
- "THE GOAT" (for legendary directors/actors)
- "Peak Scorsese" (for Martin Scorsese)
- "Certified Bangers" (for action)
- "Chef's Kiss" (for perfection)
- "Built Different" (for unique)
- "No Skips" (for consistent quality)
- "Unhinged Energy" (for wild content)

For this selection, create a name that's SO surprisingly cool it delights the user.

Response: Just the name, nothing else.`

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.95, // High creativity
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
        console.error('Creative name generation error:', error)
        return null
    }
}

/**
 * Merge Gemini semantic insights with TMDB suggestions
 */
function mergeGeminiInsights(tmdbResult: any, geminiInsights: any, mediaType: string): any {
    const { suggestions, rowNames, insight } = tmdbResult
    const mergedSuggestions = [...suggestions]

    // Add Gemini genre recommendations (as TMDB genre IDs)
    if (geminiInsights.genreIds && geminiInsights.genreIds.length > 0) {
        mergedSuggestions.push({
            type: 'genre',
            value: geminiInsights.genreIds, // Array of TMDB genre IDs (numbers)
            confidence: 95, // High confidence since it's AI-inferred
            reason: 'AI detected these genres from your description',
            source: 'gemini',
        })
    }

    // Add Gemini recommendations
    if (geminiInsights.recommendations) {
        geminiInsights.recommendations.forEach((rec: any) => {
            mergedSuggestions.push({
                type: rec.type,
                value: rec.value,
                confidence: rec.confidence || 80,
                reason: rec.reason,
                source: 'gemini',
            })
        })
    }

    return {
        suggestions: mergedSuggestions,
        rowNames,
        insight: '', // No descriptive insight
        mediaType: geminiInsights.mediaType || mediaType,
    }
}
