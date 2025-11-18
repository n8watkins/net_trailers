import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { consumeGeminiRateLimit } from '@/lib/geminiRateLimiter'
import { sanitizeInput } from '@/utils/inputSanitization'
import { apiError } from '@/utils/debugLogger'
import { routeGeminiRequest, extractGeminiText, FLASH_LITE_PRIORITY } from '@/lib/geminiRouter'

/**
 * POST /api/generate-row-name
 *
 * Generates a creative, funny name for a custom row using Google Gemini AI.
 *
 * Request Body:
 * {
 *   genres: number[],           // TMDB genre IDs
 *   genreLogic: 'AND' | 'OR',   // How genres are combined
 *   mediaType: 'movie' | 'tv' | 'both'
 * }
 *
 * Response:
 * {
 *   name: string,               // Generated name
 *   alternatives?: string[]     // Optional alternative suggestions
 * }
 */
async function handleGenerateRowName(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        const apiKey = process.env.GEMINI_API_KEY

        if (!apiKey) {
            return NextResponse.json(
                {
                    error: 'Configuration error',
                    message: 'Gemini API key not configured',
                },
                { status: 500 }
            )
        }

        const body = await request.json()
        const { genres, genreLogic, mediaType } = body

        // Validate input
        if (!genres || !Array.isArray(genres) || genres.length === 0) {
            return NextResponse.json(
                { error: 'Bad request', message: 'genres array is required' },
                { status: 400 }
            )
        }

        if (!genreLogic || !['AND', 'OR'].includes(genreLogic)) {
            return NextResponse.json(
                { error: 'Bad request', message: 'genreLogic must be AND or OR' },
                { status: 400 }
            )
        }

        if (!mediaType || !['movie', 'tv', 'both'].includes(mediaType)) {
            return NextResponse.json(
                { error: 'Bad request', message: 'mediaType must be movie, tv, or both' },
                { status: 400 }
            )
        }

        const rateStatus = consumeGeminiRateLimit(userId)
        if (!rateStatus.allowed) {
            return NextResponse.json(
                {
                    error: 'AI naming limit reached. Please try again later.',
                    retryAfterMs: rateStatus.retryAfterMs,
                },
                { status: 429 }
            )
        }

        // Map genre IDs to names for better prompts
        const genreMap: Record<number, string> = {
            // Movie genres
            28: 'Action',
            12: 'Adventure',
            16: 'Animation',
            35: 'Comedy',
            80: 'Crime',
            99: 'Documentary',
            18: 'Drama',
            10751: 'Family',
            14: 'Fantasy',
            36: 'History',
            27: 'Horror',
            10402: 'Music',
            9648: 'Mystery',
            10749: 'Romance',
            878: 'Science Fiction',
            10770: 'TV Movie',
            53: 'Thriller',
            10752: 'War',
            37: 'Western',
            // TV genres
            10759: 'Action & Adventure',
            10762: 'Kids',
            10763: 'News',
            10764: 'Reality',
            10765: 'Sci-Fi & Fantasy',
            10766: 'Soap',
            10767: 'Talk',
            10768: 'War & Politics',
        }

        const genreNames = genres.map((id) => genreMap[id] || `Genre ${id}`).join(', ')

        // Build prompt for Gemini
        const logicText = genreLogic === 'AND' ? 'that are ALL of' : 'that are ANY of'
        const mediaTypeText =
            mediaType === 'both'
                ? 'movies and TV shows'
                : mediaType === 'movie'
                  ? 'movies'
                  : 'TV shows'

        const prompt = `You are a Netflix content curator who creates SHOCKINGLY cool, witty row names that surprise and delight members.

The row shows ${mediaTypeText} ${logicText} these genres: ${genreNames}.

Requirements:
- ULTRA SHORT (1-3 words MAXIMUM)
- Be BOLD and SURPRISING - shock the user with how cool the name is
- Use pop culture slang, memes, and internet language when appropriate
- Sound like something a cool friend would say, not corporate marketing
- Examples of the vibe we want:
  * "THE GOAT" (for legendary content)
  * "Peak Scorsese" (for Martin Scorsese films)
  * "Vibes Only" (for mood-based picks)
  * "Certified Bangers" (for top-tier action)
  * "Chef's Kiss" (for perfectly crafted films)
  * "Unhinged Energy" (for wild, chaotic content)
  * "No Skips" (for consistently great content)
  * "Built Different" (for unique standouts)

DO NOT use generic phrases like:
- "Best of [X]"
- "[Genre] Picks"
- "Top [Genre]"
- "[Genre] Essentials"

Instead, think:
- Internet slang and memes
- Music culture references
- Sports culture (GOAT, MVP, etc.)
- Food culture (Chef's Kiss, Michelin Star, etc.)
- Gen Z/Millennial language

For: ${genreNames} - create a name that's SO cool and witty that it surprises and delights.

Response: Just the name, nothing else. Make it LEGENDARY.`

        // Call Gemini API with multi-model router (prioritize Flash-Lite for 1,000 RPD quota)
        const result = await routeGeminiRequest(
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 5000, // Gemini 2.5 thinking mode uses 999+ tokens, need large allocation
                },
            },
            apiKey,
            FLASH_LITE_PRIORITY // Use Flash-Lite first for high-frequency name generation
        )

        if (!result.success) {
            apiError('Gemini router error:', result.error)
            return NextResponse.json(
                {
                    error: 'AI service error',
                    message: result.error || 'Failed to generate name. Please try again.',
                },
                { status: 500 }
            )
        }

        // Extract generated text
        const generatedText = extractGeminiText(result.data)?.trim() || 'Untitled Row'

        // Clean up the response (remove quotes, extra formatting)
        const cleanedName = generatedText
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/\*\*/g, '') // Remove bold markdown
            .trim()

        return NextResponse.json({
            name: cleanedName,
            _meta: result.metadata, // Include router metadata
        })
    } catch (error) {
        apiError('Error generating row name:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export const POST = withAuth(handleGenerateRowName)
