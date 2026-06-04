# Trending Notifications Testing Guide

This guide explains how to test the trending notification system end-to-end.

## How Trending Notifications Work

### The Cron Job Logic

1. **Fetch Trending Content** from TMDB (movies and TV shows for the week)
2. **Compare** with the previous snapshot stored in Firestore
3. **Identify NEW trending items** that weren't trending before
4. **For each user:**
    - Skip if trending notifications are disabled in settings
    - Skip if user logged in **after** the last cron run (they already saw the trending data)
    - Check if any of their **watchlist items** are in the new trending list
    - Create notifications (max 3 per user) for matching items
5. **Update snapshot** for the next run

### User Must Meet ALL Criteria

For a user to receive notifications:

- ✅ Trending notifications enabled in settings (`notifications.types.trending_update = true`)
- ✅ Last login was **before** the last cron run
- ✅ At least one watchlist item is in the **NEW** trending items

## Testing Scenarios

### Scenario 1: User WILL Receive Notifications

```typescript
{
  trendingNotificationsEnabled: true,  // ✅ Opted in
  lastLoginAt: 7 days ago,             // ✅ Hasn't logged in recently
  watchlist: [                         // ✅ Items that might be trending
    { id: 603, media_type: 'movie', title: 'The Matrix' },
    { id: 550, media_type: 'movie', title: 'Fight Club' }
  ]
}
```

**Expected:** IF The Matrix or Fight Club become newly trending, user gets notified.

### Scenario 2: User WILL NOT Receive (Opted Out)

```typescript
{
  trendingNotificationsEnabled: false, // ❌ Disabled in settings
  lastLoginAt: 7 days ago,
  watchlist: [...popular movies...]
}
```

**Expected:** No notifications (user opted out).

### Scenario 3: User WILL NOT Receive (Logged In Recently)

```typescript
{
  trendingNotificationsEnabled: true,
  lastLoginAt: 30 minutes ago,         // ❌ Recently active
  watchlist: [...popular movies...]
}
```

**Expected:** No notifications (user already saw trending data in the UI).

### Scenario 4: User WILL NOT Receive (No Matches)

```typescript
{
  trendingNotificationsEnabled: true,
  lastLoginAt: 7 days ago,
  watchlist: [                         // ❌ Obscure items unlikely to trend
    { id: 12345, media_type: 'movie', title: 'Unknown Indie Film' }
  ]
}
```

**Expected:** No notifications (watchlist items aren't trending).

## Running the Test

### Full Test with Verification

```bash
npm run test:trending-notifications
```

This will:

1. Display expected behavior for each test user
2. Create 4 test users with different scenarios
3. Run the cron job
4. Verify notifications were created correctly
5. Explain why each user did/didn't receive notifications

**Example Output:**

```
Expected Behavior
========================================

User 1: test1@trending.local
  Watchlist: The Matrix, The Godfather, Fight Club
  Trending notifications: ENABLED
  Last login: 11/23/2025 (7 days ago)
  → WILL receive notifications (if watchlist items are trending)

User 2: test2@trending.local
  Watchlist: Breaking Bad, Game of Thrones, Arcane
  Trending notifications: ENABLED
  Last login: 11/27/2025 (3 days ago)
  → WILL receive notifications (if watchlist items are trending)

User 3: test3@trending.local
  Watchlist: The Dark Knight, Pulp Fiction
  Trending notifications: DISABLED
  Last login: 11/23/2025 (7 days ago)
  → WILL NOT receive notifications (opted out)

User 4: test4@trending.local
  Watchlist: The Shawshank Redemption, Schindler's List
  Trending notifications: ENABLED
  Last login: 11/30/2025 (0 days ago)
  → WILL NOT receive notifications (logged in recently)

...

Results:
  - New trending items found: 2
  - Notifications created: 0

Verifying Notifications
========================================

Checking user: test1@trending.local
  - Notifications found: 0
  ℹ No notifications (no watchlist items are trending)
```

### Cleanup Test Data

```bash
npm run test:trending-notifications -- --cleanup
```

Deletes all test users and their notifications from Firestore.

## Why You Might Not See Notifications

### 1. No NEW Trending Items

The cron job only notifies about **newly trending** items. If you run it twice in a row:

- First run: Finds 20 new items, creates notifications ✅
- Second run: Finds 0 new items (snapshot already updated) ❌

**Solution:** Wait 24 hours for TMDB trending data to refresh, or manually reset the snapshot.

### 2. Watchlist Items Aren't Trending

The test users' watchlist items (The Matrix, Breaking Bad, etc.) might not be in the current week's trending list.

**Solutions:**

- Check what's actually trending: Visit https://www.themoviedb.org/trending
- Update test users' watchlists with current trending items
- Force trending items by modifying the test script

### 3. Previous Cron Run Was Recent

If the last cron run was less than an hour ago, and you haven't logged out/in:

- User 4 (logged in 30 min ago) will be skipped
- Cron timestamp prevents duplicate notifications

**Solution:** Manually update `lastLoginAt` to be older, or wait longer.

## Advanced Testing: Force Notifications

If you want to **guarantee** notifications for testing, modify the test script:

### Option 1: Use Current Trending Items

1. Visit https://www.themoviedb.org/trending
2. Find the TMDB IDs of currently trending movies/shows
3. Update test users' watchlists in `test-trending-notifications.ts`:

```typescript
watchlist: [
    { id: 927149, media_type: 'movie', title: 'Wicked' }, // Actually trending
    { id: 558449, media_type: 'movie', title: 'Gladiator II' },
]
```

### Option 2: Reset the Snapshot

Delete the Firestore trending snapshot to force all items to be "new":

```bash
# Using Firebase Console
# Navigate to: /system/trending
# Delete the document
```

Then all trending items will be considered "new" on the next run.

### Option 3: Demo Mode (Admin Only)

Demo mode forces the cron job to always find new items:

```bash
curl -H "Authorization: Bearer YOUR_FIREBASE_ADMIN_TOKEN" \
  http://localhost:3000/api/cron/update-trending?demo=true
```

Requires a valid Firebase Auth ID token from an admin user.

## Inspecting Results in Firestore

After running the test, check Firestore directly:

### User Documents

Path: `/users/{userId}`

```json
{
  "email": "test1@trending.local",
  "watchlist": [...],
  "notifications": {
    "types": {
      "trending_update": true
    }
  },
  "lastLoginAt": 1732374092000
}
```

### Notifications Subcollection

Path: `/users/{userId}/notifications/{notificationId}`

```json
{
    "type": "trending_update",
    "title": "Now Trending!",
    "message": "The Matrix is trending this week",
    "contentId": 603,
    "mediaType": "movie",
    "imageUrl": "https://image.tmdb.org/t/p/w92/...",
    "isRead": false,
    "createdAt": 1732456892000,
    "expiresAt": 1735048892000
}
```

### Trending Snapshot

Path: `/system/trending`

```json
{
  "moviesSnapshot": [...],  // All movies from last TMDB fetch
  "tvSnapshot": [...],      // All TV shows from last TMDB fetch
  "lastRun": 1732456892000,
  "lastNewItems": 2,
  "totalNotifications": 5
}
```

## Understanding the Test Output

### Green ✓ Messages

- User created successfully
- Cron job completed successfully
- Notifications found and displayed

### Yellow ℹ Messages

- Explains why a user didn't receive notifications
- Common reasons:
    - User opted out
    - User logged in recently
    - No watchlist items are trending

### Cyan Messages

- Informational details about users, watchlists, settings

## Troubleshooting

### "No notifications created" but users meet criteria

**Cause:** None of the test users' watchlist items are in the NEW trending list.

**Fix:** Either:

1. Wait for TMDB trending data to change (updates weekly)
2. Modify test users' watchlists to include current trending items
3. Reset the Firestore snapshot

### "Notifications found: 0" for all users

**Possible causes:**

1. **No new trending items** - Cron found 0 new items (check output: "New trending items found: 0")
2. **Watchlist mismatch** - None of the watchlist items match new trending items
3. **Firestore write delay** - Notifications not yet propagated (script waits 2 seconds, might need more)

### Cron job returns 0 new items every time

**Cause:** The snapshot was already updated by a previous run.

**Fix:** Delete `/system/trending` document in Firestore, then run again.

### Test users persist after testing

**Fix:** Run cleanup command:

```bash
npm run test:trending-notifications -- --cleanup
```

## Real-World Usage Patterns

In production:

- Cron runs **daily at 2 AM UTC**
- TMDB updates trending data **weekly**
- Only users who haven't logged in since last run get notified
- Notifications expire after **30 days**
- Users can disable trending notifications in settings

## Related Files

- `/app/api/cron/update-trending/route.ts` - Cron job implementation
- `/scripts/test-trending-notifications.ts` - Test script
- `/utils/trendingComparison.ts` - Logic to compare trending snapshots
- `/components/notifications/NotificationPanel.tsx` - UI for viewing notifications
