# Schema Migration - Verification Notes

**Date:** 2025-10-10
**Purpose:** Verify critical issues before implementing fresh-start schema migration

---

## ✅ Issue 1: Recoil Atoms vs Zustand Stores

### Findings:

**Recoil atoms ARE still used, but in limited scope:**

**Files using Recoil atoms:**

- `hooks/useAuthData.ts` - Uses `authSessionState` from Recoil
- `hooks/useGuestData.ts` - Uses `guestSessionState` from Recoil

**Files using Zustand stores:**

- `hooks/useRatings.ts` - Uses `useAuthStore` and `useGuestStore`
- `hooks/useSessionData.ts` - Uses `useAuthStore` and `useGuestStore`
- `hooks/useWatchlist.ts` - Uses `useAuthStore` and `useGuestStore`
- `hooks/useListsReadOnly.ts` - Uses `useAuthStore` and `useGuestStore`
- `components/SessionSyncManager.tsx` - Uses `useAuthStore` and `useGuestStore`
- Test files - Use `useAuthStore.getState()` directly

### Conclusion:

**Recoil atoms are LEGACY.** The app has been partially migrated to Zustand, but `useAuthData` and `useGuestData` still use Recoil.

**Action Required:**

- ✅ Update Recoil atom interfaces (`atoms/authSessionAtom.ts`, `atoms/guestSessionAtom.ts`)
- ✅ Update `useAuthData` and `useGuestData` hooks (they bridge Recoil → Services)
- ⚠️ Consider fully removing Recoil and migrating these hooks to Zustand later

---

## ✅ Issue 2: Guest localStorage with Old Schema

### Findings:

`services/guestStorageService.ts` uses plain `localStorage` keys without versioning:

```typescript
const STORAGE_KEY_PREFIX = 'guest_data'
// Stores as: guest_data_{guestId}
```

**Problem:** When we deploy new schema, existing guest users will have old data in localStorage.

### Solution:

Add version checking and clear old localStorage:

```typescript
const STORAGE_VERSION = 2
const OLD_STORAGE_KEY = 'guest_data'
const NEW_STORAGE_KEY = `guest_data_v${STORAGE_VERSION}`

// On loadGuestData, clear old v1 keys
Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('guest_data_guest_') && !key.includes('_v2_')) {
        localStorage.removeItem(key)
    }
})
```

**Action Required:**

- ✅ Add versioning to guestStorageService
- ✅ Clear old localStorage on first load
- ✅ Update storage key format

---

## ✅ Issue 3: Delete All Users - Admin SDK Not Needed

### Findings:

We don't need Firebase Admin SDK. We can:

1. Delete Firestore user documents only
2. Keep Firebase Auth users
3. They'll get fresh new schema on next login

**Verified:** `services/authStorageService.ts` already has `deleteUserData()` and `deleteUserAccount()` methods

### Solution:

Create script that deletes all Firestore documents in `users` collection:

```bash
npm run delete-all-user-data
```

Auth users remain, but their Firestore data is cleared.

**Action Required:**

- ✅ Create `scripts/delete-all-user-data.ts`
- ✅ Add npm script
- ✅ Run before deployment

---

## ✅ Issue 4: Content Filtering - Hidden Movies

### Findings:

**File exists:** `utils/contentFilter.ts`

**Current implementation:**

```typescript
export function filterDislikedContent(content: Content[], ratings: UserRating[]): Content[] {
    // Filters based on ratings array where rating === 'disliked'
}
```

**Problem:** After migration, we won't have `ratings` array. We'll have `hiddenMovies: Content[]`.

### Solution:

**Completely rewrite contentFilter.ts:**

```typescript
// OLD
export function filterDislikedContent(content: Content[], ratings: UserRating[]): Content[]

// NEW
export function filterHiddenContent(content: Content[], hiddenMovies: Content[]): Content[] {
    const hiddenIds = new Set(hiddenMovies.map((m) => m.id))
    return content.filter((item) => !hiddenIds.has(item.id))
}
```

**Action Required:**

- ✅ Rewrite all functions in `utils/contentFilter.ts`
- ✅ Update function signatures to use `hiddenMovies: Content[]` instead of `ratings: UserRating[]`
- ✅ Remove `UserRating` import
- ✅ Update all usages of these functions

---

## ✅ Issue 5: Watchlists Page UI - Data Type Mismatch

### Findings:

`pages/watchlists.tsx` currently renders everything as `UserList[]`:

**Current code:**

```typescript
const allLists = useMemo(() => {
    const defaultLists = getDefaultLists() // Returns UserList[]
    const customLists = getCustomLists() // Returns UserList[]
    return [...defaultLists, ...customLists] as UserList[]
}, [getDefaultLists, getCustomLists])
```

**After migration:**

- `defaultWatchlist` → `Content[]` (not UserList!)
- `likedMovies` → `Content[]` (not UserList!)
- `hiddenMovies` → `Content[]` (not UserList!)
- `userCreatedWatchlists` → `UserList[]` ✅

**Problem:** Page expects UserList objects with `{ id, name, items[], ... }`, but we'll have raw `Content[]` arrays.

### Solution:

**Option A:** Convert Content[] to pseudo-UserList for UI consistency

```typescript
const allLists = useMemo(() => {
    const pseudoWatchlist: UserList = {
        id: 'default-watchlist',
        name: 'Watchlist',
        items: defaultWatchlist,
        isPublic: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }
    // Same for likedMovies, hiddenMovies
    return [pseudoWatchlist, pseudoLiked, pseudoHidden, ...userCreatedWatchlists]
}, [defaultWatchlist, likedMovies, hiddenMovies, userCreatedWatchlists])
```

**Option B:** Redesign UI to handle both types

**Recommended:** Option A - Less UI changes, cleaner migration

**Action Required:**

- ✅ Update `pages/watchlists.tsx` to create pseudo-UserList objects
- ✅ Update `useUserData` hook to expose new fields
- ✅ Test rendering

---

## ✅ Issue 6: Missing Inverse Logic

### Verified:

Need mutual exclusion between liked and hidden:

```typescript
addLikedMovie: (content) => {
    // ✅ Remove from hidden
    const updatedHidden = state.hiddenMovies.filter((m) => m.id !== content.id)
    const updatedLiked = [...state.likedMovies, content]
}

addHiddenMovie: (content) => {
    // ✅ Remove from liked
    const updatedLiked = state.likedMovies.filter((m) => m.id !== content.id)
    const updatedHidden = [...state.hiddenMovies, content]
}
```

**Action Required:**

- ✅ Ensure both store methods have mutual exclusion
- ✅ Test toggling liked ↔ hidden

---

## ✅ Issue 7: TypeScript Compilation During Migration

### Strategy:

Work in current branch, update all files before testing

**Recommended approach:**

1. Update all type definitions first (Phase 1)
2. Add `// @ts-expect-error` comments where needed temporarily
3. Update all implementation files (Phases 2-8)
4. Remove `// @ts-expect-error` comments
5. Run `npm run type-check`
6. Test with `npm run dev`

**Action Required:**

- ✅ Accept temporary TS errors during implementation
- ✅ Use `// @ts-expect-error` sparingly
- ✅ Full type-check before testing

---

## ✅ Issue 8: Test User Will Be Deleted

### Findings:

Current test user:

- Email: `test@nettrailer.dev`
- User ID: `yk8OnMO8r8NgJipst8jclngjj3o1`

**After deletion:** User ID will change!

### Solution:

After running `delete-all-user-data`:

```bash
npm run test:create-user
# New user ID will be generated
# Update TEST_CREDENTIALS.md with new ID
```

**Action Required:**

- ✅ Recreate test user after deletion
- ✅ Document new user ID
- ⚠️ Don't hardcode user IDs in code

---

## ✅ Issue 9: UserListsService - What Remains?

### Findings:

`services/userListsService.ts` currently has:

**Will be REMOVED:**

- `initializeDefaultLists()` - Creates 3 default lists ❌
- `migrateOldPreferences()` - Migration logic ❌
- `getDefaultLists()` - Returns default lists by ID ❌

**Will be KEPT:**

- `createList()` - Create custom list ✅
- `updateList()` - Update list metadata ✅
- `deleteList()` - Delete list ✅
- `addToList()` - Add content to list ✅
- `removeFromList()` - Remove from list ✅
- `getList()` - Get list by ID ✅
- `isContentInList()` - Check if content in list ✅
- `getListsContaining()` - Get all lists containing content ✅
- `getCustomLists()` - Filter out defaults ✅ (but simplified - just return all now)

### Simplified `getCustomLists()`:

```typescript
// OLD - filter out defaults
static getCustomLists(prefs: { userLists: UserListsState }): UserList[] {
    return prefs.userLists.lists.filter(
        list => !Object.values(prefs.userLists.defaultListIds).includes(list.id)
    )
}

// NEW - all lists are custom now!
static getCustomLists(prefs: { userCreatedWatchlists: UserList[] }): UserList[] {
    return prefs.userCreatedWatchlists
}
```

**Action Required:**

- ✅ Remove default list methods
- ✅ Simplify remaining methods
- ✅ Update method signatures

---

## ✅ Issue 10: Rating Type Imports

### Files that import rating types:

```
atoms/authSessionAtom.ts - AuthRating
atoms/guestSessionAtom.ts - GuestRating
atoms/userDataAtom.ts - UserRating
types/userData.ts - UserRating
stores/authStore.ts - uses AuthRating
stores/guestStore.ts - uses GuestRating
services/authStorageService.ts - uses AuthRating
services/guestStorageService.ts - uses GuestRating
services/userDataService.ts - uses UserRating
utils/contentFilter.ts - uses UserRating
utils/csvExport.ts - likely uses ratings
```

**Action Required:**

- ✅ Remove all rating type definitions
- ✅ Remove all rating type imports
- ✅ Replace with `Content` where content object is needed
- ✅ Use simple `contentId: number` where just ID is needed

---

## ✅ Issue 11: SessionStore References

### Findings:

**File:** `stores/sessionStore.ts`

**Verified:** ✅ Session store does NOT reference old schema

- Only manages session type (guest/auth)
- No references to ratings, watchlist, or userLists
- No changes needed ✅

---

## ✅ Issue 12: File Count Verification

### Verified:

- Types: 4 files ✅
- Storage: 2 files ✅
- Service: 2 files ✅
- Stores: 2 files ✅
- Hooks: 6 files ✅
- Components: 4 files ✅
- Pages: 1 file ✅
- Tests: 4 files ✅
- Utils: 2 files (contentFilter.ts, csvExport.ts) ⚠️ MISSED IN PLAN

**Total: 27 files** (plan said 25, actually 27 with utils)

---

## 📋 Additional Files Found

### `utils/csvExport.ts`

**Likely uses ratings:** Need to update to export `likedMovies` and `hiddenMovies` instead

### `hooks/useAuthData.ts` and `hooks/useGuestData.ts`

**Use Recoil atoms:** These bridge Recoil to Services

- Currently call `AuthStorageService.addRating()`, `removeRating()`, etc.
- Need to update to call new methods
- Consider migrating these hooks to Zustand later

---

## 🎯 Final Updated File List

### Phase 1: Type Definitions (4 files)

1. `atoms/authSessionAtom.ts`
2. `atoms/guestSessionAtom.ts`
3. `types/userData.ts`
4. `types/userLists.ts`

### Phase 2: Storage Services (2 files)

5. `services/authStorageService.ts`
6. `services/guestStorageService.ts`

### Phase 3: Service Layer (2 files)

7. `services/userListsService.ts`
8. `services/userDataService.ts`

### Phase 4: Zustand Stores (2 files)

9. `stores/authStore.ts`
10. `stores/guestStore.ts`

### Phase 5: Hooks (8 files) ⬆️ +2 more than planned

11. `hooks/useRatings.ts` → Rename to `useLikedHidden.ts`
12. `hooks/useUserData.ts`
13. `hooks/useAuthData.ts` ⬆️ NEW
14. `hooks/useGuestData.ts` ⬆️ NEW
15. `hooks/useSessionData.ts`
16. `hooks/useSessionManager.ts`
17. `hooks/useWatchlist.ts` (likely needs updates)
18. `hooks/useListsReadOnly.ts` (likely needs updates)

### Phase 6: Components (4 files)

19. `components/LikeOptions.tsx`
20. `components/SimpleLikeButton.tsx`
21. `components/WatchLaterButton.tsx`
22. `components/ContentMetadata.tsx`

### Phase 7: Pages (1 file)

23. `pages/watchlists.tsx`

### Phase 8: Utils (2 files) ⬆️ NEW PHASE

24. `utils/contentFilter.ts`
25. `utils/csvExport.ts`

### Phase 9: Tests (4 files)

26. `scripts/test-user-watchlist.ts`
27. `test-persistence-flow.ts`
28. `test-watchlist-flow.ts`
29. Other test files as needed

### Phase 0: New Scripts (2 files)

30. `scripts/delete-all-user-data.ts` (NEW)
31. `scripts/clear-old-localstorage.ts` (NEW - run on app init)

---

## **REVISED TOTAL: 31 files** (up from 25)

---

## 🚨 Critical Actions Before Starting

1. ✅ **Recoil atoms** - Must update even though legacy
2. ✅ **Guest localStorage** - Add versioning and cleanup
3. ✅ **Content filtering** - Complete rewrite needed
4. ✅ **Watchlists page** - Create pseudo-UserList objects
5. ✅ **Utils files** - Update csvExport and contentFilter
6. ✅ **More hooks** - useAuthData, useGuestData, useWatchlist, useListsReadOnly
7. ✅ **Test user** - Will need to recreate after deletion

---

## ✅ Ready to Begin

All critical issues verified and documented.
Migration plan updated with complete file list.
Proceeding to Phase 0...
