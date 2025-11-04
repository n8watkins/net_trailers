import { NextRequest, NextResponse } from 'next/server'
import { generateSmartSuggestions } from '../../../utils/smartRowSuggestions'

export async function POST(request: NextRequest) {
    try {
        const inputData = await request.json()

        // Validate input
        if (!inputData.entities || !Array.isArray(inputData.entities)) {
            return NextResponse.json({ error: 'Invalid entities' }, { status: 400 })
        }

        if (!inputData.mediaType || !['movie', 'tv', 'both'].includes(inputData.mediaType)) {
            return NextResponse.json({ error: 'Invalid media type' }, { status: 400 })
        }

        // Generate TMDB-based suggestions (people/content analysis)
        const tmdbResult = await generateSmartSuggestions(inputData)

        // Call Gemini for semantic analysis if there's text
        let geminiInsights = null
        if (inputData.rawText && inputData.rawText.trim().length >= 5) {
            try {
                const geminiResponse = await fetch(`${request.nextUrl.origin}/api/gemini/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: inputData.rawText,
                        entities: inputData.entities,
                        mediaType: inputData.mediaType,
                    }),
                })

                if (geminiResponse.ok) {
                    geminiInsights = await geminiResponse.json()
                }
            } catch (error) {
                console.warn('Gemini analysis failed, continuing with TMDB only:', error)
            }
        }

        // Merge Gemini insights with TMDB suggestions
        if (geminiInsights) {
            const mergedResult = mergeGeminiInsights(tmdbResult, geminiInsights)
            return NextResponse.json(mergedResult)
        }

        return NextResponse.json(tmdbResult)
    } catch (error) {
        console.error('Smart suggestions error:', error)
        return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }
}

/**
 * Merge Gemini semantic insights with TMDB suggestions
 */
function mergeGeminiInsights(tmdbResult: any, geminiInsights: any): any {
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
    }
}
