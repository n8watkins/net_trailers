import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SmartSearchAPIRequest } from '../../../types/smartSearch'
import { buildInitialPrompt, buildFollowUpPrompt } from '../../../utils/gemini/promptBuilder'
import { parseGeminiResponse, enrichWithTMDB } from '../../../utils/gemini/responseParser'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
    try {
        const body: SmartSearchAPIRequest = await request.json()
        const { query, mode, conversationHistory = [], existingResultIds = [] } = body

        if (!query || !mode) {
            return NextResponse.json(
                { error: 'Missing required fields: query, mode' },
                { status: 400 }
            )
        }

        // Build prompt based on context
        const isFollowUp = conversationHistory.length > 0 || existingResultIds.length > 0

        const prompt = isFollowUp
            ? buildFollowUpPrompt(query, mode, conversationHistory, existingResultIds)
            : buildInitialPrompt(query, mode)

        console.log('[AI Suggestions] Sending prompt to Gemini:', {
            mode,
            isFollowUp,
            query,
        })

        // Call Gemini API
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

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
