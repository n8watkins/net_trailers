import { NextRequest, NextResponse } from 'next/server'
import { getAllEmojis, AVAILABLE_COLORS } from '../../../config/constants'

interface WatchlistStyleRequest {
    name: string
    contentTitles?: string[] // Optional list of movie/show titles for context
}

export async function POST(request: NextRequest) {
    try {
        const body: WatchlistStyleRequest = await request.json()
        const { name, contentTitles = [] } = body

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured')
            return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
        }

        // Get all available emojis and colors
        const allEmojis = getAllEmojis()
        const allColors = AVAILABLE_COLORS as unknown as string[]

        // Build prompt for Gemini
        const contentContext =
            contentTitles.length > 0
                ? `\n\nThis watchlist contains: ${contentTitles.slice(0, 10).join(', ')}`
                : ''

        const prompt = `You are a design expert helping choose an emoji icon and color for a movie/TV watchlist.

Watchlist Name: "${name}"${contentContext}

Available Emojis:
${allEmojis.join(' ')}

Available Colors (hex codes):
${allColors.join(', ')}

IMPORTANT: Return ONLY valid JSON. Do NOT wrap in markdown code blocks.

Choose ONE emoji and ONE color from the lists above that best represent this watchlist's theme and mood.

Return JSON in this exact format:
{
  "emoji": "🎬",
  "color": "#ef4444",
  "reasoning": "Brief explanation of why these choices fit"
}

Guidelines:
- Pick an emoji that captures the watchlist's genre, mood, or theme
- Pick a color that complements the emoji and conveys the right emotion
- Be creative but appropriate
- Consider the emotional tone (exciting = red/orange, calm = blue/teal, etc.)
- The reasoning should be 1-2 sentences max`

        console.log('[AI Watchlist Style] Sending prompt to Gemini')

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7, // Slightly higher for creative choices
                        maxOutputTokens: 500,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[AI Watchlist Style] Gemini API error:', errorText)
            throw new Error('Gemini API request failed')
        }

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
            throw new Error('No response from Gemini')
        }

        console.log('[AI Watchlist Style] Gemini response received')

        // Parse response
        const parsed = JSON.parse(text)

        // Validate that the emoji and color are from our lists
        if (!allEmojis.includes(parsed.emoji)) {
            console.warn('[AI Watchlist Style] Invalid emoji, using default')
            parsed.emoji = '📺' // Default fallback
        }

        if (!allColors.includes(parsed.color)) {
            console.warn('[AI Watchlist Style] Invalid color, using default')
            parsed.color = '#ef4444' // Default fallback
        }

        return NextResponse.json({
            emoji: parsed.emoji,
            color: parsed.color,
            reasoning: parsed.reasoning,
        })
    } catch (error: any) {
        console.error('[AI Watchlist Style] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate style suggestions' },
            { status: 500 }
        )
    }
}
