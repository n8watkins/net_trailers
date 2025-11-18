# Gemini API Usage Documentation

**Last Updated**: 2025-01-18
**Model**: `gemini-2.0-flash-001`
**Total Endpoints**: 6

---

## Overview

NetTrailers uses Google Gemini AI across 6 API endpoints to power intelligent content discovery, creative naming, and semantic search. All endpoints use **Gemini 2.0 Flash** for fast, cost-effective responses.

### Rate Limiting

- **Global rate limiter**: `lib/geminiRateLimiter.ts`
- **Limit**: 10 requests per user per 10 minutes
- **Tracking**: Per-user ID (authenticated) or per-IP (guest)
- **Response**: `429 Too Many Requests` with `retryAfterMs` when exceeded

### Security

- **Input sanitization**: All user input sanitized via `utils/inputSanitization.ts`
- **XSS protection**: Uses isomorphic-dompurify
- **API key**: Server-side only (never exposed to client)

---

## 1. Genre Mapping (Smart Search)

### **Endpoint**: `/api/genre-mapping`

**Actual Route**: `/api/gemini/analyze` (technical implementation)
**Location**: Hero banner at top of homepage
**Component**: `components/smartSearch/SmartSearchInput.tsx` → `components/layout/Banner.tsx`

### Purpose

Maps natural language queries to **unified genre IDs** by analyzing semantic meaning. Uses our unified genre system that automatically handles movie/TV genre differences.

**What it returns:**

- **Unified genre IDs** (strings like "action", "scifi", "romance") - works for both movies and TV
- Time periods/year ranges
- Content ratings/certifications
- Vibe/mood concepts
- Specific movie/TV recommendations

**How it works:**

1. We give Gemini a list of unified genres (e.g., "action", "comedy", "scifi")
2. User types natural language query
3. Gemini selects relevant genre IDs from our unified list
4. Returns string genre IDs like `["scifi", "thriller"]`
5. Our genre system automatically translates to correct TMDB IDs based on media type

**Why unified genres?**

- **Romance** example: Genre ID `"romance"` automatically maps to:
    - Movies: TMDB ID 10749 (Romance)
    - TV Shows: TMDB ID 18 (Drama - closest equivalent)
- **Fantasy/Sci-Fi** example: Genre IDs `"fantasy"` and `"scifi"` map to:
    - Movies: Separate TMDB IDs 14 (Fantasy) and 878 (Sci-Fi)
    - TV Shows: Combined TMDB ID 10765 (Sci-Fi & Fantasy)

### Example Use Cases

```
User types: "rainy day vibes"
→ Gemini returns: ["drama", "romance"]
→ App translates for movies: [18, 10749]
→ App translates for TV: [18, 18] → deduplicated to [18]

User types: "dark sci-fi thriller"
→ Gemini returns: ["scifi", "thriller"]
→ Movies: [878, 53] | TV: [10765] (no thriller genre for TV)

User types: "romantic dramas"
→ Gemini returns: ["romance", "drama"]
→ Movies: [10749, 18] | TV: [18] (deduplicated)
```

### Prompt Strategy

- **Temperature**: 0.3 (low - for consistent, accurate genre mapping)
- **Max tokens**: 1000
- **Instructions**:
    - We provide unified genre IDs ("action", "scifi", "romance", etc.)
    - Gemini selects from OUR provided list
    - Returns unified genre IDs (strings) that work across media types
    - Detect media type preference (movie/tv/both)
    - Extract year ranges and rating preferences

### Input

```typescript
{
  text: string,           // User's natural language query (1-500 chars)
  mediaType: 'movie' | 'tv' | 'both'
}
```

### Output

```typescript
{
  genreIds: string[],                    // Unified genre IDs (e.g., ["action", "comedy"])
  yearRange: { min: number, max: number } | null,
  certification: string[] | null,        // e.g., ["R", "PG-13"]
  mediaType: 'movie' | 'tv' | 'both',
  conceptQuery: string | null,           // Semantic description for complex vibes
  movieRecommendations: Array<{          // Specific titles when query is conceptual
    title: string,
    year: number,
    reason: string
  }>
}
```

### Unified Genres Provided to Gemini

**All Genres** (work for both movies and TV):

- "action", "adventure", "animation", "comedy", "crime"
- "documentary", "drama", "family", "fantasy", "history"
- "horror", "kids", "music", "mystery", "news"
- "reality", "romance", "scifi", "soap", "talk"
- "thriller", "war", "politics", "western"

**Note**: Some genres are media-specific:

- Movie-only: "history", "horror", "music", "thriller"
- TV-only: "kids", "news", "reality", "soap", "talk", "politics"

### Integration Flow

1. User types in hero search bar (e.g., "romantic sci-fi")
2. Frontend calls `/api/gemini/analyze` with query
3. Gemini selects unified IDs: `["romance", "scifi"]`
4. For movies → translates to TMDB IDs: [10749, 878]
5. For TV → translates to TMDB IDs: [18, 10765]
6. App queries TMDB API with correct genre IDs per media type
7. Results displayed with proper genre filtering

---

## 2. Generate Collection (Full AI Generation)

### **Endpoint**: `/api/generate-collection`

**Actual Route**: `/api/generate-row` (technical implementation)
**Location**: Multiple places

- Smart collection builder: `components/customRows/smart/SimplifiedSmartBuilder.tsx`
- Smart ranking creator: `components/rankings/SmartRankingCreator.tsx`
- Collection wizard: `components/customRows/WizardStep3NamePreview.tsx`

### Purpose

**Single-call AI collection generation** - returns complete collections with TMDB IDs, metadata, and creative names.

### Example Use Cases

```
User query: "best denzel washington movies"
→ Returns: 10-15 Denzel movies with TMDB IDs + row name "THE GOAT" + metadata

User query: "mind-bending thrillers"
→ Returns: Inception, Shutter Island, Memento, etc. + name "Brain Melters" + metadata

User query: "keanu reeves movies"
→ Returns: Matrix trilogy, John Wick series, Speed, Point Break + franchises grouped
```

### Prompt Strategy

- **Temperature**: 0.4 (balanced creativity + accuracy)
- **Max tokens**: 4000
- **Instructions**:
    - Return 10-15 movies/shows as `{title, year}` pairs
    - Create catchy, internet-slang row names (1-4 words)
    - Group franchises chronologically
    - Provide genre fallback IDs
    - Use exact TMDB titles

### Special Features

- **Franchise grouping**: Matrix trilogy, John Wick series ordered chronologically
- **Creative naming**: "THE GOAT", "Peak Sci-Fi", "Certified Bangers", "No Skips"
- **TMDB enrichment**: Server-side TMDB search validates all titles
- **Hidden content filtering**: Now excludes user's hidden movies (Phase 4 implementation)

### Input

```typescript
{
  query: string,          // Natural language query (1-500 chars)
  excludedIds?: number[]  // Content IDs to exclude (optional)
}
```

### Output

```typescript
{
  movies: Array<{
    title: string,
    year: number,
    tmdbId: number,
    posterPath: string | null,
    rating: number,
    reason: string        // Brief description
  }>,
  rowName: string,        // Creative name from Gemini
  mediaType: 'movie' | 'tv' | 'both',
  genreFallback: number[] // TMDB genre IDs as backup
}
```

### Integration Flow

1. User enters query (e.g., "best tom hanks movies")
2. Single API call to `/api/generate-row`
3. Gemini returns titles + creative name
4. Server enriches with TMDB data (posters, ratings, IDs)
5. Filters out hidden content (new!)
6. Frontend displays instant preview
7. User can save as collection or ranking

---

## 3. Generate Name (Creative Collection Naming)

### **Endpoint**: `/api/generate-name`

**Actual Route**: `/api/generate-row-name` (technical implementation)
**Location**: Collection creation wizard
**Component**: `components/customRows/CustomRowForm.tsx`

### Purpose

Generates **ultra-creative, witty, slang-heavy names** for genre-based collections.

### Example Use Cases

```
Genres: [Action, Comedy]
→ "Certified Bangers"

Genres: [Horror, Thriller]
→ "Unhinged Energy"

Genres: [Drama, Romance]
→ "Chef's Kiss"

Genres: [Sci-Fi]
→ "Built Different"
```

### Prompt Strategy

- **Temperature**: 0.9 (high creativity)
- **Max tokens**: 5000 (Gemini 2.0's thinking mode uses 999+ tokens internally)
- **Top K**: 40, **Top P**: 0.95
- **Instructions**:
    - ULTRA SHORT (1-3 words MAX)
    - Use internet slang, memes, pop culture
    - Examples: "THE GOAT", "Peak Scorsese", "Vibes Only", "No Skips"
    - Avoid generic phrases like "Best of X" or "Top Genre"

### Input

```typescript
{
  genres: number[],           // TMDB genre IDs
  genreLogic: 'AND' | 'OR',   // How genres are combined
  mediaType: 'movie' | 'tv' | 'both'
}
```

### Output

```typescript
{
    name: string // Ultra-creative name (1-3 words)
}
```

### Integration Flow

1. User selects genres in collection wizard
2. Clicks "Generate Name" button
3. API calls Gemini with genre context
4. Returns witty, slang-heavy name
5. User can accept or regenerate

---

## 4. Smart Suggestions (Collection Builder Wizard)

### **Endpoint**: `/api/smart-suggestions`

**Location**: Smart Collection Builder Wizard (3-step flow)
**Entry Point**: Settings → Collections → "+" button → Select "Smart" mode
**Components**:

- `components/customRows/smart/SmartRowBuilder.tsx` (main wizard orchestrator)
- `components/customRows/smart/SmartStep1Input.tsx` (input step)
- `components/customRows/smart/SmartStep2Suggestions.tsx` (uses this API)
- `components/customRows/smart/SmartStep3Preview.tsx` (preview step)

### Purpose

Powers **Step 2** of the Smart Collection Builder - analyzes user input and provides intelligent suggestions for collection filters. This is the "brain" of the smart wizard that converts natural language into TMDB-compatible collection configuration using AI interpretation.

**What it does:**

1. Analyzes user's typed natural language text
2. Calls `/api/genre-mapping` internally for semantic understanding
3. Gemini infers actors, directors, genres from the text automatically
4. Generates creative collection names using Gemini
5. Returns configurable suggestions (genres, cast, directors)
6. User can toggle/modify these suggestions before creating collection

**Key Features:**

- **AI interpretation**: Gemini automatically detects people, genres, themes from text
- **Genre inference**: "90s action vibes" → Genre: Action + Year: 1990-1999
- **People detection**: "Christopher Nolan films" → Director: Christopher Nolan
- **Creative naming**: Multiple name suggestions with refresh button
- **TMDB + Gemini hybrid**: Combines TMDB data with AI insights

### User Flow (3-Step Wizard)

```
Step 1: Smart Input
├─ User types: "Christopher Nolan dark themes"
├─ AI will automatically interpret actors/directors from text
└─ Click "Continue"

Step 2: Smart Suggestions (THIS API)
├─ API analyzes input → Gemini interprets the query
├─ Shows: Genre: Thriller, Drama (inferred by AI)
├─ Shows: Director: Christopher Nolan (detected from text)
├─ Shows: Row name: "Nolan's Dark Mysteries" (generated by AI)
├─ User can:
│   ├─ Toggle genre chips
│   ├─ Remove/add people
│   ├─ Refresh name (calls API again with seed++)
│   └─ Adjust media type
└─ Click "Continue to Preview"

Step 3: Preview
├─ Shows actual content (12 items)
├─ Shows total results count (~47 results)
└─ Click "Create Collection"
```

### Example Use Cases

```
Input: User types "wes anderson films"
→ API analyzes text with Gemini
→ Gemini detects: "Wes Anderson" as director
→ Returns:
  - Genres: [35, 18] (Comedy, Drama) - inferred by AI
  - Director filter: Wes Anderson (ID: 5281) - detected from text
  - Row names: ["Peak Wes", "Wes Anderson Collection", "Anderson Essentials"]
  - Media type: movie

Input: User types "90s action vibes"
→ API analyzes natural language
→ Returns:
  - Genres: [28] (Action) - inferred by AI
  - Year range: 1990-1999 (inferred from "90s")
  - Row names: ["90s Bangers", "Action Classics", "Retro Action"]
  - Media type: both

Input: User types "Tom Hanks dramatic performances"
→ Gemini detects: "Tom Hanks" as actor, "dramatic" as genre
→ Returns:
  - Genres: [18] (Drama) - inferred from "dramatic"
  - Cast: Tom Hanks (required: false = OR logic) - detected from text
  - Row names: ["Hanks Masterclass", "THE GOAT", "Peak Tom"]
  - Media type: movie
```

### Prompt Strategy

This endpoint **orchestrates multiple AI operations**:

1. **Semantic Analysis** (via `/api/genre-mapping`):
    - Temperature: 0.3 (precise)
    - Purpose: Map text to TMDB genre IDs
    - Example: "dark vibes" → [53, 27] (Thriller, Horror)

2. **Creative Naming** (internal Gemini call):
    - Temperature: 0.95 (very creative)
    - Max tokens: 50
    - Purpose: Generate surprising, witty collection names
    - Style: Internet slang, memes, pop culture

3. **AI People Detection**:
    - Gemini detects actor/director names from text
    - Names verified against TMDB database
    - Profile images fetched for detected people
    - Determines if person is actor or director based on context

### Input

```typescript
{
  rawText: string,                     // User's typed text (minimum 10 chars)
  mediaType: 'movie' | 'tv' | 'both',  // Selected media type
  seed?: number                        // For name variation (increments on refresh)
}
```

### Output

```typescript
{
  suggestions: Array<{
    type: 'genre' | 'cast' | 'director' | 'content_list' | 'year_range',
    value: any,              // Genre IDs array, person ID, or content IDs
    confidence: number,      // 0-100 (how confident AI is)
    reason: string,          // Human-readable explanation
    source: 'tmdb' | 'gemini' // Where suggestion came from
  }>,
  rowNames: string[],        // 3 creative name suggestions
  mediaType: 'movie' | 'tv' | 'both',  // May be inferred by AI
  estimatedCount?: number    // Preview of how many results
}
```

### Suggestion Types Returned

1. **Genre Suggestions** (type: 'genre'):

    ```typescript
    {
      type: 'genre',
      value: [28, 35],  // TMDB genre IDs (Action, Comedy)
      confidence: 95,
      reason: 'AI detected action comedy from your description',
      source: 'gemini'
    }
    ```

2. **Cast Suggestions** (type: 'cast'):

    ```typescript
    {
      type: 'cast',
      value: 2963,  // TMDB person ID (Nicolas Cage)
      confidence: 100,
      reason: 'You tagged Nicolas Cage',
      source: 'tmdb'
    }
    ```

3. **Director Suggestions** (type: 'director'):
    ```typescript
    {
      type: 'director',
      value: 525,  // Christopher Nolan
      confidence: 100,
      reason: 'You tagged Christopher Nolan (Director)',
      source: 'tmdb'
    }
    ```

### Integration Flow

```
┌─────────────────────────────────────────────────┐
│ 1. User in Step 1: Types Natural Language      │
│    Input: "Tom Hanks dramatic performances"    │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ 2. Click Continue → Step 2 loads               │
│    API: POST /api/smart-suggestions             │
│    Body: {rawText, mediaType, seed:0}           │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ 3. API Processing:                              │
│    a) Gemini detects "Tom Hanks" from text     │
│    b) Call /api/genre-mapping for "dramatic"   │
│    c) TMDB lookup for Tom Hanks → ID: 31       │
│    d) Generate creative names via Gemini       │
│    e) Merge suggestions from TMDB + AI         │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ 4. Step 2 UI displays:                          │
│    ✓ Genre chips: [Drama] (toggleable)         │
│    ✓ Cast: Tom Hanks (AI-detected, removable)  │
│    ✓ Row name: "Hanks Masterclass" (refresh ↻) │
│    ✓ Media type: movie (changeable)            │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ 5. User clicks refresh name button:            │
│    → Calls API again with seed: 1              │
│    → Returns new names from same context       │
│    → UI updates name options                   │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ 6. User continues to Step 3:                    │
│    → Converts suggestions to TMDB filters      │
│    → Shows actual content preview              │
│    → User creates collection                   │
└─────────────────────────────────────────────────┘
```

### Special Behaviors

**Name Refresh with Seed:**

- Initial call: `seed: 0` → "Peak Tom"
- User clicks refresh: `seed: 1` → "Hanks Masterclass"
- Clicks again: `seed: 2` → "THE GOAT"
- Seed ensures variety without changing core analysis

**Media Type Inference:**

- User selects "movie" in Step 1
- API may override to "tv" if input strongly suggests TV
- Example: "best sitcoms" → API returns mediaType: "tv"

**AI People Detection:**

- Gemini analyzes context to determine if person is actor or director
- "Christopher Nolan films" → Detected as director
- "Tom Hanks movies" → Detected as actor
- TMDB lookup validates and provides person ID
- Affects how filters are built in Step 3

---

## 5. Surprise Me! (Random Query Generator)

### **Endpoint**: `/api/surprise-query`

**Location**: Smart ranking creator
**Component**: `components/rankings/SmartRankingCreator.tsx`

### Purpose

Generates **random, interesting ranking queries** to inspire users when they don't know what to create.

### Example Outputs

```
→ "Wes Anderson filmography"
→ "Best Tom Hanks performances"
→ "Star Wars saga ranked"
→ "Christopher Nolan filmography"
→ "Top 80s action classics"
→ "Tarantino films ranked"
```

### Prompt Strategy

- **Temperature**: 1.0 (maximum creativity/randomness)
- **Max tokens**: 100
- **Instructions**:
    - Generate ONE ranking title
    - Use ranking language: "Best", "Worst", "Top", "filmography", "collection", "ranked"
    - Focus on: actors, directors, franchises, decades, genres
    - Simple and clear
    - NO complex descriptions, NO episodes

### Fallback Strategy

- **Rate limiting**: 2 seconds between requests
- **Fallback list**: 12 curated queries if rate limited or API fails
- **Graceful degradation**: Always returns a valid query

### Input

```typescript
// No input - just POST request
```

### Output

```typescript
{
    query: string // Random ranking query
}
```

### Integration Flow

1. User clicks "Surprise Me!" in ranking creator
2. API generates random query
3. Query automatically populates search
4. AI generates ranking suggestions
5. User can accept or hit "Surprise Me!" again

---

## 6. AI Collection Name Suggestions

### **Endpoint**: `/api/ai-suggestions`

**Location**: Collection creation wizard (manual mode)
**Component**: `components/customRows/WizardStep3NamePreview.tsx`

### Purpose

Generate collection names from **conversational context** - supports multi-turn conversations and iterative refinement.

### Example Use Cases

```
Initial: "epic space battles"
→ Returns: "Cosmic Warfare" + 15 movies

Follow-up: "add more classics"
→ Refines results, keeps context

Follow-up: "make it darker"
→ Adjusts tone, returns darker titles
```

### Prompt Strategy

- **Temperature**: 0.4
- **Max tokens**: 4000
- **Context-aware**: Maintains conversation history
- **Iterative**: Can refine based on existing movies

### Special Features

- **Conversation history**: Tracks multi-turn context
- **Exclusion logic**: Avoids suggesting already-added content
- **TMDB enrichment**: Validates and enriches all suggestions
- **Mode support**:
    - `collection` - Build collections iteratively
    - `ranking` - Generate ranking suggestions

### Input

```typescript
{
  query: string,
  mode: 'collection' | 'ranking',
  conversationHistory?: Array<{
    role: 'user' | 'assistant',
    content: string
  }>,
  existingMovies?: number[]  // Already added TMDB IDs
}
```

### Output

```typescript
{
  results: Array<{
    title: string,
    year: number,
    tmdbId: number,
    posterPath: string | null,
    rating: number,
    reason: string
  }>,
  generatedName: string,
  genreFallback: number[],
  mediaType: 'movie' | 'tv' | 'both'
}
```

### Integration Flow

1. User enters initial query
2. API returns suggestions + name
3. User adds some, refines query
4. API receives context + existing movies
5. Returns new suggestions (excludes existing)
6. Iterative refinement continues

---

## Summary Matrix

| Endpoint                   | Location             | Temperature | Max Tokens | Purpose                   | Rate Limited     |
| -------------------------- | -------------------- | ----------- | ---------- | ------------------------- | ---------------- |
| `/api/genre-mapping`       | Hero search          | 0.3         | 1000       | Map queries to genre IDs  | ✅               |
| `/api/generate-collection` | Collections/Rankings | 0.4         | 4000       | Full AI generation        | ✅               |
| `/api/generate-name`       | Collection wizard    | 0.9         | 5000       | Creative naming           | ✅               |
| `/api/smart-suggestions`   | Smart builder        | 0.3 / 0.95  | 1000 / 50  | Live preview + naming     | ✅               |
| `/api/surprise-query`      | Rankings             | 1.0         | 100        | Random query generation   | ⚠️ (2s cooldown) |
| `/api/ai-suggestions`      | Manual collections   | 0.4         | 4000       | Conversational refinement | ✅               |

---

## Common Patterns

### Temperature Settings

- **0.3**: Semantic analysis, genre mapping (precise)
- **0.4**: Content recommendations (balanced)
- **0.9-1.0**: Creative naming, random generation (creative)

### Prompt Engineering Strategy

1. **System role**: "You are a Netflix curator" / "Expert film analyst"
2. **Exact constraints**: TMDB genre IDs, title formats, word limits
3. **Examples**: Show desired output style
4. **Tone guidance**: "Witty", "Shocking", "Slang-heavy"
5. **Output format**: "Return ONLY JSON, no additional text"

### Error Handling

- All endpoints have graceful fallbacks
- Rate limiting returns `429` with retry time
- Invalid input returns `400` with sanitization errors
- API failures return `500` with error details
- Surprise Me has curated fallback list

### Hidden Content Filtering

As of **2025-01-18**, the following endpoints now filter hidden content:

- ✅ `/api/generate-collection` - Server-side Firestore fetch
- ❌ `/api/genre-mapping` - Returns genre IDs only (no content to filter)
- ❌ `/api/generate-name` - Returns names only (no content)
- ❌ Other endpoints - Return suggestions/names only (no content)

---

## Model Information

### Gemini 2.0 Flash

- **Speed**: ~1-2 seconds per response
- **Cost**: Low (Flash tier)
- **Context**: 1M token context window
- **Output**: Up to 8192 tokens
- **Thinking mode**: Automatically used for complex reasoning (uses extra tokens internally)

### Why Gemini 2.0 Flash?

- **Speed**: Fast enough for real-time search
- **Cost-effective**: Budget-friendly for high-volume requests
- **Quality**: Excellent for creative + analytical tasks
- **Multimodal**: Future-ready for image analysis

---

## Rate Limiting Details

### Implementation

```typescript
// lib/geminiRateLimiter.ts
- 10 requests per user per 10 minutes
- Sliding window algorithm
- Per-user tracking (authenticated)
- Per-IP tracking (guest users)
```

### Response When Limited

```json
{
    "error": "AI request limit reached. Please try again later.",
    "retryAfterMs": 120000
}
```

### Bypass Strategy

Some endpoints (like `/api/surprise-query`) have fallback mechanisms to provide value even when rate limited.

---

## Future Enhancements

### Potential Additions

1. **Image analysis**: Gemini 2.0 supports image input (poster-based search)
2. **Video trailers**: Could analyze trailer content for mood/genre
3. **Longer context**: Use conversation history for better personalization
4. **Multimodal search**: "Find movies like this poster"
5. **Sentiment analysis**: Analyze user review tone for recommendations

### Optimization Opportunities

1. **Caching**: Cache common queries (e.g., "best action movies")
2. **Batch processing**: Combine multiple requests where possible
3. **Streaming**: Use streaming responses for faster perceived latency
4. **Fine-tuning**: Train custom model on TMDB data

---

## Testing

See `__tests__/app/api/` directory for comprehensive API tests:

- `gemini/analyze/route.test.ts`
- `generate-row-name/route.test.ts`
- `smart-suggestions/route.test.ts`

---

**Document Version**: 1.0
**Author**: Claude Code Analysis
**Related Docs**:

- `CLAUDE.md` - Architecture overview
- `docs/hidden-content-filtering-plan.md` - Content filtering implementation
- `lib/geminiRateLimiter.ts` - Rate limiting implementation
