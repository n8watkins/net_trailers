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

Maps natural language queries to TMDB genre IDs by analyzing semantic meaning. We provide Gemini with a comprehensive list of genres and their TMDB IDs, and it intelligently selects the most relevant ones.

**What it returns:**

- **TMDB genre IDs** (numbers like 28, 35, 878) - not genre names
- Time periods/year ranges
- Content ratings/certifications
- Vibe/mood concepts
- Specific movie/TV recommendations

**How it works:**

1. We give Gemini a mapping of genres → TMDB IDs (e.g., "Action → 28", "Comedy → 35")
2. User types natural language query
3. Gemini selects relevant genre IDs from our provided list
4. Returns numeric TMDB genre IDs for API queries

### Example Use Cases

```
User types: "rainy day vibes"
→ We provide Gemini: list of all genres with IDs
→ Gemini returns: [18, 10749] (Drama, Romance IDs)
→ App uses these IDs to query TMDB

User types: "dark sci-fi thriller"
→ Gemini maps to IDs: [878, 53] (Sci-Fi, Thriller)
→ Returns TMDB-compatible genre IDs

User types: "comedy of errors"
→ Gemini returns: [35] (Comedy ID) + specific title recommendations
```

### Prompt Strategy

- **Temperature**: 0.3 (low - for consistent, accurate genre mapping)
- **Max tokens**: 1000
- **Instructions**:
    - We provide complete genre mapping (Action: 28, Adventure: 12, etc.)
    - Gemini must select from OUR provided list
    - Returns TMDB genre IDs (numbers) for API compatibility
    - Detect media type preference (movie/tv/both)
    - Extract year ranges and rating preferences

### Input

```typescript
{
  text: string,           // User's natural language query (1-500 chars)
  entities: Array<{       // Tagged people/content from autocomplete
    type: 'person' | 'movie' | 'tv',
    name: string
  }>,
  mediaType: 'movie' | 'tv' | 'both'
}
```

### Output

```typescript
{
  genreIds: number[],                    // TMDB genre IDs (e.g., [28, 35] for Action + Comedy)
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

### Genre Mapping Provided to Gemini

**Movie Genres:**

- 28: Action | 12: Adventure | 16: Animation | 35: Comedy | 80: Crime
- 99: Documentary | 18: Drama | 10751: Family | 14: Fantasy | 36: History
- 27: Horror | 10402: Music | 9648: Mystery | 10749: Romance | 878: Science Fiction
- 53: Thriller | 10752: War | 37: Western

**TV Genres:**

- 10759: Action & Adventure | 16: Animation | 35: Comedy | 80: Crime
- 99: Documentary | 18: Drama | 10751: Family | 10762: Kids | 9648: Mystery
- 10765: Sci-Fi & Fantasy | 10768: War & Politics | 37: Western

### Integration Flow

1. User types in hero search bar (e.g., "rainy day vibes")
2. Frontend calls `/api/gemini/analyze` with query
3. Gemini receives our genre mapping and selects IDs: [18, 10749]
4. Returns numeric TMDB genre IDs (not names)
5. App queries TMDB API using these genre IDs
6. Results displayed instantly

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

## 4. Smart Collection Suggestions (Live Preview)

### **Endpoint**: `/api/smart-suggestions`

**Location**: Smart collection builder wizard
**Components**:

- `components/customRows/smart/SmartStep2Suggestions.tsx`
- `components/customRows/smart/SmartStep3Preview.tsx`

### Purpose

Provides **live preview** of collection size and suggestions as user types. Combines:

- TMDB-based suggestions (cast, directors, genres)
- Gemini AI insights (vibes, concepts)
- Creative row naming

### Example Use Cases

```
User types: "wes anderson"
→ Shows: 15 results, suggests row name "Peak Wes", genres [35, 18]

User types: "90s action vibes"
→ Shows: 200+ results, suggests "90s Bangers", genres [28], year range [1990-1999]
```

### Prompt Strategy

This endpoint **orchestrates** two Gemini calls:

1. `/api/gemini/analyze` for semantic understanding
2. Internal creative naming (similar to `/api/generate-row-name`)

- **Analyze temperature**: 0.3
- **Naming temperature**: 0.95
- **Integration**: Merges TMDB + Gemini insights

### Input

```typescript
{
  entities: Array<{       // Tagged actors, directors, titles
    type: 'person' | 'movie' | 'tv',
    name: string,
    id: number
  }>,
  rawText: string,        // User's typed query (5-500 chars)
  mediaType: 'movie' | 'tv' | 'both',
  seed?: number           // For randomization
}
```

### Output

```typescript
{
  suggestions: Array<{
    type: 'genre' | 'cast' | 'director' | 'content_list',
    value: any,
    confidence: number,   // 0-100
    reason: string,
    source: 'tmdb' | 'gemini'
  }>,
  rowNames: string[],     // 3 creative name suggestions
  mediaType: 'movie' | 'tv' | 'both',
  estimatedCount?: number // Preview of results
}
```

### Integration Flow

1. User types in smart input (e.g., "christopher nolan")
2. Autocomplete suggests entities
3. User selects or continues typing
4. Live API call to `/api/smart-suggestions`
5. Shows "~15 results" count + name suggestions
6. User refines or creates collection

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
