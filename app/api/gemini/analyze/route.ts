import { NextRequest, NextResponse } from 'next/server'
import { sanitizeInput } from '@/utils/inputSanitization'
import { apiError } from '@/utils/debugLogger'
import { getAiVisitor } from '@/lib/aiVisitor'
import { consumeAiQuota, quotaExhaustedMessage, refundAiQuota } from '@/lib/aiQuota'
import { analyzeText, AiUnavailableError } from '@/lib/gemini/analyzeText'

/**
 * Gemini API endpoint for semantic analysis of user input
 */
export async function POST(request: NextRequest) {
    let visitorKey: string | null = null
    try {
        const { text, mediaType } = await request.json()

        // Sanitize and validate input (allow queries with 1+ characters for smart search)
        const sanitizationResult = sanitizeInput(text, 1, 500)
        if (!sanitizationResult.isValid) {
            return NextResponse.json({ error: sanitizationResult.error }, { status: 400 })
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            apiError('GEMINI_API_KEY not configured')
            return NextResponse.json(
                { error: 'AI analysis unavailable', code: 'AI_UNAVAILABLE' },
                { status: 503 }
            )
        }

        visitorKey = (await getAiVisitor(request)).key
        const quota = await consumeAiQuota(visitorKey)
        if (!quota.allowed) {
            return NextResponse.json(
                { error: quotaExhaustedMessage(quota), code: 'AI_QUOTA', quota },
                { status: 429 }
            )
        }

        const analysis = await analyzeText(sanitizationResult.sanitized, mediaType, apiKey)
        return NextResponse.json({ ...analysis, quota })
    } catch (error) {
        if (error instanceof AiUnavailableError) {
            apiError('Gemini analysis router error:', error.message)
            if (visitorKey) await refundAiQuota(visitorKey).catch(() => undefined)
            return NextResponse.json(
                { error: 'AI analysis unavailable', code: 'AI_UNAVAILABLE' },
                { status: 503 }
            )
        }
        apiError('Gemini analysis error:', error)
        return NextResponse.json({ error: 'Failed to analyze text' }, { status: 500 })
    }
}
