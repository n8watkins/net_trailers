# Schema Migration Review

## ✅ Completed Work (Phases 0-4: Core Data Layer)

### Phase 0: Delete Script ✓

- `scripts/delete-all-user-data.ts` created
- NPM script added for deleting all Firebase users

### Phase 1: Type Definitions ✓

- ✅ `atoms/authSessionAtom.ts` - Updated AuthPreferences interface
- ✅ `atoms/guestSessionAtom.ts` - Updated GuestPreferences interface
- ✅ `types/userData.ts` - Updated UserPreferences interface
- ✅ `types/userLists.ts` - Deprecated UserListsState

**Changes:**

- Removed `ratings: UserRating[]`
- Added `likedMovies: Content[]`, `hiddenMovies: Content[]`
- Changed `watchlist` → `defaultWatchlist`
- Changed `userLists: UserListsState` → `userCreatedWatchlists: UserList[]`

### Phase 2: Storage Services ✓

- ✅ `services/authStorageService.ts` - Complete rewrite with mutual exclusion
- ✅ `services/guestStorageService.ts` - Complete rewrite with v2 localStorage

**New Methods:**

- `addLikedMovie()`, `removeLikedMovie()`, `isLiked()`
- `addHiddenMovie()`, `removeHiddenMovie()`, `isHidden()`
- Updated `addToWatchlist()` to use `defaultWatchlist`

**Removed Methods:**

- `addRating()`, `removeRating()`, `getRating()`

### Phase 3: Service Layer ✓

- ✅ `services/userListsService.ts` - Removed defaultListIds logic
- ✅ `services/userDataService.ts` - Updated for compatibility

**Removed Methods from UserListsService:**

- `initializeDefaultLists()`
- `migrateOldPreferences()`
- `getDefaultLists()`
- `getCustomLists()`

**New Method:**

- `getAllLists()` - Returns all userCreatedWatchlists

### Phase 4: Zustand Stores ✓

- ✅ `stores/authStore.ts` - Complete interface and method updates
- ✅ `stores/guestStore.ts` - Complete interface and method updates

**New Store Methods:**

- `addLikedMovie()`, `removeLikedMovie()`
- `addHiddenMovie()`, `removeHiddenMovie()`

**Removed Store Methods:**

- `addRating()`, `removeRating()`

### Phase 5: Hooks (Partial) ✓

- ✅ `hooks/useLikedHidden.ts` - NEW (replaces useRatings)
- ✅ `hooks/useWatchlist.ts` - Updated to use defaultWatchlist
- ✅ `hooks/useListsReadOnly.ts` - Updated to use userCreatedWatchlists

### Phase 6: Components (Partial) ✓

- ✅ `components/LikeOptions.tsx` - Updated to use useLikedHidden
- ✅ `components/SimpleLikeButton.tsx` - Updated to use useLikedHidden

---

## ❌ Critical Issues Found (Type Check Failures: 75 errors)

### 1. **Legacy Hooks Still Using Old Schema** (HIGH PRIORITY)

These hooks are still referencing the OLD schema and breaking:

- ❌ `hooks/useRatings.ts` - **MUST DELETE** (replaced by useLikedHidden.ts)
    - Still references `state.ratings`, `addRating()`, `removeRating()`

- ❌ `hooks/useAuthData.ts` - **MUST UPDATE**
    - Line 54: `AuthStorageService.addRating` (doesn't exist)
    - Line 66: `AuthStorageService.removeRating` (doesn't exist)
    - Line 71: `AuthStorageService.getRating` (doesn't exist)
    - Line 145: `UserListsService.getDefaultLists` (doesn't exist)
    - Line 149: `UserListsService.getCustomLists` (doesn't exist)
    - Lines 243-245: References `watchlist`, `ratings`, `userLists` (don't exist on AuthPreferences)

- ❌ `hooks/useGuestData.ts` - **MUST UPDATE**
    - Line 31: `GuestStorageService.addRating` (doesn't exist)
    - Line 43: `GuestStorageService.removeRating` (doesn't exist)
    - Line 48: `GuestStorageService.getRating` (doesn't exist)
    - Line 122: `UserListsService.getDefaultLists` (doesn't exist)
    - Line 126: `UserListsService.getCustomLists` (doesn't exist)
    - Lines 154-156: References `watchlist`, `ratings`, `userLists` (don't exist on GuestPreferences)

- ❌ `hooks/useSessionData.ts` - **MUST UPDATE**
    - Lines 32-34: References `watchlist`, `ratings`, `userLists`
    - Lines 40-41: References `addRating()`, `removeRating()`
    - Lines 56-58: References old properties

- ❌ `hooks/useUserData.ts` - **MUST UPDATE**
    - Line 64: `UserListsService.getDefaultLists` (doesn't exist)
    - Line 66: `UserListsService.getCustomLists` (doesn't exist)
    - Line 150: Same issues

- ❌ `hooks/useSessionManager.ts` - **MUST UPDATE**
    - Lines 201, 223: Type mismatch between GuestPreferences and UserPreferences

### 2. **Components Still Using Old Schema**

- ❌ `components/AuthFlowDebugger.tsx` - Uses `getDefaultLists`, `getCustomLists`
- ❌ `components/PostHydrationEffects.tsx` - Method signature issues (wrong arg count)
- ❌ Various components have implicit `any` types

### 3. **Pages Need Updates**

- ❌ `pages/hidden.tsx` - Implicit any types
- ❌ `pages/liked.tsx` - Implicit any types
- ❌ `pages/watchlists.tsx` - Property 'name' errors

### 4. **Test Scripts Broken**

- ❌ `scripts/check-user-data.ts` - References old schema
- ❌ `scripts/clear-test-user.ts` - References old schema
- ❌ `scripts/test-user-watchlist.ts` - Likely broken

---

## 🔴 Breaking Changes Not Yet Addressed

### Method Signature Changes:

1. **Storage Services:**
    - `addRating(prefs, id, rating, content)` → `addLikedMovie(prefs, content)` + `addHiddenMovie(prefs, content)`
    - `getRating(prefs, id)` → `isLiked(prefs, id)` + `isHidden(prefs, id)`

2. **UserListsService:**
    - `getDefaultLists(prefs)` → REMOVED (no default lists in new schema)
    - `getCustomLists(prefs)` → `getAllLists(prefs)` (all lists are custom now)

3. **Store State:**
    - `state.ratings` → `state.likedMovies` + `state.hiddenMovies`
    - `state.watchlist` → `state.defaultWatchlist`
    - `state.userLists` → `state.userCreatedWatchlists`

---

## 📊 Migration Completeness

| Phase               | Files | Status     | Completion |
| ------------------- | ----- | ---------- | ---------- |
| 0: Scripts          | 1     | ✅ Done    | 100%       |
| 1: Types            | 4     | ✅ Done    | 100%       |
| 2: Storage Services | 2     | ✅ Done    | 100%       |
| 3: Service Layer    | 2     | ✅ Done    | 100%       |
| 4: Zustand Stores   | 2     | ✅ Done    | 100%       |
| 5: Hooks            | 3/8   | ⚠️ Partial | 37%        |
| 6: Components       | 2/8+  | ⚠️ Partial | ~25%       |
| 7: Pages            | 0/3   | ❌ Pending | 0%         |
| 8: Utils            | 0/2   | ❌ Pending | 0%         |
| 9: Tests            | 0/4   | ❌ Pending | 0%         |
| 10: Cleanup         | 0     | ❌ Pending | 0%         |

**Overall Progress: ~45%**

---

## 🚨 Critical Path to Complete

### Immediate Priority (Fix Type Errors):

1. **Delete** `hooks/useRatings.ts`
2. **Update** `hooks/useAuthData.ts` - Replace rating methods, update property references
3. **Update** `hooks/useGuestData.ts` - Replace rating methods, update property references
4. **Update** `hooks/useSessionData.ts` - Update to new schema
5. **Update** `hooks/useUserData.ts` - Update list methods
6. **Update** `hooks/useSessionManager.ts` - Fix type mismatches

### Medium Priority:

7. Update remaining components (AuthFlowDebugger, PostHydrationEffects, etc.)
8. Update pages (hidden.tsx, liked.tsx, watchlists.tsx)
9. Update utils (contentFilter.ts, csvExport.ts)

### Final Steps:

10. Update test scripts
11. Run full type-check (should pass)
12. Test in browser
13. Delete all user data
14. Deploy

---

## ⚠️ Risks & Concerns

1. **Incomplete Migration**: Core data layer is done, but many hooks/components still broken
2. **Type Safety**: 75 TypeScript errors - app won't compile until fixed
3. **Testing Gaps**: Test scripts need updating before we can verify the migration
4. **Breaking Changes**: Significant API changes that need careful handling

---

## ✅ What's Working

1. ✅ Core type definitions are correct
2. ✅ Storage services implement mutual exclusion correctly
3. ✅ Zustand stores have proper methods
4. ✅ New hooks (useLikedHidden, useWatchlist, useListsReadOnly) are properly implemented
5. ✅ Two components successfully updated
6. ✅ localStorage v2 versioning in place
7. ✅ Delete script ready for deployment

---

## 📝 Recommendation

**DO NOT DEPLOY** until:

1. All TypeScript errors are resolved (currently 75 errors)
2. All hooks are updated to new schema
3. All components/pages are updated
4. Type-check passes cleanly
5. Manual testing confirms functionality
6. Delete all user data script is run

**Estimated Remaining Work:**

- 6 critical hooks to update
- 6+ components to update
- 3 pages to update
- 2 utils to update
- 4 test scripts to update
- Cleanup and testing

**ETA: 2-3 hours of focused work**
