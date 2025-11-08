import { NextRequest, NextResponse } from 'next/server'
import { SmartSearchAPIRequest } from '../../../types/smartSearch'
import { buildInitialPrompt, buildFollowUpPrompt } from '../../../utils/gemini/promptBuilder'
import { parseGeminiResponse, enrichWithTMDB } from '../../../utils/gemini/responseParser'

export async function POST(request: NextRequest) {
    try {
        const body: SmartSearchAPIRequest = await request.json()
        const { query, mode, conversationHistory = [], existingMovies = [] } = body

        if (!query || !mode) {
            return NextResponse.json(
                { error: 'Missing required fields: query, mode' },
                { status: 400 }
            )
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured')
            return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
        }

        // Build prompt based on context
        const isFollowUp = conversationHistory.length > 0 || existingMovies.length > 0

        const prompt = isFollowUp
            ? buildFollowUpPrompt(query, mode, conversationHistory, existingMovies)
            : buildInitialPrompt(query, mode)

        console.log('[AI Suggestions] Existing movies count:', existingMovies.length)

        console.log('[AI Suggestions] Sending prompt to Gemini:', {
            mode,
            isFollowUp,
            query,
        })

        // Call Gemini API using REST endpoint (matching generate-row)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 4000,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[AI Suggestions] Gemini API error:', errorText)
            throw new Error('Gemini API request failed')
        }

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
            throw new Error('No response from Gemini')
        }

        console.log('[AI Suggestions] Gemini response received')

        // Parse response
        const parsed = parseGeminiResponse(text)

        console.log('[AI Suggestions] Parsed response:', {
            rowName: parsed.rowName,
            mediaType: parsed.mediaType,
            movieCount: parsed.movies.length,
            genreFallback: parsed.genreFallback,
        })

        // Enrich with TMDB data
        const enrichedResults = await enrichWithTMDB(parsed.movies, parsed.mediaType)

        console.log('[AI Suggestions] Enriched with TMDB:', {
            foundCount: enrichedResults.length,
            requestedCount: parsed.movies.length,
        })

        return NextResponse.json({
            results: enrichedResults,
            generatedName: parsed.rowName,
            genreFallback: parsed.genreFallback,
            mediaType: parsed.mediaType,
        })
    } catch (error: any) {
        console.error('[AI Suggestions] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate suggestions' },
            { status: 500 }
        )
    }
}
