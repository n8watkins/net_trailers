# Trending Notifications Implementation Plan

## Overview

Design a scalable system to notify users when content enters TMDB's trending lists. Since TMDB provides no webhooks, we use a polling + comparison approach.

## Current State

- ✅ `utils/trendingNotifications.ts` - comparison logic already exists
- ✅ `/api/movies/trending` and `/api/tv/trending` - TMDB endpoints
- ✅ `utils/firestore/notifications.ts` - notification CRUD operations
- ❌ No automated job to poll TMDB and generate notifications

## Architecture

### 1. Trending Snapshot Storage (Firestore)

Store trending snapshots to enable comparison:

```
/system/trending/
  - movies (document)
    - snapshot: Content[]
    - lastUpdated: timestamp
    - period: 'daily' | 'weekly'

  - tv (document)
    - snapshot: Content[]
    - lastUpdated: timestamp
    - period: 'daily' | 'weekly'
```

### 2. Cron Job Implementation

Create `/api/cron/update-trending` endpoint:

**Frequency:** Daily at 3 AM UTC (after TMDB updates)

**Process:**

1. Fetch current trending data from TMDB (movies + TV)
2. Load previous snapshot from Firestore
3. Compare using `compareTrendingContent()` from `trendingNotifications.ts`
4. For each new trending item:
    - Query users who have it in watchlist OR similar genre preferences
    - Create notifications for those users (max 5 new items per user)
5. Update snapshot in Firestore
6. Return stats (items processed, notifications created)

**Scalability Considerations:**

- Batch user queries (500 at a time)
- Use Firestore batch writes for notifications
- Implement user preference check (opt-in/opt-out)
- Rate limit: Don't spam same user with too many trending notifications

### 3. User Preference System

Add to user preferences:

```typescript
notificationPreferences: {
    trending: {
        enabled: boolean // default: true
        frequency: 'daily' | 'weekly' | 'off'
        onlyWatchlist: boolean // only notify for watchlist items
        maxPerDay: number // default: 3
    }
}
```

### 4. Intelligent Targeting (Phase 2)

Instead of notifying ALL users about every trending item:

**Option A: Watchlist-Based**

- Only notify users who have the trending content in their watchlist
- Query: `WHERE watchlist ARRAY_CONTAINS contentId`

**Option B: Genre Preference-Based**

- Use interaction tracking to determine user's top genres
- Only send trending notifications for content matching those genres
- Leverage existing `personalized recommendations` logic

**Option C: Hybrid (Recommended)**

- Watchlist items: Always notify (high relevance)
- Other trending: Only if genre matches user preferences
- Respect `maxPerDay` limit

### 5. Implementation Steps

#### Step 1: Create Trending Snapshot Schema

Create `utils/firestore/trendingSnapshots.ts`:

- `saveTrendingSnapshot(type, content)`
- `getTrendingSnapshot(type)`
- `compareTrendingSnapshots(type)`

#### Step 2: Create Cron Endpoint

Create `/api/cron/update-trending/route.ts`:

- Protected by CRON_SECRET
- Fetch trending from TMDB
- Load previous snapshot
- Compare and identify new items
- Generate notifications with targeting logic
- Update snapshot

#### Step 3: Add to vercel.json

```json
{
    "crons": [
        {
            "path": "/api/cron/update-trending",
            "schedule": "0 3 * * *"
        }
    ]
}
```

#### Step 4: User Preferences UI (Optional)

Add toggle in settings to enable/disable trending notifications.

### 6. Example Flow

**Day 1:**

- Cron runs at 3 AM UTC
- Fetches trending movies: [Movie A, Movie B, Movie C, ...]
- No previous snapshot exists
- Saves snapshot, no notifications (baseline)

**Day 2:**

- Cron runs at 3 AM UTC
- Fetches trending movies: [Movie A, Movie D, Movie E, ...]
- Compares to Day 1 snapshot
- Identifies new trending: [Movie D, Movie E]
- Queries users:
    - User 1 has Movie D in watchlist → send notification
    - User 2 has no connection to Movie D/E → skip
    - User 3 likes Action genre, Movie E is Action → send notification
- Creates notifications (respecting maxPerDay limit)
- Updates snapshot

**Result:**

- Only relevant users get notified
- Notifications are timely (within 24 hours of trending)
- No spam (limited to actual new trending items)

### 7. Scalability & Performance

**Database Impact:**

- 2 reads per cron run (movies + TV snapshots)
- 2 writes per cron run (update snapshots)
- N writes for notifications (where N = targeted users)

**TMDB API Impact:**

- 2 API calls per cron run (movies + TV trending)
- Well within 40 req/sec limit

**Firestore Queries:**
For 10,000 users:

- Watchlist queries: Fast (indexed by contentId)
- Genre preference queries: Use existing interaction data
- Batch processing: Process 500 users at a time

**Cost Estimate (10k users):**

- Reads: ~10,000 (user preference checks)
- Writes: ~500 (avg 5% of users get notifications)
- Total: ~$0.01 per day

### 8. Alternative: Event-Driven Architecture (Future)

Instead of polling TMDB, create a more reactive system:

1. User visits app → check cache timestamp
2. If cache > 24 hours old → fetch fresh trending
3. Compare with user's last seen trending
4. Show "New trending items since your last visit" badge
5. Optionally create notification

**Pros:**

- No cron job needed
- Per-user freshness
- Lower database writes

**Cons:**

- Only works for active users
- Multiple redundant TMDB API calls
- Inconsistent notification timing

**Verdict:** Stick with cron job approach for predictability.

## Recommended Implementation

### Minimal Viable Product (MVP)

1. Create trending snapshot storage in Firestore
2. Create `/api/cron/update-trending` endpoint
3. Use watchlist-based targeting only
4. Respect existing `notificationPreferences` system
5. Add cron job to vercel.json

### Phase 2 Enhancements

1. Add genre-based targeting
2. Implement per-user max notifications limit
3. Add UI preferences for trending notifications
4. Analytics: Track notification open rates

## Testing Strategy

1. **Manual Testing:**
    - Seed trending snapshot with known data
    - Run cron endpoint manually
    - Verify notifications created correctly

2. **Load Testing:**
    - Simulate 10k users with varying preferences
    - Measure execution time and cost

3. **Edge Cases:**
    - No previous snapshot (first run)
    - Empty trending list (TMDB API failure)
    - User with all notifications disabled
    - Very popular item (thousands of users notified)

## Open Questions

1. **Should we track dismissed trending notifications to avoid re-notifying?**
    - Recommendation: No, trending is time-sensitive. If user dismisses, respect it.

2. **What if 1000+ users have the same trending item in watchlist?**
    - Recommendation: Accept it. 1000 notifications is reasonable for truly trending content.
    - Alternative: Add global rate limit (e.g., max 5000 notifications per cron run)

3. **Weekly vs Daily trending?**
    - Recommendation: Start with weekly (more stable, fewer changes)
    - Can add daily as opt-in feature later

4. **Should we notify for content leaving trending?**
    - Recommendation: No. Only positive notifications (content entering trending)

## Conclusion

The polling + comparison approach is the most scalable solution given TMDB's API limitations. By using Firestore snapshots and intelligent targeting, we can deliver relevant trending notifications without spam.

**Next Steps:**

1. Implement `trendingSnapshots.ts` utility
2. Create cron endpoint
3. Test with subset of users
4. Monitor performance and adjust
