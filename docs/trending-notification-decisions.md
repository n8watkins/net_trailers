# Trending Notifications - Decision Tree & Quick Reference

## Quick Decision Guide

Use this guide to make key decisions when implementing trending notifications.

---

## 🎯 Decision 1: When Should the Cron Job Run?

### Options

| Option                   | Pros                                                                         | Cons                                                  | Recommendation     |
| ------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------ |
| **Hourly**               | Most up-to-date, catches changes quickly                                     | 24× more API calls, trending doesn't change that fast | ❌ Overkill        |
| **Daily at 3 AM UTC** ✅ | TMDB updates stabilize, low traffic time, users see notifications in morning | 24-hour delay between trending changes                | ✅ **Recommended** |
| **Daily at 12 PM UTC**   | Users online to see notifications immediately                                | Higher server load, TMDB may not be stable yet        | ⚠️ Alternative     |
| **Weekly**               | Minimal API calls, cost-effective                                            | Too slow, users miss trending content                 | ❌ Too infrequent  |

### Decision: Daily at 3 AM UTC

**Reasoning:**

- TMDB updates trending around midnight PST (8 AM UTC)
- 3 AM UTC gives ~5 hours for data to stabilize
- Users wake up to fresh notifications (better engagement)
- Low server load time (safe for errors)

---

## 🎯 Decision 2: Who Should Get Notifications?

### Strategy Matrix

```
User Targeting Strategy Selection
─────────────────────────────────────────────────────────────

                    Relevance     Implementation    Notification
Strategy            (1-10)        Complexity        Volume
─────────────────────────────────────────────────────────────
A. All Active Users    4              Low             High
   Pros: Simple, guaranteed delivery
   Cons: May feel spammy, low engagement

B. Watchlist Only      9              Medium          Low
   Pros: Highly relevant, user explicitly interested
   Cons: May miss opportunities, fewer notifications

C. Genre Match         6              High            Medium
   Pros: Discovers new content, leverages user data
   Cons: Requires genre preference calculation

D. Hybrid (B + C)      8              High            Medium
   Pros: Best balance of relevance and reach
   Cons: Most complex to implement
─────────────────────────────────────────────────────────────
```

### Recommended Progression

**Phase 1 (MVP):** Strategy B - Watchlist Only

- Easy to implement
- High user satisfaction
- Clear user intent

**Phase 2 (Growth):** Strategy D - Hybrid

- Add genre matching
- Discover new content for users
- Maintain high relevance

### Implementation Comparison

#### Strategy A: All Active Users

```typescript
// Simple query
const users = await getDocs(
    query(collection(db, 'users'), where('lastLoginAt', '>=', thirtyDaysAgo))
)

// Result: 50 users × 3 items = 150 notifications/day
```

#### Strategy B: Watchlist Only

```typescript
// For each trending item
const users = await getDocs(
    query(collection(db, 'users'), where('defaultWatchlist', 'array-contains', contentId))
)

// Result: ~5 users per item × 3 items = 15 notifications/day
```

#### Strategy D: Hybrid (Recommended for Production)

```typescript
// Priority 1: Watchlist
const watchlistUsers = await getWatchlistUsers(contentId)

// Priority 2: Genre match (if not in watchlist)
const genreUsers = await getGenreUsers(content.genre_ids)

// Combine and deduplicate
const eligibleUsers = [...new Set([...watchlistUsers, ...genreUsers])]

// Result: ~10 users per item × 3 items = 30 notifications/day
```

---

## 🎯 Decision 3: How Many Trending Items to Notify About?

### Analysis

| New Items    | User Fatigue | Relevance | Cost     | Recommendation      |
| ------------ | ------------ | --------- | -------- | ------------------- |
| All (~5-10)  | High 😫      | Low       | High     | ❌ Too many         |
| Top 5        | Medium 😐    | Medium    | Medium   | ⚠️ Still a lot      |
| **Top 3** ✅ | Low 😊       | High      | Low      | ✅ **Sweet spot**   |
| Top 1        | Very Low 🙂  | Very High | Very Low | ⚠️ Too conservative |

### Decision: Top 3

**Reasoning:**

```
Day's trending changes: 5 new items
├─ Item 1 (Most popular) ──────────> NOTIFY ✅
├─ Item 2 (Very popular) ──────────> NOTIFY ✅
├─ Item 3 (Popular) ───────────────> NOTIFY ✅
├─ Item 4 (Less popular) ──────────> SKIP
└─ Item 5 (Least popular) ─────────> SKIP
```

**User receives 3 notifications max per day:**

- Not overwhelming
- Focused on most significant changes
- High chance at least one is interesting
- Can adjust based on user feedback

---

## 🎯 Decision 4: What Should the Notification Say?

### Copy Options

#### Option A: Generic (Simple)

```
"The Dark Knight is Trending!"
"The Dark Knight just entered the trending list!"
```

**Pros:** Simple, works for all users
**Cons:** Not personalized, lower engagement

---

#### Option B: Context-Aware (Better) ✅

```
// If from watchlist
"The Dark Knight from your watchlist is now trending!"
"Your watchlist item The Dark Knight just started trending!"

// If from genre match
"The Dark Knight is trending - matches genres you love!"
"Trending now: The Dark Knight (Action, Drama, Crime)"
```

**Pros:** Personalized, explains why they got it
**Cons:** Slightly more complex

---

#### Option C: Urgency-Based (Advanced)

```
"🔥 The Dark Knight just hit #1 trending!"
"⏰ Everyone's watching The Dark Knight - join them!"
```

**Pros:** Creates FOMO, higher engagement
**Cons:** May feel pushy, not always accurate

### Recommended: Option B (Context-Aware)

**Implementation:**

```typescript
const message =
    eligibilityReason === 'watchlist'
        ? `${title} from your watchlist is now trending!`
        : `${title} is trending - matches your favorite genres!`
```

---

## 🎯 Decision 5: How to Handle Notification Preferences?

### User Preference Model

```typescript
interface TrendingNotificationPreferences {
    enabled: boolean // Master toggle
    frequency: 'daily' | 'weekly' // How often to receive
    maxPerDay: number // Limit (1-5)
    onlyWatchlist: boolean // Only notify for watchlist items
}
```

### Recommended Defaults

```typescript
const DEFAULT_PREFERENCES = {
    enabled: true, // Opt-in by default
    frequency: 'daily', // Match cron schedule
    maxPerDay: 3, // Aligns with top 3 strategy
    onlyWatchlist: false, // Allow genre matches too
}
```

### UI Implementation (Optional Phase 2)

```tsx
// In Settings page
<div className="setting-group">
    <h3>Trending Notifications</h3>

    <Toggle
        label="Enable trending notifications"
        checked={preferences.enabled}
        onChange={(enabled) => updatePreference('enabled', enabled)}
    />

    <Select
        label="Frequency"
        value={preferences.frequency}
        options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
        ]}
    />

    <Slider label="Max notifications per day" min={1} max={5} value={preferences.maxPerDay} />

    <Checkbox label="Only notify for watchlist items" checked={preferences.onlyWatchlist} />
</div>
```

---

## 🎯 Decision 6: What to Do When Errors Occur?

### Error Handling Strategy

```
Error Scenario Decision Tree
────────────────────────────────────────────────────────

TMDB API Fails
├─ Retry? NO
├─ Skip this run? YES
├─ Log error? YES
└─ Update snapshot? NO (keep old snapshot for next run)

Firestore Write Fails
├─ Retry notification? NO (avoid duplicates)
├─ Continue with other users? YES
├─ Log error? YES
└─ Mark as failed? YES (for monitoring)

User Query Fails
├─ Retry? NO
├─ Skip all notifications? NO
├─ Fallback to all users? NO (could spam)
└─ Log and continue? YES

Timeout (>10 seconds)
├─ Abort? YES
├─ Retry next run? YES
├─ Log timeout? YES
└─ Alert admin? If >3 consecutive timeouts
────────────────────────────────────────────────────────
```

### Retry Logic: When to Retry vs Skip

| Error Type           | Retry? | Reason                         |
| -------------------- | ------ | ------------------------------ |
| TMDB timeout         | ❌ No  | Will run again tomorrow        |
| TMDB rate limit      | ❌ No  | Rare, will resolve by next run |
| Firestore timeout    | ❌ No  | Prevents duplicates            |
| User not found       | ❌ No  | User deleted, skip them        |
| Invalid content data | ❌ No  | Data issue, log and skip       |
| Network error        | ❌ No  | Transient, retry tomorrow      |

**Philosophy:** Don't retry in cron jobs. Let next run handle it.

---

## 🎯 Decision 7: How to Monitor & Measure Success?

### Key Metrics to Track

```typescript
interface CronRunMetrics {
    // Operational metrics
    duration: number // How long did it take?
    tmdbApiCalls: number // API usage
    firestoreReads: number // Cost tracking
    firestoreWrites: number // Cost tracking

    // Business metrics
    newTrendingItemsFound: number // How many changes?
    notificationsCreated: number // Delivery volume
    usersNotified: number // Reach

    // Error metrics
    errors: string[] // What went wrong?
    skippedUsers: number // How many skipped?

    // Success metrics
    notificationOpenRate: number // Engagement (calculate separately)
    contentModalOpens: number // Action taken
}
```

### Success Criteria

**Week 1 (MVP Validation):**

- [ ] Cron runs successfully every day
- [ ] Zero critical errors
- [ ] At least 1 notification created when trending changes
- [ ] Users report seeing notifications in panel

**Week 2-4 (Optimization):**

- [ ] Open rate > 20% (1 in 5 notifications clicked)
- [ ] Action rate > 10% (user opens content modal)
- [ ] Zero user complaints about spam
- [ ] Firestore costs remain $0

**Month 2+ (Growth):**

- [ ] Open rate > 30%
- [ ] Positive user feedback
- [ ] Feature mentioned in user testimonials
- [ ] Consider adding more notification types

### Monitoring Dashboard (Optional)

```typescript
// Admin-only page: /admin/trending-stats

interface TrendingStats {
    last30Days: {
        runsCompleted: number
        averageDuration: number
        totalNotificationsSent: number
        averageOpenRate: number
        errorRate: number
    }

    lastRun: {
        timestamp: Date
        duration: number
        newItemsFound: number
        notificationsSent: number
        errors: string[]
    }
}
```

---

## 🚦 Implementation Roadmap

### Phase 1: MVP (Week 1)

- [ ] Implement cron endpoint
- [ ] Use Strategy B (Watchlist only)
- [ ] Top 3 trending items
- [ ] Basic error logging
- [ ] Manual testing

**Goal:** Prove the concept works

---

### Phase 2: Refinement (Week 2-3)

- [ ] Add user preferences check
- [ ] Implement maxPerDay limit
- [ ] Improve error handling
- [ ] Add monitoring metrics
- [ ] A/B test notification copy

**Goal:** Optimize for engagement

---

### Phase 3: Enhancement (Month 2)

- [ ] Add genre-based targeting (Strategy D)
- [ ] Add UI for preferences
- [ ] Track open rates
- [ ] Add analytics dashboard
- [ ] Consider weekly digest option

**Goal:** Scale and improve UX

---

## 🎯 Quick Reference: Recommended Configuration

```typescript
// Final recommended setup for 50-user portfolio

const TRENDING_CONFIG = {
    // Cron schedule
    schedule: '0 3 * * *', // Daily at 3 AM UTC

    // Targeting
    strategy: 'watchlist', // Start simple
    fallback: 'genre_match', // Phase 2

    // Limits
    maxItemsToNotify: 3, // Top 3 trending
    maxNotificationsPerUser: 3, // Per day
    batchSize: 100, // Users per batch

    // Timeouts
    tmdbTimeout: 10000, // 10 seconds
    firestoreTimeout: 5000, // 5 seconds

    // Retry
    retryOnFailure: false, // Let next run handle it

    // Preferences
    defaultEnabled: true, // Opt-in by default
    allowDisable: true, // Users can opt out

    // Monitoring
    logLevel: 'info', // Log all runs
    alertOnError: false, // Phase 2 (email alerts)
}
```

---

## ✅ Pre-Launch Checklist

Before enabling trending notifications:

**Technical:**

- [ ] Cron endpoint tested locally
- [ ] CRON_SECRET set in Vercel
- [ ] Firestore security rules deployed
- [ ] Baseline snapshot created
- [ ] Error handling tested

**User Experience:**

- [ ] Notification copy reviewed
- [ ] Bell icon shows unread count
- [ ] Clicking notification opens content
- [ ] Notification expiry set (7 days)
- [ ] Users can dismiss notifications

**Monitoring:**

- [ ] Vercel logs accessible
- [ ] Firebase budget alert set ($1)
- [ ] Can view notification count in Firestore
- [ ] Can manually trigger cron for testing

**Documentation:**

- [ ] README updated with cron info
- [ ] Team knows about new feature
- [ ] Rollback plan documented

---

## 🆘 Troubleshooting Quick Guide

### "Notifications not being created"

**Check:**

1. Did cron run? (Vercel logs)
2. Is CRON_SECRET correct?
3. Did TMDB API succeed?
4. Were there new trending items?
5. Are users eligible? (watchlist/preferences)

**Debug:**

```bash
curl -X GET https://your-app.vercel.app/api/cron/update-trending \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

### "Too many notifications"

**Immediate fix:**

- Reduce `maxItemsToNotify` from 3 to 1
- Change strategy from "all users" to "watchlist only"
- Add `maxPerDay` limit check

---

### "Costs higher than expected"

**Check Firestore Console:**

1. How many notifications created today?
2. How many users queried?
3. Are old notifications being cleaned up?

**Quick fix:**

- Reduce user targeting
- Increase expiration (delete sooner)
- Pause cron temporarily

---

**Next:** Ready to implement? See `docs/trending-cron-implementation.md` for code.
