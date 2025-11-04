# AI-Powered Concept-Based Movie Recommendations - Complete Technical Documentation

## Feature Overview

This feature enables users to create custom movie/TV rows using natural language descriptions that go beyond simple genre filtering. Instead of just "Action" or "Comedy", users can describe vibes, concepts, and narrative structures like:

- **"comedy of errors"** → Curated list of mistaken identity comedies
- **"dark scifi thriller"** → Sci-fi thrillers with dark, atmospheric tone
- **"fish out of water"** → Films about characters in unfamiliar situations

The system uses Google Gemini AI to:

1. Detect whether a query is a simple genre or a concept/vibe query
2. Recommend specific TMDB movie IDs that match the concept
3. Provide genre fallbacks for broader filtering

---

## Architecture Diagram

```
User Input ("dark scifi thriller")
         ↓
SmartStep1Input.tsx (collects text + entities)
         ↓
/api/smart-suggestions (orchestrator)
         ↓
/api/gemini/analyze (AI analysis)
         ↓
    Gemini Returns:
    - genreIds: [878, 53]
    - conceptQuery: "Dark, atmospheric..."
    - movieRecommendations: [{title, year, reason}...]
         ↓
searchTMDBForTitles() (convert titles → IDs)
         ↓
    Suggestions Created:
    - genre suggestion (genreIds)
    - content_list suggestion (TMDB IDs)
         ↓
SmartStep2Suggestions.tsx (user reviews/adjusts)
         ↓
/api/smart-suggestions/preview (Step 3 preview)
         ↓
SmartStep3Preview.tsx (shows actual content)
         ↓
convertSuggestionsToFormData()
    - genres: [878, 53]
    - advancedFilters.contentIds: [424, 264660, ...]
         ↓
Save to Database (CustomRow)
         ↓
CustomRowLoader.tsx (fetches content)
         ↓
/api/custom-rows/[id]/content (with contentIds param)
         ↓
Display on Homepage
```

---

## File Structure & Responsibilities

### 1. Frontend Components

#### **`/components/customRows/smart/SmartStep1Input.tsx`**

**Role:** Collects user input (text + tagged entities)

**Key Data:**

- `rawText`: User's natural language description
- `entities`: Tagged actors, directors, genres from autocomplete
- `mediaType`: Inferred by Gemini (movie/tv/both)

**Output:**

```typescript
{
  entities: Entity[],
  rawText: string
}
```

---

#### **`/components/customRows/smart/SmartStep2Suggestions.tsx`**

**Role:** Displays AI-generated suggestions for user review

**Receives:**

- Suggestions from `/api/smart-suggestions`
- Genres, people, ratings, year ranges, **content_list**

**Displays:**

- Genre chips (toggle on/off)
- People with images (toggle Required/Suggested)
- Curated content indicator (when content_list exists)

**Output:**

```typescript
{
  selectedSuggestions: Suggestion[],
  selectedRowName: string,
  mediaType: 'movie' | 'tv' | 'both'
}
```

---

#### **`/components/customRows/smart/SmartStep3Preview.tsx`**

**Role:** Shows actual TMDB content before creating row

**Flow:**

1. Calls `/api/smart-suggestions/preview` with suggestions
2. Caches results in `previewCache` Map
3. Displays poster grid + total count
4. User confirms and creates row

**Cache Key:**

```typescript
JSON.stringify({ selectedSuggestions, mediaType })
```

---

#### **`/components/customRows/smart/SmartRowBuilder.tsx`**

**Role:** Orchestrates 4-step wizard flow

**Key Function - `convertSuggestionsToFormData()`:**

```typescript
function convertSuggestionsToFormData(
    step1Data: { entities; rawText; mediaType },
    suggestions: Suggestion[],
    rowName: string
): CustomRowFormData {
    const formData = {
        name: rowName,
        genres: [], // From genre suggestions
        genreLogic: 'OR',
        mediaType: step1Data.mediaType,
        enabled: true,
        advancedFilters: {},
    }

    // Extract genres
    suggestions.filter((s) => s.type === 'genre').forEach((s) => formData.genres.push(...s.value))

    // Extract content IDs (concept-based)
    suggestions.forEach((s) => {
        if (s.type === 'content_list') {
            formData.advancedFilters.contentIds = s.value
        }
    })

    return formData
}
```

**Output (saved to database):**

```typescript
{
  name: "Dark Sci-Fi Thrillers",
  genres: [878, 53],  // Sci-Fi, Thriller
  genreLogic: "OR",
  mediaType: "movie",
  enabled: true,
  advancedFilters: {
    contentIds: [424, 264660, 157336, 301528]  // Blade Runner, Ex Machina, etc.
  }
}
```

---

#### **`/components/customRows/CustomRowLoader.tsx`**

**Role:** Fetches and displays content for saved custom rows

**Key Logic:**

```typescript
// Build API URL
url = new URL(`/api/custom-rows/${row.id}/content`, window.location.origin)

// Check for curated content
const customRow = row as CustomRow
if (customRow.advancedFilters?.contentIds?.length > 0) {
    // Use content IDs (concept-based row)
    url.searchParams.append('contentIds', customRow.advancedFilters.contentIds.join(','))
} else {
    // Use genre filters (traditional row)
    url.searchParams.append('genres', row.genres.join(','))
    url.searchParams.append('genreLogic', row.genreLogic)
}
```

---

### 2. API Routes

#### **`/app/api/smart-suggestions/route.ts`**

**Role:** Main orchestrator for generating suggestions

**Flow:**

```typescript
1. Receive user input (entities, rawText, mediaType, seed)
2. Call /api/gemini/analyze if text exists (≥5 chars)
3. Call generateSmartSuggestions() for TMDB-based analysis
4. If Gemini returned movieRecommendations:
   → searchTMDBForTitles() to convert titles to IDs
   → Create content_list suggestion
5. Merge Gemini + TMDB suggestions
6. Generate creative row name via Gemini
7. Return merged suggestions
```

**Key Function - `searchTMDBForTitles()`:**

```typescript
async function searchTMDBForTitles(
    recommendations: Array<{ title: string; year?: number; reason?: string }>,
    mediaType: string
): Promise<number[]> {
    const tmdbIds: number[] = []

    for (const rec of recommendations) {
        // Search TMDB for title
        const searchUrl =
            mediaType === 'tv'
                ? `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(rec.title)}`
                : `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(rec.title)}`

        const response = await fetch(searchUrl)
        const data = await response.json()

        // Find best match (prefer by year)
        let bestMatch = data.results[0]
        if (rec.year && data.results.length > 1) {
            for (const result of data.results) {
                const releaseYear = parseInt(
                    (result.release_date || result.first_air_date || '').split('-')[0]
                )
                if (releaseYear === rec.year) {
                    bestMatch = result
                    break
                }
            }
        }

        if (bestMatch?.id) {
            tmdbIds.push(bestMatch.id)
        }

        if (tmdbIds.length >= 15) break // Rate limit
    }

    return tmdbIds
}
```

**Response Structure:**

```typescript
{
  suggestions: [
    {
      type: 'genre',
      value: [878, 53],  // Sci-Fi, Thriller
      confidence: 95,
      reason: 'AI detected these genres from your description',
      source: 'gemini'
    },
    {
      type: 'content_list',
      value: [424, 264660, 157336, 301528],  // TMDB IDs
      confidence: 95,
      reason: 'Dark, atmospheric sci-fi thrillers with suspense and tension',
      source: 'gemini'
    }
  ],
  rowNames: ['Peak Sci-Fi', 'Dark Future Vibes', 'Atmospheric Thrillers'],
  mediaType: 'movie'
}
```

---

#### **`/app/api/gemini/analyze/route.ts`**

**Role:** Analyzes user input with Gemini AI

**Request:**

```typescript
{
  text: "dark scifi thriller",
  entities: [],
  mediaType: "both"
}
```

**Gemini Prompt (Full):**

```
You are an expert film/TV analyst. Analyze this user's description and map it to TMDB genre IDs.

User Input: "dark scifi thriller"
Media Type: both

**IMPORTANT: You MUST use these exact TMDB genre IDs:**

MOVIE GENRES:
- 28: Action
- 12: Adventure
- 16: Animation
- 35: Comedy
- 80: Crime
- 99: Documentary
- 18: Drama
- 10751: Family
- 14: Fantasy
- 36: History
- 27: Horror
- 10402: Music
- 9648: Mystery
- 10749: Romance
- 878: Science Fiction
- 10770: TV Movie
- 53: Thriller
- 10752: War
- 37: Western

TV GENRES:
- 10759: Action & Adventure
- 16: Animation
- 35: Comedy
- 80: Crime
- 99: Documentary
- 18: Drama
- 10751: Family
- 10762: Kids
- 9648: Mystery
- 10763: News
- 10764: Reality
- 10765: Sci-Fi & Fantasy
- 10766: Soap
- 10767: Talk
- 10768: War & Politics
- 37: Western

Return ONLY this JSON structure with TMDB genre IDs:
{
  "mediaType": "movie"|"tv"|"both",
  "genreIds": [80, 18],  // ARRAY OF NUMBERS ONLY - TMDB genre IDs
  "yearRange": { "min": 1980, "max": 1989 } | null,
  "certification": ["R", "PG-13"] | null,
  "recommendations": [...],
  "conceptQuery": string | null,  // If user describes a VIBE/CONCEPT
  "movieRecommendations": [  // If conceptQuery exists, provide 10-15 specific titles
    {
      "title": "Blade Runner",
      "year": 1982,
      "reason": "Neo-noir sci-fi with dark atmosphere"
    }
  ]
}

Examples:
- "gangster movies" → {"genreIds": [80, 18]}
- "scary films" → {"genreIds": [27]}

CONCEPT QUERY Examples:

**Pure Concept (provide BOTH genres AND specific titles):**
- "comedy of errors" → {
    "conceptQuery": "Comedy films with mistaken identities...",
    "movieRecommendations": [
      {"title": "Clue", "year": 1985, "reason": "Murder mystery comedy..."},
      {"title": "Noises Off", "year": 1992, ...}
    ],
    "genreIds": [35]
  }

**Hybrid Genre+Vibe (provide BOTH genres AND specific titles):**
- "dark scifi thriller" → {
    "conceptQuery": "Dark, atmospheric sci-fi thrillers...",
    "movieRecommendations": [
      {"title": "Blade Runner", "year": 1982, "reason": "Neo-noir..."},
      {"title": "Ex Machina", "year": 2014, ...}
    ],
    "genreIds": [878, 53]  // Sci-Fi + Thriller for backup
  }

**Simple Genre (NO recommendations needed):**
- "action movies" → {"genreIds": [28], "movieRecommendations": []}

Rules:
- MediaType: "series/show/tv" → "tv", "film/movie" → "movie", unclear → "both"
- ALWAYS provide genreIds when genres are clear
- Provide movieRecommendations when:
  1. Query describes a vibe/tone (dark, gritty, wholesome, epic)
  2. Query describes a narrative structure (fish out of water, heist gone wrong)
  3. Query has subjective qualities beyond genre (best, underrated, hidden gems)
- For simple genre-only queries: return empty movieRecommendations
- For concept/vibe queries: provide 10-15 specific titles AND relevant genres
- Return 1-3 genre IDs maximum
- ONLY use IDs from the lists above
- Return ONLY valid JSON
```

**Response:**

```typescript
{
  genreIds: [878, 53],  // Sci-Fi, Thriller
  yearRange: null,
  certification: null,
  recommendations: [],
  mediaType: "movie",
  conceptQuery: "Dark, atmospheric sci-fi thrillers with suspense and tension",
  movieRecommendations: [
    {
      title: "Blade Runner",
      year: 1982,
      reason: "Neo-noir sci-fi with dark atmosphere"
    },
    {
      title: "Ex Machina",
      year: 2014,
      reason: "Tense AI thriller with dark undertones"
    },
    {
      title: "Moon",
      year: 2009,
      reason: "Psychological sci-fi thriller"
    },
    {
      title: "Annihilation",
      year: 2018,
      reason: "Dark cosmic horror sci-fi"
    }
    // ... 10-15 total
  ]
}
```

---

#### **`/app/api/smart-suggestions/preview/route.ts`**

**Role:** Generates preview content for Step 3

**Request:**

```typescript
POST /api/smart-suggestions/preview
{
  suggestions: [...],
  mediaType: "movie"
}
```

**Logic:**

```typescript
// Priority 1: Check for curated content list
const contentListSuggestion = suggestions.find((s) => s.type === 'content_list')
if (contentListSuggestion) {
    // Fetch specific TMDB IDs directly
    for (const tmdbId of contentListSuggestion.value) {
        const endpoint = mediaType === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`
        const item = await tmdb.fetch(endpoint, {})
        content.push(item)
    }

    return {
        content: content.slice(0, 10),
        totalResults: contentListSuggestion.value.length,
    }
}

// Priority 2: Use discover endpoint with genre filters
// (traditional genre-based rows)
```

**Response:**

```typescript
{
  content: [
    {
      id: 424,
      title: "Blade Runner",
      poster_path: "/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg",
      vote_average: 7.9,
      media_type: "movie"
    },
    // ... up to 10 items
  ],
  totalResults: 15
}
```

---

#### **`/app/api/custom-rows/[id]/content/route.ts`**

**Role:** Fetches content for saved custom rows on homepage

**Request:**

```
GET /api/custom-rows/custom-12345/content?contentIds=424,264660,157336&mediaType=movie&page=1
```

**Logic:**

```typescript
// Check for contentIds parameter (curated content)
if (contentIdsParam) {
    const contentIds = contentIdsParam.split(',').map((id) => parseInt(id))

    // Fetch each TMDB ID directly
    for (const tmdbId of contentIds) {
        const endpoint =
            mediaType === 'tv' ? `${BASE_URL}/tv/${tmdbId}` : `${BASE_URL}/movie/${tmdbId}`

        const url = new URL(endpoint)
        url.searchParams.append('api_key', API_KEY)

        const response = await fetch(url.toString())
        const item = await response.json()

        enrichedResults.push({
            ...item,
            media_type: mediaType,
        })
    }

    return {
        results: enrichedResults,
        page: 1,
        total_pages: 1,
        total_results: enrichedResults.length,
    }
}

// Fallback: Use genres parameter (traditional rows)
if (!genresParam) {
    return { error: 'genres parameter is required' }
}
```

**Response:**

```typescript
{
  results: [
    { id: 424, title: "Blade Runner", ... },
    { id: 264660, title: "Ex Machina", ... },
    { id: 157336, title: "Interstellar", ... }
  ],
  page: 1,
  total_pages: 1,
  total_results: 15
}
```

---

### 3. Type Definitions

#### **`/types/customRows.ts`**

```typescript
export interface AdvancedFilters {
    // Year filters
    yearMin?: number
    yearMax?: number

    // Rating filters
    ratingMin?: number
    ratingMax?: number

    // Cast/Crew filters
    withCast?: string[]
    withDirector?: string

    // ✨ NEW: Curated content list (Gemini AI recommendations)
    contentIds?: number[] // Specific TMDB IDs for concept-based rows
}

export interface CustomRow extends BaseRowConfig {
    userId: string
    enabled: boolean
    createdAt: number
    updatedAt: number
    advancedFilters?: AdvancedFilters // Contains contentIds
}

export interface CustomRowFormData {
    name: string
    genres: number[] // Still stored for fallback/expansion
    genreLogic: 'AND' | 'OR'
    mediaType: 'movie' | 'tv' | 'both'
    enabled: boolean
    advancedFilters?: AdvancedFilters
}
```

---

#### **`/utils/smartRowSuggestions.ts`**

```typescript
export interface Suggestion {
    type:
        | 'genre'
        | 'rating'
        | 'year_range'
        | 'studio'
        | 'actor'
        | 'director'
        | 'certification'
        | 'content_list' // ← NEW
    value: any
    displayName?: string
    confidence: number // 0-100
    reason: string
    estimatedResults?: number
    source: 'user' | 'tmdb' | 'text_analysis' | 'gemini' // ← NEW
}
```

---

## Complete Data Flow Example

### User Input: "dark scifi thriller"

#### **Step 1: User Input**

```typescript
// SmartStep1Input.tsx
{
  entities: [],  // No tagged entities
  rawText: "dark scifi thriller"
}
```

#### **Step 2: AI Analysis**

```typescript
// POST /api/smart-suggestions
{
  entities: [],
  rawText: "dark scifi thriller",
  mediaType: "both",
  seed: 0
}

// ↓ Calls /api/gemini/analyze

// Gemini Response:
{
  genreIds: [878, 53],
  conceptQuery: "Dark, atmospheric sci-fi thrillers with suspense and tension",
  movieRecommendations: [
    { title: "Blade Runner", year: 1982, reason: "..." },
    { title: "Ex Machina", year: 2014, reason: "..." },
    { title: "Moon", year: 2009, reason: "..." },
    { title: "Annihilation", year: 2018, reason: "..." },
    { title: "Under the Skin", year: 2013, reason: "..." },
    { title: "Arrival", year: 2016, reason: "..." },
    { title: "Stalker", year: 1979, reason: "..." },
    { title: "Cube", year: 1997, reason: "..." },
    { title: "The Thing", year: 1982, reason: "..." },
    { title: "Solaris", year: 1972, reason: "..." }
  ],
  mediaType: "movie"
}
```

#### **Step 3: TMDB Title Search**

```typescript
// searchTMDBForTitles() in /api/smart-suggestions/route.ts

// For each recommendation:
// 1. Search TMDB: GET /search/movie?query=Blade+Runner
// 2. Find best match by year (1982)
// 3. Extract TMDB ID: 424

// Result:
tmdbIds = [424, 264660, 157336, 301528, 268, 329865, 11963, 2758, 1091, 9461]
```

#### **Step 4: Merged Suggestions**

```typescript
// Response from /api/smart-suggestions
{
  suggestions: [
    {
      type: 'genre',
      value: [878, 53],
      confidence: 95,
      reason: 'AI detected these genres from your description',
      source: 'gemini'
    },
    {
      type: 'content_list',
      value: [424, 264660, 157336, 301528, 268, 329865, 11963, 2758, 1091, 9461],
      confidence: 95,
      reason: 'Dark, atmospheric sci-fi thrillers with suspense and tension',
      source: 'gemini'
    }
  ],
  rowNames: ['Peak Sci-Fi', 'Dark Future Vibes', 'Atmospheric Thrillers'],
  mediaType: 'movie'
}
```

#### **Step 5: User Reviews (SmartStep2Suggestions.tsx)**

User sees:

- **Genres**: Sci-Fi, Thriller (toggle chips)
- **AI Curated**: "10 handpicked titles matching your vibe"
- **Row Names**: [selectable options]

User selects and continues.

#### **Step 6: Preview (SmartStep3Preview.tsx)**

```typescript
// POST /api/smart-suggestions/preview
{
  suggestions: [...above suggestions...],
  mediaType: "movie"
}

// Response:
{
  content: [
    { id: 424, title: "Blade Runner", poster_path: "...", vote_average: 7.9 },
    { id: 264660, title: "Ex Machina", poster_path: "...", vote_average: 7.7 },
    { id: 157336, title: "Interstellar", poster_path: "...", vote_average: 8.4 },
    // ... 10 total
  ],
  totalResults: 10
}
```

User sees poster grid and confirms.

#### **Step 7: Save to Database**

```typescript
// convertSuggestionsToFormData()
{
  name: "Dark Future Vibes",  // User's choice
  genres: [878, 53],  // From genre suggestion
  genreLogic: "OR",
  mediaType: "movie",
  enabled: true,
  advancedFilters: {
    contentIds: [424, 264660, 157336, 301528, 268, 329865, 11963, 2758, 1091, 9461]
  }
}

// Saved to Firestore:
/users/{userId}/customRows/custom-abc123
```

#### **Step 8: Display on Homepage**

```typescript
// CustomRowLoader.tsx
const url = new URL('/api/custom-rows/custom-abc123/content')
url.searchParams.append('contentIds', '424,264660,157336,...')
url.searchParams.append('mediaType', 'movie')

// GET /api/custom-rows/custom-abc123/content?contentIds=...

// Response:
{
  results: [
    { id: 424, title: "Blade Runner", ... },
    { id: 264660, title: "Ex Machina", ... },
    // ... all curated titles
  ]
}

// Rendered as horizontal scrolling row:
// [Blade Runner] [Ex Machina] [Interstellar] [Moon] ...
```

---

## Decision Logic: When to Use Content List vs Genres

### Gemini Decision Tree:

```
User Input
    ↓
Does it contain vibe/tone keywords?
  (dark, gritty, wholesome, epic, atmospheric)
    ↓ YES
  Provide movieRecommendations + genreIds
    ↓ NO
Does it describe narrative structure?
  (fish out of water, heist gone wrong, comedy of errors)
    ↓ YES
  Provide movieRecommendations + genreIds
    ↓ NO
Does it have subjective quality indicators?
  (best, underrated, hidden gems, peak)
    ↓ YES
  Provide movieRecommendations + genreIds
    ↓ NO
Simple genre query
  Provide genreIds only, empty movieRecommendations
```

### Backend Decision Tree:

```
Suggestions Array
    ↓
Contains content_list suggestion?
    ↓ YES
  Use contentIds (priority)
  Genres stored as fallback
    ↓ NO
Contains genre suggestion?
    ↓ YES
  Use discover endpoint with genres
    ↓ NO
  Error: Invalid row configuration
```

---

## Edge Cases & Handling

### 1. TMDB Title Search Failures

```typescript
// If TMDB search fails for a title:
- Skip that title
- Continue with remaining recommendations
- Still create row if ≥5 titles found
```

### 2. Empty Movie Recommendations

```typescript
// If Gemini returns movieRecommendations: []
- Fall back to genre-based filtering
- No content_list suggestion created
- Traditional discover endpoint used
```

### 3. Hybrid Rows (Genres + ContentIds)

```typescript
// Both stored in database:
{
  genres: [878, 53],
  advancedFilters: {
    contentIds: [424, 264660, ...]
  }
}

// Rendering priority:
1. If contentIds exist → fetch by IDs
2. Genres available for future pagination
```

### 4. Child Safety Mode

```typescript
// Applied AFTER fetching curated content:
1. Fetch all contentIds
2. Filter by adult flag
3. Filter mature TV ratings
4. Return filtered list
```

---

## Performance Considerations

### Caching Strategy:

1. **Preview Cache** (SmartStep3Preview.tsx):
    - In-memory Map
    - Key: `JSON.stringify({ suggestions, mediaType })`
    - Persists during session
    - Instant back navigation

2. **API Cache** (HTTP headers):
    - `/api/custom-rows/[id]/content`: 30min cache
    - `/api/smart-suggestions`: No cache (dynamic)

### Rate Limiting:

- **TMDB Search**: Max 15 titles searched
- **Gemini Recommendations**: Request 10-15 titles
- **Preview Display**: Show 10 items max

---

## Testing Scenarios

### Test Case 1: Simple Genre Query

```
Input: "action movies"
Expected:
  - genreIds: [28]
  - movieRecommendations: []
  - Uses discover endpoint
```

### Test Case 2: Pure Concept Query

```
Input: "comedy of errors"
Expected:
  - genreIds: [35]
  - movieRecommendations: [Clue, Noises Off, ...]
  - Uses content_list
```

### Test Case 3: Hybrid Query

```
Input: "dark scifi thriller"
Expected:
  - genreIds: [878, 53]
  - movieRecommendations: [Blade Runner, Ex Machina, ...]
  - Uses content_list (priority)
  - Genres stored as fallback
```

### Test Case 4: Actor + Vibe

```
Input: "gritty crime dramas with denzel washington"
Expected:
  - genreIds: [80, 18]
  - movieRecommendations: [Training Day, Man on Fire, ...]
  - actor suggestion: Denzel Washington (required)
```

---

## Future Enhancements

### Potential Improvements:

1. **Pagination for Curated Rows**
    - Use stored genres when user scrolls past curated content
    - Blend curated + discover results

2. **User Feedback Loop**
    - Track which curated titles users interact with
    - Improve Gemini prompts based on engagement

3. **Multi-Language Support**
    - Translate concept queries to English for Gemini
    - Return localized movie recommendations

4. **Hybrid Rendering**
    - Show curated titles first
    - Fill remaining slots with genre-filtered content

---

## Implementation Commits

- `289dada` - feat: AI-powered concept-based movie recommendations
- `1680b72` - feat: support hybrid genre+vibe queries in smart suggestions

---

**Last Updated:** November 3, 2024
