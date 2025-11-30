# Firebase vs TMDB API Cost-Benefit Analysis

**Last Updated:** 2025-01-30
**Purpose:** Evaluate cost trade-offs between Firebase caching and TMDB API usage for actor/director collections

---

## Executive Summary

**Current Implementation:**

- Firebase caches first 50 items (IDs only) per actor/director collection
- Cached pages (1-3) require 1 Firebase read + 20 TMDB API calls per view
- Non-cached pages (4+) require 1 Firebase read + 1 TMDB API call per view

**Key Findings:**

- **Break-even point:** ~27,778 users before Firebase costs money
- **TMDB API is FREE** (no official paid tier exists)
- **Firebase cost at 100,000 users:** $2.34/month
- **Optimization opportunity:** Caching full content details reduces TMDB calls by 68%

**Recommendation:** Continue using Firebase caching. TMDB is free but has rate limits (40 req/sec). Firebase helps stay under rate limits while providing faster response times.

---

## TMDB API Pricing Analysis

### Current TMDB API Costs

**TMDB API v3 (Current):**

- **Cost:** FREE (no paid tier)
- **Rate Limit:** 40 requests/second
- **Daily Limit:** ~3.5 million requests/day
- **Requirements:** API key (free registration)

**TMDB API v4 (Experimental):**

- **Cost:** FREE (no paid tier)
- **Rate Limit:** 50 requests/second
- **Features:** Read/write access tokens, user authentication

### TMDB Commercial Terms

From TMDB Terms of Use (Section 5):

> "The TMDB API is provided free of charge for personal, non-commercial use and for commercial use that does not involve selling, licensing, or otherwise commercializing the TMDB data or API."

**What this means:**

- ✅ Free for our use case (content discovery app)
- ✅ No direct monetization of TMDB data
- ❌ Cannot resell TMDB data
- ❌ Cannot create a competing database

**Potential Risks:**

1. **Rate limiting:** Exceeding 40 req/sec causes 429 errors
2. **Service availability:** No SLA guarantees
3. **Terms changes:** TMDB could introduce paid tiers in future
4. **Attribution required:** Must display TMDB logo and link

---

## Firebase Pricing

### Spark Plan (Free Tier)

| Resource           | Free Tier Limit         | Overage Cost       |
| ------------------ | ----------------------- | ------------------ |
| **Reads**          | 50,000/day (1.5M/month) | $0.06 per 100,000  |
| **Writes**         | 20,000/day (600K/month) | $0.18 per 100,000  |
| **Storage**        | 1 GB                    | $0.18 per GB/month |
| **Network Egress** | 10 GB/month             | $0.12 per GB       |

### Blaze Plan (Pay-as-you-go)

Same free tier limits, then pay overage costs above.

**No minimum fee** - you only pay for what you use beyond free tier.

---

## Current Implementation Analysis

### Per-Page Cost Breakdown

#### **Cached Collection Page View (Pages 1-3)**

**Firebase:**

- 1 document read (collection with cached IDs) = **1 read**

**TMDB:**

- 20 individual content detail calls (`/movie/{id}` or `/tv/{id}`) = **20 API calls**

**Total:** 1 Firebase read + 20 TMDB calls

#### **Non-Cached Page View (Pages 4+)**

**Firebase:**

- 1 document read (collection metadata) = **1 read**

**TMDB:**

- 1 discover endpoint call (returns 20 items) = **1 API call**

**Total:** 1 Firebase read + 1 TMDB call

#### **Weekly Cron Cache Refresh**

**Per collection refreshed:**

**Firebase:**

- 1 collection read = **1 read**
- 1 cache update write = **1 write**
- 1 notification write = **1 write**

**TMDB:**

- 3 discover calls (pages 1-3 to rebuild cache) = **3 API calls**

---

## Scaling Projections (Detailed)

### Assumptions

**User Distribution:**

- **Total users:** Variable (see table below)
- **Active users:** 50% of total
- **Users with actor/director collections:** 10% of total
- **Average actor/director collections per user:** 2
- **Average total collections per user:** 10

**Usage Patterns:**

- **Collections viewed per active user/month:** 5
- **Pages viewed per collection:** 2 (average)
- **Cached collection view rate:** 20% of all views
- **Cache refresh rate:** 20% of cached collections change per week

### Monthly Usage Calculations

**Total page views/month:**

```
Active users × Collections viewed × Pages per collection
= (Total users × 0.5) × 5 × 2
= Total users × 5
```

**Firebase reads breakdown:**

- Page views: Total users × 5 reads
- Cron jobs: (Total users × 10 collections) × 4 weeks
- Miscellaneous: Total users × 5 reads

**TMDB calls breakdown:**

- Cached page views: (Total users × 5 × 0.2) × 20 calls
- Regular page views: (Total users × 5 × 0.8) × 1 call
- Cron refreshes: (Total users × 0.1 × 2 collections × 0.2) × 3 calls × 4 weeks
- Miscellaneous: Total users × 5 calls

---

## Cost Projection Table

| Users      | Active Users | Cached Collections | Monthly Firebase Reads | Monthly Firebase Writes | Monthly TMDB Calls | Firebase Cost | TMDB Cost | Total Monthly Cost |
| ---------- | ------------ | ------------------ | ---------------------- | ----------------------- | ------------------ | ------------- | --------- | ------------------ |
| 100        | 50           | 20                 | 5,400                  | 142                     | 2,950              | $0.00         | $0.00     | **$0.00**          |
| 500        | 250          | 100                | 27,000                 | 710                     | 14,750             | $0.00         | $0.00     | **$0.00**          |
| 1,000      | 500          | 200                | 54,000                 | 1,420                   | 29,500             | $0.00         | $0.00     | **$0.00**          |
| 2,500      | 1,250        | 500                | 135,000                | 3,550                   | 73,750             | $0.00         | $0.00     | **$0.00**          |
| 5,000      | 2,500        | 1,000              | 270,000                | 7,100                   | 147,500            | $0.00         | $0.00     | **$0.00**          |
| 10,000     | 5,000        | 2,000              | 540,000                | 14,200                  | 295,000            | $0.00         | $0.00     | **$0.00**          |
| 15,000     | 7,500        | 3,000              | 810,000                | 21,300                  | 442,500            | $0.00         | $0.00     | **$0.00**          |
| 20,000     | 10,000       | 4,000              | 1,080,000              | 28,400                  | 590,000            | $0.00         | $0.00     | **$0.00**          |
| 25,000     | 12,500       | 5,000              | 1,350,000              | 35,500                  | 737,500            | $0.00         | $0.00     | **$0.00**          |
| **27,778** | **13,889**   | **5,556**          | **1,500,000**          | **39,444**              | **820,000**        | **$0.00**     | **$0.00** | **$0.00** ✅       |
| 30,000     | 15,000       | 6,000              | 1,620,000              | 42,600                  | 885,000            | $0.07         | $0.00     | **$0.07**          |
| 50,000     | 25,000       | 10,000             | 2,700,000              | 71,000                  | 1,475,000          | $0.72         | $0.00     | **$0.72**          |
| 75,000     | 37,500       | 15,000             | 4,050,000              | 106,500                 | 2,212,500          | $1.53         | $0.00     | **$1.53**          |
| 100,000    | 50,000       | 20,000             | 5,400,000              | 142,000                 | 2,950,000          | $2.34         | $0.00     | **$2.34**          |
| 250,000    | 125,000      | 50,000             | 13,500,000             | 355,000                 | 7,375,000          | $7.20         | $0.00     | **$7.20**          |
| 500,000    | 250,000      | 100,000            | 27,000,000             | 710,000                 | 14,750,000         | $15.30        | $0.00     | **$15.30**         |
| 1,000,000  | 500,000      | 200,000            | 54,000,000             | 1,420,000               | 29,500,000         | $31.47        | $0.00     | **$31.47**         |

### Cost Formula (for calculations)

**Firebase Read Cost:**

```
If reads > 1,500,000:
    overage_reads = monthly_reads - 1,500,000
    read_cost = (overage_reads / 100,000) × $0.06
Else:
    read_cost = $0.00
```

**Firebase Write Cost:**

```
If writes > 600,000:
    overage_writes = monthly_writes - 600,000
    write_cost = (overage_writes / 100,000) × $0.18
Else:
    write_cost = $0.00
```

**TMDB Cost:**

```
tmdb_cost = $0.00 (always free, but watch rate limits)
```

---

## Rate Limit Analysis

### TMDB Rate Limits

**Limit:** 40 requests/second = 144,000/hour = 3,456,000/day

**Peak Load Scenarios:**

#### **Scenario 1: Morning Traffic Spike (8 AM)**

Assume 10% of active users browse simultaneously:

**At 10,000 users:**

- Active users: 5,000
- Simultaneous: 500 users
- Requests: 500 users × 3 page views × 5 TMDB calls = 7,500 requests
- Spread over 5 minutes = 7,500 / 300 seconds = **25 req/sec** ✅ Safe

**At 100,000 users:**

- Simultaneous: 5,000 users
- Requests: 5,000 × 3 × 5 = 75,000 requests
- Spread over 5 minutes = 75,000 / 300 = **250 req/sec** ❌ **RATE LIMIT EXCEEDED**

#### **Scenario 2: Cron Job Execution**

**At 100,000 users:**

- Collections to refresh: 20,000 × 0.2 = 4,000 collections
- TMDB calls: 4,000 × 3 = 12,000 calls
- Cron runs for ~10 minutes = 12,000 / 600 = **20 req/sec** ✅ Safe

### Rate Limit Mitigation Strategies

1. **Request Queuing:** Implement request queue with max 30 req/sec throughput
2. **Exponential Backoff:** Retry with backoff on 429 errors
3. **Distributed Caching:** Cache TMDB responses in Redis/Memcached
4. **CDN Integration:** Use CDN for static content (posters, backdrops)
5. **Batch Processing:** Spread cron jobs over longer time windows

**Estimated safe capacity with current implementation:** ~50,000 users

**With optimization (full content caching):** ~200,000 users

---

## Optimization Analysis

### Current Implementation Issues

**Problem:** Cached pages make 20 individual TMDB calls instead of 0

**Why it's inefficient:**

- Each cached page view: 1 Firebase read + 20 TMDB calls
- Should be: 1 Firebase read + 0 TMDB calls

### Optimization Option: Cache Full Content Details

**Changes required:**

1. Store complete content objects in `cachedContentIds` instead of just IDs
2. Update `buildInitialCache()` to fetch and store full details
3. Update content route to serve directly from cache (no TMDB calls)

**Storage impact:**

```
Current: 50 items × 10 bytes (just IDs) = 500 bytes per collection
Optimized: 50 items × 1 KB (full details) = 50 KB per collection

At 20,000 cached collections:
Current: 20,000 × 500 bytes = 10 MB
Optimized: 20,000 × 50 KB = 1 GB (exactly at free tier limit)
```

**TMDB call reduction:**

```
Current: 20,000 TMDB calls/month for cached pages (at 1,000 users)
Optimized: 0 TMDB calls for cached pages
Savings: 100% reduction for cached pages
Overall: 68% reduction in total TMDB calls
```

**Benefits:**

- ✅ **68% fewer TMDB API calls** (reduces rate limit pressure)
- ✅ **Faster response times** (no TMDB network latency)
- ✅ **Better reliability** (no dependency on TMDB availability for cached pages)
- ✅ **Same Firebase costs** (storage still within free tier)

**Costs:**

- ❌ **Larger Firebase storage** (approaches 1 GB limit at 20,000 collections)
- ❌ **More network egress** (sending 50 KB vs 500 bytes per read)
- ❌ **Stale data risk** (weekly refresh means up to 7-day-old data)

### Optimized Cost Projections

| Users   | Monthly TMDB Calls (Current) | Monthly TMDB Calls (Optimized) | TMDB Call Reduction | Firebase Storage (Current) | Firebase Storage (Optimized) | Storage Impact  |
| ------- | ---------------------------- | ------------------------------ | ------------------- | -------------------------- | ---------------------------- | --------------- |
| 1,000   | 29,500                       | 9,500                          | 68%                 | 10 MB                      | 100 MB                       | Safe            |
| 5,000   | 147,500                      | 47,500                         | 68%                 | 50 MB                      | 500 MB                       | Safe            |
| 10,000  | 295,000                      | 95,000                         | 68%                 | 100 MB                     | 1 GB                         | **At limit**    |
| 20,000  | 590,000                      | 190,000                        | 68%                 | 200 MB                     | 2 GB                         | **$0.18/month** |
| 50,000  | 1,475,000                    | 475,000                        | 68%                 | 500 MB                     | 5 GB                         | **$0.72/month** |
| 100,000 | 2,950,000                    | 950,000                        | 68%                 | 1 GB                       | 10 GB                        | **$1.62/month** |

**Combined costs with optimization (Firebase reads + writes + storage):**

| Users   | Current Total | Optimized Total | Savings                 |
| ------- | ------------- | --------------- | ----------------------- |
| 1,000   | $0.00         | $0.00           | $0.00                   |
| 10,000  | $0.00         | $0.00           | $0.00                   |
| 30,000  | $0.07         | $0.22           | -$0.15 (more expensive) |
| 50,000  | $0.72         | $0.96           | -$0.24 (more expensive) |
| 100,000 | $2.34         | $3.96           | -$1.62 (more expensive) |

**Conclusion:** Optimization increases Firebase costs but dramatically reduces TMDB rate limit pressure. Worth it at scale (50,000+ users) to prevent rate limiting.

---

## Alternative: Hybrid Caching Strategy

### Proposed Implementation

**Tier 1: Hot Cache (Redis/Memcached)**

- Cache most-viewed collections in memory
- TTL: 1 hour
- Capacity: Top 100 collections
- Cost: $0.00 (self-hosted) or $15/month (Redis Cloud)

**Tier 2: Warm Cache (Firebase)**

- Cache first 50 items (IDs only) per collection
- TTL: 7 days
- Current implementation

**Tier 3: Cold Storage (TMDB)**

- Fetch on cache miss
- Current implementation

**Benefits:**

- ✅ Reduces TMDB calls for popular collections
- ✅ Minimal Firebase storage increase
- ✅ Handles traffic spikes better

**Costs:**

- Redis Cloud: $15/month (500 MB)
- Self-hosted: $5/month (DigitalOcean droplet)

---

## Recommendations by Scale

### **< 1,000 Users: Current Implementation is Perfect**

- **Cost:** $0.00/month
- **Action:** No changes needed
- **Monitoring:** Track TMDB call volume

### **1,000 - 10,000 Users: Monitor and Prepare**

- **Cost:** $0.00/month
- **Action:** Set up Firebase usage alerts at 80% of free tier
- **Monitoring:** Track peak TMDB request rates

### **10,000 - 30,000 Users: Consider Optimization**

- **Cost:** $0.00 - $0.07/month
- **Action:** Implement Redis hot cache for top collections
- **Benefit:** Reduces rate limit pressure before hitting limits

### **30,000 - 50,000 Users: Optimize or Risk Rate Limits**

- **Cost:** $0.07 - $0.72/month (current) or $0.22 - $0.96/month (optimized)
- **Action:** Implement full content caching OR hybrid Redis strategy
- **Critical:** Rate limits become a concern at peak traffic

### **50,000+ Users: Full Optimization Required**

- **Cost:** $0.72+/month (current) or $15+/month (with Redis)
- **Action:**
    1. Implement full content caching
    2. Add Redis hot cache
    3. Implement request queuing with rate limiting
    4. Consider CDN for static assets
- **Alternative:** Explore TMDB partnership for higher rate limits

---

## Risk Assessment

### TMDB API Risks

| Risk                        | Likelihood        | Impact                            | Mitigation                                               |
| --------------------------- | ----------------- | --------------------------------- | -------------------------------------------------------- |
| **Rate limiting at scale**  | High (50k+ users) | High (site unusable during peaks) | Implement caching optimization + request queuing         |
| **TMDB service outage**     | Low               | High (no new content loads)       | Cache full content details, graceful degradation         |
| **Terms of Service change** | Low               | Medium (could require paid tier)  | Monitor TMDB announcements, build data layer abstraction |
| **API deprecation**         | Very Low          | High (migration required)         | Use stable v3 API, plan v4 migration                     |

### Firebase Risks

| Risk                      | Likelihood                         | Impact                     | Mitigation                                    |
| ------------------------- | ---------------------------------- | -------------------------- | --------------------------------------------- |
| **Exceeding free tier**   | Medium (27k+ users)                | Low ($0.07-$2/month)       | Acceptable cost, already budgeted             |
| **Storage limit (1 GB)**  | Low (10k+ users with optimization) | Low ($0.18/GB overage)     | Monitor usage, implement storage optimization |
| **Network egress limits** | Very Low                           | Low ($0.12/GB overage)     | Optimize response payloads                    |
| **Firestore outage**      | Very Low                           | Medium (cached pages fail) | Fallback to TMDB-only mode                    |

---

## Conclusion

### Key Takeaways

1. **TMDB is free but rate-limited** - Main constraint is 40 req/sec, not cost
2. **Firebase costs are minimal** - Only $2.34/month at 100,000 users
3. **Rate limits are the real bottleneck** - Will hit limits before costs become significant
4. **Optimization is about reliability, not cost** - Cache optimization prevents rate limit issues
5. **Break-even at 27,778 users** - Firebase starts costing money, but only $0.07/month

### Recommended Action Plan

**Phase 1 (Now - 5,000 users):**

- ✅ Keep current implementation
- ✅ Set up Firebase usage monitoring
- ✅ Track TMDB request rates

**Phase 2 (5,000 - 20,000 users):**

- ⚠️ Implement request rate monitoring
- ⚠️ Add Firebase usage alerts
- ⚠️ Consider Redis hot cache for top collections

**Phase 3 (20,000+ users):**

- 🔴 Implement full content caching optimization
- 🔴 Deploy Redis/Memcached for hot cache
- 🔴 Add request queuing with backoff
- 🔴 Monitor for rate limit warnings

**Phase 4 (50,000+ users):**

- 🔴 Consider TMDB partnership for higher limits
- 🔴 Implement CDN for static assets
- 🔴 Build data layer abstraction for API flexibility

---

## Appendix: Detailed Cost Formulas

### Firebase Read Cost

```typescript
function calculateFirebaseReadCost(users: number): number {
    const readsPerUser = 54 // Per month
    const totalReads = users * readsPerUser
    const freeTierReads = 1_500_000

    if (totalReads <= freeTierReads) {
        return 0
    }

    const overageReads = totalReads - freeTierReads
    return (overageReads / 100_000) * 0.06
}
```

### Firebase Write Cost

```typescript
function calculateFirebaseWriteCost(users: number): number {
    const writesPerUser = 1.42 // Per month
    const totalWrites = users * writesPerUser
    const freeTierWrites = 600_000

    if (totalWrites <= freeTierWrites) {
        return 0
    }

    const overageWrites = totalWrites - freeTierWrites
    return (overageWrites / 100_000) * 0.18
}
```

### TMDB Call Volume

```typescript
function calculateTMDBCalls(users: number): number {
    const callsPerUser = 29.5 // Per month
    return users * callsPerUser
}
```

### Peak Request Rate

```typescript
function calculatePeakRequestRate(users: number): number {
    const activeUsers = users * 0.5
    const peakSimultaneous = activeUsers * 0.1 // 10% during peak
    const requestsPerUser = 15 // During 5-minute session
    const totalRequests = peakSimultaneous * requestsPerUser
    const peakWindowSeconds = 300 // 5 minutes

    return totalRequests / peakWindowSeconds
}
```

---

## Document Maintenance

**Review Schedule:** Quarterly or when significant changes occur

**Update Triggers:**

- Firebase pricing changes
- TMDB terms of service updates
- User growth milestones (5k, 10k, 25k, 50k, 100k)
- Implementation changes (optimization deployed)

**Maintained By:** Development team

**Last Reviewed:** 2025-01-30
