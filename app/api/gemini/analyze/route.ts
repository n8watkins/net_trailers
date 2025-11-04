import { NextRequest, NextResponse } from 'next/server'

/**
 * Gemini API endpoint for semantic analysis of user input
 *
 * Analyzes natural language text to extract:
 * - Genre mentions (sci-fi, thriller, comedy, etc.)
 * - Style/tone (dark, lighthearted, gritty, family-friendly)
 * - Themes (revenge, coming-of-age, time travel)
 * - Era/time period (80s, modern, classic)
 * - Rating preferences (R-rated, family-friendly)
 * - Smart recommendations based on context
 */
export async function POST(request: NextRequest) {
    try {
        const { text, entities, mediaType } = await request.json()

        // Validate input
        if (!text || text.trim().length < 5) {
            return NextResponse.json({ error: 'Text too short for analysis' }, { status: 400 })
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            console.error('GEMINI_API_KEY not configured')
            return NextResponse.json({ error: 'AI analysis unavailable' }, { status: 503 })
        }

        // Build the prompt for Gemini
        const prompt = buildAnalysisPrompt(text, entities, mediaType)

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3, // Lower for more consistent results
                        maxOutputTokens: 1000,
                        responseMimeType: 'application/json', // Force JSON output without markdown
                    },
                }),
            }
        )

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`)
        }

        const data = await response.json()
        const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!analysisText) {
            throw new Error('No analysis returned from Gemini')
        }

        // Strip markdown code blocks if present (Gemini 2.5 wraps JSON in ```json...```)
        const cleanedText = analysisText
            .replace(/^```json\s*\n?/i, '') // Remove opening ```json
            .replace(/\n?```\s*$/, '') // Remove closing ```
            .trim()

        // Parse the JSON response from Gemini
        const analysis = JSON.parse(cleanedText)

        return NextResponse.json({
            genres: analysis.genres || [],
            style: analysis.style || {},
            themes: analysis.themes || [],
            yearRange: analysis.yearRange || null,
            certification: analysis.certification || null,
            recommendations: analysis.recommendations || [],
            insight: analysis.insight || '',
        })
    } catch (error) {
        console.error('Gemini analysis error:', error)
        return NextResponse.json(
            { error: 'Failed to analyze text', details: (error as Error).message },
            { status: 500 }
        )
    }
}

/**
 * Build the prompt for Gemini to analyze user input
 */
function buildAnalysisPrompt(text: string, entities: any[], mediaType: string): string {
    const taggedPeople = entities.filter((e) => e.type === 'person').map((e) => e.name)
    const taggedContent = entities
        .filter((e) => e.type === 'movie' || e.type === 'tv')
        .map((e) => e.name)

    return `You are an expert film/TV analyst. Analyze this user's description of content they want to watch.

User Input: "${text}"
Media Type: ${mediaType}
${taggedPeople.length > 0 ? `Tagged People: ${taggedPeople.join(', ')}` : ''}
${taggedContent.length > 0 ? `Tagged Titles: ${taggedContent.join(', ')}` : ''}

Extract and return a JSON object with:
{
  "genres": ["genre1", "genre2"],  // TMDB genre names (Action, Sci-Fi, Thriller, Horror, Comedy, Drama, etc.)
  "style": {
    "tone": "dark|light|gritty|whimsical|serious|comedic",  // Overall tone
    "maturity": "family|teen|mature|adult"  // Content maturity level
  },
  "themes": ["theme1", "theme2"],  // e.g. "revenge", "time travel", "coming-of-age"
  "yearRange": { "min": 1980, "max": 1989 } | null,  // If user mentions era/decade
  "certification": ["R", "PG-13"] | null,  // MPAA ratings if tone suggests it
  "recommendations": [
    {
      "type": "rating"|"year_range"|"keyword",
      "value": any,
      "reason": "why this makes sense based on the description",
      "confidence": 0-100
    }
  ],
  "insight": "Single concise sentence (10-15 words max) capturing the vibe"
}

Important:
- Only include genres that are clearly mentioned or strongly implied
- Be conservative with recommendations - only suggest what clearly fits
- Tone keywords: dark, gritty → likely R-rated mature content
- Family keywords: kids, children, wholesome → G/PG ratings
- Era mentions: 80s → 1980-1989, 90s → 1990-1999, classic → pre-2000, modern → post-2015
- Keep insight VERY concise - single sentence, max 15 words, capturing the essence

Return ONLY valid JSON, no markdown formatting.`
}
