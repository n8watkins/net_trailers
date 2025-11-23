import { SmartSearchMode, ConversationMessage } from '../../types/smartSearch'
import { getAllEmojis, AVAILABLE_COLORS } from '../../config/constants'

/**
 * Builds Gemini AI prompts for smart search functionality
 */

// Get available emojis and colors for prompts
const EMOJI_LIST = getAllEmojis().join(' ')
const COLOR_LIST = (AVAILABLE_COLORS as readonly string[]).join(', ')

export function buildInitialPrompt(query: string, mode: SmartSearchMode): string {
    const baseInstructions = `You are a movie and TV show recommendation expert. Analyze the user's query and provide personalized suggestions.

IMPORTANT: Return ONLY valid JSON. Do NOT wrap in markdown code blocks.

User Query: "${query}"

AVAILABLE EMOJIS (pick ONE that best represents this collection):
${EMOJI_LIST}

AVAILABLE COLORS (pick ONE hex code that matches the mood/theme):
${COLOR_LIST}`

    const modeSpecificInstructions = {
        suggestions: `
Generate 10-15 movie/TV recommendations based on the query.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Creative Short Name (1-4 words)",
  "mediaType": "movie" | "tv",
  "genreFallback": [genre_id1, genre_id2],
  "emoji": "🎬",
  "color": "#ef4444"
}

Guidelines:
- Focus on quality, well-known titles
- Mix of classics and recent releases
- Use internet slang for row names (e.g., "Peak Cinema", "Absolute Bangers")
- Genre IDs for fallback: Action=28, Comedy=35, Drama=18, Horror=27, Scifi=878, Thriller=53, Romance=10749
- Pick an emoji that captures the collection's genre, mood, or theme
- Pick a color that complements the emoji (exciting = red/orange, calm = blue/teal, dark = purple/violet)`,

        row: `
Generate 10-15 movie/TV recommendations for creating a custom row. This row may have infinite scrolling.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Creative Row Name (1-4 words, use slang/memes)",
  "mediaType": "movie" | "tv",
  "genreFallback": [genre_id1, genre_id2],
  "emoji": "🎬",
  "color": "#ef4444"
}

Guidelines:
- genreFallback should enable infinite content discovery
- If query is about actor/director, group series/trilogies together
- Creative, memorable row names
- Genre IDs: Action=28, Comedy=35, Drama=18, Horror=27, Scifi=878, Thriller=53, Romance=10749, Crime=80
- Pick an emoji that captures the collection's genre, mood, or theme
- Pick a color that complements the emoji (exciting = red/orange, calm = blue/teal, dark = purple/violet)`,

        watchlist: `
Generate 8-12 movie/TV recommendations for a curated watchlist. This is a finite, personal collection.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Watchlist Name (descriptive, 2-4 words)",
  "mediaType": "movie" | "tv",
  "genreFallback": [],
  "emoji": "📺",
  "color": "#3b82f6"
}

Guidelines:
- Focus on must-watch titles
- Diverse selection within the theme
- Professional watchlist names (not slang)
- genreFallback should be empty (watchlists are finite)
- Pick an emoji that captures the collection's genre, mood, or theme
- Pick a color that complements the emoji (exciting = red/orange, calm = blue/teal, dark = purple/violet)`,
    }

    return `${baseInstructions}\n${modeSpecificInstructions[mode]}`
}

export function buildFollowUpPrompt(
    query: string,
    mode: SmartSearchMode,
    conversationHistory: ConversationMessage[],
    existingMovies: Array<{ title: string; year: string }>
): string {
    // Format existing movies list for clear context
    const existingMoviesList = existingMovies
        .map((m) => `- ${m.title}${m.year ? ` (${m.year})` : ''}`)
        .join('\n')

    const baseInstructions = `ORIGINAL USER QUERY: "${query}"

YOU ALREADY PROVIDED THESE ${existingMovies.length} RECOMMENDATIONS:
${existingMoviesList}

TASK: Find MORE movies/shows that are VERY SIMILAR to the original query "${query}".

CRITICAL REQUIREMENTS:
1. STAY EXTREMELY CLOSE to the theme, style, and vibe of "${query}"
2. DO NOT repeat ANY of the ${existingMovies.length} titles listed above
3. Find titles that someone who liked the first batch would DEFINITELY want to watch
4. Maintain the same quality level, genre, and tone
5. Think of what naturally belongs in the same collection

DO NOT:
- Suggest any title already in the list above (check carefully!)
- Drift away from the original query's theme
- Include random or loosely related content

IMPORTANT: Return ONLY valid JSON. Do NOT wrap in markdown code blocks.`

    const modeSpecificInstructions = {
        suggestions: `
Generate 10-15 MORE recommendations that perfectly match "${query}".

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Keep same theme as before",
  "mediaType": "movie" | "tv",
  "genreFallback": [genre_id1, genre_id2],
  "emoji": "🎬",
  "color": "#ef4444"
}

Focus on:
- Titles with the exact same vibe as the original recommendations
- Mix of well-known and hidden gems
- Natural companions to what was already suggested
- Keep same emoji and color as the original batch`,

        row: `
Generate 10-15 MORE titles to expand this row about "${query}".

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Keep same name",
  "mediaType": "movie" | "tv",
  "genreFallback": [genre_id1, genre_id2],
  "emoji": "🎬",
  "color": "#ef4444"
}

Focus on:
- Perfect thematic matches for "${query}"
- Continue the same quality and style
- Titles that belong in this exact collection
- Keep same emoji and color as the original batch`,

        watchlist: `
Generate 8-12 MORE titles for this "${query}" watchlist.

Return JSON in this exact format:
{
  "movies": [{"title": "Movie Title", "year": 2020}],
  "rowName": "Keep same name",
  "mediaType": "movie" | "tv",
  "genreFallback": [],
  "emoji": "📺",
  "color": "#3b82f6"
}

Focus on:
- Must-watch titles that fit "${query}" perfectly
- Same caliber as the first batch
- Natural additions to this collection
- Keep same emoji and color as the original batch`,
    }

    return `${baseInstructions}\n${modeSpecificInstructions[mode]}`
}
