# Notification System - Complete Guide

## 🎯 START HERE: MASTER-PLAN.md

**📖 [MASTER-PLAN.md](./MASTER-PLAN.md)** - Complete overview of all plans, implementation roadmap, and documentation references.

**Use this if:**

- You're another AI taking over this project
- You need the complete picture of what was planned
- You want to see implementation status and next steps
- You need to understand how all docs connect together

---

## 📚 Documentation Index

This directory contains all documentation for the notification and account limiting systems.

### Quick Start

1. **Want the complete plan?** → Read `MASTER-PLAN.md` (30 min) ⭐ **NEW**
2. **Want to understand costs?** → Read `COST-SUMMARY.md` (5 min read)
3. **Want to implement account limits?** → Read `account-limits-integration.md` (15 min)
4. **Want to implement trending notifications?** → Read `trending-cron-implementation.md` (30 min)
5. **Want full technical details?** → Read `costs-and-limits.md` (20 min)

---

## 📄 Document Overview

### MASTER-PLAN.md ⭐⭐⭐ MASTER REFERENCE

**Complete implementation plan with all documentation references**

- Executive summary of project goals
- Links to all 10 documentation files with context
- Complete implementation roadmap (Phases 0-4)
- Cost summary at different scales (10, 50, 1000 users)
- Security architecture overview
- Technical architecture diagrams
- Data models and schemas
- Testing strategy for all features
- Monitoring and alerting setup
- Troubleshooting guide
- Knowledge transfer for another AI/developer
- Quick start guide for immediate implementation

**Read if:** You need the complete picture or are taking over this project

---

### COST-SUMMARY.md ⭐ START HERE (for costs only)

**Quick reference guide for costs and protection**

- Cost breakdown for 10, 50, 100, 1000 users
- What you'll actually pay (spoiler: $0 for portfolio)
- When you'd need to worry
- Implementation priority checklist

**Read if:** You want a simple answer to "will this cost me money?"

---

### costs-and-limits.md

**Detailed cost analysis and anti-abuse strategy**

- Complete Firestore pricing breakdown
- Notification cost calculations
- Account limiting architecture
- IP-based rate limiting
- Security considerations
- Firebase budget alerts

**Read if:** You want to understand the full picture

---

### account-limits-integration.md ⭐ IMPLEMENTATION GUIDE

**Step-by-step guide to implement account limits**

- Code samples for integration
- Client-side vs server-side approaches
- Firestore security rules
- Admin dashboard setup
- Testing procedures

**Read if:** You're ready to implement the protection system

---

### trending-notifications-plan.md

**Architecture design for trending notifications**

- How TMDB trending works
- Polling vs webhook approach
- Firestore snapshot storage
- User targeting strategies
- Scalability analysis
- Cost projections

**Read if:** You want to understand the trending notification system design

---

### trending-cron-implementation.md

**Ready-to-use code for trending notifications**

- Complete cron job implementation
- API route code
- Firestore utilities
- vercel.json configuration
- Testing instructions

**Read if:** You're ready to implement trending notifications

---

## 🎯 What Problem Are We Solving?

### Problem 1: Notification Costs

**Issue:** Without limits, malicious users could create thousands of accounts and trigger expensive Firestore operations.

**Solution:** Hard-coded account limit (50 max) ensures costs stay at $0/month even if attacked.

**Files:**

- `utils/accountLimits.ts` - Core limiting logic
- `app/api/account-stats/route.ts` - Public stats endpoint

---

### Problem 2: TMDB Has No Webhooks

**Issue:** TMDB doesn't notify us when content becomes trending. We need to poll their API.

**Solution:** Daily cron job compares trending snapshots and creates notifications for new entries.

**Files:**

- `utils/firestore/trendingSnapshots.ts` - Snapshot storage
- `app/api/cron/update-trending/route.ts` - Cron job
- `utils/trendingNotifications.ts` - Comparison logic (already exists)

---

## 🚀 Implementation Status

### ✅ Completed (Seed Data Update)

- [x] Removed `collection_update` notifications from seed data
- [x] Removed `system` notifications from seed data
- [x] Replaced with working notification types

### ✅ Created (Account Limits)

- [x] `utils/accountLimits.ts` - Core functions
- [x] `app/api/account-stats/route.ts` - Stats endpoint
- [x] `utils/getClientIP.ts` - IP extraction helper

### 📝 Documentation Created

- [x] `COST-SUMMARY.md` - Quick reference
- [x] `costs-and-limits.md` - Detailed analysis
- [x] `account-limits-integration.md` - Implementation guide
- [x] `trending-notifications-plan.md` - Architecture design
- [x] `trending-cron-implementation.md` - Code samples

### ⏭️ Next Steps (Account Limits)

1. Add `NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS=50` to `.env.local`
2. Update Firestore security rules
3. Integrate into signup flow (choose Option A or B)
4. Add account stats to signup modal
5. Set up Firebase budget alerts

### ⏭️ Next Steps (Trending Notifications)

1. Create `utils/firestore/trendingSnapshots.ts`
2. Create `app/api/cron/update-trending/route.ts`
3. Update `vercel.json` with cron schedule
4. Seed initial trending snapshot
5. Test locally
6. Deploy to Vercel

---

## 📊 Current Notification Types

### Implemented ✅

| Type              | Description             | Frequency  | Triggered By       |
| ----------------- | ----------------------- | ---------- | ------------------ |
| `trending_update` | Content enters trending | Daily      | Cron job (pending) |
| `new_release`     | Watchlist item released | As happens | Manual/cron        |
| `share_activity`  | Collection shared       | As happens | User action        |

### Not Implemented ❌

| Type                | Status            | Reason              |
| ------------------- | ----------------- | ------------------- |
| `collection_update` | Removed from seed | Not implemented yet |
| `system`            | Removed from seed | Not implemented yet |

---

## 🔢 Cost Scenarios

### Your Portfolio (10 users)

```
Daily Operations:
- 32 reads, 62 writes, 10 deletes

Monthly Cost: $0 (0.31% of free tier)
```

### At Account Limit (50 users)

```
Daily Operations:
- 160 reads, 310 writes, 50 deletes

Monthly Cost: $0 (1.5% of free tier)
```

### If You Went Viral (1,000 users)

```
Daily Operations:
- 3,200 reads, 6,200 writes, 1,000 deletes

Monthly Cost: $0.38/month (still very cheap!)
```

### Bot Attack WITHOUT Limits

```
10,000 fake accounts × 3 notifications/day

Monthly Cost: $1.62/month ⚠️
```

### Bot Attack WITH Limits

```
Stopped at 50 accounts

Monthly Cost: $0 ✅
```

---

## 🛡️ Security Measures

### Layer 1: Hard Account Limit

```typescript
MAX_TOTAL_ACCOUNTS = 50
```

**Prevents:** Unlimited account creation

---

### Layer 2: IP Rate Limiting

```typescript
MAX_ACCOUNTS_PER_IP = 3 per 24 hours
```

**Prevents:** Single attacker creating many accounts

---

### Layer 3: Domain Rate Limiting

```typescript
MAX_ACCOUNTS_PER_DOMAIN = 5 per 7 days
```

**Prevents:** Temp email abuse

---

### Layer 4: Firestore Security Rules

```javascript
allow create: if false; // Only server can create notifications
```

**Prevents:** Users creating fake notifications

---

### Layer 5: Budget Alerts

```
Alert at $1.00 threshold
```

**Prevents:** Surprise charges from bugs

---

## 🎨 User Experience Features

### Account Stats Display

```
📊 Portfolio Demo Accounts
35/50 used
[████████░░] 70%

⚠️ Spots filling up fast!
```

### Signups Closed Message

```
🚫 Signups Closed

This portfolio project has reached its account limit (50 accounts).

Please contact the developer if you need a demo account.
```

### Trending Notifications

```
🔥 The Dark Knight is Trending!

The Dark Knight (Movie) just entered the trending list!

[View Movie] [Dismiss]
```

---

## 📈 Monitoring & Analytics

### Admin Dashboard (Optional)

Track:

- Total accounts created
- Accounts per IP (detect abuse)
- Firestore operation counts
- Estimated monthly costs
- Account creation timeline

### Firebase Console

Monitor:

- Real-time Firestore usage
- Auth user count
- Database size
- Function invocations (if using)

### Vercel Logs

Monitor:

- Cron job execution
- API errors
- Performance metrics

---

## 🧪 Testing Checklist

### Account Limits

- [ ] Try creating account when at limit → Should fail with message
- [ ] Try creating 4 accounts from same IP → 4th should fail
- [ ] Try using blocked email domain → Should fail
- [ ] Check account stats endpoint → Returns correct counts
- [ ] Verify Firestore logs being created

### Trending Notifications

- [ ] Run cron job manually → Should fetch trending
- [ ] Run twice → Should detect new items
- [ ] Check notifications created → Should appear in Firestore
- [ ] Verify user sees notifications → Check notification panel
- [ ] Test with no previous snapshot → Should create baseline

---

## 🆘 Troubleshooting

### "Account limit reached" but I have < 50 accounts

**Check:** Firestore `accountCreationLog` collection

**Fix:** Some old test accounts might not be deleted. Either:

1. Delete old logs from Firestore
2. Increase `MAX_TOTAL_ACCOUNTS` temporarily
3. Clear old guest accounts

---

### Trending notifications not being created

**Check:**

1. Cron job running? (Vercel cron logs)
2. CRON_SECRET correct? (Environment variables)
3. Trending snapshot exists? (Firestore `/system/trending`)
4. Users have notification preferences enabled?

**Fix:** Run cron job manually to test

---

### Costs unexpectedly high

**Check:**

1. Firebase Console usage tab
2. Account creation logs (bot attack?)
3. Notification count per user

**Fix:**

1. Reduce account limit
2. Disable trending notifications temporarily
3. Check for bugs in notification creation

---

## 🔗 External Resources

### Firestore Pricing

https://firebase.google.com/pricing

### TMDB API Docs

https://developer.themoviedb.org/docs

### Vercel Cron Jobs

https://vercel.com/docs/cron-jobs

### Next.js App Router

https://nextjs.org/docs/app

---

## 📞 Questions?

If you need help:

1. Check the detailed docs in this directory
2. Review the code comments in implementation files
3. Check Firebase Console for errors
4. Review Vercel deployment logs

---

## ✅ Final Checklist

### Before Deploying to Production

**Security:**

- [ ] Firestore security rules deployed
- [ ] Account limits implemented
- [ ] IP extraction working
- [ ] Firebase budget alerts set ($1 threshold)

**Features:**

- [ ] Account stats visible on signup
- [ ] Signups closed message at limit
- [ ] Trending notifications working (if implemented)
- [ ] Admin can monitor usage

**Testing:**

- [ ] Tested account limit enforcement
- [ ] Tested IP rate limiting
- [ ] Verified notification costs
- [ ] Confirmed Firestore within free tier

**Documentation:**

- [ ] README updated with account limits info
- [ ] Deployment notes include environment variables
- [ ] Team/recruiters know about account limit

---

**Ready to implement? Start with `account-limits-integration.md`**

**Questions about costs? Read `COST-SUMMARY.md`**

**Want trending notifications? Read `trending-cron-implementation.md`**
