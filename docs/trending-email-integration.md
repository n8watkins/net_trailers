# Email Notifications for Trending - Integration Plan

## Current State

### ✅ Already Implemented

You already have a complete email infrastructure:

**1. Resend API Integration** (`lib/email/resend.ts`)

- API key configured
- Ready to send emails

**2. EmailService Class** (`lib/email/email-service.ts`)

- ✅ `sendTrendingContent()` - Method already exists!
- ✅ `sendWeeklyDigest()` - Includes trending content
- ✅ `sendCollectionUpdate()` - Similar notification pattern
- ✅ `batchSend()` - Handles rate limiting (10 emails/batch, 1s delay)

**3. Email Templates** (`lib/email/templates/`)

- `TrendingContentEmail` component already exists
- React-based templates with branding

**4. User Preferences** (`components/settings/NotificationsSection.tsx`)

- ✅ Email toggle in settings UI
- ✅ Email digest frequency selector
- ✅ "Send Test Email" button

**5. Notification Preferences Model** (`types/notifications.ts`)

```typescript
interface NotificationPreferences {
    inApp: boolean // ✅ Implemented
    email: boolean // ✅ Infrastructure exists, not connected to trending
    push: boolean // ⏭️ Future
    emailDigest: 'instant' | 'daily' | 'weekly' | 'never'
    types: {
        trending_update: boolean
        // ...
    }
}
```

### ❌ Not Yet Connected

- Trending cron job doesn't send emails (only creates in-app notifications)
- Email preferences not checked in trending notification flow
- No daily/instant email option for trending (only weekly digest)

---

## Architecture: Two Notification Channels

```
┌─────────────────────────────────────────────────────────────────┐
│                  TRENDING NOTIFICATION SYSTEM                    │
└─────────────────────────────────────────────────────────────────┘

           ┌──────────────────────────────────┐
           │   Trending Cron Job (3 AM UTC)   │
           │   Finds 3 new trending items     │
           └────────────┬─────────────────────┘
                        │
                        ▼
           ┌──────────────────────────────────┐
           │   Query Eligible Users           │
           │   (Watchlist/Genre)              │
           └────────────┬─────────────────────┘
                        │
                        ▼
           ┌──────────────────────────────────┐
           │   Check User Preferences         │
           │   • inApp enabled?               │
           │   • email enabled?               │
           │   • emailDigest preference       │
           └────────────┬─────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
┌─────────────────────┐   ┌─────────────────────────┐
│  IN-APP Channel     │   │  EMAIL Channel          │
│                     │   │                         │
│  Create Firestore   │   │  • instant: Send now    │
│  notification       │   │  • daily: Queue for     │
│                     │   │    daily digest         │
│  User sees in       │   │  • weekly: Add to       │
│  bell icon          │   │    weekly digest        │
└─────────────────────┘   └─────────────────────────┘
```

---

## Strategy: Three Email Delivery Options

### Option 1: Instant Email (Real-Time)

**When:** Immediately when trending detected (3 AM UTC)

**Pros:**

- Timely notification
- Users get email right away
- Matches in-app notification timing

**Cons:**

- More emails sent (potential spam)
- Higher Resend costs
- May annoy users who check email at night

**Cost:** ~$0.001 per email (Resend pricing)

- 50 users × 3 items = 150 emails = $0.15/month

---

### Option 2: Daily Digest (Batched)

**When:** Once per day (e.g., 9 AM user's local time)

**Pros:**

- Single email per day
- Lower volume (less spam)
- Better email engagement
- Lower costs

**Cons:**

- Delay between detection and notification
- More complex (need to queue notifications)
- Requires timezone handling

**Cost:** ~$0.001 per email

- 50 users × 1 email/day = 50 emails = $0.05/month

---

### Option 3: Weekly Digest (Already Exists!)

**When:** Weekly (Sundays 6 PM)

**Pros:**

- ✅ Already implemented (`sendWeeklyDigest()`)
- Minimal email volume
- Comprehensive weekly summary
- Very low costs

**Cons:**

- 7-day delay (not really "trending" anymore)
- Lower urgency
- May miss time-sensitive content

**Cost:** ~$0.001 per email

- 50 users × 1 email/week = 50 emails = $0.012/month

---

## Recommended Approach: Dual Strategy

### Phase 1: Leverage Weekly Digest (No Code Change)

**What to do:**

- Trending notifications already flow to in-app (bell icon)
- Weekly digest email already includes trending section
- Users who enable email get trending in weekly summary

**Implementation:** ZERO work - already done!

**User flow:**

```
Monday 3 AM - Trending detected → In-app notification created
Sunday 6 PM - Weekly digest sent → Includes trending from past week
```

---

### Phase 2: Add Daily Digest Option

**What to add:**

- New preference: `emailDigest: 'daily'`
- New cron job: Daily at 9 AM user's timezone
- Queue trending notifications for daily send
- Send batch email with yesterday's trending

**Implementation:** ~2-3 hours

**User flow:**

```
Day 1, 3 AM - Trending detected → In-app notification + queue for email
Day 1, 9 AM - Daily digest sent → Yesterday's trending items
```

---

### Phase 3: Add Instant Email Option (Advanced)

**What to add:**

- Check `emailDigest === 'instant'` in cron job
- Send email immediately when trending detected
- Use existing `sendTrendingContent()` method

**Implementation:** ~1 hour (easiest but highest email volume)

**User flow:**

```
3 AM - Trending detected → In-app notification + instant email
```

---

## Implementation: Add Email to Trending Cron

### Modify `/api/cron/update-trending/route.ts`

```typescript
// Current: Only creates in-app notifications
await createNotification(userId, {
    type: 'trending_update',
    title: `${title} is Trending!`,
    message: `${title} (${mediaType}) just entered the trending list!`,
    // ...
})

// Enhanced: Also handle email
await notifyUserAboutTrending(userId, content, {
    inApp: true, // Create in-app notification
    email: true, // Check email preferences
})
```

### New Helper Function

```typescript
/**
 * Notify user about trending content via in-app and/or email
 */
async function notifyUserAboutTrending(
    userId: string,
    content: Content,
    channels: { inApp: boolean; email: boolean }
) {
    // Load user preferences
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) return

    const userData = userDoc.data()
    const prefs = userData.notificationPreferences || {}

    const title = getTitle(content)
    const mediaType = content.media_type === 'movie' ? 'Movie' : 'TV Show'

    // Channel 1: In-App Notification
    if (channels.inApp && prefs.inApp && prefs.types?.trending_update) {
        await createNotification(userId, {
            type: 'trending_update',
            title: `${title} is Trending!`,
            message: `${title} (${mediaType}) just entered the trending list!`,
            contentId: content.id,
            actionUrl: `/${content.media_type}/${content.id}`,
            imageUrl: content.poster_path
                ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
                : undefined,
            expiresIn: 7,
        })
    }

    // Channel 2: Email Notification (if instant email enabled)
    if (
        channels.email &&
        prefs.email &&
        prefs.emailDigest === 'instant' && // New option
        prefs.types?.trending_update
    ) {
        await EmailService.sendTrendingContent({
            to: userData.email,
            userName: userData.displayName || 'there',
            movies: content.media_type === 'movie' ? [content] : [],
            tvShows: content.media_type === 'tv' ? [content] : [],
        })
    }

    // Channel 3: Queue for Daily/Weekly Digest
    if (
        channels.email &&
        prefs.email &&
        ['daily', 'weekly'].includes(prefs.emailDigest) &&
        prefs.types?.trending_update
    ) {
        // Add to pending digest queue (Firestore collection)
        await queueForEmailDigest(userId, {
            type: 'trending_update',
            content,
            timestamp: Date.now(),
        })
    }
}
```

---

## Email Digest Queue (For Daily/Weekly)

### Firestore Structure

```typescript
// New collection: /users/{userId}/emailDigestQueue/{itemId}
interface DigestQueueItem {
    type: 'trending_update' | 'collection_update' | 'new_release'
    content?: Content
    metadata?: any
    timestamp: number
    includedInDigest?: boolean // Mark as sent
}
```

### Daily Digest Cron

```typescript
// New cron: /api/cron/send-daily-digest
// Runs daily at 9 AM (or user's preferred time)

export async function GET(request: NextRequest) {
    // Verify CRON_SECRET
    // ...

    // Query users with emailDigest === 'daily'
    const usersRef = collection(db, 'users')
    const q = query(
        usersRef,
        where('notificationPreferences.email', '==', true),
        where('notificationPreferences.emailDigest', '==', 'daily')
    )

    const snapshot = await getDocs(q)

    for (const userDoc of snapshot.docs) {
        const userId = userDoc.id
        const userData = userDoc.data()

        // Load queued items from yesterday
        const queuedItems = await getQueuedDigestItems(userId, 'daily')

        if (queuedItems.length === 0) continue

        // Group by type
        const trendingItems = queuedItems
            .filter((item) => item.type === 'trending_update')
            .map((item) => item.content)

        // Send email
        await EmailService.sendDailyDigest({
            to: userData.email,
            userName: userData.displayName,
            date: new Date().toLocaleDateString(),
            trendingContent: {
                movies: trendingItems.filter((c) => c.media_type === 'movie'),
                tvShows: trendingItems.filter((c) => c.media_type === 'tv'),
            },
            // ... other digest sections
        })

        // Mark items as sent
        await markDigestItemsAsSent(userId, queuedItems)
    }

    return NextResponse.json({ success: true })
}
```

---

## Cost Analysis: Email Options

### Resend Pricing

```
Free Tier:  100 emails/day
Paid:       $20/month for 50,000 emails ($0.001 per email after)
```

### Cost Comparison (50 Users)

| Option      | Emails/Day               | Emails/Month | Cost                      |
| ----------- | ------------------------ | ------------ | ------------------------- |
| **Instant** | 150 (3 items × 50 users) | 4,500        | **$0** (within free tier) |
| **Daily**   | 50 (1 email per user)    | 1,500        | **$0** (within free tier) |
| **Weekly**  | 7 (50 users ÷ 7 days)    | 200          | **$0** (within free tier) |

**Verdict:** Even with instant emails, you're well within Resend's free tier!

---

## Recommended Implementation Priority

### ✅ Now (Already Done)

- Weekly digest includes trending content
- Users can enable email notifications
- Test email button works

### 🔜 Phase 1 (Optional - 1 hour)

- Add instant email option to trending cron
- Check `emailDigest === 'instant'` preference
- Send email immediately when trending detected

### 📅 Phase 2 (Optional - 2-3 hours)

- Implement digest queue (Firestore collection)
- Create daily digest cron job
- Add `emailDigest: 'daily'` UI option
- Send consolidated daily email

### 🚀 Phase 3 (Future)

- Timezone-aware email delivery
- Personalized send time preferences
- A/B test email subject lines
- Track email open rates

---

## User Preference Model Updates

### Add to `types/notifications.ts`

```typescript
export interface NotificationPreferences {
    inApp: boolean
    email: boolean
    push: boolean

    types: {
        trending_update: boolean
        new_release: boolean
        collection_update: boolean
        share_activity: boolean
        system: boolean
    }

    // Enhanced email options
    emailDigest: 'instant' | 'daily' | 'weekly' | 'never'

    // New: Email timing preferences (Phase 3)
    emailTime?: {
        hour: number // 0-23 (e.g., 9 for 9 AM)
        timezone?: string // e.g., 'America/New_York'
    }
}
```

### Update Settings UI

```typescript
// In NotificationsSection.tsx
<Select
  label="Email Frequency"
  value={preferences.emailDigest}
  onChange={(value) => onNotificationsChange({ emailDigest: value })}
  options={[
    { value: 'instant', label: 'Instant (as it happens)' },
    { value: 'daily', label: 'Daily digest (9 AM)' },
    { value: 'weekly', label: 'Weekly digest (Sunday 6 PM)' },
    { value: 'never', label: 'Never' },
  ]}
/>
```

---

## Email Template: Trending Notification

### Instant Email (Single Item)

**Subject:** `🔥 The Dark Knight is Trending Now!`

```
Hi [UserName],

The Dark Knight just entered the trending list!

[Image of movie poster]

The Dark Knight (Movie)
Rating: 8.5/10

Why you're seeing this:
✓ It's in your watchlist

[Watch Now] [View Details]

---
This is a trending notification. You can adjust your
email preferences in Settings.

[Unsubscribe] [Manage Preferences]
```

### Daily Digest (Multiple Items)

**Subject:** `Your Daily Digest: 3 New Trending Items`

```
Hi [UserName],

Here's what's trending today:

MOVIES 🎬
• The Dark Knight (Action, Drama) - 8.5/10
• Fight Club (Drama, Thriller) - 8.4/10

TV SHOWS 📺
• Breaking Bad (Crime, Drama) - 8.9/10

[View All Trending]

---
OTHER UPDATES
• 2 new releases in your watchlist
• Marvel Universe collection updated (3 new items)

[View Dashboard]
```

---

## Implementation Code Snippets

### 1. Add to Trending Cron Job

```typescript
// In /api/cron/update-trending/route.ts

for (const content of newTrendingItems.slice(0, 3)) {
    const eligibleUsers = await getEligibleUsers(content)

    for (const userId of eligibleUsers) {
        // Create in-app notification + handle email
        await notifyUserAboutTrending(userId, content, {
            inApp: true,
            email: true, // Will check user preferences
        })
    }
}
```

### 2. Email Service Integration

```typescript
// Already exists in lib/email/email-service.ts!
EmailService.sendTrendingContent({
    to: user.email,
    userName: user.displayName,
    movies: [content], // If movie
    tvShows: [content], // If TV show
})
```

### 3. Check Email Preferences

```typescript
async function shouldSendEmail(
    userId: string,
    type: 'instant' | 'daily' | 'weekly'
): Promise<boolean> {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) return false

    const prefs = userDoc.data().notificationPreferences || {}

    // Check email enabled
    if (!prefs.email) return false

    // Check trending notifications enabled
    if (!prefs.types?.trending_update) return false

    // Check email frequency matches
    if (prefs.emailDigest !== type) return false

    return true
}
```

---

## Testing Plan

### Test Instant Email

```typescript
// In settings, enable:
// ✓ Email Notifications
// ✓ Trending Updates
// ✓ Email Digest: Instant

// Then manually trigger cron:
curl -X GET https://your-app.vercel.app/api/cron/update-trending \
  -H "Authorization: Bearer $CRON_SECRET"

// Check:
// 1. In-app notification created? ✓
// 2. Email received? ✓
// 3. Email has correct content? ✓
```

### Test Daily Digest

```typescript
// 1. Enable daily digest preference
// 2. Run trending cron (queues items)
// 3. Check Firestore emailDigestQueue collection
// 4. Run daily digest cron
// 5. Verify email sent
```

---

## Summary

### Current State

- ✅ Email infrastructure exists (Resend + templates)
- ✅ Weekly digest includes trending (already working!)
- ❌ Trending cron doesn't send emails yet

### Recommended Next Steps

**Option A: Use Weekly Digest (0 hours - already done)**

- Users get trending in weekly email
- No code changes needed
- Good for low email volume

**Option B: Add Instant Email (1 hour)**

```typescript
1. Check emailDigest === 'instant' in cron
2. Call EmailService.sendTrendingContent()
3. Update settings UI to show 'instant' option
4. Test with your account
```

**Option C: Add Daily Digest (2-3 hours)**

```typescript
1. Create emailDigestQueue collection
2. Queue trending items in main cron
3. Create /api/cron/send-daily-digest
4. Add cron schedule to vercel.json
5. Update settings UI
```

### Costs

- **In-app notifications:** $0 (Firestore free tier)
- **Email (Resend):** $0 for up to 100 emails/day
- **50 users, instant emails:** Still $0/month

---

**Bottom Line:** You already have everything needed for email notifications! Just need to connect the trending cron to the existing EmailService. The easiest path is Option B (instant emails) since all the infrastructure exists.

Want me to implement Option B (instant email for trending)?
