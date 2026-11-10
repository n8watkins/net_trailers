/**
 * Semantic analysis of a free-text mood with Gemini: maps it to unified genre
 * ids, a year range and title recommendations. Used by /api/gemini/analyze and
 * directly (in-process) by /api/smart-suggestions, so one user action is
 * charged once against the AI quota.
 */

import { routeGeminiRequest, extractGeminiText } from '@/lib/geminiRouter'

export interface TextAnalysis {
    genreIds: string[]
    yearRange: unknown
    certification: unknown
    recommendations: unknown[]
    mediaType: string
    conceptQuery: string | null
    movieRecommendations: unknown[]
    _meta?: unknown
}

export class AiUnavailableError extends Error {
    constructor(detail?: string) {
        super(detail || 'Gemini request failed')
        this.name = 'AiUnavailableError'
    }
}

/** Analyse sanitised text. Throws AiUnavailableError when Gemini fails. */
export async function analyzeText(
    text: string,
    mediaType: string,
    apiKey: string
): Promise<TextAnalysis> {
    const result = await routeGeminiRequest(
        {
            contents: [{ parts: [{ text: buildAnalysisPrompt(text, mediaType) }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
        },
        apiKey
    )
    if (!result.success) throw new AiUnavailableError(result.error)

    const analysisText = extractGeminiText(result.data)
    if (!analysisText) throw new AiUnavailableError('No analysis returned from Gemini')

    const analysis = JSON.parse(
        analysisText
            .replace(/^```json\s*\n?/i, '')
            .replace(/\n?```\s*$/, '')
            .trim()
    )
    return {
        genreIds: analysis.genreIds || [],
        yearRange: analysis.yearRange || null,
        certification: analysis.certification || null,
        recommendations: analysis.recommendations || [],
        mediaType: analysis.mediaType || 'both',
        conceptQuery: analysis.conceptQuery || null,
        movieRecommendations: analysis.movieRecommendations || [],
        _meta: result.metadata,
    }
}

function buildAnalysisPrompt(text: string, mediaType: string): string {
    return `You are an expert film/TV analyst. Analyze this user's description and map it to unified genre IDs.

User Input: "${text}"
Media Type: ${mediaType}

**IMPORTANT: You MUST use these exact unified genre IDs (they work for both movies and TV):**

UNIFIED GENRES:
- "action": Action
- "adventure": Adventure
- "animation": Animation
- "comedy": Comedy
- "crime": Crime
- "documentary": Documentary
- "drama": Drama
- "family": Family
- "fantasy": Fantasy
- "history": History
- "horror": Horror
- "kids": Kids (TV only)
- "music": Music
- "mystery": Mystery
- "news": News (TV only)
- "reality": Reality (TV only)
- "romance": Romance
- "scifi": Science Fiction
- "soap": Soap (TV only)
- "talk": Talk (TV only)
- "thriller": Thriller
- "war": War
- "politics": Politics (TV only)
- "western": Western

**NOTE**: Use lowercase string IDs, not numbers. The system automatically maps these to correct TMDB IDs based on media type.
Example: "romance" → Maps to genre 10749 for movies, genre 18 (Drama) for TV shows

Return ONLY this JSON structure with unified genre IDs:
{
  "mediaType": "movie"|"tv"|"both",
  "genreIds": ["crime", "drama"],
  "yearRange": { "min": 1980, "max": 1989 } | null,
  "certification": ["R", "PG-13"] | null,
  "recommendations": [
    {
      "type": "rating"|"year_range",
      "value": any,
      "reason": "brief reason",
      "confidence": 0-100
    }
  ],
  "conceptQuery": string | null,
  "movieRecommendations": [
    {
      "title": "Clue",
      "year": 1985,
      "reason": "Murder mystery comedy with mistaken identities"
    }
  ]
}

Examples:
- "gangster movies" → {"genreIds": ["crime", "drama"]}
- "scary films" → {"genreIds": ["horror"]}
- "space adventures" → {"genreIds": ["scifi", "adventure"]}
- "action comedies" → {"genreIds": ["action", "comedy"]}
- "romantic dramas" → {"genreIds": ["romance", "drama"]}

CONCEPT QUERY Examples:

Pure Concept:
- "comedy of errors" → provide conceptQuery plus 10-15 titles and genreIds ["comedy"]

Hybrid Genre+Vibe:
- "dark scifi thriller" → conceptQuery + movieRecommendations + genreIds ["scifi", "thriller"]

Stay concise and return valid JSON only.`
}
