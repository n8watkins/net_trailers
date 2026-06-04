# Phase 2: Feedback Loop Integration

**Status:** Complete (5/5 tasks)
**Completed:** 2025-11-28
**Version:** Recommendations V2.2

---

## Overview

Phase 2 adds a feedback tracking layer to the recommendation system, allowing it to learn from user interactions with recommended content. This complements Phase 1's deep history analysis by providing recommendation-specific signals.

**Key Capabilities:**

- Track user actions on recommended content (viewed, dismissed, hidden, liked, watchlisted)
- Exclude dismissed/hidden content from future recommendations
- Boost scores for content users engage with positively
- Calculate engagement metrics for analytics
- 30-day feedback window with automatic cleanup

---

## Architecture

### Data Flow

```
User Action (e.g., "Like" on recommended content)
    ↓
1. authStore.addLikedMovie() updates Firestore
    ↓
2. sessionStore syncs change
    ↓
3. RecommendedForYouRow detects change via useEffect
    ↓
4. useRecommendationFeedback hook logs feedback
    ↓
5. POST /api/recommendations/feedback
    ↓
6. Firestore: /recommendation_feedback/{feedbackId}
    ↓
[Feedback accumulates over 30 days]
    ↓
7. Next recommendation fetch:
   - POST /api/recommendations/personalized
   - Fetches last 30 days of feedback (500 entries max)
   - Processes signals (excludes, boosts, genre preferences)
   - Applies to recommendations before returning
```

### Components

**Frontend:**

- `hooks/useRecommendationFeedback.ts` - Feedback tracking hook
- `components/recommendations/RecommendedForYouRow.tsx` - Integrates tracking

**Backend:**

- `app/api/recommendations/feedback/route.ts` - POST/GET feedback API
- `app/api/recommendations/personalized/route.ts` - Enhanced with feedback integration
- `utils/recommendations/feedbackProcessor.ts` - Signal processing utilities

**Data:**

- Firestore collection: `/recommendation_feedback`
- 30-day TTL, indexed by userId + timestamp
- Immutable entries (no updates/deletes)

---

## Feedback Actions

### Action Types

| Action          | Type     | Weight | Description                         |
| --------------- | -------- | ------ | ----------------------------------- |
| `liked`         | Explicit | +10    | User clicked "Like" button          |
| `watchlisted`   | Explicit | +8     | User added to watchlist             |
| `dismissed`     | Explicit | -10    | User explicitly dismissed (exclude) |
| `hidden`        | Explicit | -10    | User hid content (exclude)          |
| `viewed`        | Implicit | +1     | Content visible for >3 seconds      |
| `scrolled_past` | Implicit | 0      | Content scrolled past (neutral)     |

### Tracking Implementation

**Explicit Actions:**
Detected by monitoring session data changes in RecommendedForYouRow component:

```typescript
useEffect(() => {
    const currentLikedIds = new Set(sessionData.likedMovies.map((c) => c.id))

    // Detect new likes
    for (const id of currentLikedIds) {
        if (!previousLikedIds.has(id)) {
            const rec = recommendations.find((r) => r.content.id === id)
            if (rec) {
                feedbackHook.trackLiked({
                    contentId: rec.content.id,
                    mediaType: rec.content.media_type,
                    page: contentPageMap.get(key) || 1,
                })
            }
        }
    }
}, [sessionData.likedMovies])
```

**Implicit Actions:**
Tracked automatically when recommendations load:

```typescript
// Track first 10 items as "viewed" after 3-second delay
useEffect(() => {
    recommendations.slice(0, 10).forEach((rec) => {
        setTimeout(() => {
            feedbackHook.trackViewed({
                contentId: rec.content.id,
                mediaType: rec.content.media_type,
                page: 1,
            })
        }, 3000) // MIN_VIEW_TIME_MS
    })
}, [recommendations])
```

---

## API Reference

### POST /api/recommendations/feedback

Log user feedback on recommended content.

**Authentication:** Required (Firebase ID token)

**Request Body:**

```json
{
    "contentId": 550,
    "mediaType": "movie",
    "action": "liked",
    "page": 1
}
```

**Response:**

```json
{
    "success": true,
    "feedback": {
        "id": "abc123xyz789",
        "userId": "user_123",
        "contentId": 550,
        "mediaType": "movie",
        "recommendationPage": 1,
        "feedbackType": "explicit",
        "action": "liked",
        "timestamp": 1732860000000,
        "source": "recommended_row"
    }
}
```

**Validation:**

- `contentId`: Required, integer
- `mediaType`: Required, "movie" or "tv"
- `action`: Required, one of 6 valid actions
- `page`: Required, integer 1-100

**Security:**

- User ID extracted from Firebase auth token (not trusted from client)
- Firestore rules validate userId matches request.auth.uid
- Client-side deduplication (60-second window)

---

### GET /api/recommendations/feedback

Fetch user's recent feedback entries.

**Authentication:** Required (Firebase ID token)

**Query Parameters:**

- `limit` (optional): Number of entries to return (default: 100, max: 500)

**Response:**

```json
{
    "success": true,
    "feedback": [
        {
            "id": "abc123",
            "userId": "user_123",
            "contentId": 550,
            "mediaType": "movie",
            "action": "liked",
            "timestamp": 1732860000000,
            ...
        }
    ],
    "count": 42
}
```

**Performance:**

- Query window: Last 30 days (RECENT_WINDOW_DAYS)
- Indexed query: userId + timestamp DESC
- Entry limit: 500 max

---

## Feedback Processing

### Signal Extraction

The `feedbackProcessor.ts` utility extracts actionable signals from feedback:

```typescript
interface FeedbackSignals {
    excludedContentIds: Set<number> // Dismissed/hidden
    positiveSignals: Map<number, number> // contentId -> boost score
    viewedContentIds: Set<number> // Viewed content
    positiveGenres: Map<number, number> // genreId -> count
    negativeGenres: Map<number, number> // genreId -> count
}
```

**Processing Logic:**

1. Iterate through all feedback entries
2. For dismissed/hidden: Add to excluded set, track negative genres
3. For liked/watchlisted: Calculate boost score, track positive genres
4. For viewed: Add to viewed set

### Application to Recommendations

**Filtering:**

```typescript
// Remove excluded content
filtered = content.filter((item) => !signals.excludedContentIds.has(item.id))
```

**Score Boosting:**

```typescript
// Apply boost to engaged content
filtered = filtered.map((item) => {
    const boost = signals.positiveSignals.get(item.id) || 0
    if (boost > 0) {
        return {
            ...item,
            vote_average: Math.min(10, item.vote_average + boost * 0.1),
        }
    }
    return item
})
```

### Engagement Metrics

```typescript
interface EngagementMetrics {
    totalShown: number // Unique content shown
    totalViewed: number // Unique content viewed
    totalEngaged: number // Unique content with explicit action
    viewRate: number // % viewed
    engagementRate: number // % engaged
}
```

**Example:**

- 100 recommendations shown
- 75 viewed (75% view rate)
- 25 engaged with (25% engagement rate)

---

## Integration with Recommendations API

### POST /api/recommendations/personalized

Enhanced in Phase 2 to fetch and apply feedback signals:

```typescript
// Fetch last 30 days of feedback
const feedbackSnapshot = await db
    .collection('recommendation_feedback')
    .where('userId', '==', userId)
    .where('timestamp', '>=', thirtyDaysAgo)
    .orderBy('timestamp', 'desc')
    .limit(500)
    .get()

// Process feedback
const feedbackSignals = processFeedback(feedback, contentGenreMap)

// Apply to recommendations
mergedContent = applyFeedbackToRecommendations(mergedContent, feedbackSignals)
```

**Response includes metrics:**

```json
{
    "success": true,
    "recommendations": [...],
    "feedback": {
        "enabled": true,
        "metrics": {
            "viewRate": 75.5,
            "engagementRate": 25.2
        },
        "excludedCount": 15,
        "boostedCount": 8
    }
}
```

---

## Firestore Schema

### Collection: recommendation_feedback

**Document Structure:**

```typescript
{
    id: string // nanoid(12)
    userId: string // Firebase user ID
    contentId: number // TMDB content ID
    mediaType: 'movie' | 'tv' // Media type
    recommendationPage: number // Page number (1-indexed)
    feedbackType: 'explicit' | 'implicit'
    action: FeedbackAction // One of 6 action types
    timestamp: number // Unix timestamp (ms)
    source: 'recommended_row' // Recommendation source
}
```

**Indexes:**

```json
{
    "collectionGroup": "recommendation_feedback",
    "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
    ]
}
```

**Security Rules:**

- Users can only read their own feedback
- Users can only create feedback with their own userId
- No updates or deletes (immutable entries)
- Full validation of data structure

**TTL:**

- Retention period: 90 days (RETENTION_DAYS)
- Query window: 30 days (RECENT_WINDOW_DAYS)
- Automatic cleanup via Firestore TTL policies

---

## Hook Usage

### useRecommendationFeedback

**Import:**

```typescript
import { useRecommendationFeedback } from '@/hooks/useRecommendationFeedback'
```

**API:**

```typescript
const {
    trackViewed,
    trackDismissed,
    trackHidden,
    trackLiked,
    trackWatchlisted,
    trackScrolledPast,
} = useRecommendationFeedback()
```

**Example:**

```typescript
// Track when user likes content
const handleLike = async (content: Content, page: number) => {
    await addLikedMovie(content)

    // Fire-and-forget feedback tracking
    trackLiked({
        contentId: content.id,
        mediaType: content.media_type as 'movie' | 'tv',
        page,
    })
}
```

**Features:**

- Fire-and-forget (doesn't block UI)
- Client-side deduplication (60-second window)
- Automatic cleanup of deduplication map
- No error handling needed (failures logged but don't throw)

---

## Performance Characteristics

### Client-Side

**Tracking Overhead:**

- Per action: ~5ms (deduplication check + fetch call initiation)
- No blocking (fire-and-forget pattern)
- Memory footprint: ~1KB per 10 entries in deduplication map

**Network:**

- Payload size: ~200 bytes per feedback entry
- No retry logic (fire-and-forget)
- No user-facing errors

### Server-Side

**Feedback API:**

- POST: ~50ms (write to Firestore)
- GET: ~100-200ms (indexed query, 500 entry limit)

**Recommendations API:**

- Feedback fetch: +50-100ms (indexed query)
- Signal processing: +10-20ms (500 entries)
- Total impact: +60-120ms to recommendation generation

**Firestore:**

- Indexed query (userId + timestamp): <50ms
- Write latency: <100ms
- Concurrent writes: No locking (independent documents)

---

## Configuration

### Constants

```typescript
// types/recommendations.ts
export const FEEDBACK_CONSTRAINTS = {
    RETENTION_DAYS: 90, // How long to keep feedback
    MIN_VIEW_TIME_MS: 3000, // Minimum time to count as "viewed"
    RECENT_WINDOW_DAYS: 30, // Query window for recent feedback
} as const
```

### Tuning Parameters

**Client-side:**

- Deduplication window: 60 seconds (hardcoded in hook)
- View tracking count: First 10 items (hardcoded in component)
- View delay: 3 seconds (FEEDBACK_CONSTRAINTS.MIN_VIEW_TIME_MS)

**Server-side:**

- Feedback fetch limit: 500 entries (hardcoded in API)
- Query window: 30 days (FEEDBACK_CONSTRAINTS.RECENT_WINDOW_DAYS)
- Max GET limit: 500 entries (hardcoded in API)

**Scoring:**

- Liked boost: +10 (hardcoded in feedbackProcessor)
- Watchlisted boost: +8 (hardcoded in feedbackProcessor)
- Viewed weight: +1 (hardcoded in feedbackProcessor)
- Boost multiplier: 0.1x vote_average (hardcoded in applyFeedback)

---

## Testing Recommendations

### Manual Testing

1. **Track liked content:**
    - Load recommendations
    - Like a recommended item
    - Check Firestore: `/recommendation_feedback` collection should have new entry
    - Refresh recommendations: liked item should have boosted score

2. **Track dismissed content:**
    - Dismiss a recommended item (hide it)
    - Check Firestore for feedback entry
    - Refresh recommendations: dismissed item should not appear

3. **View tracking:**
    - Load recommendations
    - Wait 3+ seconds
    - Check Firestore: First 10 items should have "viewed" entries

4. **Deduplication:**
    - Quickly like/unlike same item multiple times
    - Check Firestore: Should only see one entry (60s window)

### Automated Testing

**Unit Tests:**

```typescript
// feedbackProcessor.test.ts
describe('processFeedback', () => {
    it('excludes dismissed content', () => {
        const feedback = [
            { action: 'dismissed', contentId: 123, ... }
        ]
        const signals = processFeedback(feedback, contentGenreMap)
        expect(signals.excludedContentIds.has(123)).toBe(true)
    })
})
```

**Integration Tests:**

```typescript
// feedback-api.test.ts
describe('POST /api/recommendations/feedback', () => {
    it('requires authentication', async () => {
        const res = await fetch('/api/recommendations/feedback', {
            method: 'POST',
            body: JSON.stringify({ ... })
        })
        expect(res.status).toBe(401)
    })
})
```

---

## Known Limitations

1. **GET Pagination Not Enhanced**
    - Only POST (initial load) applies feedback signals
    - GET (infinite scroll) uses V1 logic
    - Users may see dismissed content on later pages
    - **Fix:** Extend feedback integration to GET handler

2. **Simplified View Tracking**
    - Tracks first 10 items with 3s delay
    - Doesn't use IntersectionObserver for actual visibility
    - May log items as "viewed" that user scrolled past
    - **Fix:** Implement IntersectionObserver-based tracking

3. **No User-Facing Confirmation**
    - Users don't see "We won't show this again" after dismiss
    - System learns silently without feedback
    - May reduce user confidence
    - **Fix:** Add toast notification on dismiss

4. **Potential Data Duplication**
    - Actions (liked, hidden, watchlisted) tracked in both:
        - Interaction system (`/users/{userId}/interactions`)
        - Feedback system (`/recommendation_feedback`)
    - Creates 2 Firestore writes per action
    - Different purposes justify duplication (broad vs recommendation-specific)

---

## Future Enhancements

### Planned (Phase 3-4)

1. **Collaborative Filtering** (Phase 3)
    - Find similar users based on feedback patterns
    - Recommend content popular with similar users
    - Reduces filter bubble effect

2. **Explicit Reason Generation** (Phase 4)
    - Show "Because you liked X" badges
    - Explain why content was recommended
    - Increases transparency and trust

### Potential Improvements

1. **Real-time Feedback Application**
    - Apply feedback immediately without refresh
    - Use optimistic updates for instant removal
    - WebSocket or Firestore listener for live updates

2. **Feedback Analytics Dashboard**
    - Show users their feedback history
    - Display engagement metrics over time
    - Allow manual preference adjustments

3. **A/B Testing Framework**
    - Test feedback effectiveness
    - Compare CTR with/without feedback
    - Measure recommendation quality improvements

4. **Server-Side View Tracking**
    - Move interaction summary to backend cron
    - Pre-generate summaries instead of on-demand
    - Eliminate client-side blocking

---

## Troubleshooting

### Issue: Feedback not appearing in Firestore

**Symptoms:**

- User actions tracked but no documents in `/recommendation_feedback`
- Console logs show "Skipping duplicate" messages

**Causes:**

- Client-side deduplication blocking writes (60s window)
- Authentication failing (user not logged in)
- Firestore rules rejecting writes

**Debug:**

```typescript
// Check auth state
console.log('Current user:', auth.currentUser?.uid)

// Check deduplication map
console.log('Recent feedback:', recentFeedback.current)

// Check Firestore rules
// Ensure userId matches request.auth.uid
```

### Issue: Dismissed content still appearing

**Symptoms:**

- User dismisses content but it shows up again
- Feedback entry exists in Firestore

**Causes:**

- GET pagination not applying feedback (known limitation)
- Feedback fetch failing silently
- Content has different ID/mediaType combination

**Debug:**

```typescript
// Check API response
const res = await fetch('/api/recommendations/personalized', { method: 'POST' })
const data = await res.json()
console.log('Excluded count:', data.feedback?.excludedCount)

// Check feedback signals
console.log('Excluded IDs:', feedbackSignals.excludedContentIds)
```

### Issue: Performance degradation

**Symptoms:**

- Recommendations taking >2 seconds to load
- High CPU usage on recommendation fetch

**Causes:**

- Feedback fetch not using index (missing composite index)
- Too many feedback entries (>1000)
- Interaction summary cache miss

**Debug:**

```typescript
// Check query performance in Firestore console
// Verify composite index exists for userId + timestamp

// Check feedback entry count
const snapshot = await db.collection('recommendation_feedback').where('userId', '==', userId).get()
console.log('Total feedback entries:', snapshot.size)
```

---

## Migration Guide

### From V1 to V2

No migration needed - Phase 2 is backward compatible.

**What happens:**

1. Users with no feedback: System works same as V1
2. Users start generating feedback: Gradually improves over time
3. No breaking changes to existing features

**Rollback:**

- Remove feedback processing from recommendations API
- Delete `/recommendation_feedback` collection
- System reverts to V1 behavior

---

## Changelog

### v2.2.0 (2025-11-28) - Phase 2 Complete

**Added:**

- Feedback tracking hook (`useRecommendationFeedback`)
- Feedback API endpoint (`/api/recommendations/feedback`)
- Feedback processor utility (`feedbackProcessor.ts`)
- Integration with RecommendedForYouRow component
- Firestore collection and security rules
- Composite index for feedback queries

**Changed:**

- Enhanced `/api/recommendations/personalized` with feedback integration
- Added engagement metrics to recommendation response

**Fixed:**

- Authentication integration (withAuth middleware)
- Feedback type classification (liked/watchlisted = explicit)
- Input validation (page number, action types)
- Firestore composite index deployment

**Known Issues:**

- GET pagination doesn't apply feedback (limitation)
- Simplified view tracking (first 10 items only)
- No user-facing dismiss confirmation

---

## References

- [Phase 2 Code Review](./PHASE_2_CODE_REVIEW.md)
- [Recommendations V2 Overview](./RECOMMENDATIONS_V2.md) _(if exists)_
- [Firestore Indexes](../firestore.indexes.json)
- [Firestore Security Rules](../firestore.rules)
