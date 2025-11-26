# Hidden Content Filtering Implementation Plan

**Date**: 2025-11-17
**Status**: Planning / Awaiting Review
**Version**: 2.0 (Revised based on code review)

## Overview

This document outlines the gaps in hidden content filtering across the NetTrailers application and provides a comprehensive implementation plan to ensure hidden content is properly filtered from all user-facing features.

### Important Context on Visual Impact

**Key Finding**: `components/content/Row.tsx:75-90` already filters hidden content client-side before rendering any browse row. This means:

- ✅ **No visible bugs**: Hidden content is NOT currently shown to users on browse pages
- ⚠️ **Bandwidth waste**: APIs fetch hidden content that gets immediately filtered client-side
- ⚠️ **Data hygiene**: Collections and rankings may contain hidden content in their data structures (even if not displayed)

**Real Impact**: This is primarily about **bandwidth optimization** and **data integrity**, not fixing an active visual bug. The client-side safety net prevents display issues, but we're fetching unnecessary data.

---

## Current Implementation Status

### ✅ CORRECTLY FILTERING HIDDEN CONTENT

#### 1. Browse Pages (Root /)

- **Location**: Client-side filtering in components
- **Files**:
    - `components/layout/Banner.tsx:36` - Filters trending content for hero carousel
    - `components/content/Row.tsx:76-79` - Filters all row content
- **Implementation**: Uses `filterDislikedContent(allContent, sessionData.hiddenMovies)`
- **Status**: ✅ Working correctly

#### 2. Search Results

- **Location**: `components/search/SearchResults.tsx:39`
- **Implementation**: Client-side filtering with `filterDislikedContent(results, hiddenMovies)`
- **Status**: ✅ Working correctly

#### 3. Genre Pages

- **Location**: `app/genres/[type]/[id]/page.tsx:47`
- **Implementation**: Client-side filtering
- **Status**: ✅ Working correctly

#### 4. More Like This (Modal)

- **Location**: `components/modal/MoreLikeThisSection.tsx:31`
- **Implementation**: Filters recommendations in content modal
- **Status**: ✅ Working correctly

#### 5. Personalized Recommendations

- **Location**: `api/recommendations/personalized/route.ts:37-55`
- **Implementation**: Server-side exclusion using `getSeenContentIds()` which includes hiddenMovies
- **Status**: ✅ Working correctly (BEST PATTERN - follows this approach)

---

### ❌ GAPS - MISSING HIDDEN CONTENT FILTERING

#### 1. Collections Generation (CRITICAL - HIGH PRIORITY)

- **Location**: `app/api/custom-rows/[id]/content/route.ts:224-334`
- **Issue**: Genre-based collections fetch from TMDB with only child safety filtering, NOT user's hidden movies
- **Impact**: Auto-updating and genre-based collections will include content the user has hidden
- **Affected Lines**: 150-187, 336-366

#### 2. Auto-Update Cron Job (LOW PRIORITY - Currently Disabled)

- **Location**: `app/api/cron/update-collections/route.ts:35`
- **Issue**: When re-enabled, will populate collections without filtering hidden content
- **Impact**: Collections will auto-update with hidden movies
- **Note**: Currently disabled via `AUTO_UPDATE_CRON_ENABLED = false`

#### 3. AI-Generated Collections (HIGH PRIORITY)

- **Locations**:
    - `app/api/gemini/analyze/route.ts` - Gemini query analysis
    - `app/api/generate-row/route.ts:97-104` - AI-generated collections
- **Issue**: Doesn't exclude user's hidden movies from AI suggestions
- **Impact**: AI-generated collections may contain hidden content

#### 4. Ranking Creator - Manual Search (MEDIUM PRIORITY)

- **Location**: `components/rankings/RankingCreator.tsx`
- **Issue**: Uses `useSearch()` hook which doesn't filter hidden content from search results
- **Impact**: Users can see and add hidden content when manually creating rankings

#### 5. Smart Ranking Creator - AI Suggestions (MEDIUM PRIORITY)

- **Location**: `components/rankings/SmartRankingCreator.tsx`
- **Issue**: AI-generated ranking suggestions don't filter hidden movies
- **Impact**: Hidden content appears in AI ranking suggestions

#### 6. Collection Creator/Editor - Manual Search (MEDIUM PRIORITY)

- **Location**: `components/modals/InlineSearchBar.tsx:52-91`
- **Used By**: `CollectionCreatorModal` and `CollectionEditorModal`
- **Issue**: Inline search uses `/api/search` with only "not already added" filtering; hidden content appears in results
- **Impact**: Users can see and add hidden content when creating or editing collections manually
- **Note**: The list-selection components were refactored; InlineSearchBar is the current implementation

---

## Storage & Architecture

### Hidden Content Storage

**Location**: `stores/createUserStore.ts:18, 87, 124`

```typescript
hiddenMovies: Content[]  // Array of full Content objects with metadata
```

**Storage Adapters**:

- **AuthStore** (Firebase): Syncs via `services/firebaseStorageAdapter.ts` → Firestore `/users/{userId}/hiddenMovies`
- **GuestStore** (LocalStorage): Syncs via `services/localStorageAdapter.ts` → `nettrailer_guest_data_{guestId}`

### Filtering Utility

**Location**: `utils/contentFilter.ts`

```typescript
// Primary filtering function (O(1) Set-based lookup)
filterDislikedContent(content: Content[], hiddenMovies: Content[]): Content[]

// Wrapper accepting UserPreferences
filterHiddenContent(content: Content[], userPreferences: UserPreferences | null): Content[]

// Check if specific content is hidden
isContentDisliked(contentId: number, hiddenMovies: Content[]): boolean

// Get hidden content array
getHiddenContent(userPreferences: UserPreferences | null): Content[]

// Search-specific filtering (lines 124-134)
filterSearchResults(searchResults: Content[], userPreferences: UserPreferences | null): Content[]
```

**⚠️ Important Note**: `filterSearchResults` exists but is **currently unused** in the codebase. The implementation plan should leverage this existing, tested utility instead of creating new filtering logic.

### Mutual Exclusion Logic

**Location**: `stores/createUserStore.ts:209-210, 261-262`

When content is added to liked movies, it's automatically removed from hidden movies (and vice versa). Content cannot be both liked and hidden simultaneously.

---

## Implementation Strategies

### Strategy A: Client-Side Filtering Only

**Approach**: API returns all results, client filters using `filterDislikedContent()` or `filterSearchResults()`

**Pros**:

- ✅ No API changes needed
- ✅ Simple implementation
- ✅ Works for guest users automatically
- ✅ Already proven pattern in Row.tsx

**Cons**:

- ❌ Wastes bandwidth fetching content that gets filtered
- ❌ Inefficient for large result sets
- ❌ Inconsistent with recommendations API pattern

**Best For**: Components like useSearch() hook, InlineSearchBar, ranking creators

---

### Strategy B: Server-Side with Client Payload

**Approach**: API accepts hiddenMovies IDs in request body, server filters before returning

**Pros**:

- ✅ Efficient bandwidth usage
- ✅ Works for both auth and guest users
- ✅ Client controls what to filter

**Cons**:

- ❌ **API Contract Issue**: `/api/custom-rows/[id]/content` is currently a GET endpoint
- ❌ Would require converting GET → POST and updating ALL callers:
    - `CollectionRowLoader` (builds query string URLs)
    - `CustomRowLoader` (builds query string URLs)
    - `Row` component infinite scroll (builds query string URLs)
- ❌ Large payload for users with many hidden items (100+ IDs)
- ❌ Duplicates data already stored in Firebase/localStorage

**Verdict**: ❌ **Not Recommended** - Too much refactoring for GET → POST conversion

---

### Strategy C: Server-Side Fetch (RECOMMENDED)

**Approach**: Server fetches user's hiddenMovies from storage adapter based on auth context

**Pros**:

- ✅ Efficient bandwidth usage
- ✅ No payload bloat
- ✅ Consistent with data architecture (storage adapters)
- ✅ Single source of truth (Firestore/localStorage)
- ✅ No API contract changes needed (stays GET)
- ✅ Works for authenticated users with `withAuth` middleware

**Cons**:

- ❌ Requires server-side auth middleware
- ❌ Guest users more complex (need guestId in header/cookie)
- ❌ Additional Firestore read per request (but cacheable)
- ❌ Slightly increased latency (~50-100ms for Firestore fetch)

**Implementation Path**:

1. For authenticated routes (e.g., `/api/generate-row`): Use existing `withAuth` middleware → fetch from Firestore
2. For public routes (e.g., `/api/custom-rows/[id]/content`): Accept optional auth header → fetch if authenticated, skip if not
3. For guest users: Pass `guestId` in header → fetch from localStorage (server-side storage adapter pattern)

**Best For**: `/api/custom-rows/[id]/content`, `/api/generate-row`, `/api/gemini/analyze`

---

### Hybrid Approach (FINAL RECOMMENDATION)

**Client-Side** (Strategy A):

- ✅ `useSearch()` hook - add `filterSearchResults()` utility
- ✅ `InlineSearchBar` component - filter results from `/api/search`
- ✅ `RankingCreator` - filter search results
- ✅ `SmartRankingCreator` - filter AI suggestions

**Server-Side Fetch** (Strategy C):

- ✅ `/api/custom-rows/[id]/content` - fetch hiddenMovies from storage based on auth
- ✅ `/api/generate-row` - already has `withAuth`, fetch from Firestore
- ✅ `/api/gemini/analyze` - fetch hiddenMovies if authenticated
- ✅ `/api/cron/update-collections` - fetch per-user hiddenMovies when updating

This minimizes refactoring while achieving bandwidth savings on the most-fetched endpoints.

---

## Implementation Plan

### Phase 1: Collections Generation API (MEDIUM Priority - Bandwidth Optimization)

**Note**: Client-side filtering in `Row.tsx` already prevents display of hidden content. This phase optimizes bandwidth and data integrity.

#### Server-Side Changes

**File**: `app/api/custom-rows/[id]/content/route.ts`

**Strategy**: Fetch user's hiddenMovies from Firebase/localStorage based on auth context (Strategy C)

**Changes Required**:

1. **Add auth/guest context detection** (beginning of GET handler, around line 145):

```typescript
import { verifyIdToken } from '@/lib/firebase-admin'
import { getAdminDb } from '@/lib/firebase-admin'
import { Content } from '@/typings'

export async function GET(request: NextRequest) {
    // ... existing code ...

    // Fetch user's hidden movies based on auth context
    let hiddenMovieIds: number[] = []

    try {
        // Check for optional Authorization header (this is a public GET endpoint)
        const authHeader = request.headers.get('authorization')

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const idToken = authHeader.substring(7) // Remove 'Bearer ' prefix

            try {
                // Verify token with Firebase Admin SDK
                const decodedToken = await verifyIdToken(idToken)
                const userId = decodedToken.uid

                // Fetch user's hidden movies from Firestore
                const db = getAdminDb()
                const userDoc = await db.collection('users').doc(userId).get()

                if (userDoc.exists) {
                    const userData = userDoc.data()
                    const hiddenMovies = (userData?.hiddenMovies || []) as Content[]
                    hiddenMovieIds = hiddenMovies.map((m) => m.id)
                }
            } catch (authError) {
                console.error('Auth verification failed:', authError)
                // Continue without filtering - not critical for public endpoint
            }
        }

        // Note: Guest users won't have server-side filtering
        // They already get client-side filtering via Row.tsx
    } catch (error) {
        console.error('Error fetching hidden movies:', error)
        // Continue without filtering - client-side safety net will handle it
    }

    const hiddenIdsSet = new Set(hiddenMovieIds)

    // ... continue with existing TMDB fetch logic ...
}
```

2. **Filter TMDB results before returning** (around line 330, after fetching from TMDB):

```typescript
// After fetching from TMDB, before returning
let filteredResults = allResults
let userHiddenCount = 0

if (hiddenIdsSet.size > 0) {
    filteredResults = allResults.filter((item) => !hiddenIdsSet.has(item.id))
    userHiddenCount = allResults.length - filteredResults.length
}

// Update hidden_count to include both child safety AND user hidden content
const totalHiddenCount = childSafetyHiddenCount + userHiddenCount
```

3. **Update response** (no changes to response structure - stays the same):

```typescript
return NextResponse.json({
    content: filteredResults,
    hidden_count: totalHiddenCount,
    has_more: hasMore,
    // ... existing fields
})
```

#### Client-Side Changes

**NO CLIENT CHANGES NEEDED** ✅

- API remains GET endpoint
- All existing callers continue to work unchanged
- Client-side filtering in `Row.tsx` stays as safety net

#### Implementation Notes

- **Firestore read caching**: Consider caching hiddenMovies for 5-10 minutes to reduce Firestore reads
- **Guest users**: Skip server-side filtering, rely on client-side filtering (no performance impact)
- **Error handling**: If Firestore fetch fails, continue without filtering (client filters anyway)
- **Performance**: ~50-100ms added latency for Firestore fetch on first load, cached thereafter

---

### Phase 2: Search Hook & Ranking Creators (MEDIUM Priority)

**Strategy**: Fix `useSearch()` hook once, let all consumers inherit the filtering (Strategy A - Client-Side)

#### A. Fix useSearch() Hook (Primary Fix)

**File**: `hooks/useSearch.ts`

**Current Issue**: Lines 117-230 return raw results without filtering hidden content

**Changes Required**:

1. **Import filtering utility and user data**:

```typescript
import { filterDislikedContent } from '@/utils/contentFilter'
import { useSessionData } from '@/hooks/useSessionData'
```

2. **Filter results before returning**:

```typescript
// Inside useSearch hook, after fetching results
const { hiddenMovies } = useSessionData()

// Apply hidden content filtering using existing utility
const filteredResults = useMemo(() => {
    if (!results) return []
    return filterDislikedContent(results, hiddenMovies)
}, [results, hiddenMovies])

// Return filteredResults instead of raw results
return {
    results: filteredResults,
    // ... other return values
}
```

**Note**: `useSessionData()` returns individual fields (`hiddenMovies`, `likedMovies`, etc.), NOT a `sessionData` object. Use destructuring to get the specific fields needed.

**Impact**: This single fix automatically applies to:

- ✅ `RankingCreator.tsx:720-756` - Manual ranking search
- ✅ Any other component using `useSearch()`

---

#### B. Manual Ranking Creator

**File**: `components/rankings/RankingCreator.tsx:720-756`

**Changes Required**: ✅ **NONE** - Will automatically use filtered results from fixed `useSearch()` hook

---

#### C. Smart Ranking Creator (AI)

**File**: `components/rankings/SmartRankingCreator.tsx:269-321`

**Current Issue**: Renders raw results from `/api/generate-row` without filtering

**Changes Required**:

1. **Import filtering utility and session data**:

```typescript
import { filterDislikedContent } from '@/utils/contentFilter'
import { useSessionData } from '@/hooks/useSessionData'
```

2. **Filter AI-generated suggestions**:

```typescript
const { hiddenMovies } = useSessionData()

const filteredSuggestions = useMemo(() => {
    if (!aiSuggestions) return []
    return filterDislikedContent(aiSuggestions, hiddenMovies)
}, [aiSuggestions, hiddenMovies])

// Use filteredSuggestions instead of aiSuggestions in JSX
```

**Note**: Server-side filtering for `/api/generate-row` covered in Phase 4

---

### Phase 3: Collection Creator/Editor Search (MEDIUM Priority)

**Strategy**: Fix `InlineSearchBar` component (Strategy A - Client-Side)

**Files**:

- `components/modals/InlineSearchBar.tsx:52-91` - Inline search component
- Used by: `CollectionCreatorModal` and `CollectionEditorModal`

**Current Issue**: Calls `/api/search` and only filters for "not already added" content, hidden movies appear in results

**Changes Required**:

1. **Import filtering utility**:

```typescript
import { filterDislikedContent } from '@/utils/contentFilter'
import { useSessionData } from '@/hooks/useSessionData'
```

2. **Apply filtering after search results are received** (around line 70-80):

```typescript
const { hiddenMovies } = useSessionData()

// Filter search results to exclude hidden content
const filteredResults = useMemo(() => {
    if (!searchResults) return []
    return filterDislikedContent(searchResults, hiddenMovies)
}, [searchResults, hiddenMovies])

// Use filteredResults for rendering instead of raw searchResults
```

**Alternative**: If `InlineSearchBar` already uses `useSearch()` hook, fixing the hook in Phase 2 may automatically fix this component. Verify which approach is used.

---

### Phase 4: AI-Generated Collections (HIGH Priority)

**Strategy**: Use existing `withAuth` middleware to fetch hiddenMovies server-side (Strategy C)

#### Server-Side Changes

**File**: `app/api/generate-row/route.ts`

**Current Status**: Route uses `withAuth` middleware which provides `userId` as parameter

**Changes Required**:

1. **Import Firebase Admin SDK** (top of file):

```typescript
import { getAdminDb } from '@/lib/firebase-admin'
import { Content } from '@/typings'
```

2. **Fetch user's hidden movies from Firestore** (around line 30, inside handler function):

```typescript
// Inside route handler - withAuth provides userId parameter
async function handleGenerateRow(request: NextRequest, userId: string): Promise<NextResponse> {
    let hiddenMovieIds: number[] = []

    try {
        // Fetch user's hidden movies from Firestore using Admin SDK
        const db = getAdminDb()
        const userDoc = await db.collection('users').doc(userId).get()

        if (userDoc.exists) {
            const userData = userDoc.data()
            const hiddenMovies = (userData?.hiddenMovies || []) as Content[]
            hiddenMovieIds = hiddenMovies.map((m) => m.id)
        }
    } catch (error) {
        console.error('Error fetching hidden movies:', error)
        // Continue without filtering
    }

    // ... rest of handler logic ...
}

// Export with withAuth wrapper
export const POST = withAuth(handleGenerateRow)
```

3. **Add to excluded IDs set** (around line 97):

```typescript
const excludeIdsSet = new Set([
    ...body.excludeIds,
    ...hiddenMovieIds, // Add hidden movies to exclusion list
])
```

4. **Filter remains the same** (already excludes based on set):

```typescript
const filteredMovies = enrichedMovies.filter((m) => !excludeIdsSet.has(m.tmdbId))
```

#### Client-Side Changes

**✅ NO CLIENT CHANGES NEEDED**

- Server fetches hiddenMovies using existing auth context
- No payload changes required
- No API contract changes

#### Implementation Notes

- **Caching**: Consider caching user's hiddenMovies for 5-10 minutes to reduce Firestore reads
- **Guest users**: This route requires auth, so no guest handling needed
- **Error handling**: If Firestore fetch fails, continue with just the manually excluded IDs

---

### Phase 5: Gemini Analyze API (LOW Priority - Optional)

**File**: `app/api/gemini/analyze/route.ts:1-86`

**Current Status**: Returns genre IDs and recommendations without considering hidden content

**Strategy**: Decide between server-side fetch (Strategy C) or client-side filtering (Strategy A)

#### Option A: Server-Side Fetch (Recommended for consistency)

**Changes Required**:

1. **Determine if route has auth context** - Check if `withAuth` is used
2. **If using withAuth, fetch hidden movies from Firestore** (if authenticated):

```typescript
import { getAdminDb } from '@/lib/firebase-admin'
import { Content } from '@/typings'

// Inside handler function (if userId is available via withAuth)
let hiddenMovieIds: number[] = []
if (userId) {
    const db = getAdminDb()
    const userDoc = await db.collection('users').doc(userId).get()

    if (userDoc.exists) {
        const userData = userDoc.data()
        const hiddenMovies = (userData?.hiddenMovies || []) as Content[]
        hiddenMovieIds = hiddenMovies.map((m) => m.id)
    }
}
```

3. **Include hidden IDs in Gemini prompt context** (optional - may confuse NLU):

```typescript
// Add to prompt: "Exclude the following content IDs: [hiddenMovieIds]"
```

4. **Filter results before returning** (if Gemini returns specific content):

```typescript
const filteredResults = results.filter((item) => !hiddenMovieIds.includes(item.id))
```

#### Option B: Client-Side Filtering (Easier, recommended for now)

**Changes Required**: ✅ **NONE**

- Let consuming components (SmartRankingCreator, SimplifiedSmartBuilder) filter results
- Already covered in Phase 2C (SmartRankingCreator client-side filtering)

**Recommendation**: Use **Option B** for now. Gemini Analyze returns genre IDs and concepts, not specific content. The content fetching happens in subsequent API calls (generate-row, etc.) which we're already fixing.

**Note**: If Gemini Analyze starts returning specific content IDs/titles, revisit this phase

---

### Phase 6: Auto-Update Cron Job (LOW Priority)

**File**: `app/api/cron/update-collections/route.ts`

**Status**: Currently disabled (`AUTO_UPDATE_CRON_ENABLED = false` at line 35)

**Changes Required** (when re-enabling):

1. **Import Firebase Admin SDK and load user's hiddenMovies from Firestore**:

```typescript
import { getAdminDb } from '@/lib/firebase-admin'
import { Content } from '@/typings'

// For each user's collection being updated
const db = getAdminDb()
const userDoc = await db.collection('users').doc(userId).get()

let hiddenMovies: Content[] = []
if (userDoc.exists) {
    const userData = userDoc.data()
    hiddenMovies = (userData?.hiddenMovies || []) as Content[]
}

const hiddenIdsSet = new Set(hiddenMovies.map((m) => m.id))
```

2. **Filter TMDB results before updating collection**:

```typescript
const filteredContent = tmdbResults.filter((item) => !hiddenIdsSet.has(item.id))
```

3. **Update collection with filtered content**

---

## Implementation Order

### Recommended Sequence (Revised)

**Remember**: Client-side filtering in `Row.tsx` already prevents visual bugs. These fixes optimize bandwidth and data integrity.

#### Quick Wins (Client-Side - Low Risk)

1. **Phase 2A-B**: Fix `useSearch()` hook
    - **Priority**: HIGH (fixes ranking + other consumers)
    - **Impact**: Ranking creator manual search immediately fixed
    - **Estimated Effort**: 30 minutes
    - **Risk**: Low - pure client-side logic

2. **Phase 2C**: Fix SmartRankingCreator AI suggestions
    - **Priority**: MEDIUM
    - **Impact**: AI ranking suggestions filter hidden content
    - **Estimated Effort**: 15-30 minutes
    - **Risk**: Low - client-side filtering

3. **Phase 3**: Fix InlineSearchBar component
    - **Priority**: MEDIUM
    - **Impact**: Collection editor search filters hidden content
    - **Estimated Effort**: 15-30 minutes
    - **Risk**: Low - client-side filtering
    - **Note**: May be automatic if InlineSearchBar uses useSearch() hook

#### Server-Side Optimizations (Medium Risk)

4. **Phase 4**: AI-Generated Collections (`/api/generate-row`)
    - **Priority**: HIGH
    - **Impact**: AI collections don't include hidden content
    - **Estimated Effort**: 1-2 hours
    - **Risk**: Medium - server-side changes with auth context
    - **Benefit**: Already has `withAuth`, clean implementation

5. **Phase 1**: Collections Generation API (`/api/custom-rows/[id]/content`)
    - **Priority**: MEDIUM (bandwidth optimization)
    - **Impact**: Reduces bandwidth for genre-based collections
    - **Estimated Effort**: 2-3 hours
    - **Risk**: Medium - auth context detection, Firestore fetch, caching
    - **Note**: Not urgent due to client-side safety net

#### Optional / Future Work

6. **Phase 5**: Gemini Analyze API (SKIP for now)
    - **Priority**: LOW
    - **Impact**: Minimal - Gemini returns concepts, not specific content
    - **Estimated Effort**: 1-2 hours
    - **Recommendation**: Skip unless Gemini starts returning specific content

7. **Phase 6**: Auto-Update Cron Job (when re-enabling)
    - **Priority**: LOW (currently disabled)
    - **Impact**: Future-proofing
    - **Estimated Effort**: 2-3 hours
    - **Note**: Only implement when AUTO_UPDATE_CRON_ENABLED is re-enabled

### Total Estimated Time

- **Quick Wins (Phases 2-3)**: 1-1.5 hours
- **Server Optimizations (Phases 1, 4)**: 3-5 hours
- **Optional (Phases 5-6)**: 3-5 hours

**Grand Total**: 7-11.5 hours (or 1-1.5 hours for just the quick wins)

---

## Key Decisions & Trade-offs

### Decision 1: Guest User Filtering Strategy

**Issue**: Server-side filtering requires access to hiddenMovies, but guest data is stored in localStorage (client-side only)

**Options**:

1. **Skip server filtering for guests** - Rely on client-side filtering only
    - ✅ Simple implementation
    - ✅ Guests already get client-side filtering
    - ❌ Wastes bandwidth for guest users
2. **Pass guest hidden IDs in header** - Add `X-Hidden-Ids` header with ID list
    - ✅ Enables server filtering
    - ❌ Header size limits (typically 8KB)
    - ❌ Exposes hidden content in network requests
3. **Server-side guest storage** - Store guest preferences server-side with cookie session
    - ✅ Consistent with auth users
    - ❌ Requires backend storage for guests
    - ❌ Privacy implications

**Recommendation**: **Option 1** - Skip server filtering for guests. The client-side safety net is sufficient, and most features require auth anyway.

---

### Decision 2: Firestore Caching Strategy

**Issue**: Fetching hiddenMovies from Firestore on every API call adds latency and costs

**Options**:

1. **No caching** - Fetch fresh on every request
    - ✅ Always up-to-date
    - ❌ High Firestore read costs
    - ❌ Added latency (~50-100ms per request)
2. **In-memory caching** - Cache for 5-10 minutes per user
    - ✅ Reduced Firestore reads (99% reduction)
    - ✅ Lower latency
    - ❌ Stale data for up to 10 minutes
    - ❌ Requires cache invalidation logic
3. **Edge caching** - Use Vercel Edge config or Redis
    - ✅ Fastest option
    - ❌ Additional infrastructure
    - ❌ More complex cache invalidation

**Recommendation**: **Option 2** - In-memory caching with 5-minute TTL. Acceptable staleness trade-off for bandwidth savings.

---

### Decision 3: API Contract for `/api/custom-rows/[id]/content`

**Issue**: Currently GET endpoint; can't accept request body for hidden IDs

**Options Reviewed**:

1. **Convert GET → POST** - ❌ Rejected (too much refactoring)
2. **Query parameters** - ❌ Rejected (URL length limits with 100+ hidden IDs)
3. **Server-side fetch** - ✅ **Selected** (Strategy C)

**Decision**: Use Strategy C (server-side fetch) to avoid API contract changes

---

### Decision 4: SimplifiedSmartBuilder Component

**Location**: `components/customRows/smart/SimplifiedSmartBuilder.tsx:122-182`

**Issue**: This component also calls `/api/generate-row` without filtering

**Recommendation**: Same as SmartRankingCreator - add client-side filtering with `filterDislikedContent()`. Server-side fix in Phase 4 will eventually handle it.

---

## Testing Checklist

### Functional Testing

#### Collections

- [ ] Hidden content doesn't appear in genre-based collections (authenticated users)
- [ ] Hidden content doesn't appear in genre-based collections (guest users)
- [ ] Hidden content doesn't appear in AI-generated collections
- [ ] Hidden content filtering works with infinite scroll pagination
- [ ] Collection "hidden_count" accurately reflects both child safety + user hidden content

#### Rankings

- [ ] Hidden content doesn't appear in ranking creator manual search
- [ ] Hidden content doesn't appear in smart ranking AI suggestions
- [ ] Can still create rankings with non-hidden content
- [ ] Ranking search results update when content is hidden/unhidden

#### Collection Editor

- [ ] Hidden content doesn't appear in collection editor search
- [ ] Can still add non-hidden content to collections
- [ ] Editor search results update when content is hidden/unhidden

#### Regression Testing

- [ ] Browse pages still filter correctly
- [ ] Recommendations still exclude hidden content
- [ ] Hidden content page (`/hidden`) still shows all hidden items
- [ ] Search results still filter hidden content
- [ ] Genre pages still filter hidden content
- [ ] "More Like This" in modal still filters hidden content

### Performance Testing

- [ ] No performance degradation with large hiddenMovies arrays (100+ items)
- [ ] Server-side filtering doesn't increase API response time significantly
- [ ] Client-side filtering doesn't cause UI lag

### Edge Cases

- [ ] User with no hidden content sees normal results
- [ ] User with 100% hidden content in a genre sees empty collection (not error)
- [ ] Hiding content while viewing a collection updates the UI
- [ ] Unhiding content refreshes collection to show it
- [ ] Guest users have hidden content filtered correctly
- [ ] Switching between auth/guest users maintains separate hidden lists

---

## Risk Assessment

### Low Risk

- **Phase 2, 3**: Client-side filtering in components
    - Already proven pattern used elsewhere
    - Easy to rollback
    - No API changes

### Medium Risk

- **Phase 1, 4**: Server-side API filtering
    - Requires coordination between client and server
    - Must handle auth/guest context properly
    - Testing required for edge cases

### High Risk

- **Phase 6**: Auto-update cron job
    - Currently disabled, low immediate risk
    - Must handle batch operations efficiently
    - Requires Firestore queries for each user

---

## Rollback Plan

### If Issues Arise During Implementation

1. **Client-Side Changes**: Remove filtering useMemo, revert to showing all content
2. **Server-Side Changes**: Remove hiddenMovieIds parameter handling, return unfiltered results
3. **Emergency**: Deploy previous working commit, investigate in staging environment

### Version Control

- Create feature branch: `fix/hidden-content-filtering`
- Commit each phase separately for easier rollback
- Test each phase before proceeding to next

---

## Success Criteria

Implementation is considered successful when:

1. ✅ All items in Testing Checklist pass
2. ✅ No regression bugs in existing filtering
3. ✅ Performance remains acceptable (< 100ms additional latency)
4. ✅ Hidden content never appears in any user-facing feature except:
    - `/hidden` page (intentional display)
    - Admin/debug interfaces (if any exist)

---

## Open Questions (Answered via Code Review)

### Question 1: Should we show a message when all content in a collection is hidden?

**Answer**: Current behavior appears acceptable - empty collections are handled gracefully. No changes needed unless user testing shows confusion.

### Question 2: Should hiding content remove it from existing manual collections?

**Answer**: Current behavior keeps hidden content in collections (but filters it from display via Row.tsx). This is acceptable because:

- Users can manually remove items from collections
- Hidden content may become visible again if user unhides it
- Manual collections represent user's curation choices
  **Recommendation**: Keep current behavior, document it

### Question 3: Should we track analytics on how often hidden content is filtered?

**Answer**: Deferred. Out of scope for this implementation. Could be added later if product analytics are implemented.

### Question 4: Performance optimization for large hidden lists?

**Answer**: Resolved - Use **Strategy C (server-side fetch)** instead of client payload. This avoids sending 100+ IDs in requests. See Decision 2 for caching strategy.

### Question 5: What about SimplifiedSmartBuilder component?

**Answer**: Identified as gap. Add to Phase 2C alongside SmartRankingCreator for client-side filtering. Server-side fix in Phase 4 will handle it long-term.

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Answer open questions** before implementation
3. **Create feature branch**: `fix/hidden-content-filtering`
4. **Implement Phase 1** (highest priority)
5. **Test thoroughly** after each phase
6. **Deploy incrementally** to catch issues early

---

## References

### Key Files

- `stores/createUserStore.ts` - Hidden movies storage
- `utils/contentFilter.ts` - Filtering utilities
- `app/api/recommendations/personalized/route.ts` - Best practice pattern
- `components/content/Row.tsx` - Client-side filtering example

### Related Documentation

- `CLAUDE.md` - Architecture overview
- `types/shared.ts` - UserPreferences type definition
- `types/userLists.ts` - Collection types

---

**Document Version**: 2.2
**Last Updated**: 2025-11-17
**Author**: Claude Code Analysis

---

## Document Changelog

### Version 2.2 (2025-11-17) - Architecture Update

**Removed references to deleted /movies and /tv pages**

**Changes**:

- Updated context section: "/movies, /tv, or root pages" → "browse pages"
- Renamed section: "Root (/) / Movies / TV Pages" → "Browse Pages (Root /)"
- Updated regression testing: "Root/Movies/TV pages" → "Browse pages"

**Reason**: /movies and /tv routes are being removed from the application architecture.

---

### Version 2.1 (2025-11-17) - Code Example Corrections

**Fixed incorrect auth/storage patterns in implementation examples**

**Critical Fixes**:

1. **Firebase Admin SDK**: Replaced incorrect `@clerk/nextjs` and `@/services/firebase` (client SDK) imports with correct `@/lib/firebase-admin` imports
2. **Auth Pattern**: Fixed to use `withAuth` middleware from `@/lib/auth-middleware` which provides `userId` as parameter
3. **Firestore Access**: Corrected to use `getAdminDb()` from `@/lib/firebase-admin` for server-side database access
4. **useSessionData Hook**: Fixed destructuring pattern - returns individual fields (`hiddenMovies`), NOT a `sessionData` object
5. **Token Verification**: Updated custom-rows endpoint to use `verifyIdToken()` from Firebase Admin SDK for optional auth

**Files Updated**:

- Phase 1 (custom-rows/[id]/content): Fixed to use Firebase Admin SDK with optional auth header verification
- Phase 2A (useSearch hook): Fixed to destructure `hiddenMovies` directly from `useSessionData()`
- Phase 2C (SmartRankingCreator): Fixed to import and use `useSessionData()` correctly
- Phase 3 (InlineSearchBar): Fixed to use correct destructuring pattern
- Phase 4 (generate-row): Fixed to use `withAuth` middleware and Firebase Admin SDK
- Phase 5 (Gemini Analyze): Fixed to use Firebase Admin SDK if using withAuth
- Phase 6 (Cron Job): Fixed to use Firebase Admin SDK with proper error handling

**Architecture Alignment**:

- All server routes now use Firebase Admin SDK (`lib/firebase-admin.ts`) not client SDK
- Auth routes use `withAuth` middleware which provides `userId` parameter
- Public routes optionally verify Authorization header using `verifyIdToken()`
- Client hooks correctly destructure from `useSessionData()` return object

---

### Version 2.0 (2025-11-17) - Major Revision

**Based on comprehensive code review feedback**

**Critical Corrections**:

1. **API Contract Issue Fixed**: Removed incorrect POST conversion approach for `/api/custom-rows/[id]/content` (GET endpoint)
2. **Strategy C Added**: Introduced server-side fetch approach using auth context instead of client payloads
3. **Component Path Updates**: Fixed references from outdated `list-selection/` to actual `InlineSearchBar.tsx`
4. **Utility Leverage**: Identified unused `filterSearchResults()` utility and recommended its use
5. **useSearch() Hook**: Emphasized fixing the hook once instead of duplicating filters in components
6. **Visual Impact Clarification**: Added context that Row.tsx already filters client-side, so this is bandwidth optimization not bug fix

**Strategy Changes**:

- **Rejected**: Strategy B (client payload via POST body) - too much refactoring
- **Added**: Strategy C (server-side fetch via auth context) - recommended approach
- **Hybrid Approach**: Client-side for components, server-side for APIs with auth

**Scope Adjustments**:

- Phase 1: Downgraded from HIGH to MEDIUM priority (bandwidth optimization, not visual bug)
- Phase 2: Split into 2A (useSearch hook), 2B (automatic), 2C (client filtering)
- Phase 3: Updated to reference InlineSearchBar, noted possible automatic fix
- Phase 4: Updated to use withAuth middleware approach
- Phase 5: Downgraded to LOW/OPTIONAL (Gemini returns concepts, not content)
- Identified SimplifiedSmartBuilder as additional gap

**Decisions Documented**:

1. Guest filtering: Skip server-side, rely on client filtering
2. Caching: 5-minute in-memory cache for hiddenMovies
3. API contract: Use server-side fetch, avoid GET→POST conversion
4. SimplifiedSmartBuilder: Add client-side filtering

**Open Questions**: All answered based on code review findings

---

### Version 1.0 (2025-11-17) - Initial Draft

- Initial gap analysis
- Original implementation plan (later revised)
- Testing checklist
- Risk assessment
