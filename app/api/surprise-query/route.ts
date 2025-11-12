import { NextResponse } from 'next/server'
import { sanitizeInput } from '@/utils/inputSanitization'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// Rate limiting: track last request time
let lastRequestTime = 0
const RATE_LIMIT_MS = 2000 // 2 seconds between requests

export async function POST() {
    try {
        // Rate limiting check
        const now = Date.now()
        const timeSinceLastRequest = now - lastRequestTime
        if (timeSinceLastRequest < RATE_LIMIT_MS) {
            console.log('[Surprise Query] Rate limited - using fallback')
            // Use fallback if rate limited
            const fallbackQueries = [
                'mind-bending thrillers with plot twists',
                'heartwarming family movies',
                'epic sci-fi adventures in space',
                'classic 90s comedies',
                'edge-of-your-seat horror',
                'inspiring true stories',
                'romantic comedies with happy endings',
                'dark psychological thrillers',
                'feel-good musicals',
                'gritty crime dramas',
            ]
            const randomQuery = fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)]
            return NextResponse.json({ query: randomQuery })
        }
        lastRequestTime = now

        if (!GEMINI_API_KEY) {
            throw new Error('Gemini API key not configured')
        }

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: 'Generate a single creative and interesting movie/TV show search query. The query should be descriptive, emotional, or thematic (like mind-bending thrillers with plot twists or heartwarming family movies about second chances). Return ONLY the query text without quotes and without a period at the end. Make it unique and interesting.',
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 1.0,
                maxOutputTokens: 100,
            },
        }

        console.log('[Surprise Query] Making Gemini API request:', {
            model: 'gemini-2.0-flash-001',
            prompt: requestBody.contents[0].parts[0].text.substring(0, 100) + '...',
            temperature: requestBody.generationConfig.temperature,
            maxTokens: requestBody.generationConfig.maxOutputTokens,
        })

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            }
        )

        if (!response.ok) {
            console.error(
                '[Surprise Query] Gemini API error:',
                response.status,
                response.statusText
            )
            throw new Error('Failed to generate query from Gemini')
        }

        const data = await response.json()
        let generatedQuery =
            data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'epic adventures'

        // Clean up the query: remove quotes and trailing periods
        generatedQuery = generatedQuery
            .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
            .replace(/\.+$/, '') // Remove trailing periods
            .trim()

        console.log('[Surprise Query] Generated query:', generatedQuery)

        return NextResponse.json({ query: generatedQuery })
    } catch (error) {
        console.error('Surprise query error:', error)
        // Fallback to curated list if Gemini fails
        const fallbackQueries = [
            'mind-bending thrillers with plot twists',
            'heartwarming family movies',
            'epic sci-fi adventures in space',
            'classic 90s comedies',
            'edge-of-your-seat horror',
            'inspiring true stories',
            'romantic comedies with happy endings',
            'dark psychological thrillers',
            'feel-good musicals',
            'gritty crime dramas',
        ]
        const randomQuery = fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)]
        return NextResponse.json({ query: randomQuery })
    }
}
