import { NextRequest, NextResponse } from 'next/server'

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
export async function POST(request: NextRequest) {
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

        const prompt = `Generate a creative, catchy, and funny name for a streaming service content row.

The row shows ${mediaTypeText} ${logicText} these genres: ${genreNames}.

Requirements:
- Keep it short (2-4 words max)
- Make it clever, punny, or humorous
- Match the vibe of the genre combination
- Should sound like something Netflix or Hulu would use
- Don't use generic phrases like "Best of" or "Top picks"

Examples of good names:
- For Action + Comedy: "Punch & Giggles"
- For Horror + Romance: "Love Bites"
- For Sci-Fi + Western: "Space Cowboys"
- For Animation + Music: "Toon Tunes"

Generate ONE perfect name for: ${genreNames} (${genreLogic} logic).

Response format: Just output the name, nothing else.`

        // Call Gemini API (using 2.0 to avoid thinking tokens overhead)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.9,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 100, // Gemini 2.0 doesn't have thinking overhead
                    },
                }),
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Gemini API error:', response.status, errorText)
            return NextResponse.json(
                {
                    error: 'AI service error',
                    message: 'Failed to generate name. Please try again.',
                },
                { status: 500 }
            )
        }

        const data = await response.json()

        // Extract generated text
        const generatedText =
            data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Untitled Row'

        // Clean up the response (remove quotes, extra formatting)
        const cleanedName = generatedText
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/\*\*/g, '') // Remove bold markdown
            .trim()

        return NextResponse.json({
            name: cleanedName,
        })
    } catch (error) {
        console.error('Error generating row name:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
