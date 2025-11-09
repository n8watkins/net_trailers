# App Router Migration Plan - Strategic Approach

Date: 2025-11-01
Status: READY TO EXECUTE

## Strategy: Incremental Hybrid Migration

**Key Principle**: Next.js 13+ supports BOTH `pages/` and `app/` directories simultaneously. We'll migrate route-by-route, not all at once.

---

## Phase 0: Pre-Migration Setup (Week 1 - Day 1-2)

### 1. Install App Router Dependencies

```bash
npm install next@latest react@latest react-dom@latest
npm install @types/react@latest @types/react-dom@latest
```

### 2. Create App Directory Structure

```bash
mkdir -p app
mkdir -p app/api
```

### 3. Set Up Root Layout (Required for App Router)

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'NetTrailers',
  description: 'Netflix-style movie and TV show trailer browser',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

---

## Phase 1: Migrate Static/Public Routes First (Week 1)

**Priority**: Low-risk pages with minimal state

### Route 1: Privacy Policy (EASIEST - Start Here!)

**Current**: `pages/privacy.tsx`
**New**: `app/privacy/page.tsx`

**Why first?**

- ✅ Static content (no API calls)
- ✅ No user state
- ✅ Simple component
- ✅ Perfect learning route

**Migration Steps**:

```typescript
// app/privacy/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - NetTrailers',
  description: 'Privacy policy for NetTrailers',
}

export default function PrivacyPage() {
  // Copy content from pages/privacy.tsx
  return (
    <div className="privacy-page">
      {/* Existing privacy content */}
    </div>
  )
}
```

**Test**: Visit `/privacy` - should work immediately!

---

### Route 2: Terms of Service

**Current**: `pages/terms.tsx`
**New**: `app/terms/page.tsx`

Same pattern as privacy page.

---

### Route 3: 404 Page

**Current**: `pages/404.tsx`
**New**: `app/not-found.tsx`

```typescript
// app/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
    </div>
  )
}
```

**After Phase 1**: 3 routes migrated, zero risk, you understand the basics!

---

## Phase 2: Migrate API Routes (Week 2)

**Strategy**: Convert `pages/api/*` to `app/api/*/route.ts`

### Example: Search API

**Before** (Pages Router):

```typescript
// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { query } = req.query
    const results = await searchTMDB(query)
    res.status(200).json(results)
}
```

**After** (App Router):

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('query')
    const results = await searchTMDB(query)
    return NextResponse.json(results)
}
```

**Key Changes**:

- ✅ Export `GET`, `POST`, etc. instead of default handler
- ✅ Use `NextRequest`/`NextResponse` (Web APIs)
- ✅ Access query params via `request.nextUrl.searchParams`
- ✅ Return `NextResponse.json()` instead of `res.json()`

**Migration Order** (API routes):

1. `/api/search` - Simple query endpoint
2. `/api/movies/trending` - No params
3. `/api/movies/details/[id]` - Dynamic route
4. `/api/genres/[type]/[id]` - Multi-param route
5. Repeat for all API routes

**Benefit**: New API routes are faster (Edge Runtime compatible)!

---

## Phase 3: Migrate Simple Pages (Week 3)

**Strategy**: Pages with minimal client-side state

### Example: Settings Page

**Current**: `pages/settings.tsx`
**Challenge**: Has user state (auth, preferences)

**Solution**: Hybrid approach - Server Component + Client Components

```typescript
// app/settings/page.tsx (Server Component)
import { SettingsClient } from './SettingsClient'

export const metadata = {
  title: 'Settings - NetTrailers',
}

export default function SettingsPage() {
  return <SettingsClient />
}

// app/settings/SettingsClient.tsx (Client Component)
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useSessionStore } from '@/stores/sessionStore'

export function SettingsClient() {
  const { user } = useAuth()
  const { preferences, updatePreferences } = useSessionStore()

  // All your existing settings logic
  return (
    <div className="settings-page">
      {/* Existing settings UI */}
    </div>
  )
}
```

**Pattern**:

- Server Component = shell (metadata, layout)
- Client Component = interactive parts (forms, state)

**Migration Order**:

1. `/settings` - Form-based, learn client components
2. `/watchlists` - User-specific data
3. `/liked` - Similar to watchlists
4. `/hidden` - Similar to watchlists

---

## Phase 4: Migrate Complex Pages with Data Fetching (Week 4)

### Example: Homepage (Most Complex!)

**Current**: `pages/index.tsx`
**Challenge**:

- Fetches trending, top-rated, genre data
- Child safety filtering
- User personalization (watchlist, liked)

**Solution**: Server Components + Client Components + Redis

```typescript
// app/page.tsx (Server Component - PUBLIC data)
import { HomeClient } from './HomeClient'
import { redis } from '@/lib/redis'

// Fetch public data on server (cached)
async function getPublicHomeData(childSafetyMode: boolean) {
  // Check Redis cache first
  const cacheKey = `home:${childSafetyMode ? 'safe' : 'all'}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Fetch from TMDB
  const data = await fetchHomeData(childSafetyMode)

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(data))
  return data
}

export default async function HomePage() {
  // Server-side fetch (no client JS for this!)
  const publicData = await getPublicHomeData(false)

  return (
    <div>
      {/* Server Component - static content */}
      <TrendingBanner data={publicData.trending} />

      {/* Client Component - personalized data */}
      <HomeClient initialData={publicData} />
    </div>
  )
}

// app/HomeClient.tsx
'use client'

export function HomeClient({ initialData }) {
  const { preferences } = useSessionStore()
  const { data } = useSWR('/api/home', fetcher, {
    fallbackData: initialData, // Use server data initially
  })

  // Filter based on child safety, user preferences, etc.
  return <div>{/* Interactive content */}</div>
}
```

**Benefits**:

- ✅ Trending banner renders on server (0 JS shipped for this!)
- ✅ Personalized content uses SWR (client-side)
- ✅ Redis caching reduces TMDB calls
- ✅ Best of both worlds

**Migration Order**:

1. `/movies` - Simpler than homepage
2. `/tv` - Similar to movies
3. `/` (homepage) - Most complex, do last
4. `/genres/[type]/[id]` - Dynamic routes with ISR

---

## Phase 5: Optimize with ISR (Week 5)

### Incremental Static Regeneration for Public Pages

```typescript
// app/genres/[type]/[id]/page.tsx
import { fetchGenreData } from '@/lib/tmdb'

// Generate static pages for popular genres
export async function generateStaticParams() {
  return [
    { type: 'movie', id: '28' },  // Action
    { type: 'movie', id: '35' },  // Comedy
    { type: 'movie', id: '27' },  // Horror
    { type: 'tv', id: '10759' },  // Action & Adventure
    { type: 'tv', id: '35' },     // Comedy
    // Add top 20 most popular genre combinations
  ]
}

// Revalidate every hour
export const revalidate = 3600

export default async function GenrePage({
  params
}: {
  params: { type: string; id: string }
}) {
  const data = await fetchGenreData(params.type, params.id)

  return (
    <div>
      <h1>{data.name}</h1>
      <ContentGrid items={data.items} />
    </div>
  )
}
```

**Result**:

- Pre-rendered pages load in <100ms
- Revalidate every hour automatically
- 90% reduction in TMDB API calls for popular pages

---

## Phase 6: Implement Redis + SWR (Week 6)

### Install Upstash Redis

```bash
npm install @upstash/redis
```

### Set up Redis client

```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

### Update certification caching

```typescript
// utils/certificationCache.ts (ENHANCED)
import { redis } from '@/lib/redis'

const CACHE_TTL = 60 * 60 * 24 * 7 // 7 days

export async function fetchMovieCertification(
    movieId: number,
    apiKey: string
): Promise<string | null> {
    const cacheKey = `cert:movie:${movieId}`

    // Check Redis first
    const cached = await redis.get<string | null>(cacheKey)
    if (cached !== undefined) return cached

    // Fetch from TMDB
    const cert = await tmdbApi.getCertification(movieId)

    // Cache result
    await redis.setex(cacheKey, CACHE_TTL, cert)

    return cert
}
```

**Expected Impact**: 90%+ reduction in TMDB API calls

---

## Phase 7: Install SWR (Week 6)

```bash
npm install swr
```

### Create SWR Provider

```typescript
// app/providers.tsx
'use client'

import { SWRConfig } from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000, // 1 minute
      }}
    >
      {children}
    </SWRConfig>
  )
}

// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Refactor data hooks to use SWR

```typescript
// hooks/useHomeData.ts (REFACTORED)
import useSWR from 'swr'

export function useHomeData(filter?: string) {
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    const { data, error, isLoading } = useSWR(
        `/api/home?filter=${filter}&childSafety=${childSafetyEnabled}`,
        {
            revalidateOnMount: true,
            dedupingInterval: 60000,
        }
    )

    return {
        data: data || defaultData,
        loading: isLoading,
        error: error?.message || null,
    }
}
```

---

## Phase 8: Clean Up & Delete Pages Router (Week 7-8)

**Only after everything works perfectly:**

1. Test all routes in App Router
2. Run type checking: `npm run type-check`
3. Run build: `npm run build`
4. Test production build locally: `npm run start`
5. Deploy to Vercel preview
6. Monitor for errors
7. Delete `pages/` directory (except `pages/api` if still in use)
8. Update imports
9. Final commit

---

## Migration Checklist

### Pre-Migration

- [ ] Audit current Pages Router routes
- [ ] Install latest Next.js, React
- [ ] Create `app/` directory
- [ ] Set up root layout

### Phase 1: Static Pages

- [ ] Migrate `/privacy`
- [ ] Migrate `/terms`
- [ ] Migrate `/404`
- [ ] Test: All static pages work

### Phase 2: API Routes

- [ ] Migrate `/api/search`
- [ ] Migrate `/api/movies/*`
- [ ] Migrate `/api/tv/*`
- [ ] Migrate `/api/genres/*`
- [ ] Test: All API routes work

### Phase 3: Simple Pages

- [ ] Migrate `/settings`
- [ ] Migrate `/watchlists`
- [ ] Migrate `/liked`
- [ ] Migrate `/hidden`
- [ ] Test: User pages work

### Phase 4: Complex Pages

- [ ] Migrate `/movies`
- [ ] Migrate `/tv`
- [ ] Migrate `/search`
- [ ] Migrate `/genres/[type]/[id]`
- [ ] Migrate `/` (homepage) - LAST!
- [ ] Test: All pages work

### Phase 5: Optimization

- [ ] Implement ISR for genre pages
- [ ] Implement ISR for homepage
- [ ] Test: Pages pre-render correctly

### Phase 6-7: Caching

- [ ] Set up Upstash Redis
- [ ] Refactor certification caching
- [ ] Install SWR
- [ ] Refactor data fetching hooks
- [ ] Test: Cache hit rates 80%+

### Phase 8: Cleanup

- [ ] Run full test suite
- [ ] Run type checking
- [ ] Build production
- [ ] Deploy to Vercel preview
- [ ] Monitor Sentry for errors
- [ ] Delete `pages/` directory
- [ ] Final commit & deploy

---

## Timeline

**Estimated Total Time**: 6-8 weeks (part-time, 3-5 hours/week)

| Phase                  | Duration        | Effort | Risk   |
| ---------------------- | --------------- | ------ | ------ |
| Phase 0: Setup         | 1-2 hours       | LOW    | LOW    |
| Phase 1: Static        | 2-3 hours       | LOW    | LOW    |
| Phase 2: API Routes    | 4-6 hours       | MEDIUM | MEDIUM |
| Phase 3: Simple Pages  | 4-6 hours       | MEDIUM | MEDIUM |
| Phase 4: Complex Pages | 8-12 hours      | HIGH   | HIGH   |
| Phase 5: ISR           | 2-4 hours       | LOW    | LOW    |
| Phase 6-7: Caching     | 4-6 hours       | MEDIUM | LOW    |
| Phase 8: Cleanup       | 2-4 hours       | LOW    | MEDIUM |
| **TOTAL**              | **30-45 hours** |        |        |

---

## Benefits After Migration

1. **Performance**
    - Server Components reduce client JS by 40-60%
    - ISR reduces TMDB API calls by 70-90%
    - Redis caching eliminates 90% of certification calls
    - SWR eliminates duplicate client requests

2. **Developer Experience**
    - Modern React patterns (Server Components, Suspense)
    - Better TypeScript support
    - Cleaner data fetching patterns
    - Nested layouts & loading states

3. **Cost Savings**
    - Fewer serverless function invocations
    - Lower bandwidth (less client JS)
    - Reduced TMDB API usage (stay in free tier)

4. **SEO**
    - Better pre-rendering for public pages
    - Faster Time to First Byte (TTFB)
    - Improved Core Web Vitals

---

## Risk Mitigation

1. **Hybrid Mode**: Both routers work simultaneously
2. **Incremental**: Migrate one route at a time
3. **Rollback**: Keep `pages/` until 100% confident
4. **Testing**: Test each phase before moving forward
5. **Monitoring**: Use Sentry to catch production errors

---

## Recommended Starting Point

**Next Steps** (Start now!):

1. Create new branch: `git checkout -b feat/app-router-migration`
2. Install dependencies: `npm install next@latest react@latest react-dom@latest`
3. Create `app/layout.tsx` (root layout)
4. Migrate `/privacy` route (5 minutes!)
5. Test: Visit `/privacy` - should work immediately
6. Commit: "feat: migrate privacy page to App Router"

**Then**: Continue with terms, 404, then API routes. One route at a time!

Want me to help you start with Phase 0 right now?
