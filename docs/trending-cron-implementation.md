# Trending Notifications Cron Job - Implementation Guide

## File Structure

```
app/api/cron/update-trending/
  └── route.ts

utils/firestore/
  └── trendingSnapshots.ts (new file)

vercel.json (update)
```

## Implementation Files

### 1. `/utils/firestore/trendingSnapshots.ts`

```typescript
/**
 * Trending Snapshots Firestore Utility
 *
 * Manages trending content snapshots for comparison
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { Content } from '../../typings'

export interface TrendingSnapshot {
    snapshot: Content[]
    lastUpdated: number
    period: 'daily' | 'weekly'
}

/**
 * Get trending snapshot from Firestore
 */
export async function getTrendingSnapshot(type: 'movies' | 'tv'): Promise<TrendingSnapshot | null> {
    try {
        const docRef = doc(db, 'system', 'trending', type, 'current')
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            return docSnap.data() as TrendingSnapshot
        }

        return null
    } catch (error) {
        console.error(`Error fetching ${type} trending snapshot:`, error)
        return null
    }
}

/**
 * Save trending snapshot to Firestore
 */
export async function saveTrendingSnapshot(
    type: 'movies' | 'tv',
    content: Content[],
    period: 'daily' | 'weekly' = 'weekly'
): Promise<void> {
    try {
        const snapshot: TrendingSnapshot = {
            snapshot: content,
            lastUpdated: Date.now(),
            period,
        }

        const docRef = doc(db, 'system', 'trending', type, 'current')
        await setDoc(docRef, snapshot)

        console.log(`✅ Saved ${type} trending snapshot (${content.length} items)`)
    } catch (error) {
        console.error(`Error saving ${type} trending snapshot:`, error)
        throw error
    }
}
```

### 2. `/app/api/cron/update-trending/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getTrendingSnapshot, saveTrendingSnapshot } from '@/utils/firestore/trendingSnapshots'
import { compareTrendingContent } from '@/utils/trendingNotifications'
import { createNotification } from '@/utils/firestore/notifications'
import { Content, getTitle } from '@/typings'

// This endpoint should only be called by Vercel cron
export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const stats = {
            moviesProcessed: 0,
            tvProcessed: 0,
            notificationsCreated: 0,
            errors: [] as string[],
        }

        // Process Movies
        try {
            const movieStats = await processTrendingUpdate('movies')
            stats.moviesProcessed = movieStats.newItems
            stats.notificationsCreated += movieStats.notifications
        } catch (error) {
            const errorMsg = `Movies failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            stats.errors.push(errorMsg)
            console.error(errorMsg)
        }

        // Process TV Shows
        try {
            const tvStats = await processTrendingUpdate('tv')
            stats.tvProcessed = tvStats.newItems
            stats.notificationsCreated += tvStats.notifications
        } catch (error) {
            const errorMsg = `TV failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            stats.errors.push(errorMsg)
            console.error(errorMsg)
        }

        console.log('📊 Trending update complete:', stats)

        return NextResponse.json({
            success: true,
            stats,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('Trending update failed:', error)
        return NextResponse.json(
            {
                error: 'Failed to update trending notifications',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * Process trending updates for a specific media type
 */
async function processTrendingUpdate(
    type: 'movies' | 'tv'
): Promise<{ newItems: number; notifications: number }> {
    // 1. Fetch current trending from TMDB
    const endpoint = type === 'movies' ? `/api/movies/trending?page=1` : `/api/tv/trending?page=1`

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}${endpoint}`)

    if (!response.ok) {
        throw new Error(`Failed to fetch ${type} trending: ${response.statusText}`)
    }

    const data = await response.json()
    const currentTrending: Content[] = data.results || []

    // 2. Load previous snapshot
    const previousSnapshot = await getTrendingSnapshot(type)

    // 3. If no previous snapshot, save current and return (baseline)
    if (!previousSnapshot) {
        await saveTrendingSnapshot(type, currentTrending, 'weekly')
        console.log(`📸 Created baseline ${type} trending snapshot`)
        return { newItems: 0, notifications: 0 }
    }

    // 4. Compare snapshots
    const comparison = compareTrendingContent(previousSnapshot.snapshot, currentTrending)

    if (comparison.newTrendingItems.length === 0) {
        console.log(`✅ No new ${type} trending items`)
        return { newItems: 0, notifications: 0 }
    }

    console.log(`🆕 Found ${comparison.newTrendingItems.length} new ${type} trending items`)

    // 5. Create notifications for new trending items
    // For MVP: Notify all users (we'll add targeting in Phase 2)
    const notificationsCreated = await notifyUsersAboutTrending(comparison.newTrendingItems, type)

    // 6. Save updated snapshot
    await saveTrendingSnapshot(type, currentTrending, 'weekly')

    return {
        newItems: comparison.newTrendingItems.length,
        notifications: notificationsCreated,
    }
}

/**
 * Create trending notifications for users
 *
 * MVP: Notify all active users
 * Phase 2: Add targeting (watchlist, genre preferences)
 */
async function notifyUsersAboutTrending(
    newTrendingItems: Content[],
    type: 'movies' | 'tv'
): Promise<number> {
    // TODO: Query active users from Firestore
    // For MVP, you could:
    // 1. Query users who logged in within last 30 days
    // 2. Check their notification preferences
    // 3. Create notifications for eligible users

    // Placeholder implementation:
    // In production, replace this with actual user query

    const eligibleUsers: string[] = [] // TODO: Load from Firestore

    if (eligibleUsers.length === 0) {
        console.log('⏭️  No eligible users for trending notifications')
        return 0
    }

    let notificationsCreated = 0

    // Limit to top 3 new trending items to avoid spam
    const itemsToNotify = newTrendingItems.slice(0, 3)

    // Create notifications for each user (batched)
    const BATCH_SIZE = 100

    for (let i = 0; i < eligibleUsers.length; i += BATCH_SIZE) {
        const userBatch = eligibleUsers.slice(i, i + BATCH_SIZE)

        const notificationPromises = userBatch.flatMap((userId) =>
            itemsToNotify.map(async (content) => {
                try {
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
                        expiresIn: 7, // 7 days
                    })

                    notificationsCreated++
                } catch (error) {
                    console.error(`Failed to notify user ${userId}:`, error)
                }
            })
        )

        await Promise.all(notificationPromises)
    }

    console.log(`✅ Created ${notificationsCreated} trending notifications`)

    return notificationsCreated
}
```

### 3. Update `vercel.json`

```json
{
    "crons": [
        {
            "path": "/api/cron/update-collections",
            "schedule": "0 2 * * *"
        },
        {
            "path": "/api/cron/update-trending",
            "schedule": "0 3 * * *"
        }
    ]
}
```

## Firestore Security Rules

Add to `firestore.rules`:

```
// System-level trending snapshots (read-only for clients)
match /system/trending/{type}/{doc} {
  allow read: if true;
  allow write: if false; // Only server-side via Admin SDK
}
```

## Environment Variables

Ensure these are set in `.env.local` and Vercel:

```bash
CRON_SECRET=your-secret-here
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

## Testing

### Manual Test

```bash
# Test the endpoint locally
curl -X GET http://localhost:3000/api/cron/update-trending \
  -H "Authorization: Bearer your-cron-secret"
```

### Seed Initial Snapshot

```typescript
// Run once to create baseline snapshot
import { saveTrendingSnapshot } from '@/utils/firestore/trendingSnapshots'

// Fetch current trending
const movieResponse = await fetch('/api/movies/trending?page=1')
const movieData = await movieResponse.json()

// Save as baseline
await saveTrendingSnapshot('movies', movieData.results, 'weekly')

// Repeat for TV
const tvResponse = await fetch('/api/tv/trending?page=1')
const tvData = await tvResponse.json()
await saveTrendingSnapshot('tv', tvData.results, 'weekly')
```

## Monitoring

Log to console for Vercel logs:

```typescript
console.log('📊 Trending update stats:', {
    moviesProcessed: stats.moviesProcessed,
    tvProcessed: stats.tvProcessed,
    notificationsCreated: stats.notificationsCreated,
    duration: Date.now() - startTime,
})
```

## Cost Estimation

**Firestore Operations (per cron run):**

- 2 reads (movie + TV snapshots)
- 2 writes (update snapshots)
- N writes (notifications) where N = users × new items

**Example:**

- 1000 active users
- 3 new trending items
- = 3000 notification writes
- Cost: ~$0.006 per cron run (~$0.18/month)

**TMDB API:**

- 2 calls per cron run (well within limits)

## Future Enhancements

1. **User Targeting:**
    - Query users with watchlist items matching trending content
    - Use genre preferences from interaction tracking
    - Respect per-user notification limits

2. **Notification Preferences:**
    - Add UI toggle in settings
    - Store preference in user document
    - Check before creating notifications

3. **Analytics:**
    - Track notification open rates
    - A/B test notification copy
    - Optimize notification timing

4. **Rate Limiting:**
    - Max 3 trending notifications per user per day
    - Track in user document or separate collection
