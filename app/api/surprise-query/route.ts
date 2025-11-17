import { NextResponse } from 'next/server'
import { sanitizeInput } from '@/utils/inputSanitization'
import { apiLog, apiError } from '@/utils/debugLogger'

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
            apiLog('[Surprise Query] Rate limited - using fallback')
            // Use fallback if rate limited
            const fallbackQueries = [
                'All Wes Anderson films',
                'Tom Hanks best performances',
                'Star Wars complete saga',
                'Best Pixar movies',
                'Denzel Washington filmography',
                'Christopher Nolan ranked',
                'Marvel Cinematic Universe phases',
                'Studio Ghibli complete collection',
                'Tarantino films ranked',
                'James Bond 007 movies',
                'Best 80s action classics',
                'Coen Brothers complete works',
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
                            text: 'Generate a simple, straightforward idea for ranking movies or TV shows (complete series, not individual episodes). Keep it clean and direct - avoid complex thematic criteria or compound meanings. GOOD examples: "All Christopher Nolan films", "Best Pixar movies", "Tom Hanks performances", "Marvel Cinematic Universe", "Studio Ghibli films", "Quentin Tarantino ranked", "90s action movies", "Wes Anderson complete filmography", "Best zombie shows", "Denzel Washington movies". BAD examples (too complex): "Pixar movies ranked by emotional impact and life lessons", "Films exploring existential dread through metaphor". Focus on: complete filmographies, franchises, director/actor collections, decade + genre combos, simple thematic lists. Keep it simple and rankable. IMPORTANT: Rank complete movies or TV shows only, never individual episodes. Return ONLY the ranking idea without quotes and without a period at the end.',
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: 1.0,
                maxOutputTokens: 100,
            },
        }

        apiLog('[Surprise Query] Making Gemini API request:', {
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
            apiError('[Surprise Query] Gemini API error:', response.status, response.statusText)
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

        apiLog('[Surprise Query] Generated query:', generatedQuery)

        return NextResponse.json({ query: generatedQuery })
    } catch (error) {
        apiError('Surprise query error:', error)
        // Fallback to curated list if Gemini fails
        const fallbackQueries = [
            'All Wes Anderson films',
            'Tom Hanks best performances',
            'Star Wars complete saga',
            'Best Pixar movies',
            'Denzel Washington filmography',
            'Christopher Nolan ranked',
            'Marvel Cinematic Universe phases',
            'Studio Ghibli complete collection',
            'Tarantino films ranked',
            'James Bond 007 movies',
            'Best 80s action classics',
            'Coen Brothers complete works',
        ]
        const randomQuery = fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)]
        return NextResponse.json({ query: randomQuery })
    }
}
