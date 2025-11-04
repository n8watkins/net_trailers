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
        if (geminiInsights) {
            const mergedResult = mergeGeminiInsights(tmdbResult, geminiInsights, mediaType)
            return NextResponse.json(mergedResult)
        }

        return NextResponse.json({ ...tmdbResult, mediaType })
    } catch (error) {
        console.error('Smart suggestions error:', error)
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }
}

/**
 * Merge Gemini semantic insights with TMDB suggestions
 */
function mergeGeminiInsights(tmdbResult: any, geminiInsights: any, mediaType: string): any {
    const { suggestions, rowNames, insight } = tmdbResult
    const mergedSuggestions = [...suggestions]

    // Add Gemini genre recommendations
    if (geminiInsights.genres && geminiInsights.genres.length > 0) {
        mergedSuggestions.push({
            type: 'genre',
            value: geminiInsights.genres,
            confidence: 85,
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

    // Use Gemini insight if available
    const finalInsight = geminiInsights.insight || insight

    return {
        suggestions: mergedSuggestions,
        rowNames,
        insight: finalInsight,
        mediaType: geminiInsights.mediaType || mediaType,
    }
}
