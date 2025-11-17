# Master Plan: Notification System & Account Limits

**Date Created:** 2025-01-17
**Status:** Documentation Complete, Implementation Pending
**Project:** Net Trailers Portfolio
**Context:** Portfolio project with 10-50 expected users

---

## 📋 Executive Summary

This document serves as the master reference for the complete notification system and account limiting implementation. It was created to address two critical requirements:

1. **Prevent unexpected costs** from malicious account creation
2. **Design a scalable trending notification system** that works with TMDB's API limitations

All implementation plans, cost analyses, and technical decisions are documented across 9 comprehensive guides referenced below.

---

## 🎯 Project Goals

### Primary Objectives

1. **Account Security:** Limit account creation to prevent bot attacks and unexpected Firebase costs
2. **Trending Notifications:** Notify users when content enters TMDB's trending lists
3. **Cost Control:** Keep all Firebase/Resend costs at $0/month for portfolio scale (10-50 users)
4. **Scalability:** Design system that works efficiently from 10 to 1,000+ users

### Success Metrics

- ✅ Account creation limited to 50 max (configurable)
- ✅ IP rate limiting (3 accounts per IP per 24 hours)
- ✅ Trending notifications delivered within 6 hours of TMDB update
- ✅ Monthly costs remain $0 for 50 users
- ✅ System scales to 1,000 users for <$1/month

---

## 📚 Documentation Index

### 1. Cost & Security Documentation

#### **COST-SUMMARY.md** ⭐ START HERE

**Purpose:** Quick reference for costs and protection
**Read Time:** 5 minutes
**Use When:** Need fast answers about costs

**Key Content:**

- Cost breakdown for 10, 50, 100, 1000 users
- What you'll actually pay ($0 for portfolio)
- Account limiting protection benefits
- Implementation priority checklist

**Bottom Line:** $0/month for up to 100 users with all features

---

#### **costs-and-limits.md**

**Purpose:** Detailed cost analysis and anti-abuse strategy
**Read Time:** 20 minutes
**Use When:** Need comprehensive cost understanding

**Key Content:**

- Complete Firestore pricing breakdown
- Notification cost calculations per user
- Account limiting architecture design
- IP-based and domain-based rate limiting
- Firebase budget alerts setup
- Bot attack scenarios and mitigation

**Technical Details:**

- Daily free tier: 50K reads, 20K writes, 20K deletes
- Cost per 100K operations: $0.06 (reads), $0.18 (writes), $0.02 (deletes)
- Account limit prevents $1.62/month bot attack cost

---

### 2. Account Limiting Implementation

#### **account-limits-integration.md** ⭐ IMPLEMENTATION GUIDE

**Purpose:** Step-by-step guide to implement account limits
**Read Time:** 15 minutes
**Use When:** Ready to implement account protection

**Key Content:**

- Complete implementation instructions
- Client-side vs server-side approaches (2 options)
- Firestore security rules
- Environment variable configuration
- Admin dashboard setup
- Testing procedures

**Files to Create:**

- ✅ `utils/accountLimits.ts` - Already created
- ✅ `app/api/account-stats/route.ts` - Already created
- ✅ `utils/getClientIP.ts` - Already created
- ⏭️ Integration into signup flow (user's choice: Option A or B)
- ⏭️ Firestore security rules deployment

**Implementation Time:** ~1 hour

---

### 3. Trending Notifications - Architecture

#### **trending-notifications-plan.md**

**Purpose:** High-level architecture design for trending system
**Read Time:** 15 minutes
**Use When:** Need to understand overall system design

**Key Content:**

- Why TMDB has no webhooks (polling required)
- Firestore snapshot storage design
- User targeting strategies comparison
- Scalability analysis
- Cost projections at different scales
- MVP vs Phase 2 roadmap

**Key Decision:** Use polling + snapshot comparison approach

**Firestore Structure:**

```
/system/trending/
  - movies/current (snapshot)
  - tv/current (snapshot)
```

---

#### **trending-cron-implementation.md** ⭐ CODE SAMPLES

**Purpose:** Ready-to-use code for trending cron job
**Read Time:** 30 minutes
**Use When:** Ready to implement trending notifications

**Key Content:**

- Complete cron endpoint code
- Firestore utilities (`trendingSnapshots.ts`)
- vercel.json configuration
- Testing instructions
- Monitoring setup
- Cost estimation formulas

**Files to Create:**

- ⏭️ `utils/firestore/trendingSnapshots.ts`
- ⏭️ `app/api/cron/update-trending/route.ts`
- ⏭️ Update `vercel.json` with cron schedule

**Implementation Time:** ~2-3 hours

---

### 4. Trending Notifications - Detailed Flow

#### **trending-notification-flow.md** ⭐ COMPLETE WALKTHROUGH

**Purpose:** Step-by-step flow from TMDB to user notifications
**Read Time:** 25 minutes
**Use When:** Need detailed understanding of entire process

**Key Content:**

- Visual system architecture diagram
- 6 implementation phases with code examples
- Security checks and error handling
- User targeting strategies (4 options)
- Batched notification creation (100 users at a time)
- Real-world example scenarios
- Troubleshooting guide

**Phases Covered:**

1. Data Collection (TMDB API fetch)
2. Snapshot Comparison (detect changes)
3. User Targeting (watchlist/genre)
4. Notification Creation (batched)
5. Error Handling (comprehensive)
6. Testing & Validation

**Example Flow:**

```
Day 1 (3 AM): Fetch TMDB → Create baseline → No notifications
Day 2 (3 AM): Fetch TMDB → Compare snapshots → Find 3 new → Notify 15 users
User (9 AM): Opens app → Sees bell "2" → Views notifications → Clicks content
```

---

#### **trending-notification-decisions.md** ⭐ DECISION TREE

**Purpose:** Quick reference for implementation choices
**Read Time:** 15 minutes
**Use When:** Need to make specific implementation decisions

**Key Content:**

- Decision matrices for key choices
- When to run cron (recommendation: 3 AM UTC)
- Who to notify (4 strategies with pros/cons)
- How many items (recommendation: top 3)
- Notification copy options
- Error handling philosophy
- Success metrics and monitoring
- Pre-launch checklist

**Recommended Configuration:**

```typescript
const TRENDING_CONFIG = {
    schedule: '0 3 * * *', // Daily 3 AM UTC
    strategy: 'watchlist', // Start simple
    maxItemsToNotify: 3, // Top 3 trending
    maxNotificationsPerUser: 3, // Per day
    batchSize: 100, // Users per batch
    retryOnFailure: false, // Let next run handle it
}
```

---

### 5. Email Integration

#### **trending-email-integration.md**

**Purpose:** Plan for adding email notifications to trending
**Read Time:** 20 minutes
**Use When:** Ready to add email delivery channel

**Key Content:**

- Analysis of existing email infrastructure (Resend)
- `EmailService.sendTrendingContent()` already exists!
- Three email delivery strategies (instant, daily, weekly)
- Weekly digest already includes trending (no work needed!)
- Code snippets for instant email integration
- Resend cost analysis (free tier covers 100 emails/day)

**Email Options:**

- **Option 1:** Weekly digest (already working) - $0, 0 hours
- **Option 2:** Instant email (add to cron) - $0, ~1 hour
- **Option 3:** Daily digest (queue system) - $0, ~2-3 hours

**Resend Costs:**

```
Free tier: 100 emails/day
50 users × 3 items = 150 instant emails = Still $0/month!
```

**Current Status:**

- ✅ EmailService class exists
- ✅ Email templates exist
- ✅ User preferences UI exists
- ❌ Trending cron doesn't send emails yet

---

### 6. Master Documentation Index

#### **README-NOTIFICATIONS.md**

**Purpose:** Central hub for all notification documentation
**Read Time:** 10 minutes
**Use When:** Need overview of all docs

**Key Content:**

- Quick start guide
- Document summaries
- Implementation status
- Cost scenarios
- Security measures
- Troubleshooting guide
- Final checklist

---

## 🗺️ Implementation Roadmap

### Phase 0: Completed ✅

**Seed Data Updates**

- [x] Removed unimplemented notification types (`collection_update`, `system`)
- [x] Replaced with implemented types (`trending_update`, `new_release`, `share_activity`)
- [x] File: `utils/seedData.ts:1460-1523`

**Infrastructure Created**

- [x] Account limiting utilities (`utils/accountLimits.ts`)
- [x] Account stats API endpoint (`app/api/account-stats/route.ts`)
- [x] IP extraction helper (`utils/getClientIP.ts`)
- [x] 9 comprehensive documentation files

**Total Time Invested:** ~6 hours (documentation and foundation)

---

### Phase 1: Account Security (Priority: HIGH)

**Objective:** Prevent bot attacks and unexpected costs

**Tasks:**

1. [ ] Add `NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS=50` to `.env.local`
2. [ ] Update Firestore security rules (prevent client-side writes to `accountCreationLog`)
3. [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
4. [ ] Choose signup integration approach:
    - **Option A:** Client-side check (faster UX)
    - **Option B:** Server-side check (more secure) ✅ Recommended
5. [ ] Integrate `canCreateAccount()` into signup flow
6. [ ] Add account stats display to signup modal
7. [ ] Test account limit enforcement
8. [ ] Set Firebase budget alert ($1 threshold)

**Implementation Time:** ~1 hour
**Risk Level:** Low
**Cost Impact:** Prevents $1.62+/month bot attack costs

**Documentation Reference:**

- `account-limits-integration.md` - Complete implementation guide
- `COST-SUMMARY.md` - Cost savings breakdown

---

### Phase 2: Trending Notifications - MVP (Priority: MEDIUM)

**Objective:** Deliver trending notifications to users

**Tasks:**

1. [ ] Create `utils/firestore/trendingSnapshots.ts` (code in docs)
2. [ ] Create `app/api/cron/update-trending/route.ts` (code in docs)
3. [ ] Update `vercel.json` with cron schedule:
    ```json
    {
        "crons": [{ "path": "/api/cron/update-trending", "schedule": "0 3 * * *" }]
    }
    ```
4. [ ] Add `CRON_SECRET` to `.env.local` and Vercel
5. [ ] Seed initial trending baseline snapshot
6. [ ] Test locally by calling endpoint manually
7. [ ] Deploy to Vercel
8. [ ] Verify cron runs at 3 AM UTC (check logs next day)
9. [ ] Monitor Firestore costs (should remain $0)

**Implementation Time:** ~2-3 hours
**Risk Level:** Low
**Cost Impact:** $0 for 50 users, $0.02/month for 1,000 users

**User Targeting Strategy (MVP):** Watchlist-based (Strategy B)

- Highly relevant (user explicitly interested)
- Low notification volume (~15/day for 50 users)
- Simple to implement

**Documentation Reference:**

- `trending-cron-implementation.md` - Code samples
- `trending-notification-flow.md` - Complete flow
- `trending-notification-decisions.md` - Decision rationale

---

### Phase 3: Trending Email Integration (Priority: LOW - OPTIONAL)

**Objective:** Add email delivery channel for trending notifications

**Option A: Use Weekly Digest (Already Done)**

- [x] Weekly digest includes trending content
- [x] Users can enable email in settings
- No additional work required
- **Time:** 0 hours

**Option B: Add Instant Email (Recommended if implementing)**

- [ ] Check `emailDigest === 'instant'` in cron job
- [ ] Call `EmailService.sendTrendingContent()` for eligible users
- [ ] Add "Instant" option to settings UI
- [ ] Test with personal account
- **Time:** ~1 hour

**Option C: Add Daily Digest (Advanced)**

- [ ] Create `emailDigestQueue` Firestore collection
- [ ] Queue trending items in main cron
- [ ] Create `/api/cron/send-daily-digest` endpoint
- [ ] Add daily cron to `vercel.json`
- [ ] Update settings UI with "Daily" option
- **Time:** ~2-3 hours

**Documentation Reference:**

- `trending-email-integration.md` - Complete email integration plan

---

### Phase 4: Enhancements (Priority: FUTURE)

**Account Limits Enhancements:**

- [ ] Add admin dashboard (`/admin` page)
- [ ] Display account stats in footer
- [ ] Email domain blocking for temp mail services
- [ ] CAPTCHA on signup form (optional)

**Trending Enhancements:**

- [ ] Upgrade to hybrid user targeting (watchlist + genre)
- [ ] Add user preference UI for trending notifications
- [ ] Implement `maxPerDay` limit check
- [ ] Track notification open rates
- [ ] A/B test notification copy
- [ ] Add analytics dashboard

**Email Enhancements:**

- [ ] Timezone-aware email delivery
- [ ] Personalized send time preferences
- [ ] Email open rate tracking
- [ ] Unsubscribe link functionality

---

## 💰 Cost Summary

### Current Costs (0 users)

```
Firebase Auth:        $0/month
Firestore:            $0/month (no operations)
TMDB API:             $0/month (free tier)
Resend Email:         $0/month (free tier)
Vercel Hosting:       $0/month (hobby plan)
───────────────────────────────
TOTAL:                $0/month
```

### Projected Costs (50 users, all features)

**Firestore Operations (Daily):**

```
Trending cron:        2 reads, 2 writes (snapshots)
Notifications:        15 reads, 15 writes (watchlist-based)
User preference checks: 50 reads
Cleanup:              10 deletes
───────────────────────────────
Total:                67 reads, 17 writes, 10 deletes
Monthly:              2,010 reads, 510 writes, 300 deletes

Cost: $0 (0.5% of free tier)
```

**Resend Email (Optional):**

```
Instant emails:       150/day (50 users × 3 items)
Daily digest:         50/day
Weekly digest:        7/day
───────────────────────────────
All within 100 emails/day free tier

Cost: $0
```

**Total Monthly Cost (50 users):** $0

---

### Projected Costs (1,000 users, all features)

**Firestore Operations (Daily):**

```
Trending cron:        2 reads, 2 writes
Notifications:        300 reads, 300 writes (10% targeted)
User checks:          1,000 reads
Cleanup:              200 deletes
───────────────────────────────
Total:                1,302 reads, 302 writes, 200 deletes
Monthly:              39,060 reads, 9,060 writes, 6,000 deletes

Cost: $0.02/month
```

**Resend Email (Optional):**

```
If using instant emails: 3,000/day (exceeds free tier)
Need paid plan:       $20/month

Alternative: Use daily/weekly digest (stays free)
```

**Total Monthly Cost (1,000 users):**

- With instant emails: $20.02/month
- With digest emails: $0.02/month ✅

---

## 🔒 Security Architecture

### Multi-Layer Protection

```
Layer 1: Hard Account Limit
├─ MAX_TOTAL_ACCOUNTS = 50
├─ Global ceiling across all time
└─ Prevents unlimited account creation

Layer 2: IP Rate Limiting
├─ MAX_ACCOUNTS_PER_IP = 3 per 24 hours
├─ Blocks single attacker
└─ Firestore-based tracking

Layer 3: Domain Rate Limiting
├─ MAX_ACCOUNTS_PER_DOMAIN = 5 per 7 days
├─ Prevents temp email abuse
└─ Domain extraction and validation

Layer 4: Firestore Security Rules
├─ Client cannot write to accountCreationLog
├─ Client cannot create notifications
└─ Server-only operations via Admin SDK

Layer 5: Budget Alerts
├─ Firebase alert at $1 threshold
├─ Early warning system
└─ Email notification to admin
```

**Result:** Protected from bot attacks, cost overruns, and abuse

---

## 🏗️ Technical Architecture

### Trending Notification Flow

```
┌─────────────────────────────────────────────────────┐
│  Vercel Cron (Daily 3 AM UTC)                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Fetch TMDB Trending API                            │
│  • GET /trending/movie/week                         │
│  • GET /trending/tv/week                            │
│  • Returns ~20 items per type                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Load Previous Snapshot (Firestore)                 │
│  • /system/trending/movies/current                  │
│  • /system/trending/tv/current                      │
│  • Contains yesterday's trending                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Compare Snapshots                                  │
│  • utils/trendingNotifications.ts                   │
│  • compareTrendingContent(old, new)                 │
│  • Returns: newTrendingItems[], removedItems[]      │
└──────────────────┬──────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │ Found new items?      │
       └───────────┬───────────┘
                   │
         ┌─────────┴─────────┐
         │ YES               │ NO
         ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│ Target Users     │  │ Update Snapshot  │
│ (Watchlist/Genre)│  │ Exit             │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  Create Notifications (Batched)                     │
│  • Limit to top 3 new items                         │
│  • Batch 100 users at a time                        │
│  • Check user preferences                           │
│  • Create Firestore notification                    │
│  • Optionally send email (if enabled)               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Update Snapshot (Save for tomorrow)                │
│  • /system/trending/movies/current                  │
│  • /system/trending/tv/current                      │
│  • timestamp, period, snapshot                      │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Data Models

### Account Creation Log

```typescript
// /accountCreationLog/{logId}
interface AccountCreationLog {
    userId: string // Firebase Auth UID
    ipAddress: string // User's IP (x-forwarded-for)
    emailDomain: string // Extracted from email
    createdAt: number // Timestamp
    userAgent?: string // Browser info (optional)
}
```

### Trending Snapshot

```typescript
// /system/trending/{type}/current
interface TrendingSnapshot {
    snapshot: Content[] // Array of 20 trending items
    lastUpdated: number // Timestamp
    period: 'daily' | 'weekly'
}
```

### Notification

```typescript
// /users/{userId}/notifications/{notificationId}
interface Notification {
    id: string
    userId: string
    type: 'trending_update' | 'new_release' | 'share_activity'
    title: string
    message: string
    contentId?: number // TMDB content ID
    actionUrl?: string // Deep link
    imageUrl?: string // Poster URL
    isRead: boolean
    createdAt: number
    expiresAt?: number // Auto-delete timestamp
}
```

### User Preferences

```typescript
// /users/{userId}
interface NotificationPreferences {
    inApp: boolean
    email: boolean
    push: boolean
    types: {
        trending_update: boolean
        new_release: boolean
        share_activity: boolean
    }
    emailDigest: 'instant' | 'daily' | 'weekly' | 'never'
}
```

---

## 🧪 Testing Strategy

### Account Limits Testing

**Test 1: Hard Limit**

```bash
# Create 50 accounts manually
# Try to create 51st account
# Expected: Error "Account limit reached"
```

**Test 2: IP Rate Limit**

```bash
# Create 3 accounts from same IP within 24h
# Try to create 4th account from same IP
# Expected: Error "Too many accounts from this location"
```

**Test 3: Domain Limit**

```bash
# Create 5 accounts with @gmail.com within 7 days
# Try to create 6th @gmail.com account
# Expected: Error "Too many accounts with this domain"
```

**Test 4: Blocked Domains**

```bash
# Try to create account with @tempmail.com
# Expected: Error "Temporary email addresses not allowed"
```

---

### Trending Notifications Testing

**Test 1: Baseline Creation**

```bash
# Run cron for first time
curl -X GET http://localhost:3000/api/cron/update-trending \
  -H "Authorization: Bearer $CRON_SECRET"

# Expected:
# - Snapshot created in Firestore
# - 0 notifications created
# - Response: { newItems: 0 }
```

**Test 2: Change Detection**

```bash
# Manually modify snapshot in Firestore (remove one item)
# Run cron again
# Expected:
# - 1 new item detected
# - Notifications created for eligible users
# - Response: { newItems: 1, notifications: X }
```

**Test 3: User Targeting**

```bash
# Add test movie to user's watchlist
# Make that movie trending (modify snapshot)
# Run cron
# Expected:
# - User receives notification
# - Notification has correct content
```

**Test 4: Batching**

```bash
# Seed 200 eligible users
# Run cron with 3 new trending items
# Expected:
# - Users processed in batches of 100
# - All 600 notifications created (200 × 3)
# - No timeout errors
```

**Test 5: Error Handling**

```bash
# Disconnect Firestore
# Run cron
# Expected:
# - Graceful error handling
# - Movies fail, TV continues
# - Error logged, no crash
```

---

### Email Integration Testing

**Test 1: Weekly Digest (Already Works)**

```bash
# Enable email notifications in settings
# Wait for Sunday 6 PM
# Expected:
# - Weekly digest email received
# - Includes trending section
```

**Test 2: Instant Email (After Implementation)**

```bash
# Set emailDigest = 'instant'
# Run trending cron manually
# Expected:
# - In-app notification created
# - Email sent immediately
# - Email has correct content
```

---

## 🚨 Monitoring & Alerts

### Firebase Budget Alerts

**Setup:**

1. Go to Firebase Console → Project Settings → Usage and Billing
2. Click "Set budget alerts"
3. Configure alerts:
    - $1.00 threshold (warning)
    - $5.00 threshold (critical)
    - $10.00 threshold (hard cap)
4. Add admin email

**Expected Result:** Email notification before costs become significant

---

### Vercel Cron Monitoring

**View Logs:**

1. Vercel Dashboard → Project → Logs
2. Filter by `/api/cron/update-trending`
3. Look for:
    - "✅ Trending update complete"
    - Stats: `{ moviesProcessed, notificationsCreated }`
    - Errors: `{ errors: [...] }`

**Alert Conditions:**

- Cron hasn't run in 48 hours → Investigate
- Errors > 3 consecutive runs → Fix issue
- Duration > 30 seconds → Optimize queries

---

### Firestore Operation Monitoring

**Daily Checks:**

```bash
# Check Firestore Console → Usage tab
# Compare to free tier limits:
- Reads: Should be < 10,000/day (20% of free tier)
- Writes: Should be < 2,000/day (10% of free tier)
- Deletes: Should be < 1,000/day (5% of free tier)
```

**Red Flags:**

- Sudden spike in operations (bot attack?)
- Operations consistently above 50% of free tier
- Storage growing unexpectedly

---

## 🔧 Troubleshooting Guide

### "Notifications not being created"

**Check:**

1. Did cron run? → Vercel logs
2. Is CRON_SECRET correct? → .env.local and Vercel
3. Did TMDB API succeed? → Response status in logs
4. Were there new trending items? → Snapshot comparison result
5. Are users eligible? → Watchlist/preference checks

**Debug Command:**

```bash
curl -X GET https://your-app.vercel.app/api/cron/update-trending \
  -H "Authorization: Bearer $CRON_SECRET" \
  -v
```

---

### "Account limit reached but I have < 50 accounts"

**Check:**

1. Firestore Console → `accountCreationLog` collection
2. Count total documents
3. Possible causes:
    - Old test accounts not deleted
    - Guest accounts counted
    - Limit set too low in env

**Fix:**

```typescript
// Option A: Delete old logs
// Go to Firestore Console → accountCreationLog → Delete old entries

// Option B: Increase limit temporarily
// .env.local
NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS = 100
```

---

### "Costs unexpectedly high"

**Immediate Actions:**

1. Check Firebase Console → Usage tab
2. Identify which operation spiked (reads/writes/deletes)
3. Check Firestore Console for unusual data patterns
4. Review recent code changes

**Common Causes:**

- Infinite loop in notification creation
- Bot attack (if account limits not deployed)
- Bug in cleanup logic (deleting/recreating notifications)

**Emergency Response:**

```bash
# 1. Pause cron job (comment out in vercel.json)
# 2. Deploy updated vercel.json
# 3. Investigate root cause
# 4. Fix issue
# 5. Re-enable cron
```

---

## 📝 Implementation Checklist

### Pre-Implementation

- [ ] Review all documentation (estimated 2 hours reading)
- [ ] Understand cost implications
- [ ] Decide on user targeting strategy
- [ ] Choose email delivery option (or skip for now)
- [ ] Set up Firebase budget alerts

### Phase 1: Account Limits

- [ ] Add environment variables
- [ ] Update Firestore security rules
- [ ] Deploy security rules
- [ ] Integrate into signup flow
- [ ] Add account stats to UI
- [ ] Test limit enforcement
- [ ] Test IP rate limiting
- [ ] Monitor for 1 week

### Phase 2: Trending Notifications

- [ ] Create trendingSnapshots.ts utility
- [ ] Create update-trending cron endpoint
- [ ] Update vercel.json
- [ ] Add CRON_SECRET to environment
- [ ] Seed initial baseline snapshot
- [ ] Test locally
- [ ] Deploy to Vercel
- [ ] Verify first cron run (check logs next day)
- [ ] Monitor costs for 1 week
- [ ] Adjust based on user feedback

### Phase 3: Email Integration (Optional)

- [ ] Choose email strategy (instant/daily/weekly)
- [ ] Update notification preferences model
- [ ] Implement email sending logic
- [ ] Update settings UI
- [ ] Test with personal account
- [ ] Monitor Resend usage
- [ ] Collect user feedback

### Post-Implementation

- [ ] Document any deviations from plan
- [ ] Update this master plan if needed
- [ ] Monitor metrics for 1 month
- [ ] Optimize based on data
- [ ] Consider Phase 4 enhancements

---

## 🎓 Knowledge Transfer

### For Another AI/Developer Taking Over

**Context You Need:**

1. This is a portfolio project (10-50 expected users)
2. TMDB API has no webhooks (must poll)
3. Resend/Firebase have generous free tiers
4. Cost control is critical (prevent unexpected charges)
5. User experience matters (no spam notifications)

**Start Here:**

1. Read `COST-SUMMARY.md` (5 min) - Understand costs
2. Read `trending-notification-decisions.md` (15 min) - Understand decisions
3. Choose a phase from roadmap above
4. Follow relevant implementation guide
5. Test thoroughly before deploying
6. Monitor costs for 1 week after deployment

**Key Files:**

- `utils/accountLimits.ts` - Account limiting logic
- `utils/firestore/trendingSnapshots.ts` - Snapshot management (to create)
- `app/api/cron/update-trending/route.ts` - Main cron job (to create)
- `lib/email/email-service.ts` - Email sending (already exists)

**Critical Environment Variables:**

```bash
NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS=50
CRON_SECRET=<generate with openssl rand -hex 32>
RESEND_API_KEY=<from resend.com>
```

---

## 📞 Support & Questions

### Common Questions

**Q: Do I need to implement everything?**
A: No. Phases are prioritized. Account limits (Phase 1) recommended. Trending (Phase 2) optional.

**Q: What if costs exceed $0?**
A: Budget alerts will notify you. For 50 users, costs should stay $0. For 1000 users, expect $0.02-$1/month.

**Q: Can I use daily trending instead of weekly?**
A: Yes, but TMDB's "daily" trending is less stable. Weekly recommended for portfolio.

**Q: Should I implement email notifications?**
A: Only if users request it. Weekly digest already includes trending (already done).

**Q: What if TMDB API goes down?**
A: Cron will fail gracefully, log error, and retry next day. No data loss.

---

## 🔄 Document Maintenance

**Update This Document When:**

- Implementation status changes
- New phases added
- Costs change significantly
- New documentation created
- Major decisions made

**Last Updated:** 2025-01-17
**Next Review:** After Phase 1 implementation

---

## ✅ Quick Start Guide

**Want to implement RIGHT NOW?**

### 1. Account Limits (1 hour)

```bash
# Read: account-limits-integration.md
# Add: NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS=50 to .env.local
# Integrate: Choose Option B (server-side check)
# Test: Try creating 51 accounts
```

### 2. Trending Notifications (2-3 hours)

```bash
# Read: trending-cron-implementation.md
# Create: utils/firestore/trendingSnapshots.ts
# Create: app/api/cron/update-trending/route.ts
# Update: vercel.json with cron schedule
# Deploy: Vercel deployment
```

### 3. Email (Optional, 1 hour)

```bash
# Read: trending-email-integration.md
# Option A: Use weekly digest (already done) - 0 hours
# Option B: Add instant email - 1 hour
```

---

**Total Time to Full Implementation:** 4-5 hours

**Total Cost:** $0/month for up to 100 users

**Risk Level:** Low (all features optional, can rollback easily)

---

## 📚 All Documentation Files

1. **MASTER-PLAN.md** (this file) - Complete overview
2. **COST-SUMMARY.md** - Quick cost reference
3. **costs-and-limits.md** - Detailed cost analysis
4. **account-limits-integration.md** - Account limits implementation
5. **trending-notifications-plan.md** - Architecture overview
6. **trending-cron-implementation.md** - Code samples
7. **trending-notification-flow.md** - Step-by-step flow
8. **trending-notification-decisions.md** - Decision tree
9. **trending-email-integration.md** - Email integration
10. **README-NOTIFICATIONS.md** - Documentation index

**Total Documentation:** ~10,000 lines across 10 files

---

**END OF MASTER PLAN**
