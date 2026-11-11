import { NextRequest, NextResponse } from 'next/server'
import { SmartSearchAPIRequest } from '../../../types/smartSearch'
import { buildInitialPrompt, buildFollowUpPrompt } from '../../../utils/gemini/promptBuilder'
import { parseGeminiResponse, enrichWithTMDB } from '../../../utils/gemini/responseParser'
import { getAiVisitor } from '@/lib/aiVisitor'
import { consumeAiQuota, quotaExhaustedMessage, refundAiQuota } from '@/lib/aiQuota'
import { sanitizeInput } from '@/utils/inputSanitization'
import { apiLog, apiError } from '@/utils/debugLogger'
import { routeGeminiRequest, extractGeminiText } from '@/lib/geminiRouter'

export async function POST(request: NextRequest) {
    // Set once a unit of the visitor's daily AI quota is spent, so any failure
    // after that gives it back.
    let spentQuotaKey: string | null = null
    try {
        const visitor = await getAiVisitor(request)
        const userId = visitor.userId
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
            return NextResponse.json(
                { error: 'AI search is unavailable right now', code: 'AI_UNAVAILABLE' },
                { status: 503 }
            )
        }

        const quota = await consumeAiQuota(visitor.key)
        if (!quota.allowed) {
            return NextResponse.json(
                { error: quotaExhaustedMessage(quota), code: 'AI_QUOTA', quota },
                { status: 429 }
            )
        }
        spentQuotaKey = visitor.key

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
                    // JSON only, so the reply always parses (utils/gemini/responseParser.ts)
                    responseMimeType: 'application/json',
                },
            },
            apiKey
        )

        if (!result.success) {
            // Upstream failure (invalid key, quota, outage): log the detail, tell the
            // client only that AI search is unavailable so it can offer regular search.
            apiError('[AI Suggestions] Gemini router error:', result.error)
            await refundAiQuota(visitor.key).catch(() => undefined)
            spentQuotaKey = null
            return NextResponse.json(
                { error: 'AI search is unavailable right now', code: 'AI_UNAVAILABLE' },
                { status: 503 }
            )
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
            quota,
        })
    } catch (error: any) {
        apiError('[AI Suggestions] Error:', error)
        if (spentQuotaKey) await refundAiQuota(spentQuotaKey).catch(() => undefined)
        return NextResponse.json(
            { error: 'AI search is unavailable right now', code: 'AI_UNAVAILABLE' },
            { status: 503 }
        )
    }
}
