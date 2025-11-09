# Smart Recommendations Engine

## Overview

The Smart Recommendations Engine provides personalized content recommendations based on user preferences, viewing history, and genre affinity. The system uses a hybrid approach combining TMDB's similarity algorithms with custom genre-based filtering to deliver relevant recommendations.

**Status**: ✅ Implemented (Phase 4 - Feature Roadmap 2025)

**Implementation Date**: January 2025

## Features

### Core Capabilities

1. **Personalized Recommendations**
    - Based on liked content and watchlist
    - Genre preference scoring
    - Filters out already-seen content
    - Updates as user preferences change

2. **"More Like This" Feature**
    - Shows similar content in modal
    - Hybrid TMDB similar + recommended content
    - Inline display with grid layout
    - Click to navigate between recommendations

3. **"Recommended For You" Row**
    - First row on home page
    - 20 personalized recommendations
    - Horizontal scrolling interface
    - Only visible for authenticated users

4. **Recommendation Sources**
    - **TMDB Similar**: Content similar to specific items
    - **TMDB Recommended**: ML-based recommendations from TMDB
    - **Genre-Based**: Discover content in user's favorite genres
    - **Hybrid**: Combined approach for diversity

## Architecture

### Data Model

**Recommendation Interface** (`types/recommendations.ts`):

```typescript
interface Recommendation {
    content: Content // Movie/show details
    source: RecommendationSource // Where it came from
    score: number // Confidence (0-100)
    reason: string // Human-readable explanation
    sourceContentId?: number // Reference content ID
    generatedAt: number // Timestamp
}

type RecommendationSource =
    | 'tmdb_similar' // TMDB similar content
    | 'tmdb_recommended' // TMDB ML recommendations
    | 'genre_based' // Genre preference engine
    | 'collaborative' // Similar users (future)
    | 'trending' // Trending in user's genres
    | 'new_release' // New releases matching preferences
```

**Genre Preference Scoring**:

```typescript
interface GenrePreference {
    genreId: number
    genreName: string
    score: number // Calculated score
    count: number // Number of items contributing
}

// Scoring weights:
// Liked content: +3 points per genre
// Watchlist: +1 point per genre
// Hidden content: -2 points per genre (negative signal)
```

### Components

#### RecommendedForYouRow (`components/recommendations/RecommendedForYouRow.tsx`)

Displays personalized recommendations on the home page.

**Features**:

- Fetches recommendations via API
- Horizontal scrolling with chevrons
- Shows up to 20 recommendations
- Hidden for guest users
- Loading and error states

**Props**: None (uses stores)

**User Data Used**:

- Liked movies (up to 10)
- Default watchlist (up to 10)
- Hidden movies (up to 10)

#### MoreLikeThisSection (`components/modal/MoreLikeThisSection.tsx`)

Shows similar content in the content modal.

**Features**:

- Grid layout (2-4 columns, responsive)
- Fetches similar content via API
- Click to open modal with recommendation
- Auto-starts video muted
- Fails silently if no recommendations

**Props**:

- `content: Content` - Current content being viewed

**Display**: 12 similar items in grid

### API Routes

#### GET /api/recommendations/personalized

Returns personalized recommendations for a user.

**Request**:

- Header: `x-user-id` (required)
- Query params:
    - `likedMovies` - JSON array of liked content
    - `watchlist` - JSON array of watchlist items
    - `hiddenMovies` - JSON array of hidden content
    - `limit` - Number of recommendations (default: 20, max: 50)

**Response**:

```typescript
{
  success: true,
  recommendations: Recommendation[],
  profile: {
    topGenres: GenrePreference[],
    preferredRating: number
  },
  totalCount: number,
  generatedAt: number
}
```

**Error Response** (Not enough data):

```typescript
{
  success: true,
  recommendations: [],
  message: "Not enough user data...",
  requiresData: true
}
```

**Algorithm**:

1. Check user has minimum 3 items (liked + watchlist)
2. Build recommendation profile
3. Fetch genre-based recommendations (60% weight)
4. Fetch TMDB similar content (40% weight)
5. Merge with diversity, deduplicate
6. Return with metadata (source, score, reason)

#### GET /api/recommendations/similar/[id]

Returns content similar to a specific movie/show.

**Request**:

- Path param: `id` - Content ID
- Query params:
    - `mediaType` - 'movie' or 'tv' (default: 'movie')
    - `limit` - Number of recommendations (default: 20, max: 50)

**Response**:

```typescript
{
  success: true,
  recommendations: Recommendation[],
  sourceId: number,
  totalCount: number,
  generatedAt: number
}
```

**Algorithm**:

1. Fetch TMDB similar content
2. Fetch TMDB recommendations
3. Mix 50/50 for diversity
4. Deduplicate
5. Return up to limit

### Utilities

#### TMDB Recommendations (`utils/tmdb/recommendations.ts`)

TMDB API integration for recommendations.

**Functions**:

- `getSimilarContent(contentId, mediaType, page)` - Similar content
- `getTMDBRecommendations(contentId, mediaType, page)` - ML recommendations
- `getTrendingByGenre(genreId, timeWindow, mediaType)` - Trending in genre
- `discoverByPreferences(params)` - Discover with filters
- `getTopRatedByGenre(genreId, mediaType, page)` - Top rated
- `getBatchSimilarContent(contentIds, mediaType, limit)` - Batch similar
- `getHybridRecommendations(contentId, mediaType, limit)` - Mixed approach

#### Genre Engine (`utils/recommendations/genreEngine.ts`)

Genre-based recommendation logic.

**Functions**:

- `calculateGenrePreferences(userData)` - Score genres
- `buildRecommendationProfile(userData)` - Create profile
- `getGenreBasedRecommendations(profile, limit, excludeIds)` - Generate recs
- `getGenreRecommendations(genreId, limit, excludeIds)` - Genre-specific
- `getSeenContentIds(userData)` - Extract seen IDs
- `hasEnoughDataForRecommendations(userData, minItems)` - Validate data
- `mergeRecommendations(sources, limit)` - Merge with diversity

**Genre Scoring Algorithm**:

```typescript
// Weighted scoring:
likedMovies.forEach((content) => {
    content.genre_ids.forEach((genreId) => {
        scores[genreId] += 3 // Strongest signal
    })
})

defaultWatchlist.forEach((content) => {
    content.genre_ids.forEach((genreId) => {
        scores[genreId] += 1 // Moderate signal
    })
})

hiddenMovies.forEach((content) => {
    content.genre_ids.forEach((genreId) => {
        scores[genreId] -= 2 // Negative signal
    })
})

// Sort by score descending
// Filter positive scores only
```

## Usage Examples

### Fetching Personalized Recommendations (Client)

```typescript
import { useSessionData } from '@/hooks/useSessionData'
import { useSessionStore } from '@/stores/sessionStore'

function MyComponent() {
    const { userId } = useSessionStore()
    const sessionData = useSessionData()

    useEffect(() => {
        const fetchRecs = async () => {
            const params = new URLSearchParams({
                likedMovies: JSON.stringify(sessionData.likedMovies.slice(0, 10)),
                watchlist: JSON.stringify(sessionData.defaultWatchlist.slice(0, 10)),
                hiddenMovies: JSON.stringify(sessionData.hiddenMovies.slice(0, 10)),
                limit: '20',
            })

            const response = await fetch(`/api/recommendations/personalized?${params}`, {
                headers: { 'x-user-id': userId },
            })

            const data = await response.json()
            console.log(data.recommendations)
        }

        if (userId) fetchRecs()
    }, [userId])
}
```

### Fetching Similar Content

```typescript
const fetchSimilar = async (contentId: number, mediaType: 'movie' | 'tv') => {
    const response = await fetch(
        `/api/recommendations/similar/${contentId}?mediaType=${mediaType}&limit=12`
    )

    const data = await response.json()
    return data.recommendations
}
```

### Using RecommendedForYouRow

```tsx
import RecommendedForYouRow from '@/components/recommendations/RecommendedForYouRow'

function HomePage() {
    return (
        <div>
            <Banner />
            <RecommendedForYouRow /> {/* First row after banner */}
            {/* Other content rows */}
        </div>
    )
}
```

### Using MoreLikeThisSection

```tsx
import MoreLikeThisSection from '@/components/modal/MoreLikeThisSection'

function ContentModal({ content }: { content: Content }) {
    return (
        <div>
            <VideoPlayer />
            <ContentMetadata content={content} />
            <MoreLikeThisSection content={content} /> {/* After metadata */}
        </div>
    )
}
```

## Constraints and Limits

```typescript
export const RECOMMENDATION_CONSTRAINTS = {
    DEFAULT_LIMIT: 20, // Default recommendations
    MAX_LIMIT: 50, // Maximum per request
    MIN_SCORE: 10, // Minimum confidence score
    CACHE_DURATION: 3600000, // 1 hour cache (future)
    MIN_USER_DATA: 3, // Minimum liked/watchlist items
}
```

## Recommendation Quality

### Minimum Data Requirements

For personalized recommendations, users need:

- **At least 3 items** in combined (liked movies + watchlist)
- Ideally 5+ liked movies for best results
- Diverse genres for better recommendations

### Scoring System

Recommendations are scored 0-100:

- **90-100**: Highly confident (top similar content)
- **70-89**: Good match (genre alignment + similarity)
- **50-69**: Moderate match (trending in user's genres)
- **10-49**: Weak match (broad genre match)
- **< 10**: Not shown (filtered out)

### Diversity Strategy

The system balances:

- **60%** from genre-based discovery (user preferences)
- **40%** from TMDB similar content (collaborative filtering)
- Round-robin merge for diversity
- Deduplication to avoid repetition

## Future Enhancements

### Planned Features (Roadmap Phase 7+)

1. **User Interaction Tracking**
    - Modal views
    - Trailer plays and watch duration
    - Search query history
    - Genre interaction frequency

2. **Advanced Algorithms**
    - Collaborative filtering (similar users)
    - Time-decay weighting (recent preferences matter more)
    - Session-based recommendations
    - Contextual recommendations (time of day, device)

3. **Performance Optimizations**
    - Client-side caching (1 hour)
    - Recommendation pre-fetching
    - Incremental updates (not full refresh)

4. **Recommendation Types**
    - "Trending in Your Genres"
    - "Hidden Gems You Might Like"
    - "Popular with Similar Users"
    - "Because You Watched X, Y, Z"

5. **Notification Integration**
    - New recommendations notification
    - "New similar content to [Movie]"
    - Weekly recommendation digest

## Performance Considerations

1. **API Efficiency**
    - Parallel TMDB requests (similar + recommended)
    - Batch operations where possible
    - Filter client-side to reduce API calls

2. **User Experience**
    - Loading states for gradual reveal
    - Fail silently (don't block UI)
    - Cache-first strategy (future)

3. **Data Privacy**
    - User data stays on client
    - Sent via query params (not stored)
    - No cross-user data sharing
    - Guest users have no recommendations

## Testing

### Manual Testing Checklist

**Personalized Recommendations**:

- [ ] Shows "Recommended For You" row on home page (auth users only)
- [ ] Hidden for guest users
- [ ] Loads 20 recommendations
- [ ] Horizontal scroll works
- [ ] Chevrons appear on hover
- [ ] Recommendations match user's genre preferences
- [ ] No duplicate content
- [ ] Excludes already-liked/watchlisted content

**More Like This**:

- [ ] Shows below content metadata in modal
- [ ] Displays 12 similar items
- [ ] Grid layout responsive (2-4 columns)
- [ ] Click opens new modal
- [ ] Auto-starts video muted
- [ ] Fails silently if no recommendations

**API Routes**:

- [ ] `/api/recommendations/personalized` returns data
- [ ] Requires authentication (x-user-id header)
- [ ] Returns empty with "requiresData" if < 3 items
- [ ] `/api/recommendations/similar/[id]` works for movies and TV
- [ ] Deduplication works correctly

### Test Scenarios

**Scenario 1: New User (No Data)**

- Expected: No "Recommended For You" row
- Expected: "More Like This" still works (uses TMDB similar)

**Scenario 2: User with 5 Liked Movies**

- Expected: Recommendations appear
- Expected: Genre-based + similar content mix
- Expected: No duplicate recommendations

**Scenario 3: User with Diverse Genres**

- Expected: Recommendations span multiple genres
- Expected: Not dominated by single genre

## Files Modified/Created

### New Files (Phase 4)

1. `types/recommendations.ts` (185 lines) - Data models
2. `utils/tmdb/recommendations.ts` (280 lines) - TMDB utilities
3. `utils/recommendations/genreEngine.ts` (310 lines) - Genre engine
4. `app/api/recommendations/personalized/route.ts` (130 lines) - API
5. `app/api/recommendations/similar/[id]/route.ts` (75 lines) - API
6. `components/modal/MoreLikeThisSection.tsx` (113 lines) - UI
7. `components/recommendations/RecommendedForYouRow.tsx` (150 lines) - UI

### Modified Files

1. `components/modals/Modal.tsx` - Added MoreLikeThisSection
2. `components/pages/HomeClient.tsx` - Added RecommendedForYouRow

### Documentation

1. `docs/current/RECOMMENDATION_ENGINE.md` - This file

**Total**: 7 new files, 2 modified files, ~1,243 lines of code

## Related Features

- **Collection Sharing** (Phase 2): Shared collections can include recommendations
- **Notification System** (Phase 3): Can notify about new recommendations (future)
- **User Interaction Tracking** (Phase 7.1): Will improve recommendations

## Support

For questions or issues with recommendations:

1. Ensure user is authenticated (recommendations require auth)
2. Check user has at least 3 liked/watchlist items
3. Verify TMDB API key is configured
4. Check browser console for API errors

## Changelog

**January 2025 - v1.0.0 (Phase 4)**

- ✅ Initial implementation
- ✅ Personalized recommendations with genre-based engine
- ✅ "More Like This" feature in modal
- ✅ "Recommended For You" row on home page
- ✅ Hybrid TMDB + genre-based approach
- ✅ Minimum user data requirement (3 items)
- ✅ Deduplication and filtering
- ✅ Reason generation for recommendations

---

**Last Updated**: January 2025
**Phase**: 4 - Smart Recommendations Engine
**Status**: Complete
