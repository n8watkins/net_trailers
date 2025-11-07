import { SmartSearchMode, ConversationMessage } from '../../types/smartSearch'

/**
 * Builds Gemini AI prompts for smart search functionality
 */

export function buildInitialPrompt(query: string, mode: SmartSearchMode): string {
    const baseInstructions = `You are a movie and TV show recommendation expert. Analyze the user's query and provide personalized suggestions.

IMPORTANT: Return ONLY valid JSON. Do NOT wrap in markdown code blocks.

User Query: "${query}"`

    const modeSpecificInstructions = {
        suggestions: `
Generate 10-15 movie/TV recommendations based on the query.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Creative Short Name (1-4 words)",
  "mediaType": "movie" | "tv" | "both",
  "genreFallback": [genre_id1, genre_id2]
}

Guidelines:
- Focus on quality, well-known titles
- Mix of classics and recent releases
- Use internet slang for row names (e.g., "Peak Cinema", "Absolute Bangers")
- Genre IDs for fallback: Action=28, Comedy=35, Drama=18, Horror=27, Scifi=878, Thriller=53, Romance=10749`,

        row: `
Generate 10-15 movie/TV recommendations for creating a custom row. This row may have infinite scrolling.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Creative Row Name (1-4 words, use slang/memes)",
  "mediaType": "movie" | "tv" | "both",
  "genreFallback": [genre_id1, genre_id2]
}

Guidelines:
- genreFallback should enable infinite content discovery
- If query is about actor/director, group series/trilogies together
- Creative, memorable row names
- Genre IDs: Action=28, Comedy=35, Drama=18, Horror=27, Scifi=878, Thriller=53, Romance=10749, Crime=80`,

        watchlist: `
Generate 8-12 movie/TV recommendations for a curated watchlist. This is a finite, personal collection.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Watchlist Name (descriptive, 2-4 words)",
  "mediaType": "movie" | "tv" | "both",
  "genreFallback": []
}

Guidelines:
- Focus on must-watch titles
- Diverse selection within the theme
- Professional watchlist names (not slang)
- genreFallback should be empty (watchlists are finite)`,
    }

    return `${baseInstructions}\n${modeSpecificInstructions[mode]}`
}

export function buildFollowUpPrompt(
    query: string,
    mode: SmartSearchMode,
    conversationHistory: ConversationMessage[],
    existingResultIds: number[]
): string {
    const historyContext = conversationHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n')

    const baseInstructions = `You are continuing a conversation about movie/TV recommendations.

Previous conversation:
${historyContext}

Current request: "${query}"

The user already has ${existingResultIds.length} suggestions. Provide NEW, DIFFERENT recommendations that complement the existing ones.

IMPORTANT: Return ONLY valid JSON. Do NOT wrap in markdown code blocks.`

    const modeSpecificInstructions = {
        suggestions: `
Generate 8-12 ADDITIONAL movie/TV recommendations that are similar but different from what was already suggested.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Updated Name (if needed, or keep similar theme)",
  "mediaType": "movie" | "tv" | "both",
  "genreFallback": [genre_id1, genre_id2]
}

Guidelines:
- Avoid duplicating existing suggestions
- Expand on the theme
- Discover deeper cuts and hidden gems
- Maintain consistency with previous recommendations`,

        row: `
Generate 8-12 ADDITIONAL movies/shows to expand the custom row.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Same or similar name",
  "mediaType": "movie" | "tv" | "both",
  "genreFallback": [genre_id1, genre_id2]
}

Guidelines:
- Complement existing selections
- Maintain thematic consistency
- Include both popular and underrated titles`,

        watchlist: `
Generate 6-10 ADDITIONAL titles to expand the watchlist.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Same or similar name",
  "mediaType": "movie" | "tv" | "both",
  "genreFallback": []
}

Guidelines:
- Build on the existing watchlist theme
- Maintain quality and relevance
- Keep watchlist cohesive`,
    }

    return `${baseInstructions}\n${modeSpecificInstructions[mode]}`
}
