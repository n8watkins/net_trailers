# Trending Notifications - Complete Implementation Flow

## Overview

This document outlines the complete flow from fetching TMDB trending data to delivering notifications to users. It includes decision points, edge cases, and optimization strategies.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRENDING NOTIFICATION FLOW                   │
└─────────────────────────────────────────────────────────────────┘

   ┌──────────────┐
   │ Vercel Cron  │  Triggers daily at 3 AM UTC
   │   (Daily)    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  /api/cron/update-trending                                   │
   │                                                               │
   │  1. Verify CRON_SECRET                                       │
   │  2. Process Movies                                           │
   │  3. Process TV Shows                                         │
   │  4. Return stats                                             │
   └──────────────────────────────────────────────────────────────┘
          │
          ├─────────────────────────┬────────────────────────────┐
          ▼                         ▼                            ▼
   ┌─────────────┐          ┌─────────────┐           ┌─────────────┐
   │ Fetch TMDB  │          │ Load Previous│          │  Compare    │
   │  Trending   │──────────▶   Snapshot   │──────────▶  Snapshots  │
   │  (Movies)   │          │ (Firestore)  │          │   (Diff)    │
   └─────────────┘          └─────────────┘           └──────┬──────┘
                                                              │
                                                              ▼
                                                       ┌──────────────┐
                                                       │ New Trending │
                                                       │    Items?    │
                                                       └──────┬───────┘
                                                              │
                                            ┌─────────────────┼─────────────────┐
                                            │ YES             │                 │ NO
                                            ▼                 ▼                 ▼
                                     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                                     │ Target Users │  │ Update       │  │ Update       │
                                     │ (Query)      │  │ Snapshot     │  │ Snapshot     │
                                     └──────┬───────┘  └──────────────┘  └──────────────┘
                                            │
                                            ▼
                                     ┌──────────────────────────────────┐
                                     │  Create Notifications (Batched)  │
                                     │                                  │
                                     │  • Limit to top 3 new items      │
                                     │  • Batch users (100 at a time)   │
                                     │  • Respect preferences           │
                                     │  • Error handling per user       │
                                     └──────────────────────────────────┘
                                            │
                                            ▼
                                     ┌──────────────────────────────────┐
                                     │  Users See Notifications         │
                                     │                                  │
                                     │  • Bell icon shows unread count  │
                                     │  • Panel lists new notifications │
                                     │  • Click navigates to content    │
                                     └──────────────────────────────────┘
```

---

## Phase 1: Data Collection

### Step 1: Vercel Cron Triggers

**When:** Daily at 3 AM UTC (configurable)

**Why 3 AM UTC?**

- TMDB updates trending lists around midnight PST (8 AM UTC)
- 3 AM UTC gives buffer time for TMDB to stabilize
- Low user traffic time (minimal impact if errors occur)
- Consistent global timing

**Configuration:**

```json
// vercel.json
{
    "crons": [
        {
            "path": "/api/cron/update-trending",
            "schedule": "0 3 * * *" // Daily at 3 AM UTC
        }
    ]
}
```

---

### Step 2: Security Check

**Purpose:** Prevent unauthorized access to cron endpoint

```typescript
// /api/cron/update-trending/route.ts
export async function GET(request: NextRequest) {
    // Extract authorization header
    const authHeader = request.headers.get('authorization')

    // Verify secret matches
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn('⚠️ Unauthorized cron attempt:', {
            ip: getClientIP(request),
            timestamp: new Date().toISOString(),
        })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Continue with cron job...
}
```

**Security Notes:**

- CRON_SECRET should be a strong random value (generate with `openssl rand -hex 32`)
- Never expose in client-side code
- Rotate periodically (e.g., quarterly)
- Log unauthorized attempts for security monitoring

---

### Step 3: Fetch Trending from TMDB

**For Movies:**

```typescript
async function fetchMovieTrending(): Promise<Content[]> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const endpoint = '/api/movies/trending?page=1'

    const response = await fetch(`${baseUrl}${endpoint}`, {
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // TMDB returns { results: Content[], page: number, total_pages: number }
    return data.results || []
}
```

**For TV Shows:**

```typescript
async function fetchTVTrending(): Promise<Content[]> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const endpoint = '/api/tv/trending?page=1'

    const response = await fetch(`${baseUrl}${endpoint}`, {
        signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.results || []
}
```

**What We Get:**

TMDB returns ~20 trending items per media type:

```typescript
// Example response
{
  page: 1,
  results: [
    {
      id: 155,
      title: "The Dark Knight",
      poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
      backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
      vote_average: 8.5,
      release_date: "2008-07-16",
      genre_ids: [18, 28, 80, 53],
      media_type: "movie",
      // ... other fields
    },
    // ... 19 more items
  ],
  total_pages: 1,
  total_results: 20
}
```

**Important:**

- We only fetch page 1 (top 20 trending items)
- This is enough to detect significant changes
- Fetching multiple pages would be wasteful

---

## Phase 2: Snapshot Comparison

### Step 4: Load Previous Snapshot

**Purpose:** Compare current trending with yesterday's to find new entries

```typescript
// Firestore structure
/system/trending/movies/current
{
  snapshot: Content[],      // Array of 20 trending items
  lastUpdated: 1704326400000, // Timestamp
  period: 'weekly'            // 'daily' or 'weekly'
}
```

**Load Function:**

```typescript
async function getTrendingSnapshot(type: 'movies' | 'tv'): Promise<TrendingSnapshot | null> {
    try {
        const docRef = doc(db, 'system', 'trending', type, 'current')
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            const data = docSnap.data() as TrendingSnapshot

            // Validate snapshot age (don't use if > 7 days old)
            const now = Date.now()
            const age = now - data.lastUpdated
            const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

            if (age > maxAge) {
                console.warn(
                    `⚠️ Snapshot too old (${Math.floor(age / (24 * 60 * 60 * 1000))} days), creating fresh baseline`
                )
                return null
            }

            return data
        }

        // No snapshot exists (first run)
        return null
    } catch (error) {
        console.error(`Error fetching ${type} trending snapshot:`, error)
        return null
    }
}
```

---

### Step 5: Compare Snapshots

**Purpose:** Identify which items are newly trending

```typescript
// Uses existing utility: utils/trendingNotifications.ts
import { compareTrendingContent } from '@/utils/trendingNotifications'

const comparison = compareTrendingContent(
  previousSnapshot.snapshot,  // Yesterday's trending
  currentTrending             // Today's trending
)

// Returns:
{
  newTrendingItems: Content[],   // Items in current but not in previous
  removedItems: Content[],       // Items in previous but not in current
  totalChanges: number           // newTrendingItems.length + removedItems.length
}
```

**Example Scenario:**

```typescript
// Yesterday's trending (IDs only for clarity)
previousSnapshot = [155, 680, 238, 278, 27205, ...]  // 20 items

// Today's trending
currentTrending = [155, 680, 238, 550, 603, ...]     // 20 items
//                                 ^^^  ^^^
//                                 New entries!

// Comparison result
{
  newTrendingItems: [
    { id: 550, title: "Fight Club", ... },
    { id: 603, title: "The Matrix", ... }
  ],
  removedItems: [
    { id: 278, title: "The Shawshank Redemption", ... },
    { id: 27205, title: "Inception", ... }
  ],
  totalChanges: 4
}
```

**When No Previous Snapshot Exists (First Run):**

```typescript
if (!previousSnapshot) {
    // Save current as baseline, don't send notifications
    await saveTrendingSnapshot(type, currentTrending, 'weekly')
    console.log(`📸 Created baseline ${type} trending snapshot`)
    return { newItems: 0, notifications: 0 }
}
```

**When No Changes Detected:**

```typescript
if (comparison.newTrendingItems.length === 0) {
    console.log(`✅ No new ${type} trending items`)
    // Still update snapshot timestamp (for freshness tracking)
    await saveTrendingSnapshot(type, currentTrending, 'weekly')
    return { newItems: 0, notifications: 0 }
}
```

---

## Phase 3: User Targeting

### Step 6: Decide Who to Notify

**Three Strategies (in order of complexity):**

#### Strategy A: Notify ALL Active Users (Simplest - MVP)

```typescript
async function getEligibleUsers(): Promise<string[]> {
    // Query users who logged in within last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    const usersRef = collection(db, 'users')
    const q = query(
        usersRef,
        where('lastLoginAt', '>=', thirtyDaysAgo)
        // Optional: where('notificationPreferences.trending.enabled', '==', true)
    )

    const snapshot = await getDocs(q)
    const userIds: string[] = []

    snapshot.forEach((doc) => {
        userIds.push(doc.id)
    })

    return userIds
}
```

**Pros:**

- Simple to implement
- No complex queries
- Guaranteed to work

**Cons:**

- Less targeted (some users get irrelevant notifications)
- Higher notification volume
- May feel spammy to users

**Cost:** For 50 active users × 3 new trending items = 150 notifications/day

---

#### Strategy B: Watchlist-Based (Better - Recommended)

```typescript
async function getEligibleUsersForContent(contentId: number): Promise<string[]> {
    // Find users who have this content in their watchlist
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('defaultWatchlist', 'array-contains', contentId))

    const snapshot = await getDocs(q)
    const userIds: string[] = []

    snapshot.forEach((doc) => {
        userIds.push(doc.id)
    })

    return userIds
}

// Usage
for (const trendingItem of newTrendingItems) {
    const interestedUsers = await getEligibleUsersForContent(trendingItem.id)

    if (interestedUsers.length > 0) {
        console.log(`📢 Notifying ${interestedUsers.length} users about ${getTitle(trendingItem)}`)
        await createNotificationsForUsers(interestedUsers, trendingItem)
    }
}
```

**Pros:**

- Highly relevant (user explicitly added to watchlist)
- Lower notification volume
- Users more likely to engage

**Cons:**

- More complex query
- May miss users who'd be interested
- Requires indexed watchlist field

**Cost:** Depends on overlap between watchlists and trending

- Estimate: 5-10% of users per item = 2-5 users × 3 items = 6-15 notifications/day

---

#### Strategy C: Genre Preference-Based (Most Advanced)

```typescript
async function getEligibleUsersByGenre(content: Content): Promise<string[]> {
    // Extract genres from content
    const contentGenres = content.genre_ids || []

    // Query users who have interacted with these genres
    // This requires pre-calculated genre preferences (from interaction tracking)

    const usersRef = collection(db, 'users')
    const q = query(
        usersRef,
        where('topGenres', 'array-contains-any', contentGenres),
        where('lastLoginAt', '>=', Date.now() - 30 * 24 * 60 * 60 * 1000)
    )

    const snapshot = await getDocs(q)
    const userIds: string[] = []

    snapshot.forEach((doc) => {
        userIds.push(doc.id)
    })

    return userIds
}
```

**Pros:**

- Discovers new content for users
- Leverages existing interaction data
- Can notify more users than watchlist alone

**Cons:**

- Requires `topGenres` field in user documents
- More complex to maintain
- Needs periodic genre preference recalculation

**Cost:** Higher volume but still targeted

- Estimate: 20% of users per item = 10 users × 3 items = 30 notifications/day

---

#### Strategy D: Hybrid (Best User Experience)

```typescript
async function getEligibleUsersHybrid(
    content: Content
): Promise<{ userId: string; reason: 'watchlist' | 'genre' }[]> {
    const eligibleUsers: Map<string, 'watchlist' | 'genre'> = new Map()

    // Priority 1: Users with content in watchlist (always notify)
    const watchlistUsers = await getEligibleUsersForContent(content.id)
    watchlistUsers.forEach((userId) => {
        eligibleUsers.set(userId, 'watchlist')
    })

    // Priority 2: Users with matching genre preferences (if not already in watchlist)
    const genreUsers = await getEligibleUsersByGenre(content)
    genreUsers.forEach((userId) => {
        if (!eligibleUsers.has(userId)) {
            eligibleUsers.set(userId, 'genre')
        }
    })

    return Array.from(eligibleUsers.entries()).map(([userId, reason]) => ({
        userId,
        reason,
    }))
}
```

**Notification Copy by Reason:**

```typescript
const message =
    reason === 'watchlist'
        ? `${title} from your watchlist just entered the trending list!`
        : `${title} is trending - matches genres you love!`
```

---

### Step 7: Respect User Preferences

**Check Before Creating Notification:**

```typescript
async function shouldNotifyUser(userId: string, content: Content): Promise<boolean> {
    // Load user preferences
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) return false

    const userData = userDoc.data()

    // Check if trending notifications enabled
    const prefsEnabled = userData.notificationPreferences?.trending?.enabled ?? true
    if (!prefsEnabled) {
        console.log(`⏭️ User ${userId} has trending notifications disabled`)
        return false
    }

    // Check daily limit (prevent spam)
    const maxPerDay = userData.notificationPreferences?.trending?.maxPerDay ?? 3
    const todayNotifications = await getTodayNotificationCount(userId, 'trending_update')

    if (todayNotifications >= maxPerDay) {
        console.log(
            `⏭️ User ${userId} already received ${todayNotifications} trending notifications today`
        )
        return false
    }

    // Check if user has already been notified about this content
    const alreadyNotified = await hasBeenNotified(userId, content.id)
    if (alreadyNotified) {
        console.log(`⏭️ User ${userId} already notified about ${content.id}`)
        return false
    }

    return true
}
```

**Helper Functions:**

```typescript
async function getTodayNotificationCount(userId: string, type: NotificationType): Promise<number> {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const notificationsRef = collection(db, 'users', userId, 'notifications')
    const q = query(
        notificationsRef,
        where('type', '==', type),
        where('createdAt', '>=', startOfDay.getTime())
    )

    const snapshot = await getDocs(q)
    return snapshot.size
}

async function hasBeenNotified(userId: string, contentId: number): Promise<boolean> {
    const notificationsRef = collection(db, 'users', userId, 'notifications')
    const q = query(
        notificationsRef,
        where('type', '==', 'trending_update'),
        where('contentId', '==', contentId)
    )

    const snapshot = await getDocs(q)
    return !snapshot.empty
}
```

---

## Phase 4: Notification Creation

### Step 8: Limit Trending Items

**Don't notify about ALL new trending items - prioritize:**

```typescript
// Limit to top 3 new trending items
// These are most likely to be interesting (highest popularity)
const itemsToNotify = newTrendingItems.slice(0, 3)

console.log(`🔔 Will notify about ${itemsToNotify.length} new trending items:`)
itemsToNotify.forEach((item) => {
    console.log(`   - ${getTitle(item)} (ID: ${item.id})`)
})
```

**Why Limit to 3?**

- Prevents notification fatigue
- Focuses on most significant changes
- Reduces Firestore write costs
- Users more likely to engage with fewer notifications

---

### Step 9: Batch Notification Creation

**Process users in batches to avoid memory issues and timeouts:**

```typescript
async function createNotificationsForUsers(
    userIds: string[],
    content: Content,
    type: 'movies' | 'tv'
): Promise<number> {
    const BATCH_SIZE = 100 // Process 100 users at a time
    let notificationsCreated = 0

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const userBatch = userIds.slice(i, i + BATCH_SIZE)

        console.log(
            `   📤 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(userIds.length / BATCH_SIZE)}`
        )

        // Create notifications in parallel for this batch
        const notificationPromises = userBatch.map(async (userId) => {
            try {
                // Check preferences first
                const shouldNotify = await shouldNotifyUser(userId, content)
                if (!shouldNotify) return

                const title = getTitle(content)
                const mediaType = type === 'movies' ? 'Movie' : 'TV Show'

                await createNotification(userId, {
                    type: 'trending_update',
                    title: `${title} is Trending!`,
                    message: `${title} (${mediaType}) just entered the trending list!`,
                    contentId: content.id,
                    actionUrl: `/${type === 'movies' ? 'movie' : 'tv'}/${content.id}`,
                    imageUrl: content.poster_path
                        ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
                        : undefined,
                    expiresIn: 7, // Expire after 7 days
                })

                notificationsCreated++
            } catch (error) {
                console.error(`   ❌ Failed to notify user ${userId}:`, error)
                // Continue with other users even if one fails
            }
        })

        // Wait for this batch to complete before starting next
        await Promise.all(notificationPromises)

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < userIds.length) {
            await new Promise((resolve) => setTimeout(resolve, 100))
        }
    }

    return notificationsCreated
}
```

---

### Step 10: Update Snapshot

**Always update snapshot after processing (success or failure):**

```typescript
// Save updated snapshot
await saveTrendingSnapshot(type, currentTrending, 'weekly')

console.log(`✅ Updated ${type} trending snapshot`)
```

**Why Update Even on Failure?**

- Prevents getting stuck in error loop
- Ensures snapshot stays fresh
- Next run will compare against latest data
- Failed notifications can be retried separately if needed

---

## Phase 5: Error Handling & Monitoring

### Step 11: Comprehensive Error Handling

**Cron Job Level:**

```typescript
export async function GET(request: NextRequest) {
    const startTime = Date.now()

    try {
        const stats = {
            moviesProcessed: 0,
            tvProcessed: 0,
            notificationsCreated: 0,
            errors: [] as string[],
            duration: 0,
        }

        // Process Movies (isolated try-catch)
        try {
            const movieStats = await processTrendingUpdate('movies')
            stats.moviesProcessed = movieStats.newItems
            stats.notificationsCreated += movieStats.notifications
        } catch (error) {
            const errorMsg = `Movies failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            stats.errors.push(errorMsg)
            console.error('❌ Movie trending update failed:', error)
            // Continue with TV even if movies fail
        }

        // Process TV Shows (isolated try-catch)
        try {
            const tvStats = await processTrendingUpdate('tv')
            stats.tvProcessed = tvStats.newItems
            stats.notificationsCreated += tvStats.notifications
        } catch (error) {
            const errorMsg = `TV failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            stats.errors.push(errorMsg)
            console.error('❌ TV trending update failed:', error)
        }

        stats.duration = Date.now() - startTime

        console.log('📊 Trending update complete:', stats)

        return NextResponse.json({
            success: true,
            stats,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('💥 Critical trending update failure:', error)

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to update trending notifications',
                details: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime,
            },
            { status: 500 }
        )
    }
}
```

---

### Step 12: Monitoring & Logging

**What to Log:**

```typescript
// Start of cron
console.log('🚀 Trending notification cron started', {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
})

// TMDB fetch
console.log('📥 Fetching TMDB trending:', { type: 'movies' })

// Snapshot comparison
console.log('🔍 Comparing snapshots:', {
    previousCount: previousSnapshot?.snapshot.length,
    currentCount: currentTrending.length,
    newItems: comparison.newTrendingItems.length,
    removedItems: comparison.removedItems.length,
})

// User targeting
console.log('👥 Targeting users:', {
    totalEligible: eligibleUsers.length,
    byReason: {
        watchlist: eligibleUsers.filter((u) => u.reason === 'watchlist').length,
        genre: eligibleUsers.filter((u) => u.reason === 'genre').length,
    },
})

// Notification creation
console.log('📬 Creating notifications:', {
    contentId: content.id,
    contentTitle: getTitle(content),
    targetUsers: userIds.length,
})

// Completion
console.log('✅ Trending update complete:', {
    moviesProcessed: stats.moviesProcessed,
    tvProcessed: stats.tvProcessed,
    notificationsCreated: stats.notificationsCreated,
    errors: stats.errors,
    duration: `${stats.duration}ms`,
})
```

**View Logs in Vercel:**

```
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Logs" tab
4. Filter by "/api/cron/update-trending"
5. View cron execution logs
```

---

## Phase 6: Testing & Validation

### Step 13: Manual Testing

**Test Endpoint Locally:**

```bash
# Set environment variables
export CRON_SECRET="your-secret-here"
export NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Start dev server
npm run dev

# In another terminal, trigger cron manually
curl -X GET http://localhost:3000/api/cron/update-trending \
  -H "Authorization: Bearer your-secret-here"
```

**Expected Response:**

```json
{
    "success": true,
    "stats": {
        "moviesProcessed": 2,
        "tvProcessed": 1,
        "notificationsCreated": 15,
        "errors": [],
        "duration": 3421
    },
    "timestamp": "2024-01-15T03:00:00.000Z"
}
```

---

### Step 14: Seed Initial Baseline

**Before deploying, create initial snapshot:**

```typescript
// Run this once to create baseline (prevents notifications on first run)
async function seedTrendingBaseline() {
    const movieResponse = await fetch('/api/movies/trending?page=1')
    const movieData = await movieResponse.json()
    await saveTrendingSnapshot('movies', movieData.results, 'weekly')

    const tvResponse = await fetch('/api/tv/trending?page=1')
    const tvData = await tvResponse.json()
    await saveTrendingSnapshot('tv', tvData.results, 'weekly')

    console.log('✅ Baseline snapshots created')
}
```

**Or via CLI:**

```bash
# Create a seed script
node scripts/seed-trending-baseline.js
```

---

## Expected User Experience

### User Journey

**Day 1 (Baseline Creation):**

```
3:00 AM - Cron runs
3:01 AM - Fetches TMDB trending
3:01 AM - No previous snapshot exists
3:01 AM - Creates baseline snapshot
3:01 AM - No notifications sent ✅
```

**Day 2 (First Real Run):**

```
3:00 AM - Cron runs
3:01 AM - Fetches TMDB trending
3:01 AM - Loads yesterday's snapshot
3:01 AM - Finds 3 new trending items
3:02 AM - Queries eligible users
3:02 AM - Creates 15 notifications (5 users per item)
3:02 AM - Updates snapshot
```

**User at 9:00 AM:**

```
9:00 AM - User opens app
9:00 AM - Bell icon shows "3" unread
9:00 AM - User clicks bell
9:00 AM - Sees notifications:
          • "The Dark Knight is Trending!" (6h ago)
          • "Fight Club is Trending!" (6h ago)
          • "Inception is Trending!" (6h ago)
9:01 AM - User clicks "The Dark Knight"
9:01 AM - Modal opens with trailer auto-play
9:01 AM - Notification marked as read
```

---

## Cost Analysis

### Firestore Operations Per Run

**Assuming:**

- 3 new trending items
- 50 active users
- 10% have matching watchlists/genres
- = 5 users per item
- = 15 notifications total

**Operations:**

```
Reads:
- Load movie snapshot:           1 read
- Load TV snapshot:              1 read
- Query users (3 items × 50):    150 reads (100 users, check preferences)
- Total reads per day:           152 reads

Writes:
- Update movie snapshot:         1 write
- Update TV snapshot:            1 write
- Create notifications:          15 writes
- Total writes per day:          17 writes

Daily Cost: $0.00 (well within 50K reads, 20K writes free tier)
```

**Scaling:**

| Users | New Items | Notifications/Day | Reads/Day | Writes/Day | Monthly Cost |
| ----- | --------- | ----------------- | --------- | ---------- | ------------ |
| 10    | 3         | 3                 | 32        | 7          | $0           |
| 50    | 3         | 15                | 152       | 17         | $0           |
| 100   | 3         | 30                | 302       | 32         | $0           |
| 500   | 3         | 150               | 1,502     | 152        | $0.01        |
| 1,000 | 3         | 300               | 3,002     | 302        | $0.02        |

**Conclusion:** Even at 1,000 users, cost is negligible.

---

## Next Steps

1. **Implement Phase 1:**
    - ✅ Create `utils/firestore/trendingSnapshots.ts`
    - ✅ Create `/api/cron/update-trending/route.ts`
    - ✅ Update `vercel.json`

2. **Choose Targeting Strategy:**
    - Start with Strategy A (All Active Users) for MVP
    - Upgrade to Strategy B (Watchlist) once stable
    - Consider Strategy D (Hybrid) for best UX

3. **Test Locally:**
    - Seed baseline snapshot
    - Run cron manually
    - Verify notifications created
    - Check Firestore data

4. **Deploy & Monitor:**
    - Deploy to Vercel
    - Verify cron runs at 3 AM UTC
    - Check Vercel logs after first run
    - Monitor notification engagement

5. **Iterate:**
    - Adjust timing if needed
    - Fine-tune user targeting
    - Add notification preferences UI
    - Track open rates and adjust

---

## Decision Points Summary

| Decision               | Options                          | Recommendation                    |
| ---------------------- | -------------------------------- | --------------------------------- |
| **When to run?**       | Hourly / Daily / Weekly          | Daily at 3 AM UTC                 |
| **User targeting?**    | All / Watchlist / Genre / Hybrid | Start with Watchlist (Strategy B) |
| **How many items?**    | All new / Top 3 / Top 5          | Top 3 (prevents spam)             |
| **Notification copy?** | Generic / Personalized           | Personalized by targeting reason  |
| **Retry on failure?**  | Yes / No                         | No (wait for next run)            |
| **Batch size?**        | 50 / 100 / 500                   | 100 users (good balance)          |
| **Max per user/day?**  | 1 / 3 / 5 / Unlimited            | 3 (configurable in preferences)   |

---

**Ready to implement?** Start with `docs/trending-cron-implementation.md` for the actual code!
