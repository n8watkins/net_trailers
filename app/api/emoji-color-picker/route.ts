import { NextRequest, NextResponse } from 'next/server'
import { getAllEmojis, AVAILABLE_COLORS } from '../../../config/constants'
import { sanitizeInput, sanitizeArray } from '@/utils/inputSanitization'
import { apiLog, apiError, apiWarn } from '@/utils/debugLogger'
import { routeGeminiRequest, extractGeminiText } from '@/lib/geminiRouter'

interface EmojiColorPickerRequest {
    name: string
    contentTitles?: string[] // Optional list of movie/show titles for context
}

export async function POST(request: NextRequest) {
    try {
        const body: EmojiColorPickerRequest = await request.json()
        const { name, contentTitles = [] } = body

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
        }

        // Sanitize collection name
        const nameResult = sanitizeInput(name, 1, 100)
        if (!nameResult.isValid) {
            return NextResponse.json({ error: nameResult.error }, { status: 400 })
        }
        const sanitizedName = nameResult.sanitized

        // Sanitize content titles array
        const sanitizedTitles = sanitizeArray(contentTitles, 100)

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            apiError('[Emoji Color Picker] GEMINI_API_KEY not configured')
            return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
        }

        // Get all available emojis and colors
        const allEmojis = getAllEmojis()
        const allColors = AVAILABLE_COLORS as unknown as string[]

        // Build prompt for Gemini
        const contentContext =
            sanitizedTitles.length > 0
                ? `\n\nThis collection contains: ${sanitizedTitles.slice(0, 10).join(', ')}`
                : ''

        const prompt = `You are a design expert helping choose an emoji icon and color for a movie/TV collection.

Collection Name: "${sanitizedName}"${contentContext}

Available Emojis:
${allEmojis.join(' ')}

Available Colors (hex codes):
${allColors.join(', ')}

IMPORTANT: Return ONLY valid JSON. Do NOT wrap in markdown code blocks.

Choose ONE emoji and ONE color from the lists above that best represent this collection's theme and mood.

Return JSON in this exact format:
{
  "emoji": "🎬",
  "color": "#ef4444",
  "reasoning": "Brief explanation of why these choices fit"
}

Guidelines:
- Pick an emoji that captures the collection's genre, mood, or theme
- Pick a color that complements the emoji and conveys the right emotion
- Be creative but appropriate
- Consider the emotional tone (exciting = red/orange, calm = blue/teal, etc.)
- The reasoning should be 1-2 sentences max`

        apiLog('[Emoji Color Picker] Sending request to Gemini router')

        // Call Gemini API with multi-model router
        const result = await routeGeminiRequest(
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7, // Slightly higher for creative choices
                    maxOutputTokens: 500,
                },
            },
            apiKey
        )

        if (!result.success) {
            apiError('[Emoji Color Picker] Gemini router error:', result.error)
            return NextResponse.json(
                {
                    error: 'AI service error',
                    message: result.error || 'Failed to generate style suggestions',
                },
                { status: 500 }
            )
        }

        const text = extractGeminiText(result.data)

        if (!text) {
            throw new Error('No response from Gemini')
        }

        apiLog('[Emoji Color Picker] Response received from router')

        // Parse response - remove markdown code blocks if present
        const cleanedText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim()
        const parsed = JSON.parse(cleanedText)

        // Validate that the emoji and color are from our lists
        if (!allEmojis.includes(parsed.emoji)) {
            apiWarn('[Emoji Color Picker] Invalid emoji, using default')
            parsed.emoji = '📺' // Default fallback
        }

        if (!allColors.includes(parsed.color)) {
            apiWarn('[Emoji Color Picker] Invalid color, using default')
            parsed.color = '#ef4444' // Default fallback
        }

        return NextResponse.json({
            emoji: parsed.emoji,
            color: parsed.color,
            reasoning: parsed.reasoning,
            _meta: result.metadata, // Include router metadata
        })
    } catch (error: any) {
        apiError('[Emoji Color Picker] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate style suggestions' },
            { status: 500 }
        )
    }
}
