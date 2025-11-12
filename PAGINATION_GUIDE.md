# Firestore Pagination Implementation Guide

## Overview

This guide documents the pagination implementation pattern for Firestore queries. Phase 1 (safety limits) is complete. Phase 2 (cursor support) is partially complete. Follow this guide to complete the remaining functions.

---

## Phase 1: Safety Limits ✅ COMPLETE

All list queries now have limits to prevent unbounded fetches:

- `getUserRankings()` - Added limit(50)
- All other functions already had limits

**Commit:** `3fa7e2d` - fix(firestore): add limit to getUserRankings

---

## Phase 2: Cursor Pagination Support 🔄 IN PROGRESS

### Pattern: Update Firestore Function

**Example:** `getPublicRankings()` (COMPLETE)

```typescript
// Before
export async function getPublicRankings(
    sortBy: string,
    limit: number = 50
): Promise<Ranking[]> {
    const q = query(rankingsRef, where(...), orderBy(...), firestoreLimit(limit))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => doc.data())
}

// After
import { DocumentSnapshot, startAfter } from 'firebase/firestore'
import { PaginatedResult, createPaginatedResult } from '../../types/pagination'

export async function getPublicRankings(
    sortBy: string,
    limit: number = 50,
    startAfterDoc?: DocumentSnapshot | null  // ✅ Add cursor parameter
): Promise<PaginatedResult<Ranking>> {  // ✅ Return paginated result
    const constraints = [where(...), orderBy(...), firestoreLimit(limit)]

    // ✅ Add cursor if provided
    if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc))
    }

    const q = query(rankingsRef, ...constraints)
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map(doc => doc.data())

    // ✅ Return with cursor
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
    return createPaginatedResult(data, lastDoc, limit)
}
```

### Remaining Functions to Update

#### High Priority

1. **getRankingComments** (`utils/firestore/rankingComments.ts:161`)
    - Current: `Promise<RankingComment[]>`
    - Update to: `Promise<PaginatedResult<RankingComment>>`
    - Add `startAfterDoc?: DocumentSnapshot | null` parameter

2. **getAllNotifications** (`utils/firestore/notifications.ts:120`)
    - Current: `Promise<Notification[]>`
    - Update to: `Promise<PaginatedResult<Notification>>`
    - Add `startAfterDoc?: DocumentSnapshot | null` parameter

3. **getUserComments** (`utils/firestore/rankingComments.ts:364`)
    - Current: `Promise<RankingComment[]>`
    - Update to: `Promise<PaginatedResult<RankingComment>>`
    - Add `startAfterDoc?: DocumentSnapshot | null` parameter

4. **getUserLikedRankings** (`utils/firestore/rankings.ts:489`)
    - Current: `Promise<Ranking[]>`
    - Update to: `Promise<PaginatedResult<Ranking>>`
    - Add `startAfterDoc?: DocumentSnapshot | null` parameter
    - **Note:** This function has batched fetches - needs special handling

---

## Phase 3: Update Stores and Components

### Pattern: Update Zustand Store

**Example:** `rankingStore.ts` - `loadPublicRankings`

```typescript
// Before
interface RankingStoreState {
    communityRankings: Ranking[]
    isLoading: boolean
}

loadPublicRankings: async (sortBy, limit) => {
    const rankings = await getPublicRankings(sortBy, limit)
    set({ communityRankings: rankings })
}

// After
import { DocumentSnapshot } from 'firebase/firestore'

interface RankingStoreState {
    communityRankings: Ranking[]
    isLoading: boolean

    // ✅ Add pagination state
    communityRankingsCursor: DocumentSnapshot | null
    hasMoreCommunityRankings: boolean
}

loadPublicRankings: async (sortBy, limit, reset = true) => {
    const cursor = reset ? null : get().communityRankingsCursor

    const { data, lastDoc, hasMore } = await getPublicRankings(sortBy, limit, cursor)

    set({
        communityRankings: reset ? data : [...get().communityRankings, ...data], // ✅ Append for "Load More"
        communityRankingsCursor: lastDoc,
        hasMoreCommunityRankings: hasMore,
    })
}
```

### Stores to Update

1. **rankingStore.ts**
    - `loadPublicRankings()` - NEEDS UPDATE (return type changed)
    - `loadComments()` - NEEDS UPDATE

2. **notificationStore.ts**
    - `loadNotifications()` - NEEDS UPDATE

3. **app/rankings/page.tsx** (Component)
    - `getUserComments()` call - NEEDS UPDATE
    - `getUserLikedRankings()` call - NEEDS UPDATE

---

## Phase 4: Add UI "Load More" Buttons

### Pattern: Add Load More Button

```typescript
// In component
const {
    communityRankings,
    hasMoreCommunityRankings,
    loadPublicRankings
} = useRankingStore()

return (
    <>
        <RankingGrid rankings={communityRankings} />

        {hasMoreCommunityRankings && (
            <button
                onClick={() => loadPublicRankings(sortBy, 50, false)}
                className="..."
            >
                Load More
            </button>
        )}
    </>
)
```

### Components to Update

1. **app/rankings/page.tsx** (Community Rankings tab)
2. **app/rankings/page.tsx** (Comments tab)
3. **app/rankings/page.tsx** (Liked Rankings tab)
4. **components/rankings/CommentSection.tsx** (Comments list)

---

## Helper Hook (Optional Enhancement)

Create a reusable pagination hook for consistency:

```typescript
// hooks/usePagination.ts
export function usePagination<T>(
    fetchFn: (cursor: DocumentSnapshot | null) => Promise<PaginatedResult<T>>
) {
    const [data, setData] = useState<T[]>([])
    const [cursor, setCursor] = useState<DocumentSnapshot | null>(null)
    const [hasMore, setHasMore] = useState(true)
    const [isLoading, setIsLoading] = useState(false)

    const loadMore = async (reset = false) => {
        if (isLoading) return

        setIsLoading(true)
        const result = await fetchFn(reset ? null : cursor)

        setData((prev) => (reset ? result.data : [...prev, ...result.data]))
        setCursor(result.lastDoc)
        setHasMore(result.hasMore)
        setIsLoading(false)
    }

    return { data, loadMore, hasMore, isLoading, reset: () => loadMore(true) }
}

// Usage in component
const {
    data: rankings,
    loadMore,
    hasMore,
} = usePagination((cursor) => getPublicRankings('recent', 50, cursor))
```

---

## Testing Checklist

- [ ] Public rankings "Load More" works
- [ ] Comments pagination works
- [ ] User comments tab pagination works
- [ ] Liked rankings tab pagination works
- [ ] Notifications pagination works (if implemented)
- [ ] Reset on tab switch works (starts from beginning)
- [ ] "Load More" button disappears when no more results
- [ ] Multiple rapid "Load More" clicks handled correctly

---

## Current Status

**✅ Complete:**

- ✅ **Phase 1**: All queries have safety limits (commit e84ff8b)
- ✅ **Phase 2**: All 7 Firestore functions support cursor pagination (commit e84ff8b)
- ✅ **Phase 3**: All stores and components updated for PaginatedResult (commit bc7f33b)

**⏸️ Pending (Future Enhancement):**

- Add pagination state (cursors, hasMore) to stores
- Add "Load More" UI buttons to components
- Implement infinite scroll UX

---

## Implementation Complete

All core pagination infrastructure is in place. The API now supports cursor-based pagination across all list queries:

- 7 Firestore functions return `PaginatedResult<T>` with cursor support
- All stores extract `.data` from paginated results
- All components handle paginated API responses

**Next Steps for "Load More" Functionality:**

1. Add state to stores: `cursor: DocumentSnapshot | null`, `hasMore: boolean`
2. Update store methods to accept `reset` parameter and append data
3. Add "Load More" buttons to UI components
4. Use `hasMore` flag to show/hide buttons

See patterns above for detailed implementation examples.
