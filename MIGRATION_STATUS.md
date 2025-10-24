# Schema Migration Status - Phase 6 Update

## ✅ COMPLETED (Phases 0-5)

### Phase 0: Delete Script ✅

- `scripts/delete-all-user-data.ts` - Ready for deployment

### Phase 1: Type Definitions ✅

- `atoms/authSessionAtom.ts` - AuthPreferences updated
- `atoms/guestSessionAtom.ts` - GuestPreferences updated
- `types/userData.ts` - UserPreferences updated (NEW SCHEMA)
- `atoms/userDataAtom.ts` - UserPreferences updated (**CRITICAL FIX**)
- `types/userLists.ts` - UserListsState deprecated

### Phase 2: Storage Services ✅

- `services/authStorageService.ts` - Complete rewrite
- `services/guestStorageService.ts` - localStorage v2

### Phase 3: Service Layer ✅

- `services/userListsService.ts` - Methods updated
- `services/userDataService.ts` - Compatible

### Phase 4: Zustand Stores ✅

- `stores/authStore.ts` - All methods updated
- `stores/guestStore.ts` - All methods updated

### Phase 5: Hooks ✅ (ALL CRITICAL HOOKS FIXED)

- ✅ `hooks/useRatings.ts` - **DELETED** (replaced by useLikedHidden)
- ✅ `hooks/useLikedHidden.ts` - NEW (replaces useRatings)
- ✅ `hooks/useWatchlist.ts` - Updated
- ✅ `hooks/useListsReadOnly.ts` - Updated
- ✅ `hooks/useAuthData.ts` - **FULLY MIGRATED**
- ✅ `hooks/useGuestData.ts` - **FULLY MIGRATED**
- ✅ `hooks/useSessionData.ts` - **FULLY MIGRATED**
- ✅ `hooks/useUserData.ts` - **FULLY MIGRATED** (all 3 branches)
- ✅ `hooks/useSessionManager.ts` - **FULLY MIGRATED**

---

## ⚠️ IN PROGRESS (Phase 6)

### Components - Partially Updated

#### ✅ Fully Fixed:

1. `components/WatchLaterButton.tsx` - ✅ Updated to use isInWatchlist hook
2. `components/AvatarDropdown.tsx` - ✅ Updated property names
3. `components/LikeOptions.tsx` - ✅ Updated (from previous phase)
4. `components/SimpleLikeButton.tsx` - ✅ Updated (from previous phase)

#### ⚠️ Hook Signatures Updated, Usage Sites Need Fixing:

5. `components/Modal.tsx` - ⚠️ **Hook signatures updated**, but usage sites throughout the file still reference old methods

    **Usage sites that need updating in Modal.tsx:**
    - Line ~112-137: `handleWatchlistToggle()` function
    - Line ~260-295: Keyboard shortcut handlers ('l', 'h' keys)
    - Line ~477-650: Inline dropdown rendering
    - Line ~686-784: Button state checks

    **Pattern to replace:**

    ```typescript
    // OLD:
    const defaultLists = getDefaultLists()
    const watchlist = defaultLists.watchlist
    const isInWatchlist = watchlist ? watchlist.items.some(...) : false

    // NEW:
    const inWatchlist = isInWatchlist(content.id)

    // OLD:
    const currentRating = getRating(contentId)
    const isLiked = currentRating?.rating === 'liked'
    if (isLiked) removeRating(contentId)
    else setRating(contentId, 'liked', content)

    // NEW:
    const liked = isLiked(contentId)
    if (liked) removeLikedMovie(contentId)
    else addLikedMovie(content)

    // OLD:
    const customLists = getCustomLists()

    // NEW:
    const allLists = getAllLists()
    ```

#### ❌ Not Yet Started:

6. `components/ListDropdown.tsx` - Needs `getDefaultLists` → hook methods
7. `components/ListSelectionModal.tsx` - Needs `userLists`/`getDefaultLists`/`getCustomLists` update
8. `components/AuthFlowDebugger.tsx` - Needs `getDefaultLists`/`getCustomLists` → `getAllLists`
9. `components/PostHydrationEffects.tsx` - Argument count issues
10. `components/Banner.tsx` - Needs `ratings` → `likedMovies`/`hiddenMovies`
11. `components/Row.tsx` - Needs `ratings` → `likedMovies`/`hiddenMovies`
12. `components/SearchResults.tsx` - Needs `ratings` → `likedMovies`/`hiddenMovies`

---

## ❌ NOT STARTED

### Pages (Phase 7)

1. `pages/hidden.tsx` - Needs `getDefaultLists` → `getAllLists`, property updates
2. `pages/liked.tsx` - Needs `getDefaultLists` → `getAllLists`, property updates
3. `pages/watchlists.tsx` - Needs complete overhaul (ratings/watchlist/userLists)
4. `pages/genres/[type]/[id].tsx` - Needs `ratings` → `likedMovies`/`hiddenMovies`

### Utils (Phase 8)

1. `utils/contentFilter.ts` - 8 errors - Needs schema updates
2. `utils/csvExport.ts` - 4 errors - Needs schema updates

### Services (Additional)

1. `services/sessionManagerService.ts` - 7 errors
2. `services/debouncedFirebaseService.ts` - 2 errors

### Scripts (Phase 9)

1. `scripts/check-user-data.ts` - 7 errors
2. `scripts/clear-test-user.ts` - 9 errors
3. `scripts/test-user-watchlist.ts` - 34 errors

### Test Files (Low Priority)

1. `test-persistence-flow.ts` - 15 errors
2. `test-watchlist-flow.ts` - 14 errors
3. `utils/testFirestoreFlow.ts` - 10 errors
4. `utils/verifyUserData.ts` - 2 errors

---

## 🔧 DataSummary Interface Issue

The `DataSummary` interface likely still has `ratingsCount` but code is returning:

```typescript
{
    ;(watchlistCount,
        likedCount, // NEW
        hiddenCount, // NEW
        listsCount,
        totalItems,
        isEmpty)
}
```

**Fix:** Update the DataSummary interface definition (likely in types or components).

---

## 📊 Migration Progress

| Phase               | Files | Status     | Completion |
| ------------------- | ----- | ---------- | ---------- |
| 0: Scripts          | 1     | ✅ Done    | 100%       |
| 1: Types            | 5     | ✅ Done    | 100%       |
| 2: Storage Services | 2     | ✅ Done    | 100%       |
| 3: Service Layer    | 2     | ✅ Done    | 100%       |
| 4: Zustand Stores   | 2     | ✅ Done    | 100%       |
| 5: Hooks            | 9/9   | ✅ Done    | 100%       |
| 6: Components       | 4/12  | ⚠️ Partial | 33%        |
| 7: Pages            | 0/4   | ❌ Pending | 0%         |
| 8: Utils            | 0/4   | ❌ Pending | 0%         |
| 9: Scripts          | 0/3   | ❌ Pending | 0%         |
| 10: Tests           | 0/4   | ❌ Pending | 0%         |

**Overall Progress: ~60%** (critical foundation complete)

---

## 🎯 Priority Order for Completion

### **CRITICAL (Must fix before deployment):**

1. Complete Modal.tsx usage sites (most important user-facing component)
2. Fix remaining components (ListDropdown, ListSelectionModal, etc.)
3. Fix all pages (hidden, liked, watchlists, genres)
4. Fix utils (contentFilter, csvExport)
5. Fix services (sessionManagerService, debouncedFirebaseService)
6. Fix DataSummary interface

### **MEDIUM (Development/Debug tools):**

7. Fix AuthFlowDebugger.tsx
8. Fix check-user-data.ts script

### **LOW (Can defer):**

9. Fix other test scripts
10. Fix test files

---

## 🚀 Quick Reference: Schema Changes

### Properties Renamed:

- `ratings` → `likedMovies` + `hiddenMovies`
- `watchlist` → `defaultWatchlist`
- `userLists` → `userCreatedWatchlists`

### Methods Removed:

- `addRating(id, rating, content)` →
    - `addLikedMovie(content)` if rating === 'liked'
    - `addHiddenMovie(content)` if rating === 'disliked'
- `removeRating(id)` → `removeLikedMovie(id)` or `removeHiddenMovie(id)`
- `getRating(id)` → `isLiked(id)` or `isHidden(id)`
- `getDefaultLists()` → Use hook methods directly (isInWatchlist, etc.)
- `getCustomLists()` → `getAllLists()`

### New Methods Added:

- `isLiked(contentId): boolean`
- `isHidden(contentId): boolean`
- `addLikedMovie(content: Content): void`
- `removeLikedMovie(contentId: number): void`
- `addHiddenMovie(content: Content): void`
- `removeHiddenMovie(contentId: number): void`
- `getAllLists(): UserList[]`

---

## ✅ What's Safe to Deploy Now

**NOTHING YET** - The app won't compile due to 161 TypeScript errors. Complete at least the CRITICAL items above before deploying.

---

## 📝 Next Steps

1. Complete Modal.tsx usage sites (4 locations)
2. Fix remaining 8 components
3. Fix 4 pages
4. Fix 4 utils/services
5. Run `npm run type-check` - should have 0 errors
6. Manual testing
7. Run `npm run delete-all-user-data`
8. Deploy

**Estimated Time to Complete: 2-3 hours**
