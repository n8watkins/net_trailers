# Technical Uplift Proposal - Analysis & Prioritization

Date: 2025-11-01
Status: PROPOSAL - Ready for Implementation

## Executive Summary

Three high-value technical improvements have been identified. This document analyzes their impact, complexity, and provides prioritized implementation guidance.

---

## 1. Server-Side Caching for Child Safety Certifications ⭐⭐⭐

### Problem Statement

Current implementation makes N individual TMDB API calls per content item to fetch certifications:

- `utils/movieCertifications.ts:122-124`: Parallel requests for each movie
- `utils/tvContentRatings.ts:106-108`: Parallel requests for each TV show
- Example: 20 items = 20 TMDB API calls per page load

**Current Mitigation**:

- ✅ In-memory caching via `certificationCache` (runtime only)
- ✅ Parallel requests with `Promise.all()`
- ❌ Cache lost on server restart
- ❌ No cross-request caching
- ❌ Cold starts always hit TMDB

### Proposed Solution: Redis/Upstash Caching

**Option A: Upstash Redis (Recommended)**

```typescript
// utils/certificationCache.ts (enhanced)
import { Redis } from '@upstash/redis'

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const CACHE_TTL = 60 * 60 * 24 * 7 // 7 days (certifications rarely change)

export async function getCachedCertification(
    type: 'movie' | 'tv',
    id: number
): Promise<string | null | undefined> {
    const key = `cert:${type}:${id}`
    try {
        return await redis.get<string | null>(key)
    } catch (error) {
        console.error('Redis fetch error:', error)
        return undefined // Fall back to TMDB
    }
}

export async function setCachedCertification(
    type: 'movie' | 'tv',
    id: number,
    certification: string | null
): Promise<void> {
    const key = `cert:${type}:${id}`
    try {
        await redis.setex(key, CACHE_TTL, certification)
    } catch (error) {
        console.error('Redis set error:', error)
        // Don't throw - fail gracefully
    }
}
```

**Benefits**:

- ✅ Persistent cache across deployments
- ✅ Shared cache across all serverless functions
- ✅ Vercel-native integration (zero config)
- ✅ Free tier: 10,000 commands/day (sufficient for small-medium traffic)
- ✅ Sub-10ms latency globally
- ✅ Dramatically reduced TMDB API usage

**Cost**:

- Free tier: 10K requests/day
- Paid tier: $0.20 per 100K requests (very cheap)

**Complexity**: LOW (2-3 hours implementation)

**Impact**: HIGH (90%+ reduction in TMDB calls)

**Priority**: ⭐⭐⭐ **HIGHEST**

---

## 2. Expanded Testing for Edge Cases ⭐⭐

### Current State

- Only 4 test files exist:
    - `__tests__/hooks/useAuth.test.tsx`
    - `__tests__/integration/childSafety.client.test.tsx`
    - `__tests__/components/SessionSyncManager.test.tsx`
    - `__tests__/components/Header.test.tsx`

### Gaps Identified

**A. Rate Limit Handling**

```typescript
// __tests__/api/rateLimiting.test.ts (MISSING)
describe('API Rate Limiting', () => {
    it('should return 429 when TMDB rate limit exceeded')
    it('should implement exponential backoff')
    it('should cache responses to reduce API calls')
    it('should handle concurrent requests gracefully')
})
```

**B. Child Safety Cache Interactions**

```typescript
// __tests__/integration/childSafetyCache.test.tsx (MISSING)
describe('Child Safety Mode Toggling', () => {
    it('should invalidate content cache when child safety enabled')
    it('should invalidate content cache when child safety disabled')
    it('should not show cached adult content after enabling child safety')
    it('should re-fetch content with correct filtering')
    it('should handle rapid toggle spam gracefully')
})
```

**C. Session Migration**

```typescript
// __tests__/integration/sessionMigration.test.tsx (MISSING)
describe('Guest to Auth Migration', () => {
    it('should merge guest watchlist into authenticated account')
    it('should preserve playback preferences during migration')
    it('should clear guest data after successful migration')
    it('should handle migration failures gracefully')
    it('should not lose data if Firebase is offline during migration')
})
```

### Proposed Test Suite Structure

```
__tests__/
├── api/
│   ├── rateLimiting.test.ts
│   ├── search.test.ts
│   └── childSafety.test.ts
├── integration/
│   ├── childSafety.client.test.tsx (✅ exists)
│   ├── childSafetyCache.test.tsx (NEW)
│   └── sessionMigration.test.tsx (NEW)
├── hooks/
│   ├── useAuth.test.tsx (✅ exists)
│   ├── useChildSafety.test.tsx (NEW)
│   └── useHomeData.test.tsx (NEW)
└── components/
    ├── Header.test.tsx (✅ exists)
    ├── SessionSyncManager.test.tsx (✅ exists)
    └── Modal.test.tsx (NEW)
```

**Complexity**: MEDIUM (8-12 hours for comprehensive suite)

**Impact**: MEDIUM (prevents regressions, improves confidence)

**Priority**: ⭐⭐ **MEDIUM** (important but not blocking)

---

## 3. Performance Optimization Story ⭐⭐

### Current Performance Profile

**Needs Assessment**: Run Lighthouse audit first

```bash
# Generate baseline metrics
npm run build
npm run start
# Open Chrome DevTools > Lighthouse
# Run audit on main pages: /, /movies, /tv, /search
```

### Proposed Optimizations

#### A. Next.js Route Handlers (App Router Migration)

**Current**: Pages Router API routes (`pages/api/*`)
**Proposed**: App Router route handlers (`app/api/*/route.ts`)

**Benefits**:

- ✅ Faster cold starts
- ✅ Better streaming support
- ✅ Improved TypeScript integration
- ✅ Native support for Web APIs (Request/Response)

**Complexity**: MEDIUM-HIGH (requires migration to App Router)
**ROI**: LOW (marginal performance gain, large refactor)
**Recommendation**: ⚠️ **SKIP for now** - Pages Router is stable and performant

---

#### B. Incremental Static Regeneration (ISR)

**Candidate Pages**:

```typescript
// pages/index.tsx
export async function getStaticProps() {
    const homeData = await fetchHomeData()
    return {
        props: { homeData },
        revalidate: 3600, // Revalidate every hour
    }
}

// pages/genres/[type]/[id].tsx
export async function getStaticPaths() {
    // Pre-generate popular genres
    return {
        paths: [
            { params: { type: 'movie', id: '28' } }, // Action
            { params: { type: 'movie', id: '35' } }, // Comedy
            // ... top 20 genre combinations
        ],
        fallback: 'blocking',
    }
}

export async function getStaticProps({ params }) {
    const genreData = await fetchGenreData(params.type, params.id)
    return {
        props: { genreData },
        revalidate: 3600, // Revalidate every hour
    }
}
```

**Benefits**:

- ✅ Sub-100ms page loads for cached pages
- ✅ Reduced API calls to TMDB
- ✅ Better SEO (pre-rendered content)
- ✅ Lower serverless costs

**Challenges**:

- ❌ Personalized content (watchlists, liked movies) can't be static
- ❌ Child safety filtering is user-specific
- ⚠️ Limited benefit for authenticated users

**Hybrid Approach**:

```typescript
// Static shell + client-side hydration for personalized data
export async function getStaticProps() {
    const publicData = await fetchPublicContent() // Genre listings, trending
    return {
        props: { publicData },
        revalidate: 3600,
    }
}

// Client-side fetch for personalized data
function HomePage({ publicData }) {
    const { watchlist } = useUserData() // Client-side only
    // Merge public + personalized content
}
```

**Complexity**: MEDIUM (4-6 hours)
**Impact**: MEDIUM-HIGH (faster page loads, lower costs)
**Priority**: ⭐⭐ **RECOMMENDED** for homepage and genre pages

---

#### C. SWR/React Query for Client-Side Caching

**Current**: Manual `useEffect` + `useState` patterns
**Proposed**: SWR or React Query for data fetching

**Example with SWR**:

```typescript
// Before (manual)
function useHomeData() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/home')
            .then((r) => r.json())
            .then(setData)
            .finally(() => setLoading(false))
    }, [])

    return { data, loading }
}

// After (SWR)
import useSWR from 'swr'

function useHomeData() {
    const { data, error, isLoading } = useSWR('/api/home', fetcher, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000, // 1 minute
    })

    return { data, loading: isLoading, error }
}
```

**Benefits**:

- ✅ Automatic deduplication (prevents duplicate requests)
- ✅ Smart revalidation strategies
- ✅ Built-in error handling and retry logic
- ✅ Optimistic updates
- ✅ Cache persistence

**Complexity**: LOW-MEDIUM (3-5 hours to refactor existing hooks)

**Impact**: MEDIUM (better UX, reduced API calls)

**Priority**: ⭐⭐ **RECOMMENDED**

---

## Implementation Roadmap

### Phase 1: High-Impact, Low-Effort (Week 1)

1. ✅ **Upstash Redis caching** (2-3 hours)
    - Set up Upstash account
    - Add Redis client to `utils/certificationCache.ts`
    - Update `fetchMovieCertification()` and `fetchTVContentRatings()`
    - Test with production-like load

2. ✅ **SWR integration** (3-5 hours)
    - Install `swr` package
    - Refactor `useHomeData()` hook
    - Refactor search hooks
    - Configure cache strategies

**Expected Impact**: 80-90% reduction in TMDB API calls

---

### Phase 2: Testing & Reliability (Week 2)

3. ✅ **Edge case testing** (8-12 hours)
    - Rate limiting tests
    - Child safety cache invalidation tests
    - Session migration tests
    - Increase coverage to 60%+

**Expected Impact**: Prevent regressions, improve stability

---

### Phase 3: Static Optimization (Week 3)

4. ✅ **ISR for public pages** (4-6 hours)
    - Homepage ISR with 1-hour revalidation
    - Genre pages ISR with fallback
    - Measure Lighthouse improvements

**Expected Impact**: 50-70% faster page loads for public content

---

## Metrics to Track

### Before Implementation

- [ ] Baseline TMDB API calls per user session
- [ ] Average page load time (Lighthouse)
- [ ] Time to First Byte (TTFB)
- [ ] Cache hit rate (currently 0% across requests)
- [ ] Test coverage percentage

### After Implementation

- [ ] TMDB API call reduction (target: 90%+)
- [ ] Page load time improvement (target: 30%+ faster)
- [ ] TTFB improvement (target: 50%+ faster)
- [ ] Cache hit rate (target: 80%+)
- [ ] Test coverage (target: 60%+)

---

## Cost-Benefit Analysis

| Initiative           | Effort | Impact      | Cost       | ROI         |
| -------------------- | ------ | ----------- | ---------- | ----------- |
| Upstash Redis        | 2-3h   | Very High   | Free-$5/mo | ⭐⭐⭐⭐⭐  |
| SWR Integration      | 3-5h   | High        | Free       | ⭐⭐⭐⭐⭐  |
| Edge Testing         | 8-12h  | Medium      | Free       | ⭐⭐⭐⭐    |
| ISR Implementation   | 4-6h   | Medium-High | Free       | ⭐⭐⭐⭐    |
| App Router Migration | 20-40h | Low-Medium  | Free       | ⭐⭐ (skip) |

---

## Recommended Action Plan

**Week 1: Quick Wins**

1. Implement Upstash Redis caching
2. Integrate SWR for data fetching
3. Measure and document improvements

**Week 2: Stability** 4. Write edge case tests 5. Achieve 60%+ test coverage 6. Set up CI/CD test automation

**Week 3: Performance** 7. Implement ISR for homepage 8. Implement ISR for top genre pages 9. Run final Lighthouse audits

**Total Timeline**: 3 weeks, ~25-30 hours

**Expected Outcome**:

- 90% reduction in external API calls
- 50%+ faster page loads
- 60%+ test coverage
- Production-ready caching infrastructure
- Better user experience
- Lower hosting costs

---

## Conclusion

All three proposals are **valid and valuable**. The recommended approach is:

1. ✅ **IMMEDIATE**: Redis caching (highest ROI, lowest effort)
2. ✅ **IMMEDIATE**: SWR integration (high ROI, low effort)
3. ✅ **SOON**: Edge case testing (prevents future issues)
4. ✅ **LATER**: ISR implementation (good performance gains)
5. ❌ **SKIP**: App Router migration (high effort, marginal benefit)

The phased approach allows for incremental improvements while maintaining velocity and minimizing risk.
