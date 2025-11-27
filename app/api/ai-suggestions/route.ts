import { NextRequest, NextResponse } from 'next/server'
import { SmartSearchAPIRequest } from '../../../types/smartSearch'
import { buildInitialPrompt, buildFollowUpPrompt } from '../../../utils/gemini/promptBuilder'
import { parseGeminiResponse, enrichWithTMDB } from '../../../utils/gemini/responseParser'
import { consumeGeminiRateLimit } from '@/lib/geminiRateLimiter'
import { getRequestIdentity } from '@/lib/requestIdentity'
import { sanitizeInput } from '@/utils/inputSanitization'
import { apiLog, apiError } from '@/utils/debugLogger'
import { routeGeminiRequest, extractGeminiText } from '@/lib/geminiRouter'
import { applyCsrfProtection } from '@/lib/csrfProtection'

export async function POST(request: NextRequest) {
    try {
        // Apply CSRF protection
        const csrfResponse = applyCsrfProtection(request)
        if (csrfResponse) {
            return csrfResponse
        }

        const { userId, rateLimitKey } = await getRequestIdentity(request)
        const body: SmartSearchAPIRequest = await request.json()
        const { query, mode, conversationHistory = [], existingMovies = [] } = body

        if (!query || !mode) {
            return NextResponse.json(
                { error: 'Missing required fields: query, mode' },
                { status: 400 }
            )
        }

        // Sanitize user query (allow queries with 1+ characters for smart search)
        const queryResult = sanitizeInput(query, 1, 500) // Min 1 char, max 500 chars
        if (!queryResult.isValid) {
            return NextResponse.json({ error: queryResult.error }, { status: 400 })
        }
        const sanitizedQuery = queryResult.sanitized

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            apiError('GEMINI_API_KEY not configured')
            return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
        }

        const rateStatus = consumeGeminiRateLimit(rateLimitKey)
        if (!rateStatus.allowed) {
            return NextResponse.json(
                {
                    error: 'AI request limit reached. Please try again later.',
                    retryAfterMs: rateStatus.retryAfterMs,
                },
                { status: 429 }
            )
        }

        const isFollowUp = conversationHistory.length > 0 || existingMovies.length > 0
        const prompt = isFollowUp
            ? buildFollowUpPrompt(sanitizedQuery, mode, conversationHistory, existingMovies)
            : buildInitialPrompt(sanitizedQuery, mode)

        apiLog('[AI Suggestions] Existing movies count:', existingMovies.length, { userId })
        apiLog('[AI Suggestions] Sending prompt to Gemini:', {
            mode,
            isFollowUp,
            query: sanitizedQuery,
            userId,
        })

        // Call Gemini API with multi-model router
        const result = await routeGeminiRequest(
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 4000,
                },
            },
            apiKey
        )

        if (!result.success) {
            apiError('[AI Suggestions] Gemini router error:', result.error)
            throw new Error(result.error || 'Gemini request failed')
        }

        const text = extractGeminiText(result.data)

        if (!text) {
            throw new Error('No response from Gemini')
        }

        apiLog('[AI Suggestions] Gemini response received', { userId })

        const parsed = parseGeminiResponse(text)

        apiLog('[AI Suggestions] Parsed response:', {
            rowName: parsed.rowName,
            mediaType: parsed.mediaType,
            movieCount: parsed.movies.length,
            genreFallback: parsed.genreFallback,
            emoji: parsed.emoji,
            color: parsed.color,
            userId,
        })

        const enrichedResults = await enrichWithTMDB(parsed.movies, parsed.mediaType)

        apiLog('[AI Suggestions] Enriched with TMDB:', {
            foundCount: enrichedResults.length,
            requestedCount: parsed.movies.length,
            userId,
        })

        return NextResponse.json({
            results: enrichedResults,
            generatedName: parsed.rowName,
            genreFallback: parsed.genreFallback,
            mediaType: parsed.mediaType,
            emoji: parsed.emoji,
            color: parsed.color,
            _meta: result.metadata, // Include router metadata
        })
    } catch (error: any) {
        apiError('[AI Suggestions] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate suggestions' },
            { status: 500 }
        )
    }
}
