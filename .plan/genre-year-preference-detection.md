# Genre-Specific Year Preference Detection Plan

## Problem Statement

Currently, the recommendation engine only tracks a global `preferredYearRange` (min/max across ALL content). This misses important patterns like:

- User likes **1990s action movies** but **modern sci-fi**
- User prefers **classic horror** (1970s-1980s) but **contemporary comedies**
- User enjoys **2010s dramas** specifically

**Goal**: Detect year patterns PER GENRE and apply them to recommendations.

---

## Current State Analysis

### Existing Infrastructure

1. **RecommendationProfile** (`types/recommendations.ts:201-213`)
    - Has `preferredYearRange?: { min: number; max: number }`
    - Currently calculated as simple min/max across ALL content
    - NOT genre-specific

2. **buildRecommendationProfile()** (`utils/recommendations/genreEngine.ts:187-243`)
    - Lines 216-234: Calculates global year range
    - Collects years from: likedMovies, watchlist, collectionItems
    - Uses `Math.min()` and `Math.max()` - doesn't detect patterns

3. **discoverByPreferences()** (`utils/tmdb/recommendations.ts:123-170`)
    - ALREADY supports `yearRange?: { min?: number; max?: number }`
    - Passed to TMDB API as `primary_release_date.gte/lte`
    - Ready to use genre-specific ranges!

4. **Content Data Available**
    - Movies: `release_date` (string, e.g., "1999-03-31")
    - TV Shows: `first_air_date` (string)
    - Each content has `genre_ids: number[]`

---

## Approach Comparison

### Option 1: Simple Weighted Average per Genre

**How it works:**

- Calculate average year for each genre based on liked/rated content
- Apply ±10 year buffer around the average
- Example: Drama avg = 1995 → recommend dramas from 1985-2005

**Pros:**

- Simple to implement
- Low computational cost
- Easy to understand/debug

**Cons:**

- Doesn't detect multi-modal preferences (e.g., likes both 1960s AND 2020s westerns)
- Sensitive to outliers
- May be too restrictive if user has diverse tastes within a genre

---

### Option 2: Decade-Based Clustering

**How it works:**

- Group content by decade (1990s, 2000s, 2010s, etc.)
- For each genre, find the decade(s) with most liked content
- Recommend content from those decades

**Pros:**

- Handles multi-modal preferences well
- Natural user-friendly buckets
- Robust to individual outliers

**Cons:**

- Less precise than year-based
- Might miss preferences that span decade boundaries (1998-2002)
- Requires threshold tuning (how many items to qualify as "preferred decade"?)

---

### Option 3: Interquartile Range (IQR) Method

**How it works:**

- Calculate median and IQR for years in each genre
- Use median ± 1.5 \* IQR as the year range
- Excludes outliers automatically

**Pros:**

- Statistically robust
- Automatically handles outliers
- Adapts to data distribution

**Cons:**

- More complex calculation
- May be too wide or narrow depending on distribution
- Less intuitive than decades

---

### Option 4: Confidence-Weighted Hybrid

**How it works:**

- Combine decade clustering with weighted average
- Apply confidence weighting based on sample size
- Small sample (< 5 items): Use global range or no filter
- Medium sample (5-15 items): Use decade clustering
- Large sample (15+ items): Use IQR method

**Pros:**

- Adapts to data availability
- Most accurate for well-established preferences
- Graceful degradation with limited data

**Cons:**

- Most complex to implement
- Requires careful threshold tuning
- May be over-engineered

---

## Recommended Solution: **Option 2 - Decade-Based Clustering**

### Rationale

1. **User-Friendly**: Decades are natural mental buckets ("I like 90s action movies")
2. **Handles Variety**: Captures both "classic" and "modern" preferences within a genre
3. **Robust**: Not sensitive to single outliers
4. **Implementable**: Moderate complexity, clear logic
5. **Debuggable**: Easy to explain to users why they got a recommendation

### Confidence Levels

- **High confidence (8+ items)**: Apply decade filter strictly
- **Medium confidence (4-7 items)**: Apply decade filter with ±5 year buffer
- **Low confidence (1-3 items)**: Skip year filtering for this genre (use global default)

---

## Unified Genre System Integration

The app uses a **unified genre system** (`constants/unifiedGenres.ts`) that provides seamless genre handling across movies and TV shows. This system is critical for year preference detection.

### How It Works

1. **User-Facing**: Users see consistent genre names (Action, Fantasy, Sci-Fi) regardless of media type
2. **Storage**: Collections and preferences use unified genre IDs (`string[]` like `['action', 'fantasy']`)
3. **TMDB API**: Genres are translated to TMDB IDs only when making API calls
    - Example: 'fantasy' → 14 for movies, 10765 for TV shows

### Translation Utilities

**File**: `utils/genreMapping.ts`

```typescript
// Convert TMDB genre IDs from content to unified IDs
convertLegacyGenresToUnified(tmdbIds: number[], mediaType: 'movie' | 'tv'): string[]

// Translate unified IDs to TMDB IDs for API calls
translateToTMDBGenres(unifiedIds: string[], mediaType: 'movie' | 'tv'): number[]

// Get genre display name
getGenreDisplayName(unifiedId: string): string | undefined
```

### Content Data Structure

Content items from TMDB have:

```typescript
{
  id: 123,
  media_type: 'movie' | 'tv',
  genre_ids: [28, 14], // TMDB genre IDs (must be converted)
  release_date: '1999-03-31', // for movies
  first_air_date: '1999-03-31' // for TV
}
```

**Important**: We MUST convert `genre_ids` to unified IDs before building year preferences.

---

## Data Structure Design

### GenreYearPreference Interface

```typescript
/**
 * Year preference for a specific genre
 */
export interface GenreYearPreference {
    genreId: string // Unified genre ID ('action', 'drama', etc.)
    genreName: string // Genre name (e.g., "Action", "Drama")

    // Decade-based preferences
    preferredDecades: number[] // Array of preferred decades (e.g., [1990, 2010])

    // Statistical data
    sampleSize: number // Number of items in this genre
    yearMedian: number // Median year
    yearMin: number // Earliest year
    yearMax: number // Latest year

    // Confidence
    confidence: 'low' | 'medium' | 'high'

    // For filtering
    effectiveYearRange?: { min: number; max: number }
}
```

### Updated RecommendationProfile

```typescript
export interface RecommendationProfile {
    userId: string
    topGenres: GenrePreference[] // Existing

    // NEW: Genre-specific year preferences
    genreYearPreferences?: GenreYearPreference[]

    preferredRating?: number // Existing
    updatedAt: number // Existing
}
```

---

## Algorithm Design

### Step 1: Extract Year Data per Genre

```
For each liked/rated content item:
  1. Extract year from release_date/first_air_date
     - If the date is missing or malformed, skip the item (do NOT count it toward sample size)

  2. Convert TMDB genre_ids to unified genre IDs:
     - Use convertLegacyGenresToUnified(content.genre_ids, content.media_type)
     - Example: Movie with genre_ids [28, 14] → ['action', 'fantasy']

  3. For each unified genre ID:
     - Add year to genre's year collection
     - Increment count
```

**Note**: Content items have TMDB `genre_ids: number[]`. We must translate these to unified genre IDs using the utilities from `utils/genreMapping.ts` before processing.

### Step 2: Decade Detection Algorithm

```
For each genre with collected years:
  1. Group years into decades:
     decade = Math.floor(year / 10) * 10
     Example: 1995 → 1990, 2003 → 2000

  2. Count items per decade:
     decades_map = {
       1990: 8 items,
       2000: 3 items,
       2010: 12 items
     }

  3. Find preferred decades (2 strategies):

     A. Absolute Threshold:
        - Include any decade with 3+ items
        - Example: [1990, 2010] (both have 3+)

     B. Relative Threshold (RECOMMENDED):
        - Sort decades by count descending
        - Include top N decades that represent ≥ 60% of content
        - Example: 1990 (8) + 2010 (12) = 20/23 = 87% → include both

  4. Calculate effective year range:
     - If preferredDecades = [1990, 2010]:
       min = 1990 - buffer
       max = 2010 + 10 + buffer
     - buffer depends on confidence:
       high (8+ items): buffer = 0
       medium (4-7): buffer = 5
       low (1-3): no filtering
```

### Step 3: Apply to Recommendations

```
When fetching recommendations for a genre:
  1. Look up GenreYearPreference for this genre

  2. If confidence is 'low' or not found:
     - Skip year filtering
     - Use full TMDB catalog

  3. If confidence is 'medium' or 'high':
     - Use effectiveYearRange
     - Pass to discoverByPreferences({ yearRange: ... })
     - Log the coverage percentage used to derive the range; if the resulting window would trim >70% of available TMDB results, fall back to no year filtering for that request
```

---

## Implementation Plan

### Phase 1: Core Algorithm (utils/recommendations/yearPreferenceDetector.ts)

```typescript
/**
 * Calculate genre-specific year preferences from user content
 */
export function calculateGenreYearPreferences(userData: {
    likedMovies: Content[]
    defaultWatchlist: Content[]
    collectionItems?: Content[]
}): GenreYearPreference[] {
    // Implementation here
}

/**
 * Extract preferred decades for a genre
 */
function extractPreferredDecades(years: number[], threshold: number = 0.6): number[] {
    // Implementation here
}

/**
 * Calculate effective year range from preferred decades
 */
function calculateEffectiveYearRange(
    preferredDecades: number[],
    confidence: 'low' | 'medium' | 'high'
): { min: number; max: number } {
    // Implementation here
}
```

### Phase 2: Integration with Recommendation Engine

**File: utils/recommendations/genreEngine.ts**

1. Modify `buildRecommendationProfile()`:
    - Call `calculateGenreYearPreferences()`
    - Add result to profile as `genreYearPreferences`
    - Remove legacy `preferredYearRange` usage altogether (audit any other readers before deleting)

2. Modify `getGenreBasedRecommendations()`:
    - Look up year preference for each genre being queried
    - Pass `yearRange` to `discoverByPreferences()`

**File: app/api/recommendations/personalized/route.ts**

- Update to use new year-aware profile
- Log year filtering for debugging

### Phase 3: Type Definitions

**File: types/recommendations.ts**

1. **Update existing `GenrePreference` interface** (lines 190-196):
    - Change `genreId: number` to `genreId: string` (unified genre ID)
    - This is a breaking change - update all consumers of this type

2. **Add new `GenreYearPreference` interface**:
    - Uses `genreId: string` (unified genre ID)
    - See interface definition above in "Data Structure Design"

3. **Update `RecommendationProfile` interface**:
    - Add `genreYearPreferences?: GenreYearPreference[]`
    - Keep `preferredYearRange` for now (backwards compatibility during transition)
    - Plan to remove `preferredYearRange` in future version once fully migrated

### Phase 4: Testing & Tuning

**Test Cases:**

1. **Single Genre, Single Decade**
    - User likes 10 action movies from 2010s
    - Expected: Recommend 2010-2020 action movies

2. **Single Genre, Multi-Decade**
    - User likes 5 dramas from 1990s, 7 from 2010s
    - Expected: Recommend dramas from 1990-2000 AND 2010-2020

3. **Multiple Genres, Different Decades**
    - 8x 1990s action, 6x 2020s comedy
    - Expected: 1990s action, 2020s comedy

4. **Low Confidence (Few Items)**
    - 2 romance movies from 2005
    - Expected: No year filtering (too few samples)

5. **Outliers**
    - 10x 2010s sci-fi, 1x 1950s sci-fi
    - Expected: Only 2010-2020 (outlier ignored)

6. **Uniform Distribution**
    - 2x each from 1980s, 1990s, 2000s, 2010s, 2020s
    - Expected: Wide range or no filtering (no clear preference)

---

## Configuration Constants

```typescript
export const YEAR_PREFERENCE_CONFIG = {
    // Sample size thresholds
    LOW_CONFIDENCE_MAX: 3, // 1-3 items = low confidence
    MEDIUM_CONFIDENCE_MAX: 7, // 4-7 items = medium
    // 8+ items = high confidence

    // Decade thresholding
    MIN_ITEMS_PER_DECADE: 2, // Need at least 2 items to consider a decade
    DECADE_COVERAGE_THRESHOLD: 0.6, // Decades must cover 60% of content

    // Year range buffers
    HIGH_CONFIDENCE_BUFFER: 0, // No buffer for high confidence
    MEDIUM_CONFIDENCE_BUFFER: 5, // ±5 years for medium

    // Fallback
    DEFAULT_YEAR_BUFFER: 10, // ±10 years if using weighted average fallback
} as const
```

---

## User-Facing Features (Optional Future Enhancements)

1. **Insights Modal Addition**
    - Show "You prefer [Genre] from [Decades]" in recommendation insights
    - Visual timeline showing genre preferences

2. **Manual Override**
    - Allow users to manually set year ranges per genre
    - "I want classic horror (pre-1990) but modern action (2010+)"

3. **Profile Export**
    - Include year preferences in public profile
    - "This user loves 90s action and 2010s sci-fi"

---

## Edge Cases & Handling

### Case 1: User with Mixed Global Preferences

**Scenario**: User likes both very old and very new content across all genres
**Handling**: Use relative thresholding per genre instead of global filtering

### Case 2: Genre with No Clear Pattern

**Scenario**: Equal distribution across all decades
**Handling**: Skip year filtering for that genre (use full catalog)

### Case 3: Media Type Combined Tracking

**Scenario**: User prefers 1990s action movies and 2020s action TV shows
**Handling**: Combine both into a single "action" genre preference. Since the "Recommended For You" row shows both movies and TV shows together, tracking preferences separately by media type would create ambiguity about which year range to apply. The decade clustering algorithm will naturally find patterns across both media types (e.g., [1990, 2020] for action).

### Case 4: Recently Added Preference

**Scenario**: User just started liking a new genre (only 1 item)
**Handling**: Low confidence → no filtering → explore full catalog

---

## Performance Considerations

1. **Calculation Frequency**
    - Calculate on profile build (already happens once per recommendation request)
    - Cache in RecommendationProfile
    - No additional API calls needed

2. **Computational Cost**
    - O(n × g) where n = number of rated items, g = avg genres per item
    - Typical: 50 items × 3 genres = 150 operations
    - Negligible impact

3. **API Impact**
    - Year filtering applied to TMDB API calls
    - May slightly reduce result counts but improves relevance
    - Net neutral or positive (fewer irrelevant results to filter client-side)

---

## Success Metrics

1. **Diversity Score**
    - Measure: % of recommendations from different decades
    - Target: Reflects user's actual preference distribution

2. **User Engagement**
    - Click-through rate on recommendations
    - Additions to watchlist from recommended content
    - Expected increase: 15-25%

3. **Accuracy Validation**
    - Spot-check: Do recommendations match user's preferred decades?
    - User feedback: "These recommendations feel accurate"

---

## Migration Strategy

1. **Data Migration**
    - No user data migration needed
    - Calculated fresh from existing liked content
    - Instant availability for all users

---

## Example Walkthrough

### User Profile

- 10 liked items (mix of movies and TV shows):
    - 4x Action movies from 2015-2018 (TMDB: [28] → unified: 'action')
    - 3x Action movies from 1998-2002 (TMDB: [28] → unified: 'action')
    - 2x Drama TV shows from 2020-2022 (TMDB: [18] → unified: 'drama')
    - 1x Horror movie from 1985 (TMDB: [27] → unified: 'horror')

### Calculation Steps

**Step 1**: Convert TMDB genre IDs to unified IDs using `convertLegacyGenresToUnified()`

**Step 2**: Group years by unified genre ID

**Action Genre (7 items, unified ID: 'action'):**

```
Years: [2015, 2016, 2017, 2018, 1998, 1999, 2002]
Decades:
  1990: 3 items (1998, 1999, 2002)
  2010: 4 items (2015, 2016, 2017, 2018)

Preferred Decades: [1990, 2010] (both have 2+ items)
Coverage: 7/7 = 100% ✓
Confidence: medium (7 items)
Effective Range: { min: 1985, max: 2025 } (with ±5 year buffer)
```

**Drama Genre (2 items, unified ID: 'drama'):**

```
Years: [2020, 2022]
Decades:
  2020: 2 items

Preferred Decades: [2020]
Coverage: 2/2 = 100% ✓
Confidence: low (only 2 items)
Effective Range: null (skip filtering due to low confidence)
```

**Horror Genre (1 item, unified ID: 'horror'):**

```
Years: [1985]
Confidence: low (only 1 item)
Effective Range: null (skip filtering)
```

### Recommendation Behavior

When generating "Recommended For You" (which shows both movies + TV):

1. **Action recommendations**:
    - Unified genre: 'action'
    - Translate to TMDB: Movies (28), TV (10759)
    - Apply year filter: 1985-2025
    - Result: Action content from 1985-2025

2. **Drama recommendations**:
    - Unified genre: 'drama'
    - Translate to TMDB: Movies (18), TV (18)
    - Skip year filtering (low confidence)
    - Result: Full catalog

3. **Horror recommendations**:
    - Unified genre: 'horror'
    - Translate to TMDB: Movies (27), TV (10765, 9648)
    - Skip year filtering (low confidence)
    - Result: Full catalog

---

## Timeline Estimate

- **Phase 1** (Core Algorithm): 4-6 hours
- **Phase 2** (Integration): 3-4 hours
- **Phase 3** (Types & Tests): 2-3 hours
- **Phase 4** (Testing & Tuning): 3-4 hours
- **Total**: 12-17 hours (1.5-2 days)

---

## Summary of Changes from Original Plan

This updated plan incorporates the **unified genre system** throughout:

1. ✅ Uses unified genre IDs (`string`) instead of TMDB genre IDs (`number`)
2. ✅ Combines TV and movie preferences (unified recommendation row)
3. ✅ Translates genres only at TMDB API boundary
4. ✅ Updated all type definitions to use `genreId: string`
5. ✅ Added genre conversion step to algorithm
6. ✅ Updated example walkthrough with genre translation

## Open Questions

1. **Decade Threshold**: Use 60% coverage or different percentage?
2. **Confidence Levels**: Are 3/7 items good cutoffs for low/medium/high?
3. **Buffer Years**: Should medium confidence use ±5 years or ±10?
4. **UI**: Should we show year preferences in the insights modal?
5. **Profile Freshness**: How often should we rebuild the recommendation profile?
    - On every new like/rating?
    - Daily refresh?
    - Manual refresh button?
