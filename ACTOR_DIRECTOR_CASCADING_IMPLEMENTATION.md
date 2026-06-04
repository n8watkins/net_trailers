# Actor & Director Cascading - Detailed Implementation Guide

## Overview

Implement **progressive cascading for actors and directors** with fast, simple implementation (Option A - no director role verification). This ensures collections prioritize the most specific matches (ALL actors + director) before progressively broadening to more general matches.

---

## Core Cascading Logic

### Tier Priority System

When a collection has:

- **2 actors** (Tom Hanks + Leonardo DiCaprio)
- **1 director** (Steven Spielberg)
- **3 genres** (Action + Thriller + Drama)

**The system generates these tiers in priority order:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Tier 1: ALL actors + director + 3 genres                       │
│         with_cast=31,6193 (comma=AND)                          │
│         with_crew=488                                          │
│         with_genres=action,thriller,drama (AND logic)          │
│         → Most specific, fewest results                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tier 2: ANY actor + director + 3 genres                        │
│         with_cast=31|6193 (pipe=OR)                            │
│         with_crew=488                                          │
│         with_genres=action,thriller,drama                      │
│         → Medium specific                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tier 3: director + 3 genres (no actors)                        │
│         with_crew=488                                          │
│         with_genres=action,thriller,drama                      │
│         → Broader results                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tier 4: ALL actors + 3 genres (no director)                    │
│         with_cast=31,6193                                      │
│         with_genres=action,thriller,drama                      │
│         → No director requirement                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tier 5: ANY actor + 3 genres (no director)                     │
│         with_cast=31|6193                                      │
│         with_genres=action,thriller,drama                      │
│         → Broader actor matching                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tier 6: 3 genres only (if infinite enabled)                    │
│         with_genres=action,thriller,drama                      │
│         → No actor/director requirement                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tier 7: 2 genres (if infinite enabled)                         │
│         with_genres=action,thriller                            │
│         → Genre cascading begins                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tier 8: 1 genre (if infinite enabled)                          │
│         with_genres=action                                     │
│         → Broadest, truly infinite                             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Rules

1. **Actor cascading**: ALL → ANY → NONE
2. **Director cascading**: PRESENT → ABSENT
3. **Genre cascading**: 3 → 2 → 1 (existing system)
4. **Infinite content**: Controls whether to continue beyond Tier 5 (no actors/director)

---

## Phase 1: Data Model Updates

### 1.1 Update TypeScript Types

**File: `types/collections.ts`**

Add new fields to `AdvancedFilters` interface:

```typescript
export interface AdvancedFilters {
    // Year filters
    yearMin?: number
    yearMax?: number

    // Rating filters
    ratingMin?: number
    ratingMax?: number

    // Popularity filter
    popularity?: number

    // Vote count filter
    voteCount?: number

    // Cast/Crew filters
    withCast?: string[] // Actor names (for display)
    withDirector?: string // Director name (for display)

    // NEW: TMDB Person IDs
    withCastIds?: number[] // TMDB person IDs for actors
    withDirectorId?: number // TMDB person ID for director

    // Curated content list
    contentIds?: number[]
}
```

**Why both names and IDs?**

- `withCast` / `withDirector`: Display in UI pills (user-friendly names)
- `withCastIds` / `withDirectorId`: API calls to TMDB (required for filtering)

**Migration Strategy:**

- Existing collections have names only → Continue working (falls back to genre-only)
- New collections store both names AND IDs → Full cascading works
- Optional: Background job to populate IDs for existing collections

---

### 1.2 Update UI - CollectionEditorModal

**File: `components/modals/CollectionEditorModal.tsx`**

**Update `addActor` function:**

```typescript
const addActor = (actor: any) => {
    const currentActors = advancedFilters.withCast || []
    const currentActorIds = advancedFilters.withCastIds || []

    if (!currentActors.includes(actor.name)) {
        setAdvancedFilters({
            ...advancedFilters,
            withCast: [...currentActors, actor.name],
            withCastIds: [...currentActorIds, actor.id], // ✨ NEW: Store TMDB ID
        })

        // Store profile image for display
        setActorProfileImages((prev) => ({
            ...prev,
            [actor.name]: actor.profile_path,
        }))
    }

    setActorInput('')
    setActorSearchResults([])
    setShowActorInput(false)
    setSelectedActorIndex(0)
}
```

**Update `removeActor` function:**

```typescript
const removeActor = (actorName: string) => {
    const currentActors = advancedFilters.withCast || []
    const currentActorIds = advancedFilters.withCastIds || []

    // Find index to remove from both arrays
    const index = currentActors.indexOf(actorName)

    setAdvancedFilters({
        ...advancedFilters,
        withCast: currentActors.filter((name) => name !== actorName),
        withCastIds: index >= 0 ? currentActorIds.filter((_, i) => i !== index) : currentActorIds, // ✨ NEW: Remove corresponding ID
    })
}
```

**Update `setDirector` function:**

```typescript
const setDirector = (director: any) => {
    setAdvancedFilters({
        ...advancedFilters,
        withDirector: director.name,
        withDirectorId: director.id, // ✨ NEW: Store TMDB ID
    })
    setDirectorInput('')
    setDirectorSearchResults([])
    setShowDirectorInput(false)
    setSelectedDirectorIndex(0)
}
```

**Update `removeDirector` function:**

```typescript
const removeDirector = () => {
    setAdvancedFilters({
        ...advancedFilters,
        withDirector: undefined,
        withDirectorId: undefined, // ✨ NEW: Remove ID
    })
}
```

---

## Phase 2: Unified Cascading Utility

### 2.1 Create New Utility File

**File: `utils/unifiedCascadingFetch.ts`**

This file contains all the cascading logic.

### 2.2 Type Definitions

```typescript
const BASE_URL = 'https://api.themoviedb.org/3'

type ActorMode = 'all' | 'any' | 'none'
type DirectorMode = 'present' | 'absent'
type GenreLogic = 'AND' | 'OR'

interface FilterTier {
    actorMode: ActorMode // How to filter actors
    directorMode: DirectorMode // Whether to include director
    genreCount: number // Number of genres to use (3, 2, or 1)
    totalPages: number // Total pages available in this tier
}

interface CascadingConfig {
    actorIds: number[] // TMDB person IDs for actors
    directorId?: number // TMDB person ID for director
    genres: string[] // Unified genre IDs (e.g., ['action', 'thriller'])
    mediaType: 'movie' | 'tv' // Content type
    genreLogic: GenreLogic // How to combine genres
    childSafeMode: boolean // Apply child safety filters
    infiniteEnabled: boolean // Allow cascading beyond actor/director tiers
}

interface TMDBResponse {
    results: any[]
    page: number
    total_pages: number
    total_results: number
}

interface TierInfo {
    tier: FilterTier
    adjustedPage: number // Page number within this tier
}
```

### 2.3 Cache Implementation

```typescript
/**
 * Cache for tier metadata (total_pages for each tier combination)
 * Key format: "actorIds:directorId:genres:mediaType:childSafe:genreLogic"
 */
const tierCache = new Map<string, FilterTier[]>()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours (matches genre cache)

/**
 * Generate cache key from cascading config
 * Ensures consistent ordering for cache hits
 */
function generateCacheKey(config: CascadingConfig): string {
    const sortedActors = [...config.actorIds].sort((a, b) => a - b)
    const sortedGenres = [...config.genres].sort()

    return [
        sortedActors.join(',') || 'no-actors',
        config.directorId || 'no-director',
        sortedGenres.join(','),
        config.mediaType,
        config.genreLogic,
        config.childSafeMode,
        config.infiniteEnabled,
    ].join(':')
}
```

### 2.4 TMDB Parameter Builder

```typescript
/**
 * Build TMDB discover API parameters for a specific tier
 */
function buildTMDBParams(tier: FilterTier, config: CascadingConfig): Record<string, string> {
    const params: Record<string, string> = {}

    // Import genre translation utility
    const { translateToTMDBGenres } = require('./genreMapping')

    // Actor filtering
    if (tier.actorMode === 'all' && config.actorIds.length > 0) {
        // Comma-separated = AND logic (all actors must be present)
        params.with_cast = config.actorIds.join(',')
    } else if (tier.actorMode === 'any' && config.actorIds.length > 0) {
        // Pipe-separated = OR logic (any actor can be present)
        params.with_cast = config.actorIds.join('|')
    }
    // 'none' = omit parameter (no actor filtering)

    // Director filtering
    if (tier.directorMode === 'present' && config.directorId) {
        // TMDB with_crew parameter (includes all crew roles)
        // Option A: No role verification (accept producer/writer credits)
        params.with_crew = config.directorId.toString()
    }
    // 'absent' = omit parameter (no director filtering)

    // Genre filtering (use existing translation)
    const currentGenres = config.genres.slice(0, tier.genreCount)
    const tmdbGenreIds = translateToTMDBGenres(currentGenres, config.mediaType)

    if (tmdbGenreIds.length > 0) {
        params.with_genres =
            config.genreLogic === 'AND'
                ? tmdbGenreIds.join(',') // All genres required
                : tmdbGenreIds.join('|') // Any genre matches
    }

    // Child safety filters
    if (config.childSafeMode) {
        params.include_adult = 'false'

        if (config.mediaType === 'movie') {
            params.certification_country = 'US'
            params['certification.lte'] = 'PG-13'
        }
    }

    // Standard parameters
    params.language = 'en-US'
    params.sort_by = 'popularity.desc' // Most popular first

    return params
}
```

### 2.5 Tier Generation Logic

```typescript
/**
 * Generate all possible tier combinations based on config
 */
function generateTierCombinations(config: CascadingConfig): Array<Omit<FilterTier, 'totalPages'>> {
    const tiers: Array<Omit<FilterTier, 'totalPages'>> = []

    // Determine actor modes based on number of actors
    const actorModes: ActorMode[] = []
    if (config.actorIds.length > 1) {
        actorModes.push('all', 'any') // Multiple actors: ALL then ANY
    } else if (config.actorIds.length === 1) {
        actorModes.push('any') // Single actor: just 'any' (presence)
    }
    actorModes.push('none') // Always include 'none' (no actors)

    // Determine director modes
    const directorModes: DirectorMode[] = config.directorId ? ['present', 'absent'] : ['absent']

    // Determine genre counts (existing genre cascading)
    const genreCounts =
        config.genres.length >= 3
            ? [3, 2, 1]
            : config.genres.length === 2
              ? [2, 1]
              : config.genres.length === 1
                ? [1]
                : []

    // Generate combinations in priority order
    // Priority: Actor specificity > Director presence > Genre count

    for (const genreCount of genreCounts) {
        for (const directorMode of directorModes) {
            for (const actorMode of actorModes) {
                // Skip genre-only tiers if infinite is disabled
                if (!config.infiniteEnabled && actorMode === 'none' && directorMode === 'absent') {
                    continue
                }

                tiers.push({
                    actorMode,
                    directorMode,
                    genreCount,
                })
            }
        }
    }

    return tiers
}
```

### 2.6 Tier Metadata Fetching

```typescript
/**
 * Fetch metadata (total_pages) for a specific tier
 */
async function fetchTierMetadata(
    tierConfig: Omit<FilterTier, 'totalPages'>,
    config: CascadingConfig,
    apiKey: string
): Promise<FilterTier | null> {
    const params = buildTMDBParams(
        { ...tierConfig, totalPages: 0 }, // totalPages not needed for building params
        config
    )

    const url = `${BASE_URL}/discover/${config.mediaType}?api_key=${apiKey}&page=1&${new URLSearchParams(params).toString()}`

    try {
        const response = await fetch(url)

        if (!response.ok) {
            if (response.status === 404) {
                // Person ID not found - skip this tier
                console.warn(`Person ID not found in tier, skipping`)
                return null
            }
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data: TMDBResponse = await response.json()

        return {
            ...tierConfig,
            totalPages: data.total_pages,
        }
    } catch (error) {
        console.error('Error fetching tier metadata:', error)
        return null
    }
}
```

### 2.7 Parallel Tier Calculation

```typescript
/**
 * Calculate all tiers in parallel with rate limiting
 */
async function calculateAllTiers(config: CascadingConfig, apiKey: string): Promise<FilterTier[]> {
    const tierCombos = generateTierCombinations(config)

    // Create fetch promises for all tiers
    const tierPromises = tierCombos.map((tierConfig) =>
        fetchTierMetadata(tierConfig, config, apiKey)
    )

    // Batch requests to respect rate limits (40 req/sec)
    const BATCH_SIZE = 10
    const DELAY_BETWEEN_BATCHES = 300 // 300ms delay

    const results: Array<FilterTier | null> = []

    for (let i = 0; i < tierPromises.length; i += BATCH_SIZE) {
        const batch = tierPromises.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.all(batch)
        results.push(...batchResults)

        // Delay between batches (except for last batch)
        if (i + BATCH_SIZE < tierPromises.length) {
            await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
        }
    }

    // Filter out failed tiers and tiers with 0 pages
    return results.filter((tier): tier is FilterTier => tier !== null && tier.totalPages > 0)
}
```

### 2.8 Tier Cache Management

```typescript
/**
 * Get cached tier data or calculate and cache it
 */
async function getTiers(config: CascadingConfig, apiKey: string): Promise<FilterTier[]> {
    const cacheKey = generateCacheKey(config)

    // Check cache first
    const cached = tierCache.get(cacheKey)
    if (cached) {
        return cached
    }

    // Calculate tiers (parallel fetching with rate limiting)
    const tiers = await calculateAllTiers(config, apiKey)

    // Cache the result
    tierCache.set(cacheKey, tiers)

    // Auto-expire after TTL
    setTimeout(() => {
        tierCache.delete(cacheKey)
    }, CACHE_TTL)

    return tiers
}
```

### 2.9 Page-to-Tier Mapping

```typescript
/**
 * Find which tier a requested page belongs to
 */
function findTierForPage(requestedPage: number, tiers: FilterTier[]): TierInfo | null {
    if (tiers.length === 0) {
        return null
    }

    let cumulativePages = 0

    for (const tier of tiers) {
        if (requestedPage <= cumulativePages + tier.totalPages) {
            // This page belongs to this tier
            return {
                tier,
                adjustedPage: requestedPage - cumulativePages,
            }
        }

        cumulativePages += tier.totalPages
    }

    // Page exceeds all tiers - return last tier with max page
    const lastTier = tiers[tiers.length - 1]
    return {
        tier: lastTier,
        adjustedPage: lastTier.totalPages,
    }
}
```

### 2.10 Content Fetching

```typescript
/**
 * Fetch actual content for a specific tier and page
 */
async function fetchContentForTier(
    tier: FilterTier,
    page: number,
    config: CascadingConfig,
    apiKey: string
): Promise<TMDBResponse> {
    const params = buildTMDBParams(tier, config)
    params.page = page.toString()

    const url = `${BASE_URL}/discover/${config.mediaType}?api_key=${apiKey}&${new URLSearchParams(params).toString()}`

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
    }

    return response.json()
}
```

### 2.11 Main Export Function

```typescript
/**
 * Fetch content with unified actor + director + genre cascading
 *
 * This is the main function called by the API route
 */
export async function fetchWithUnifiedCascading(
    config: CascadingConfig,
    page: number,
    apiKey: string
): Promise<TMDBResponse> {
    // Special case: No filters at all
    if (config.actorIds.length === 0 && !config.directorId && config.genres.length === 0) {
        // Fetch without any filters (pure trending/popular)
        const params = new URLSearchParams({
            api_key: apiKey,
            language: 'en-US',
            page: page.toString(),
            sort_by: 'popularity.desc',
            include_adult: config.childSafeMode ? 'false' : 'true',
        })

        const url = `${BASE_URL}/discover/${config.mediaType}?${params.toString()}`
        const response = await fetch(url)
        return response.json()
    }

    // Get or calculate all tiers
    const tiers = await getTiers(config, apiKey)

    if (tiers.length === 0) {
        // No tiers available - return empty results
        return {
            results: [],
            page: 1,
            total_pages: 1,
            total_results: 0,
        }
    }

    // Find which tier this page belongs to
    const tierInfo = findTierForPage(page, tiers)

    if (!tierInfo) {
        // Shouldn't happen, but fallback to empty
        return {
            results: [],
            page: 1,
            total_pages: 1,
            total_results: 0,
        }
    }

    // Fetch content from the appropriate tier
    return fetchContentForTier(tierInfo.tier, tierInfo.adjustedPage, config, apiKey)
}
```

---

## Phase 3: API Route Integration

### 3.1 Update Content API Route

**File: `app/api/custom-rows/[id]/content/route.ts`**

**Import the new utility:**

```typescript
import { fetchWithUnifiedCascading } from '../../../../../utils/unifiedCascadingFetch'
```

**Replace genre-only cascading with unified cascading:**

**Find this code block (around line 318-328):**

```typescript
// Single media type (movie or tv) - use prioritized genre cascading
const data = await fetchWithPrioritizedGenres(
    unifiedGenreIds,
    mediaType,
    'discover',
    pageNumber,
    API_KEY!,
    childSafeMode,
    genreLogic
)
```

**Replace with:**

```typescript
// Single media type (movie or tv) - use unified actor + director + genre cascading

// Extract actor/director IDs from advanced filters
const actorIds = advancedFilters?.withCastIds || []
const directorId = advancedFilters?.withDirectorId

// Determine if infinite content is enabled
const infiniteEnabled = collection?.canGenerateMore ?? false

const data = await fetchWithUnifiedCascading(
    {
        actorIds,
        directorId,
        genres: unifiedGenreIds,
        mediaType,
        genreLogic,
        childSafeMode,
        infiniteEnabled,
    },
    pageNumber,
    API_KEY!
)
```

**Handle "both" media type (around line 274-318):**

```typescript
if (mediaType === 'both') {
    // Extract actor/director IDs
    const actorIds = advancedFilters?.withCastIds || []
    const directorId = advancedFilters?.withDirectorId
    const infiniteEnabled = collection?.canGenerateMore ?? false

    // Fetch movies and TV separately with unified cascading
    const [movieData, tvData] = await Promise.all([
        fetchWithUnifiedCascading(
            {
                actorIds,
                directorId,
                genres: unifiedGenreIds,
                mediaType: 'movie',
                genreLogic,
                childSafeMode,
                infiniteEnabled,
            },
            pageNumber,
            API_KEY!
        ),
        fetchWithUnifiedCascading(
            {
                actorIds,
                directorId,
                genres: unifiedGenreIds,
                mediaType: 'tv',
                genreLogic,
                childSafeMode,
                infiniteEnabled,
            },
            pageNumber,
            API_KEY!
        ),
    ])

    // Rest of the interleaving logic remains the same...
}
```

### 3.2 Access Collection Data

**Note**: The API route needs access to `collection.canGenerateMore` to determine infinite setting.

**Add parameter to route or fetch collection data:**

```typescript
// Option 1: Add query parameter
const infiniteEnabled = searchParams.get('infiniteEnabled') === 'true'

// Option 2: Fetch collection from Firestore (if not already fetched)
const db = getAdminDb()
const collectionDoc = await db
    .collection('users')
    .doc(userId)
    .collection('customRows')
    .doc(collectionId)
    .get()
const collection = collectionDoc.data()
const infiniteEnabled = collection?.canGenerateMore ?? false
```

---

## Phase 4: Testing Strategy

### 4.1 Unit Tests

**Test tier generation:**

```typescript
describe('generateTierCombinations', () => {
    it('generates correct tiers for 2 actors + 1 director + 3 genres', () => {
        const tiers = generateTierCombinations({
            actorIds: [31, 6193],
            directorId: 488,
            genres: ['action', 'thriller', 'drama'],
            mediaType: 'movie',
            genreLogic: 'AND',
            childSafeMode: false,
            infiniteEnabled: true,
        })

        // Should have 8 tiers total
        expect(tiers.length).toBe(18) // 3 actor modes × 2 director modes × 3 genre counts

        // First tier should be most specific
        expect(tiers[0]).toEqual({
            actorMode: 'all',
            directorMode: 'present',
            genreCount: 3,
        })

        // Last tier should be broadest
        expect(tiers[tiers.length - 1]).toEqual({
            actorMode: 'none',
            directorMode: 'absent',
            genreCount: 1,
        })
    })

    it('stops at actor/director tiers when infinite disabled', () => {
        const tiers = generateTierCombinations({
            actorIds: [31],
            directorId: 488,
            genres: ['action'],
            mediaType: 'movie',
            genreLogic: 'AND',
            childSafeMode: false,
            infiniteEnabled: false, // Disabled
        })

        // Should NOT include 'none' actor + 'absent' director tiers
        const hasGenreOnlyTier = tiers.some(
            (t) => t.actorMode === 'none' && t.directorMode === 'absent'
        )
        expect(hasGenreOnlyTier).toBe(false)
    })
})
```

**Test TMDB parameter building:**

```typescript
describe('buildTMDBParams', () => {
    it('translates ALL actor mode to comma-separated IDs', () => {
        const params = buildTMDBParams(
            { actorMode: 'all', directorMode: 'absent', genreCount: 1, totalPages: 0 },
            {
                actorIds: [31, 6193],
                genres: ['action'],
                mediaType: 'movie',
                genreLogic: 'OR',
                childSafeMode: false,
                infiniteEnabled: true,
            }
        )

        expect(params.with_cast).toBe('31,6193') // Comma = AND
    })

    it('translates ANY actor mode to pipe-separated IDs', () => {
        const params = buildTMDBParams(
            { actorMode: 'any', directorMode: 'absent', genreCount: 1, totalPages: 0 },
            {
                actorIds: [31, 6193],
                genres: ['action'],
                mediaType: 'movie',
                genreLogic: 'OR',
                childSafeMode: false,
                infiniteEnabled: true,
            }
        )

        expect(params.with_cast).toBe('31|6193') // Pipe = OR
    })

    it('includes director with with_crew parameter', () => {
        const params = buildTMDBParams(
            { actorMode: 'none', directorMode: 'present', genreCount: 1, totalPages: 0 },
            {
                actorIds: [],
                directorId: 488,
                genres: ['action'],
                mediaType: 'movie',
                genreLogic: 'OR',
                childSafeMode: false,
                infiniteEnabled: true,
            }
        )

        expect(params.with_crew).toBe('488')
    })
})
```

### 4.2 Integration Tests

**Test full collection fetch:**

```typescript
describe('Collection Content Fetch', () => {
    it('fetches Tier 1 content on page 1', async () => {
        const response = await fetch(
            '/api/custom-rows/test-id/content?page=1&actorIds=31,6193&directorId=488&genres=action,thriller&mediaType=movie&genreLogic=AND'
        )

        const data = await response.json()

        // Should return results from Tier 1 (ALL actors + director)
        expect(data.results.length).toBeGreaterThan(0)
    })

    it('falls back to broader tier when page exceeds Tier 1', async () => {
        // Assume Tier 1 has 3 pages
        const response = await fetch(
            '/api/custom-rows/test-id/content?page=10&actorIds=31,6193&directorId=488&genres=action,thriller&mediaType=movie&genreLogic=AND'
        )

        const data = await response.json()

        // Should return results from Tier 2 or 3 (broader match)
        expect(data.results.length).toBeGreaterThan(0)
    })
})
```

### 4.3 Manual Testing Checklist

- [ ] Create collection with 2 actors + 1 director + 3 genres
- [ ] Verify page 1 shows most specific results
- [ ] Scroll through pages - verify progressive broadening
- [ ] Toggle infinite content OFF - verify stops at actor/director tiers
- [ ] Toggle infinite content ON - verify continues to genre-only
- [ ] Remove director - verify actor-only cascading works
- [ ] Remove actors - verify genre-only cascading works (existing behavior)
- [ ] Test with child safety mode enabled
- [ ] Test with hidden content filtering

---

## Phase 5: Error Handling & Edge Cases

### 5.1 Invalid Person IDs

```typescript
async function fetchTierMetadata(...) {
    try {
        const response = await fetch(url)

        if (response.status === 404) {
            console.warn('Person ID not found, skipping tier')
            return null  // Skip this tier, continue with others
        }

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        // ...
    } catch (error) {
        console.error('Tier fetch error:', error)
        return null  // Skip failed tier
    }
}
```

### 5.2 No Results in Any Tier

```typescript
export async function fetchWithUnifiedCascading(...) {
    const tiers = await getTiers(config, apiKey)

    if (tiers.length === 0) {
        return {
            results: [],
            page: 1,
            total_pages: 1,
            total_results: 0,
            message: 'No content found matching these criteria'
        }
    }

    // ...
}
```

### 5.3 Collections with Names but No IDs

**Graceful degradation in API route:**

```typescript
// Extract actor/director IDs
const actorIds = advancedFilters?.withCastIds || []
const directorId = advancedFilters?.withDirectorId

// If IDs missing but names exist, log warning and fall back to genre-only
if (actorIds.length === 0 && advancedFilters?.withCast && advancedFilters.withCast.length > 0) {
    console.warn('Collection has actor names but no IDs - falling back to genre-only cascading')
    // TODO: Optional background job to populate IDs
}

if (!directorId && advancedFilters?.withDirector) {
    console.warn('Collection has director name but no ID - falling back to genre-only cascading')
}

// Continue with whatever IDs we have (might be empty, which falls back to genre-only)
```

### 5.4 Rate Limiting

```typescript
// In calculateAllTiers - already implemented with batching
const BATCH_SIZE = 10
const DELAY_BETWEEN_BATCHES = 300 // 300ms

// This ensures we don't exceed TMDB's 40 req/sec limit
```

---

## Implementation Checklist

### Phase 1: Data Model ✅

- [ ] Add `withCastIds` and `withDirectorId` to `AdvancedFilters` type
- [ ] Update `addActor()` to store TMDB person ID
- [ ] Update `removeActor()` to remove corresponding ID
- [ ] Update `setDirector()` to store TMDB person ID
- [ ] Update `removeDirector()` to remove ID
- [ ] Test: Verify IDs are stored when adding actors/directors

### Phase 2: Cascading Utility ✅

- [ ] Create `utils/unifiedCascadingFetch.ts`
- [ ] Implement type definitions
- [ ] Implement cache with 6-hour TTL
- [ ] Implement `generateTierCombinations()`
- [ ] Implement `buildTMDBParams()`
- [ ] Implement `fetchTierMetadata()`
- [ ] Implement `calculateAllTiers()` with batching
- [ ] Implement `getTiers()` with caching
- [ ] Implement `findTierForPage()`
- [ ] Implement `fetchContentForTier()`
- [ ] Implement `fetchWithUnifiedCascading()` main export
- [ ] Test: Unit tests for tier generation and parameter building

### Phase 3: API Integration ✅

- [ ] Import `fetchWithUnifiedCascading` in content route
- [ ] Replace single media type fetch with unified cascading
- [ ] Replace "both" media type fetch with unified cascading
- [ ] Handle `infiniteEnabled` parameter
- [ ] Test: API returns correct content per tier

### Phase 4: Testing ✅

- [ ] Unit tests for tier generation
- [ ] Unit tests for TMDB parameter translation
- [ ] Integration test: Full collection fetch
- [ ] Manual test: 2 actors + 1 director + 3 genres
- [ ] Manual test: Infinite content toggle
- [ ] Manual test: Child safety mode
- [ ] Manual test: Hidden content filtering

### Phase 5: Polish ✅

- [ ] Error handling for invalid person IDs
- [ ] Graceful degradation for missing IDs
- [ ] Logging for debugging
- [ ] Performance monitoring (cache hit rate, API calls)

---

## Performance Expectations

### Initial Load (No Cache)

- **Tier calculation**: ~2-3 seconds (12-18 parallel requests with batching)
- **Content fetch**: ~500ms
- **Total**: ~2.5-3.5 seconds

### Cached Load

- **Tier calculation**: <50ms (cache hit)
- **Content fetch**: ~500ms
- **Total**: ~550ms

### API Calls Per Collection

- **Initial**: 13-18 calls (tier metadata) + 1 (content) = 14-19 calls
- **Cached**: 1 call (content only)

### Cache Efficiency

- **Cache duration**: 6 hours
- **Expected hit rate**: >80% (most users don't change filters frequently)

---

## Rollback Strategy

If issues arise:

1. **Quick Rollback** (5 minutes)
    - Revert API route changes
    - Collections fall back to genre-only cascading
    - No data loss (IDs remain in Firestore)

2. **Partial Rollback**
    - Keep UI changes (IDs continue being stored)
    - Disable cascading via environment variable
    - Re-enable when issues resolved

3. **Data Safety**
    - Person IDs stored in separate fields
    - Existing `withCast`/`withDirector` unchanged
    - Full backward compatibility maintained

---

## Success Metrics

### Technical

- Cache hit rate >80%
- Tier calculation <3s (initial), <50ms (cached)
- Content fetch <500ms
- API calls per collection: <20 (initial), <2 (cached)

### User

- % of collections using actor/director filters
- Average pages scrolled in actor-based collections
- User engagement (time spent browsing)
- Collection creation rate with advanced filters

---

## Future Enhancements

### Near Future (3-6 months)

1. **Background ID Population**
    - Job to populate missing person IDs for existing collections
    - Improves cascading for legacy collections

2. **Director Role Verification (Option B)**
    - Add credit verification for 100% accuracy
    - Feature flag to enable/disable
    - Monitor API usage impact

### Long Term (6-12 months)

1. **Year Range Cascading**
    - Exact range → ±5 years → ±10 years → no limit

2. **Rating Range Cascading**
    - Exact range → -0.5 minimum → -1.0 minimum → no limit

3. **Multi-Director Support**
    - Change `withDirector` to array
    - Apply ALL/ANY/NONE logic like actors

4. **Smart Suggestions**
    - "Users who like Christopher Nolan also like Denis Villeneuve"
    - AI-powered person recommendations

---

## Conclusion

This implementation provides **progressive cascading for actors and directors** with:

✅ **Full backward compatibility** - Existing collections continue working
✅ **Performance optimized** - 6-hour cache, batched requests, rate limiting
✅ **Simple implementation** - No director role verification (Option A)
✅ **Extensible design** - Easy to add year/rating cascading later
✅ **Robust error handling** - Graceful degradation, helpful logging

**Next Step:** Begin Phase 1 - Update data model and UI to store TMDB person IDs.
