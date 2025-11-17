# 💰 Cost Summary - Quick Reference

## TL;DR

**For 10 users (your portfolio): $0/month**

**For 50 users (max limit): $0/month**

**For 1,000 users (way beyond portfolio): $0.38/month**

---

## Firestore Free Tier (Per Day)

```
✅ 50,000 reads
✅ 20,000 writes
✅ 20,000 deletes
✅ 1 GB storage

This resets EVERY DAY
```

## Your Actual Usage (10 Active Users)

### Daily Usage

```
Reads:   ~32 reads/day    (0.06% of free tier)
Writes:  ~62 writes/day   (0.31% of free tier)
Deletes: ~10 deletes/day  (0.05% of free tier)

Status: ✅ COMPLETELY FREE
```

### Monthly Usage (30 days)

```
Reads:   960 reads/month
Writes:  1,860 writes/month
Deletes: 300 deletes/month

Cost: $0.00 (well within free tier)
```

## Firestore Cost Calculator

```
Cost per 100,000 operations:
- Reads:   $0.06
- Writes:  $0.18
- Deletes: $0.02
```

**Your monthly operations (10 users):**

```
960 reads   = $0.0006
1,860 writes = $0.0033
300 deletes  = $0.0001

TOTAL: $0.004/month (still free because < $0.01 minimum charge)
```

## When Would You Actually Pay?

### Scenario 1: Bot Attack Creates 10,000 Accounts

**WITHOUT LIMITS:**

```
10,000 users × 3 notifications/day × 30 days = 900,000 writes
Cost: $1.62/month
```

**WITH LIMITS (50 account max):**

```
50 users × 3 notifications/day × 30 days = 4,500 writes
Cost: $0.00 (within free tier)
```

**Savings: $1.62/month** ✅

### Scenario 2: 100 Real Users Sign Up

```
100 users × 6 writes/day × 30 days = 18,000 writes/month
Cost: $0.00 (within 20,000/day free tier)
```

**Still free!** ✅

### Scenario 3: 1,000 Users (Viral Success)

```
1,000 users × 6 writes/day × 30 days = 180,000 writes/month
Cost: $0.32/month

Total monthly cost including reads: $0.38/month
```

**Still incredibly cheap** ✅

## Other Service Costs

### Firebase Auth

```
Email/Password: FREE
Google OAuth:   FREE
Phone Auth:     $0.06 per verification (optional)
```

### TMDB API

```
Requests: UNLIMITED (with 40/sec rate limit)
Cost:     FREE
```

### Vercel Hosting

```
Hobby Plan:  FREE
Pro Plan:    $20/month (only if you need)
```

### Domain (Optional)

```
.com:  ~$12/year
.dev:  ~$12/year
```

## Account Limiting Protection

### What We're Protecting Against

| Scenario                     | Without Limits | With Limits (50 max) |
| ---------------------------- | -------------- | -------------------- |
| Normal usage (10 users)      | $0/month       | $0/month             |
| Bot attack (10,000 accounts) | $1.62/month    | $0/month ✅          |
| Notification spam bug        | $5+/month      | $0/month ✅          |
| Viral traffic (1,000 users)  | $0.38/month    | $0/month ✅          |

### Implementation Cost

```
Time to implement:  ~1 hour
Lines of code:      ~300
Additional dependencies: 0
Runtime overhead:   <50ms per signup
```

## Firebase Budget Alerts (Recommended)

Set these up in Firebase Console:

```
Alert 1: $1.00 threshold
Alert 2: $5.00 threshold
Alert 3: $10.00 threshold (hard cap)
```

**Why?**

- You'll be notified BEFORE costs become significant
- Gives you time to investigate issues
- Peace of mind for portfolio projects

## Cost Comparison: Other Services

### If You Used MongoDB Atlas Instead

```
Free Tier: 512 MB storage, shared cluster
Beyond free: $9/month (M2 cluster)

Your usage: Could fit in free tier initially
Long-term: Would need paid plan ($9-25/month)
```

### If You Used Supabase Instead

```
Free Tier: 500 MB database, 2 GB bandwidth
Beyond free: $25/month (Pro plan)

Your usage: Could fit in free tier
Long-term: Might hit bandwidth limits
```

### Firestore Advantage

```
Free Tier: More generous operations limit
Scaling: Pay only for what you use
No sudden jumps from $0 to $9 or $25
Perfect for portfolio projects
```

## Monthly Cost Projections

| Users | Firestore | Vercel | TMDB | Total/Month |
| ----- | --------- | ------ | ---- | ----------- |
| 10    | $0        | $0     | $0   | **$0**      |
| 50    | $0        | $0     | $0   | **$0**      |
| 100   | $0        | $0     | $0   | **$0**      |
| 500   | $0.18     | $0     | $0   | **$0.18**   |
| 1,000 | $0.38     | $0     | $0   | **$0.38**   |

_\*Excludes optional domain ($1/month) and optional email service_

## Bottom Line

### For Your Portfolio (10-50 users)

```
💰 COST: $0/month

✅ Firebase: Free tier more than enough
✅ TMDB API: Completely free
✅ Vercel: Hobby plan covers it
✅ Account limits: Extra protection at no cost

Total investment: $0 + ~1 hour setup time
```

### Recommendations

1. ✅ **Implement account limits** - Takes 1 hour, prevents all risk
2. ✅ **Set Firebase budget alert at $1** - You'll never be surprised
3. ✅ **Start with 50 account max** - Can increase later if needed
4. ⏭️ **Don't worry about costs** - Free tier is VERY generous

### When to Increase Limits

Only increase from 50 accounts if:

- You're actively showing it to companies/recruiters
- You have 40+ real users and growing
- You're prepared to monitor usage
- You've set up budget alerts

### Red Flags to Watch For

🚩 Sudden spike in accounts (bot attack)
🚩 Firebase usage alerts
🚩 Account creation from same IP repeatedly
🚩 Many accounts from temporary email domains

**With limits in place: All of these are blocked automatically** ✅

---

## Quick Reference: Implementation Priority

### Must Have (Security)

1. ✅ Hard account limit (50 max)
2. ✅ Firestore security rules
3. ✅ Firebase budget alerts

### Should Have (UX)

4. ⏭️ Account stats display on signup
5. ⏭️ IP rate limiting (3 per IP per day)
6. ⏭️ Blocked email domains (temp mail)

### Nice to Have (Polish)

7. ⏭️ Admin dashboard
8. ⏭️ Account stats in footer
9. ⏭️ Usage analytics

---

**Questions? Check the detailed docs:**

- 📄 `docs/costs-and-limits.md` - Full cost breakdown
- 📄 `docs/account-limits-integration.md` - How to implement
- 📄 `docs/trending-notifications-plan.md` - Notification architecture
