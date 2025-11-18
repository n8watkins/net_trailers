import { NextResponse } from 'next/server'
import { sanitizeInput } from '@/utils/inputSanitization'
import { apiLog, apiError } from '@/utils/debugLogger'
import { routeGeminiRequest, extractGeminiText } from '@/lib/geminiRouter'

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
            const waitTime = RATE_LIMIT_MS - timeSinceLastRequest
            apiWarn(
                `[Surprise Query] ⚠️ RATE LIMITED - Last request was ${timeSinceLastRequest}ms ago (need ${RATE_LIMIT_MS}ms). Wait ${waitTime}ms more.`
            )
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
            apiLog('[Surprise Query] Returning rate-limit fallback query:', randomQuery)
            return NextResponse.json({
                query: randomQuery,
                _debug: {
                    rateLimited: true,
                    timeSinceLastRequest: timeSinceLastRequest,
                    waitTimeMs: waitTime,
                    hadError: false,
                },
            })
        }
        lastRequestTime = now
        apiLog('[Surprise Query] Rate limit OK - proceeding with Gemini call')

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

        // Call Gemini API with multi-model router
        const result = await routeGeminiRequest(requestBody, GEMINI_API_KEY)

        if (!result.success) {
            apiError('[Surprise Query] Gemini router error:', result.error)
            throw new Error(result.error || 'Failed to generate query from Gemini')
        }

        // DEBUG: Log raw Gemini response
        apiLog('[Surprise Query] Raw Gemini response:', JSON.stringify(result.data, null, 2))

        const extractedText = extractGeminiText(result.data)
        apiLog('[Surprise Query] Extracted text:', extractedText)

        if (!extractedText) {
            apiError('[Surprise Query] extractGeminiText returned null/undefined!')
            apiLog('[Surprise Query] Result data structure:', {
                hasCandidates: !!result.data?.candidates,
                candidatesLength: result.data?.candidates?.length,
                firstCandidate: result.data?.candidates?.[0],
            })
        }

        let generatedQuery = extractedText?.trim() || 'epic adventures'

        if (generatedQuery === 'epic adventures') {
            apiError('[Surprise Query] Using fallback "epic adventures" - extraction failed!')
        }

        // Clean up the query: remove quotes, trailing periods, and take only first line
        generatedQuery = generatedQuery
            .split('\n')[0] // Take only the first line if multiple are returned
            .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
            .replace(/\.+$/, '') // Remove trailing periods
            .replace(/^\d+\.\s*/, '') // Remove leading numbers like "1. "
            .replace(/^-\s*/, '') // Remove leading dashes
            .trim()

        apiLog('[Surprise Query] Final cleaned query:', generatedQuery)

        return NextResponse.json({
            query: generatedQuery,
            _meta: result.metadata, // Include router metadata
            _debug: {
                rawExtracted: extractedText,
                usedFallback: generatedQuery === 'epic adventures',
                rateLimited: false,
                hadError: false,
            },
        })
    } catch (error) {
        apiError('[Surprise Query] ❌ ERROR CAUGHT - Using error fallback:', error)
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
        apiLog('[Surprise Query] Returning error fallback query:', randomQuery)
        return NextResponse.json({
            query: randomQuery,
            _debug: {
                hadError: true,
                errorMessage: error instanceof Error ? error.message : String(error),
                rateLimited: false,
            },
        })
    }
}
