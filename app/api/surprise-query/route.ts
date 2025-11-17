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
                'Wes Anderson filmography',
                'Best Tom Hanks performances',
                'Star Wars saga ranked',
                'Best Pixar movies',
                'Denzel Washington collection',
                'Christopher Nolan filmography',
                'Marvel Cinematic Universe ranked',
                'Studio Ghibli complete collection',
                'Tarantino films ranked',
                'Best James Bond movies',
                'Top 80s action classics',
                'Coen Brothers filmography',
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
                            text: 'Generate ONE SINGLE ranking title for movies or TV shows. Use ranking language like "Best", "Worst", "Top", or for complete collections use "filmography" or "collection". This will be the actual title of the ranking. GOOD examples: "Best Pixar movies", "Worst Adam Sandler films", "Top sci-fi movies of the 90s", "Christopher Nolan filmography", "Tom Hanks collection", "Marvel Cinematic Universe ranked", "Best zombie shows", "Worst superhero movies", "Tarantino films ranked", "Studio Ghibli complete collection". BAD examples: "All Christopher Nolan films" (use "filmography" instead), "Pixar movies ranked by emotional impact" (too complex), "Leonardo DiCaprio performances" (missing ranking language). Focus on: Best/Worst + genre, Top + decade/genre, Actor/Director filmography or collection, Franchise rankings. Keep titles simple and clear. IMPORTANT: Rank complete movies or TV shows only, never individual episodes. Return ONLY ONE ranking title without quotes, without a period, without a numbered list, just a single title.',
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

        // Clean up the query: remove quotes, trailing periods, and take only first line
        generatedQuery = generatedQuery
            .split('\n')[0] // Take only the first line if multiple are returned
            .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
            .replace(/\.+$/, '') // Remove trailing periods
            .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
            .replace(/^-\s*/, '') // Remove leading dashes
            .trim()

        apiLog('[Surprise Query] Generated query:', generatedQuery)

        return NextResponse.json({ query: generatedQuery })
    } catch (error) {
        apiError('Surprise query error:', error)
        // Fallback to curated list if Gemini fails
        const fallbackQueries = [
            'Wes Anderson filmography',
            'Best Tom Hanks performances',
            'Star Wars saga ranked',
            'Best Pixar movies',
            'Denzel Washington collection',
            'Christopher Nolan filmography',
            'Marvel Cinematic Universe ranked',
            'Studio Ghibli complete collection',
            'Tarantino films ranked',
            'Best James Bond movies',
            'Top 80s action classics',
            'Coen Brothers filmography',
        ]
        const randomQuery = fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)]
        return NextResponse.json({ query: randomQuery })
    }
}
