# Actor & Director Cascading Implementation Plan

## Executive Summary

Implement **progressive cascading for actors and directors** similar to the existing genre cascading system. This ensures collections never run out of content by progressively broadening filter criteria while prioritizing the most specific matches first.

## Current State Analysis

### What Currently Exists ✅

1. **Genre Cascading System** (`utils/prioritizedGenreFetch.ts`)
    - Progressive genre cascading: 3 genres → 2 genres → 1 genre
    - Tier calculation with parallel fetching
    - 6-hour cache for tier metadata
    - Automatic page mapping to correct tier

2. **Actor/Director UI** (`components/modals/CollectionEditorModal.tsx`)
    - Inline search for actors and directors
    - Profile image display in pills
    - Keyboard navigation (Arrow keys + Enter)
    - Store actor names and profile images in state

3. **Data Storage** (`types/collections.ts`)
    - `AdvancedFilters.withCast: string[]` - Actor names or TMDB IDs
    - `AdvancedFilters.withDirector: string` - Director name or TMDB ID

4. **Person Search API** (`/api/search/people`)
    - Returns person ID, name, profile_path, known_for_department
    - Filters by department (acting/directing)
    - Caches results for 10 minutes

5. **TMDB Integration** (`utils/tmdb/contentDiscovery.ts`)
    - Already applies `with_cast` and `with_crew` parameters
    - Currently uses comma-separated IDs (AND logic in TMDB)

### Current Limitations ❌

1. **No actor cascading** - All pages use same actor filter (static)
2. **Name-based storage** - Only stores actor names, not TMDB person IDs
3. **No tier calculation** - Doesn't calculate total pages per actor combination
4. **No progressive fallback** - Cannot broaden from "all actors" to "any actor" to "no actor"

## Problem Statement

**User's Request:**

> "When we have multiple actors, prioritize movies with ALL actors first, then movies with ANY actor, then if infinite content is enabled, continue with genre-only content."

**Example Scenario:**
Collection with:

- Actors: Tom Hanks + Leonardo DiCaprio
- Genres: Action + Thriller
- Infinite Content: Enabled

**Desired Behavior:**

- **Tier 1 (Pages 1-3)**: Action + Thriller with BOTH Tom Hanks AND Leonardo DiCaprio
- **Tier 2 (Pages 4-20)**: Action + Thriller with EITHER Tom Hanks OR Leonardo DiCaprio
- **Tier 3 (Pages 21+)**: Action + Thriller (no actor requirement)

**Current Behavior:**

- All pages: Action + Thriller with Tom Hanks OR Leonardo DiCaprio (static OR logic)
- No progressive broadening

## Solution Architecture

### Phase 1: Data Model Updates

**1.1 Store TMDB Person IDs**

Update `AdvancedFilters` to store person IDs alongside names:

```typescript
export interface AdvancedFilters {
    // Current (names only)
    withCast?: string[]
    withDirector?: string

    // New (add person IDs)
    withCastIds?: number[] // TMDB person IDs for actors
    withDirectorId?: number // TMDB person ID for director
}
```

**Why both names and IDs?**

- Names: Display in UI pills
- IDs: Required for TMDB API calls
- Fallback: If ID missing, attempt name-to-ID lookup

**Migration Strategy:**

- Existing collections continue working (names only)
- New collections store both names and IDs
- Background job to populate IDs for existing collections (optional)

---

### Phase 2: Unified Cascading System

**2.1 Create Unified Cascading Utility**

New file: `utils/unifiedCascadingFetch.ts`

```typescript
interface FilterTier {
    actorMode: 'all' | 'any' | 'none' // ALL actors, ANY actor, or NO actors
    directorMode: 'present' | 'absent' // With director or without
    genreCount: number // 3, 2, or 1 genres
    totalPages: number // Pages available in this tier
}

interface CascadingConfig {
    actorIds: number[] // TMDB person IDs for actors
    directorId?: number // TMDB person ID for director
    genres: string[] // Unified genre IDs
    mediaType: 'movie' | 'tv'
    genreLogic: 'AND' | 'OR'
    childSafeMode: boolean
}

async function fetchWithUnifiedCascading(
    config: CascadingConfig,
    page: number,
    apiKey: string
): Promise<TMDBResponse>
```

**2.2 Tier Priority Order**

When ALL filters are present (2 actors + 1 director + 3 genres):

```
Tier 1: ALL actors AND director AND 3 genres (most specific)
Tier 2: ANY actor AND director AND 3 genres
Tier 3: director AND 3 genres (no actor filter)
Tier 4: 3 genres only (no actor/director)
Tier 5: 2 genres only
Tier 6: 1 genre only (truly infinite)
```

**2.3 Tier Calculation Algorithm**

```typescript
async function calculateAllTiers(config: CascadingConfig): Promise<FilterTier[]> {
    const tiers: FilterTier[] = []

    // Actor cascading tiers
    const actorModes: Array<'all' | 'any' | 'none'> = []
    if (config.actorIds.length > 1) {
        actorModes.push('all', 'any', 'none')
    } else if (config.actorIds.length === 1) {
        actorModes.push('any', 'none') // Single actor: present or absent
    } else {
        actorModes.push('none') // No actors specified
    }

    // Director modes
    const directorModes: Array<'present' | 'absent'> = config.directorId
        ? ['present', 'absent']
        : ['absent']

    // Genre cascading
    const genreCounts =
        config.genres.length >= 3 ? [3, 2, 1] : config.genres.length === 2 ? [2, 1] : [1]

    // Generate all tier combinations (parallel fetching)
    const tierPromises = []

    for (const actorMode of actorModes) {
        for (const directorMode of directorModes) {
            for (const genreCount of genreCounts) {
                tierPromises.push(
                    fetchTierMetadata({
                        ...config,
                        actorMode,
                        directorMode,
                        genreCount,
                    })
                )
            }
        }
    }

    const results = await Promise.all(tierPromises)
    return results.filter((tier) => tier.totalPages > 0)
}
```

**2.4 TMDB API Parameter Translation**

```typescript
function buildTMDBParams(tier: FilterTier, config: CascadingConfig): Record<string, any> {
    const params: Record<string, any> = {}

    // Actor filtering
    if (tier.actorMode === 'all') {
        // Comma-separated = AND logic in TMDB
        params.with_cast = config.actorIds.join(',')
    } else if (tier.actorMode === 'any') {
        // Pipe-separated = OR logic in TMDB
        params.with_cast = config.actorIds.join('|')
    }
    // 'none' = omit parameter

    // Director filtering
    if (tier.directorMode === 'present' && config.directorId) {
        params.with_crew = config.directorId
    }

    // Genre filtering (use existing genre translation)
    const currentGenres = config.genres.slice(0, tier.genreCount)
    const tmdbGenreIds = translateToTMDBGenres(currentGenres, config.mediaType)
    params.with_genres =
        config.genreLogic === 'AND' ? tmdbGenreIds.join(',') : tmdbGenreIds.join('|')

    return params
}
```

---

### Phase 3: API Route Integration

**3.1 Update `/api/custom-rows/[id]/content/route.ts`**

Replace direct `fetchWithPrioritizedGenres()` call with unified cascading:

```typescript
// Current (genre-only cascading)
const data = await fetchWithPrioritizedGenres(
    unifiedGenreIds,
    mediaType,
    'discover',
    pageNumber,
    API_KEY!,
    childSafeMode,
    genreLogic
)

// New (unified actor + director + genre cascading)
const actorIds = advancedFilters?.withCastIds || []
const directorId = advancedFilters?.withDirectorId

const data = await fetchWithUnifiedCascading(
    {
        actorIds,
        directorId,
        genres: unifiedGenreIds,
        mediaType,
        genreLogic,
        childSafeMode,
    },
    pageNumber,
    API_KEY!
)
```

**3.2 Handle Query Parameters**

Add optional parameters to API route:

- `actorIds`: Comma-separated TMDB person IDs
- `directorId`: Single TMDB person ID

---

### Phase 4: UI Updates

**4.1 Store Person IDs When Adding Actors/Directors**

Update `CollectionEditorModal.tsx`:

```typescript
const addActor = (actor: any) => {
    const currentActors = advancedFilters.withCast || []
    const currentActorIds = advancedFilters.withCastIds || []

    if (!currentActors.includes(actor.name)) {
        setAdvancedFilters({
            ...advancedFilters,
            withCast: [...currentActors, actor.name],
            withCastIds: [...currentActorIds, actor.id], // Store TMDB ID
        })

        // Store profile image
        setActorProfileImages((prev) => ({
            ...prev,
            [actor.name]: actor.profile_path,
        }))
    }
    // ...
}

const setDirector = (director: any) => {
    setAdvancedFilters({
        ...advancedFilters,
        withDirector: director.name,
        withDirectorId: director.id, // Store TMDB ID
    })
    // ...
}
```

**4.2 Display Cascading Status (Optional Enhancement)**

Show tier information in collection preview:

```
Collection Content Preview:
✓ Tier 1: 3 results (Both actors + 3 genres)
✓ Tier 2: 127 results (Any actor + 3 genres)
✓ Tier 3: 1,459 results (Genres only)

Total: 1,589 results with infinite scrolling
```

---

### Phase 5: Caching Strategy

**5.1 Tier Cache Structure**

```typescript
interface TierCacheKey {
    actorIds: number[] // Sorted for consistency
    directorId?: number
    genres: string[] // Sorted for consistency
    mediaType: 'movie' | 'tv'
    genreLogic: 'AND' | 'OR'
    childSafeMode: boolean
}

const tierCache = new Map<string, FilterTier[]>()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours (match genre cache)
```

**5.2 Cache Key Generation**

```typescript
function generateCacheKey(config: CascadingConfig): string {
    const sortedActors = [...config.actorIds].sort()
    const sortedGenres = [...config.genres].sort()

    return [
        sortedActors.join(','),
        config.directorId || 'no-director',
        sortedGenres.join(','),
        config.mediaType,
        config.genreLogic,
        config.childSafeMode,
    ].join(':')
}
```

---

### Phase 6: Edge Cases & Error Handling

**6.1 Person ID Not Found**

When TMDB person ID is invalid (404):

```typescript
if (response.status === 404) {
    // Log warning and skip this person filter
    apiWarn(`Person ID ${personId} not found, skipping tier`)
    continue // Try next tier without this person
}
```

**6.2 No Results in Any Tier**

```typescript
if (allTiers.every((tier) => tier.totalPages === 0)) {
    return {
        results: [],
        page: 1,
        total_pages: 1,
        total_results: 0,
        message: 'No content found matching these criteria',
    }
}
```

**6.3 Infinite Content Disabled**

When `canGenerateMore: false`:

- Still apply actor cascading
- Stop at Tier 3 (don't cascade to genre-only)
- Collection has finite pages based on actor+genre matches

**6.4 Mixed Name/ID Storage (Migration)**

Handle collections with names but no IDs:

```typescript
// Attempt to resolve names to IDs
if (withCast && withCast.length > 0 && (!withCastIds || withCastIds.length === 0)) {
    // Background: Lookup person IDs by name
    const resolvedIds = await resolvePersonNames(withCast)

    // Update collection with IDs (async, non-blocking)
    updateCollectionPersonIds(collectionId, resolvedIds)

    // Use whatever IDs we found for this request
    actorIds = resolvedIds
}
```

---

## Implementation Phases

### Phase 1: Data Model & Storage (2-3 hours)

- ✅ Update `AdvancedFilters` interface with ID fields
- ✅ Update `CollectionEditorModal` to store IDs on selection
- ✅ Update `AdvancedFiltersModal` to store IDs (if still using)
- ✅ Test: Verify IDs are stored in Firestore correctly

### Phase 2: Unified Cascading Utility (4-5 hours)

- ✅ Create `utils/unifiedCascadingFetch.ts`
- ✅ Implement tier calculation with parallel fetching
- ✅ Implement TMDB parameter translation
- ✅ Implement cache with 6-hour TTL
- ✅ Implement page-to-tier mapping logic
- ✅ Test: Verify tier calculation matches expected combinations

### Phase 3: API Route Integration (2-3 hours)

- ✅ Update `/api/custom-rows/[id]/content/route.ts`
- ✅ Replace `fetchWithPrioritizedGenres` with `fetchWithUnifiedCascading`
- ✅ Handle both "movie" and "tv" media types
- ✅ Handle "both" media type with merged results
- ✅ Test: Verify API returns correct content per tier

### Phase 4: End-to-End Testing (2-3 hours)

- ✅ Test single actor cascading
- ✅ Test multiple actor cascading (ALL → ANY → NONE)
- ✅ Test director cascading (present → absent)
- ✅ Test combined actor + director + genre cascading
- ✅ Test infinite content disabled (stops before genre-only tier)
- ✅ Test child safety mode integration
- ✅ Test hidden content filtering
- ✅ Test page navigation across tier boundaries

### Phase 5: Edge Cases & Migration (1-2 hours)

- ✅ Handle collections with names but no IDs
- ✅ Handle invalid person IDs gracefully
- ✅ Add error logging for debugging
- ✅ Optional: Background job to populate IDs for existing collections

**Total Estimate**: 11-16 hours

---

## Testing Strategy

### Unit Tests

1. **Tier Calculation Logic**

    ```typescript
    describe('calculateAllTiers', () => {
        it('creates ALL/ANY/NONE tiers for multiple actors', async () => {
            const tiers = await calculateAllTiers({
                actorIds: [138, 6193], // Christian Bale + Leonardo DiCaprio
                directorId: 525, // Christopher Nolan
                genres: ['action', 'thriller', 'scifi'],
                mediaType: 'movie',
                genreLogic: 'AND',
                childSafeMode: false,
            })

            expect(tiers[0].actorMode).toBe('all') // Both actors
            expect(tiers[0].directorMode).toBe('present')
            expect(tiers[0].genreCount).toBe(3)
        })
    })
    ```

2. **TMDB Parameter Translation**

    ```typescript
    it('translates ALL actor mode to comma-separated IDs', () => {
        const params = buildTMDBParams(
            { actorMode: 'all' /* ... */ },
            { actorIds: [138, 6193] /* ... */ }
        )
        expect(params.with_cast).toBe('138,6193') // AND logic
    })

    it('translates ANY actor mode to pipe-separated IDs', () => {
        const params = buildTMDBParams(
            { actorMode: 'any' /* ... */ },
            { actorIds: [138, 6193] /* ... */ }
        )
        expect(params.with_cast).toBe('138|6193') // OR logic
    })
    ```

### Integration Tests

1. **Full Collection Fetch**
    - Create collection with 2 actors + 1 director + 3 genres
    - Fetch page 1 → Verify Tier 1 (ALL actors + director + 3 genres)
    - Fetch page 20 → Verify Tier 2 (ANY actor + director + 3 genres)
    - Fetch page 100 → Verify Tier 3 (director + 3 genres)
    - Fetch page 500 → Verify Tier 6 (1 genre only)

2. **Infinite Content Toggle**
    - Disable infinite content → Verify stops at Tier 3
    - Enable infinite content → Verify continues to Tier 6

---

## Rollback Plan

If cascading causes issues:

1. **Quick Rollback** (5 minutes)
    - Revert `/api/custom-rows/[id]/content/route.ts` to use `fetchWithPrioritizedGenres`
    - Deploy immediately
    - Collections continue working with genre-only cascading

2. **Data Preservation**
    - Person IDs stored in `withCastIds` and `withDirectorId` remain in Firestore
    - No data loss, can re-enable cascading later

3. **Gradual Rollout Alternative**
    - Feature flag: `ENABLE_ACTOR_CASCADING` environment variable
    - Test with subset of users before full rollout

---

## Success Metrics

1. **Technical Metrics**
    - Cache hit rate for tier metadata (target: >80%)
    - Average API response time per tier (target: <500ms)
    - Tier calculation time (target: <2s for all tiers)

2. **User Metrics**
    - % of collections using actor/director filters
    - Average pages scrolled in actor-based collections
    - User engagement with actor-filtered content vs genre-only

3. **Edge Case Handling**
    - % of successful person ID resolutions
    - % of collections hitting "no results" state
    - % of 404 errors for invalid person IDs

---

## Future Enhancements (Out of Scope)

1. **Year Range Cascading**
    - Tier 1: Exact year range (1990-2000)
    - Tier 2: ±5 years (1985-2005)
    - Tier 3: ±10 years (1980-2010)
    - Tier 4: No year filter

2. **Rating Range Cascading**
    - Tier 1: Exact rating range (7.0-10.0)
    - Tier 2: Lowered minimum (6.5-10.0)
    - Tier 3: Broader range (6.0-10.0)
    - Tier 4: No rating filter

3. **Multi-Director Support**
    - Change `withDirector: string` to `withDirector: string[]`
    - Apply same ALL/ANY/NONE cascading logic

4. **Collaboration Filters**
    - "Movies where Nolan directed DiCaprio"
    - Requires AND logic between director and specific actor

---

## Conclusion

This plan implements **progressive cascading for actors and directors** to ensure collections never run out of content while prioritizing the most relevant matches first. The system builds on the existing genre cascading infrastructure and maintains backward compatibility with existing collections.

**Key Benefits:**

- ✅ Infinite scrolling with progressive broadening
- ✅ Prioritizes most specific matches (both actors + director)
- ✅ Falls back gracefully to broader matches
- ✅ Works with existing genre cascading
- ✅ Minimal API changes (additive only)
- ✅ Full backward compatibility

**Next Steps:**

1. Review and approve plan
2. Begin Phase 1: Data Model Updates
3. Implement in development environment
4. Test thoroughly with various actor/director combinations
5. Deploy with feature flag for gradual rollout
