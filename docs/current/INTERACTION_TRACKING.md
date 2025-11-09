# User Interaction Tracking System

## Overview

The User Interaction Tracking System collects user interaction data to improve personalized recommendations. By tracking how users engage with content (viewing, liking, adding to watchlist, playing trailers), the system builds a profile of user preferences that enables better content discovery.

**Status**: ✅ Implemented (Phase 7.1-7.3 - Feature Roadmap 2025)

**Implementation Date**: January 2025

## Features

### Core Capabilities

1. **Comprehensive Interaction Types**
    - 10 different interaction types covering all major user actions
    - Weighted scoring system (likes +5, views +1, hides -5)
    - Negative signals for content users don't want to see

2. **Automatic Genre Preference Calculation**
    - Calculates genre scores based on interaction weights
    - Updates summary every 24 hours automatically
    - Tracks top 20 most-interacted content for similarity matching

3. **Privacy-First Design**
    - Tracking fails silently (doesn't disrupt UX)
    - Skips tracking for guest users (optional - can be enabled)
    - All data stored in user's own Firestore document
    - 90-day data retention with automatic cleanup

4. **Batch Logging Support**
    - Efficient batch operations (up to 50 interactions)
    - Automatic summary refresh triggers
    - Minimal Firestore write costs

5. **Analytics & Insights**
    - Interaction counts by type
    - Top genres with scores
    - Trailer engagement metrics (plays, duration, averages)
    - Recent interaction timeline

## Architecture

### Data Model

**UserInteraction** (`types/interactions.ts`):

```typescript
export interface UserInteraction {
    id: string // Interaction ID
    userId: string // Firebase Auth UID or Guest ID
    contentId: number // TMDB content ID
    mediaType: 'movie' | 'tv' // Content type
    interactionType: InteractionType
    genreIds: number[] // TMDB genre IDs
    timestamp: number // Unix timestamp

    // Optional metadata
    trailerDuration?: number // Seconds watched (for play_trailer)
    searchQuery?: string // Search term (for search interactions)
    collectionId?: string // Collection ID if from collection
    source?: string // Where interaction occurred
}
```

**Interaction Types**:

```typescript
type InteractionType =
    | 'view_modal' // Opened content modal (+1)
    | 'add_to_watchlist' // Added to watchlist (+3)
    | 'remove_from_watchlist' // Removed from watchlist (-2)
    | 'like' // Liked content (+5)
    | 'unlike' // Unliked content (-2)
    | 'play_trailer' // Started playing trailer (+2)
    | 'hide_content' // Hidden content (-5)
    | 'unhide_content' // Unhidden content (0)
    | 'search' // Searched for content (+1)
    | 'voice_search' // Used voice search (+2)
```

**Interaction Weights**:

```typescript
export const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
    like: 5, // Strongest positive signal
    add_to_watchlist: 3, // Strong positive signal
    play_trailer: 2, // Medium positive signal
    voice_search: 2, // Medium positive signal
    view_modal: 1, // Light positive signal
    search: 1, // Light positive signal
    unhide_content: 0, // Neutral
    unlike: -2, // Negative signal
    remove_from_watchlist: -2, // Negative signal
    hide_content: -5, // Strongest negative signal
}
```

**UserInteractionSummary**:

```typescript
export interface UserInteractionSummary {
    userId: string
    totalInteractions: number
    genrePreferences: GenrePreference[] // Sorted by score descending
    lastUpdated: number // When summary was last calculated
    topContentIds: number[] // Most interacted-with content (top 20)
}

export interface GenrePreference {
    genreId: number
    genreName: string
    score: number // Weighted sum of interactions
    count: number // Number of interactions
}
```

### Firestore Structure

```
/users/{userId}/
  interactions/
    {interactionId}/ → UserInteraction
  interactionSummary/
    summary → UserInteractionSummary
```

**Data Retention**: 90 days (configurable via INTERACTION_CONSTRAINTS.RETENTION_DAYS)

### Components

#### useInteractionTracking Hook (`hooks/useInteractionTracking.ts`)

React hook providing easy-to-use tracking API.

**Usage**:

```typescript
import { useInteractionTracking } from '@/hooks/useInteractionTracking'

function MyComponent() {
    const trackInteraction = useInteractionTracking()

    const handleOpenModal = (content: Content) => {
        // Track modal view
        trackInteraction.viewModal(content, 'home')

        // Open modal...
    }

    const handleLike = (content: Content) => {
        // Track like
        trackInteraction.like(content, 'modal')

        // Update UI...
    }

    const handleTrailerEnd = (content: Content, duration: number) => {
        // Track trailer play with duration
        trackInteraction.playTrailer(content, duration, 'modal')
    }
}
```

**Available Methods**:

- `viewModal(content, source?)` - Track modal view
- `addToWatchlist(content, source?)` - Track watchlist addition
- `removeFromWatchlist(content, source?)` - Track watchlist removal
- `like(content, source?)` - Track like
- `unlike(content, source?)` - Track unlike
- `playTrailer(content, duration?, source?)` - Track trailer play
- `hideContent(content, source?)` - Track hide
- `unhideContent(content, source?)` - Track unhide
- `search(content, query, source?)` - Track search
- `voiceSearch(content, query, source?)` - Track voice search
- `track(content, type, options?)` - Generic tracking method

**Source Parameter**: Tracks where interaction occurred

```typescript
type InteractionSource =
    | 'home' // Home page row
    | 'search' // Search results
    | 'collection' // Custom collection
    | 'recommended' // Recommended for you row
    | 'similar' // More like this section
    | 'trending' // Trending row
    | 'watchlist' // Watchlist
    | 'modal' // Content modal
    | 'voice' // Voice search
```

#### useUserData Hook Integration

All user actions automatically tracked:

```typescript
const { addToWatchlist, like, hideContent } = useUserData()

// These now automatically track interactions
addToWatchlist(content) // Tracks 'add_to_watchlist'
like(content) // Tracks 'like'
hideContent(content) // Tracks 'hide_content'
```

**Tracked Actions in useUserData**:

- `addToWatchlist` → Tracks before adding
- `removeFromWatchlist` → Tracks before removing
- `addLikedMovie` → Tracks before liking
- `removeLikedMovie` → Tracks before unliking
- `addHiddenMovie` → Tracks before hiding
- `removeHiddenMovie` → Tracks before unhiding

### Utilities

#### Firestore Utilities (`utils/firestore/interactions.ts`)

##### `logInteraction(userId, interaction): Promise<UserInteraction>`

Logs a single interaction.

```typescript
const interaction = {
    contentId: 123,
    mediaType: 'movie',
    interactionType: 'like',
    genreIds: [28, 12], // Action, Adventure
}

await logInteraction(userId, interaction)
```

##### `logInteractionBatch(userId, interactions): Promise<UserInteraction[]>`

Logs multiple interactions efficiently.

```typescript
const interactions = [
    { contentId: 123, interactionType: 'view_modal', ... },
    { contentId: 456, interactionType: 'like', ... },
]

await logInteractionBatch(userId, interactions)
```

##### `getRecentInteractions(userId, limit?): Promise<UserInteraction[]>`

Gets recent interactions.

```typescript
const recent = await getRecentInteractions(userId, 50)
```

##### `getInteractionsByType(userId, type, limit?): Promise<UserInteraction[]>`

Gets interactions of specific type.

```typescript
const likes = await getInteractionsByType(userId, 'like', 100)
```

##### `getInteractionSummary(userId): Promise<UserInteractionSummary | null>`

Gets user's interaction summary.

```typescript
const summary = await getInteractionSummary(userId)

if (summary) {
    console.log(`Total interactions: ${summary.totalInteractions}`)
    console.log(`Top genre: ${summary.genrePreferences[0].genreName}`)
}
```

##### `calculateInteractionSummary(userId): Promise<UserInteractionSummary>`

Calculates and saves interaction summary.

```typescript
// Recalculate summary manually
const summary = await calculateInteractionSummary(userId)
```

**Algorithm**:

```typescript
// For each interaction
interactions.forEach((interaction) => {
    const weight = INTERACTION_WEIGHTS[interaction.interactionType]

    interaction.genreIds.forEach((genreId) => {
        scores[genreId] += weight
        counts[genreId] += 1
    })
})

// Create GenrePreference objects
const preferences = Object.entries(scores)
    .filter(([_, score]) => score > 0) // Only positive scores
    .map(([genreId, score]) => ({
        genreId: parseInt(genreId),
        genreName: getGenreName(genreId),
        score,
        count: counts[genreId],
    }))
    .sort((a, b) => b.score - a.score) // Descending order
```

##### `refreshInteractionSummaryIfNeeded(userId): Promise<UserInteractionSummary | null>`

Refreshes summary if stale (>24 hours).

```typescript
// Automatically called after logging interactions
const summary = await refreshInteractionSummaryIfNeeded(userId)
```

##### `getInteractionAnalytics(userId): Promise<InteractionAnalytics>`

Gets comprehensive analytics.

```typescript
const analytics = await getInteractionAnalytics(userId)

console.log(`Total interactions: ${analytics.totalInteractions}`)
console.log(`Likes: ${analytics.interactionsByType.like}`)
console.log(`Trailer plays: ${analytics.trailerEngagement.totalPlays}`)
console.log(`Avg trailer duration: ${analytics.trailerEngagement.averageDuration}s`)
```

##### `cleanupOldInteractions(userId, retentionDays?): Promise<number>`

Cleans up old interactions.

```typescript
// Delete interactions older than 90 days
const deletedCount = await cleanupOldInteractions(userId, 90)
```

##### `createInteractionFromContent(content, type, options?)`

Helper to create interaction from Content object.

```typescript
const interaction = createInteractionFromContent(content, 'play_trailer', {
    trailerDuration: 45,
    source: 'modal',
})

await logInteraction(userId, interaction)
```

## Usage Examples

### Basic Tracking

```typescript
import { useInteractionTracking } from '@/hooks/useInteractionTracking'

function MovieCard({ content }: { content: Content }) {
    const trackInteraction = useInteractionTracking()

    const handleClick = () => {
        // Track view
        trackInteraction.viewModal(content, 'home')

        // Open modal
        openModal(content)
    }

    return (
        <div onClick={handleClick}>
            {/* Movie card UI */}
        </div>
    )
}
```

### Tracking with Duration

```typescript
function VideoPlayer({ content }: { content: Content }) {
    const trackInteraction = useInteractionTracking()
    const [startTime] = useState(Date.now())

    const handleVideoEnd = () => {
        const duration = (Date.now() - startTime) / 1000
        trackInteraction.playTrailer(content, duration, 'modal')
    }

    return (
        <ReactPlayer
            onEnded={handleVideoEnd}
            // ... other props
        />
    )
}
```

### Batch Tracking

```typescript
async function trackBulkViews(contents: Content[]) {
    const userId = getUserId()

    const interactions = contents.map((content) =>
        createInteractionFromContent(content, 'view_modal', {
            source: 'home',
        })
    )

    await logInteractionBatch(userId, interactions)
}
```

### Getting User Analytics

```typescript
async function showUserStats(userId: string) {
    const analytics = await getInteractionAnalytics(userId)

    return {
        totalActions: analytics.totalInteractions,
        favoriteGenres: analytics.topGenres.slice(0, 3),
        trailerStats: {
            watched: analytics.trailerEngagement.totalPlays,
            avgDuration: Math.round(analytics.trailerEngagement.averageDuration),
        },
        recentActivity: analytics.recentInteractions.slice(0, 5),
    }
}
```

## Integration Points

### Modal Component (`components/modals/Modal.tsx`)

**view_modal** tracking when modal opens:

```typescript
useEffect(() => {
    if (!currentMovie || !currentMovie.id) return
    if (loadedMovieId === currentMovie.id) return

    // Track modal view
    trackInteraction.viewModal(currentMovie as Content, 'modal')

    // ... fetch movie details
}, [currentMovie, loadedMovieId])
```

### useUserData Hook (`hooks/useUserData.ts`)

All user actions wrapped with tracking:

```typescript
const addToWatchlistTracked = (content: Content) => {
    trackInteraction.addToWatchlist(content as Content)
    return sessionData.addToWatchlist(content)
}

const addLikedMovieTracked = (content: Content) => {
    trackInteraction.like(content as Content)
    return sessionData.addLikedMovie(content)
}

const addHiddenMovieTracked = (content: Content) => {
    trackInteraction.hideContent(content as Content)
    return sessionData.addHiddenMovie(content)
}

// ... similarly for remove actions
```

## Configuration

### Constraints

```typescript
export const INTERACTION_CONSTRAINTS = {
    MAX_INTERACTIONS_PER_USER: 10000, // Per user limit
    MAX_BATCH_SIZE: 50, // Max interactions per batch write
    RETENTION_DAYS: 90, // Keep interactions for 90 days
    SUMMARY_REFRESH_HOURS: 24, // Recalculate summary every 24 hours
    MIN_INTERACTIONS_FOR_RECOMMENDATIONS: 5, // Minimum for recommendations
}
```

### Interaction Weights

Customize weights in `types/interactions.ts`:

```typescript
export const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
    like: 5, // Adjust to change importance
    add_to_watchlist: 3,
    // ... other weights
}
```

## Performance Considerations

### Firestore Operations

**Per Interaction**:

- 1 write (logInteraction)
- 1 read (optional - for summary check)
- 1 write (optional - for summary refresh)

**Per Summary Refresh**:

- N reads (all interactions)
- 1 write (updated summary)
- Triggered max once per 24 hours

### Optimization Tips

1. **Use Batch Logging**: For multiple interactions, use `logInteractionBatch` to reduce writes
2. **Cache Summary**: Summary auto-refreshes every 24h, no need to recalculate manually
3. **Fail Silently**: Tracking errors don't disrupt UX
4. **Skip Guest Users**: Currently skips guests to reduce load (can be enabled)

### Firestore Costs

Assuming 1000 active users with 10 interactions/day each:

- **Writes**: 10,000 interactions/day + ~42 summary updates/day = **~10,042 writes/day**
- **Reads**: ~42 summary checks/day = **~42 reads/day**
- **Storage**: ~10K interactions × 500 bytes = **~5 MB**

With 90-day retention:

- **Total storage**: ~450 MB
- **Monthly cost**: <$1 (Firestore free tier covers this)

## Data Privacy

### Privacy Features

1. **User-Specific Data**: All interactions stored in user's own Firestore document
2. **No Cross-User Sharing**: Data never shared between users
3. **Automatic Cleanup**: 90-day retention with auto-deletion
4. **Fail-Silent Design**: Tracking failures don't affect user experience
5. **Guest Opt-Out**: Guest users currently not tracked (configurable)

### GDPR Compliance

- **Data Access**: Users can request interaction data via Firestore
- **Data Deletion**: Use `cleanupOldInteractions(userId, 0)` to delete all
- **Data Export**: Use `getRecentInteractions(userId, 10000)` to export
- **Consent**: Should add UI toggle for "Improve Recommendations" (Phase 7.5 - pending)

## Future Enhancements

### Phase 7.4: Analytics Dashboard (Optional)

Create user-facing analytics page:

```typescript
// components/analytics/InteractionDashboard.tsx
- Total interactions chart
- Genre preference breakdown
- Trailer engagement stats
- Recent activity timeline
- Weekly/monthly comparisons
```

### Phase 7.5: Privacy Controls (Pending)

Add privacy settings:

```typescript
interface InteractionPrivacySettings {
    enabled: boolean // Master toggle
    improveRecommendations: boolean // Use for recommendations
    anonymizeData: boolean // Strip identifying info
}
```

**UI Location**: Settings page
**Default**: enabled = true, improveRecommendations = true

### Phase 7.7: Enhanced Tracking (Future)

Additional interaction types:

- `share_content` - User shared content
- `follow_collection` - User followed shared collection
- `rate_content` - User rated content (if rating system added)
- `skip_content` - User skipped content in carousel

### Phase 7.8: Real-Time Recommendations (Future)

Use interaction data for live recommendations:

```typescript
// Update recommendations immediately after interactions
useEffect(() => {
    if (recentInteraction) {
        refreshRecommendations()
    }
}, [recentInteraction])
```

## Troubleshooting

### Interactions Not Being Logged

**Check**:

1. User ID is available (`getUserId()` returns non-null)
2. Content has required fields (id, media_type, genre_ids)
3. Browser console for tracking errors
4. Firestore permissions allow writes to `/users/{userId}/interactions`

**Solution**:

```typescript
// Enable debug logging
console.log('[Tracking] User ID:', getUserId())
console.log('[Tracking] Content:', content)
```

### Summary Not Updating

**Check**:

1. Summary exists in Firestore
2. `lastUpdated` timestamp is >24 hours old
3. User has interactions logged

**Solution**:

```typescript
// Force summary recalculation
await calculateInteractionSummary(userId)
```

### High Firestore Costs

**Check**:

1. Number of interactions per user
2. Summary refresh frequency
3. Batch operations usage

**Solution**:

```typescript
// Increase summary refresh interval
INTERACTION_CONSTRAINTS.SUMMARY_REFRESH_HOURS = 48 // 48 hours

// Use batch logging
await logInteractionBatch(userId, interactions)
```

## Testing

### Manual Testing Checklist

**Basic Tracking**:

- [ ] Opening modal logs 'view_modal'
- [ ] Adding to watchlist logs 'add_to_watchlist'
- [ ] Removing from watchlist logs 'remove_from_watchlist'
- [ ] Liking content logs 'like'
- [ ] Unliking content logs 'unlike'
- [ ] Hiding content logs 'hide_content'
- [ ] Unhiding content logs 'unhide_content'

**Summary Calculation**:

- [ ] Summary created after first interaction
- [ ] Genre preferences calculated correctly
- [ ] Scores reflect interaction weights
- [ ] Positive scores only (negative filtered out)
- [ ] Top content IDs tracked
- [ ] Summary auto-refreshes after 24h

**Analytics**:

- [ ] Total interactions counted correctly
- [ ] Interactions by type aggregated correctly
- [ ] Trailer engagement calculated (plays, duration)
- [ ] Recent interactions returned in order

**Privacy**:

- [ ] Guest users not tracked (current behavior)
- [ ] Authenticated users tracked
- [ ] Old interactions deleted after 90 days
- [ ] Tracking errors don't disrupt UX

### Test Scenarios

**Scenario 1: New User First Interaction**

```typescript
// Setup
const userId = 'new-user-123'
const content = { id: 123, media_type: 'movie', genre_ids: [28, 12] }

// Action
await trackInteraction.viewModal(content, 'home')

// Expected
// - Interaction logged with timestamp
// - Summary created with 1 interaction
// - Genre preferences: Action +1, Adventure +1
```

**Scenario 2: Heavy User**

```typescript
// Setup
const userId = 'heavy-user-456'
// User has 100+ interactions over 30 days

// Action
const analytics = await getInteractionAnalytics(userId)

// Expected
// - All 100+ interactions returned
// - Genre preferences sorted by score
// - Trailer engagement metrics accurate
```

**Scenario 3: Data Retention**

```typescript
// Setup
const userId = 'old-user-789'
// User has interactions from 100 days ago

// Action
await cleanupOldInteractions(userId, 90)

// Expected
// - Interactions >90 days deleted
// - Recent interactions (<90 days) retained
```

## Files Created/Modified

### New Files (Phase 7.1-7.3)

1. `types/interactions.ts` (187 lines) - Data types and weights
2. `utils/firestore/interactions.ts` (464 lines) - Firestore utilities
3. `hooks/useInteractionTracking.ts` (164 lines) - React hook
4. `docs/current/INTERACTION_TRACKING.md` (this file) - Documentation

### Modified Files

1. `components/modals/Modal.tsx` - Added view_modal tracking
2. `hooks/useUserData.ts` - Wrapped actions with tracking

**Total**: 3 new files, 2 modified files, ~900 new lines of code

## Related Features

- **Smart Recommendations** (Phase 4): Uses interaction data for genre-based recs
- **Auto-Updating Collections** (Phase 5): Can leverage interaction data (future)
- **Notification System** (Phase 3): Could notify based on interaction patterns (future)

## Support

For questions or issues with interaction tracking:

1. Check user is authenticated (tracking currently skips guests)
2. Verify Firestore rules allow writes to `/users/{userId}/interactions`
3. Check browser console for tracking errors
4. Ensure content has all required fields (id, media_type, genre_ids)
5. Review Firestore for actual interactions logged

## Changelog

**January 2025 - v1.0.0 (Phase 7.1-7.3)**

- ✅ Initial implementation
- ✅ 10 interaction types with weighted scoring
- ✅ Firestore logging and batch operations
- ✅ Automatic summary calculation (24h refresh)
- ✅ useInteractionTracking hook
- ✅ Integration into Modal component
- ✅ Integration into useUserData hook
- ✅ Analytics with trailer engagement
- ✅ 90-day data retention
- ✅ Privacy-first design

---

**Last Updated**: January 2025
**Phase**: 7.1-7.3 - User Interaction Tracking
**Status**: Complete
