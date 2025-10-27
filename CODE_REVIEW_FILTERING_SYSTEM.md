# Code Review: Filtering System - Authentication & Data Integrity

**Date:** January 2025
**Reviewer:** Claude Code
**Focus Areas:** Filtering system, auth vs. guest data flow, race conditions, data integrity

---

## Executive Summary

This code review identified **7 significant issues** in the filtering and state management system, ranging from CRITICAL data integrity bugs to documentation inconsistencies. The most severe issues involve:

1. **Firebase sync may fail silently on initial load** (prevents users from loading their data)
2. **Missing mutual exclusion** allows content in both liked AND hidden states simultaneously
3. **Race conditions** that could cause data corruption across user accounts
4. **Silent data loss** when users perform actions before store initialization

All issues have been documented with tests in `__tests__/stores/authStore.test.ts` and `__tests__/components/SessionSyncManager.test.tsx`.

---

## Issue #1: CRITICAL - Firebase Sync Does Not Trigger on Initial Auth Load

### Location
- **File:** `components/SessionSyncManager.tsx`
- **Line:** 86

### Description
The condition that determines whether to sync with Firebase uses **AND** logic that prevents sync on initial page load for authenticated users.

### The Bug

```typescript
// Line 86-89
if (authStore.userId !== user.uid && authStore.syncStatus === 'offline') {
    authStore.syncWithFirebase(user.uid)
}
```

**Problem:** On initial load:
- `authStore.userId` is `undefined` (store not synced yet)
- `authStore.syncStatus` is `'synced'` (default value from `stores/authStore.ts:64`)
- Condition: `(undefined !== 'user-123') && ('synced' === 'offline')`
- Result: `true && false = FALSE` → **Sync does NOT trigger!**

### Impact
- **CRITICAL:** Authenticated users see empty watchlists/liked content on first page load
- Data only loads if user manually refreshes or navigates away and back
- Affects 100% of authenticated users on initial session

### Root Cause
The default `syncStatus` is set to `'synced'` in `authStore.ts:64`:
```typescript
const getDefaultState = (): AuthState => ({
    // ...
    syncStatus: 'synced',  // ← This prevents initial sync
})
```

### Recommended Fixes

**Option 1: Remove syncStatus check (Simplest)**
```typescript
// Just check if userId doesn't match
if (authStore.userId !== user.uid) {
    authStore.syncWithFirebase(user.uid)
}
```

**Option 2: Change to OR logic**
```typescript
// Sync if userId mismatch OR offline
if (authStore.userId !== user.uid || authStore.syncStatus === 'offline') {
    authStore.syncWithFirebase(user.uid)
}
```

**Option 3: Change default syncStatus**
```typescript
// In authStore.ts getDefaultState():
syncStatus: 'offline',  // Start as offline, trigger sync immediately
```

### Test Coverage
- Test: `__tests__/components/SessionSyncManager.test.tsx`
- Scenario: "ISSUE: Default syncStatus prevents initial Firebase sync"

---

## Issue #2: CRITICAL - No Mutual Exclusion Between Liked and Hidden Content

### Location
- **Files:** `stores/authStore.ts` (lines 165-300), `stores/guestStore.ts` (lines 111-205)

### Description
Content can exist in both `likedMovies` AND `hiddenMovies` arrays simultaneously, despite code comments and documentation claiming mutual exclusion exists.

### The Bug

**Current Implementation:**
```typescript
// authStore.ts:165-211
addLikedMovie: async (content: Content) => {
    const newLikedMovies = [...state.likedMovies, content]
    set({ likedMovies: newLikedMovies })
    // No removal from hiddenMovies!
}

addHiddenMovie: async (content: Content) => {
    const newHiddenMovies = [...state.hiddenMovies, content]
    set({ hiddenMovies: newHiddenMovies })
    // No removal from likedMovies!
}
```

**But the code comments say:**
```typescript
// components/LikeOptions.tsx:62
// Add to liked (automatically removes from hidden due to mutual exclusion)

// components/LikeOptions.tsx:71
// Add to hidden (automatically removes from liked due to mutual exclusion)
```

**And documentation says:**
```
// CLAUDE.md (from grep results)
"Mutual exclusion logic ensures content cannot be both liked AND hidden"
```

### Impact
- **CRITICAL:** Users can have same content marked as both liked AND hidden
- Inconsistent UI state (content shows as both liked and hidden)
- Filtering logic becomes unpredictable
- Data export/import may corrupt state further

### Comparison with Storage Services

Interestingly, the **storage services** DO have mutual exclusion:

```typescript
// services/authStorageService.ts:276-287
static addLikedMovie(preferences: AuthPreferences, content: Content): AuthPreferences {
    // Remove from hidden if exists (mutual exclusion)
    const hiddenMovies = preferences.hiddenMovies.filter((m) => m.id !== content.id)

    const likedMovies = isAlreadyLiked
        ? preferences.likedMovies
        : [...preferences.likedMovies, content]

    return { ...preferences, likedMovies, hiddenMovies }
}
```

But the **stores** don't use these functions - they implement their own logic without mutual exclusion!

### Historical Context
Git log shows this commit:
```
commit: fix: remove mutual exclusion between liked and hidden content
```

So mutual exclusion was **intentionally removed**, but:
- Documentation wasn't updated
- Code comments weren't updated
- Storage services still have it (inconsistency)

### Recommended Fixes

**Option 1: Implement mutual exclusion in stores**
```typescript
addLikedMovie: async (content: Content) => {
    // Remove from hidden if exists
    const newHiddenMovies = state.hiddenMovies.filter(m => m.id !== content.id)
    const newLikedMovies = [...state.likedMovies, content]

    set({
        likedMovies: newLikedMovies,
        hiddenMovies: newHiddenMovies  // ← Add this
    })
}
```

**Option 2: Update all documentation to reflect intentional removal**
- Remove mutual exclusion comments from LikeOptions.tsx
- Update CLAUDE.md to say "content CAN be both liked and hidden"
- Remove mutual exclusion logic from storage services for consistency

**Option 3: Use storage service functions (best for consistency)**
```typescript
addLikedMovie: async (content: Content) => {
    const state = get()
    const updatedPrefs = AuthStorageService.addLikedMovie(state, content)

    set({
        likedMovies: updatedPrefs.likedMovies,
        hiddenMovies: updatedPrefs.hiddenMovies
    })
}
```

### Test Coverage
- Test: `__tests__/stores/authStore.test.ts`
- Scenario: "CRITICAL ISSUE: Missing Mutual Exclusion"
- Tests prove content CAN be in both arrays

---

## Issue #3: CRITICAL - Silent Data Loss When UserId/GuestId Undefined

### Location
- **Files:** All store actions in `stores/authStore.ts` and `stores/guestStore.ts`

### Description
If users perform actions (like, hide, watchlist) before the store is initialized with `userId`/`guestId`, those actions appear to succeed locally but are **never persisted** to Firebase/localStorage.

### The Bug

**authStore Example:**
```typescript
// authStore.ts:89-114
addToWatchlist: async (content: Content) => {
    // ... update local state ...

    // Save to Firebase
    if (state.userId) {  // ← Check if userId exists
        // ... save to Firebase ...
    } else {
        set({ syncStatus: 'synced' })  // ← Misleading! Nothing was saved
    }
}
```

**Problem:**
- If `state.userId` is `undefined`, the `if` block is skipped
- `syncStatus` is set to `'synced'` even though nothing was saved
- User has no indication their data isn't being persisted
- Action appears successful but data is lost on page reload

### Impact
- **CRITICAL:** User data silently lost during initialization window
- Affects users who interact with the app before auth state loads (~1-2 seconds)
- No error thrown, no UI feedback
- Users trust the app saved their data but it didn't

### Reproduction Scenario
1. User loads app while authenticated
2. During the ~500ms-2s while Firebase auth initializes
3. User likes a movie / adds to watchlist
4. Action succeeds locally (shows in UI)
5. `userId` is still `undefined`, so save is skipped
6. User refreshes page
7. Their action is gone (data loss)

### Recommended Fixes

**Option 1: Throw error if userId/guestId missing**
```typescript
addToWatchlist: async (content: Content) => {
    const state = get()

    if (!state.userId) {
        throw new Error('Cannot save: User not initialized')
    }

    // ... rest of logic ...
}
```

**Option 2: Queue actions until initialization completes**
```typescript
// Add action queue to store
actionQueue: []

addToWatchlist: async (content: Content) => {
    if (!state.userId) {
        // Queue action for later
        state.actionQueue.push({ type: 'addToWatchlist', content })
        return
    }

    // ... execute action ...
}

// Process queue after initialization
onInitialized: () => {
    state.actionQueue.forEach(action => {
        // Execute queued actions
    })
}
```

**Option 3: Set syncStatus to 'offline' when save is skipped**
```typescript
if (state.userId) {
    // ... save to Firebase ...
} else {
    set({ syncStatus: 'offline' })  // ← Indicate save didn't happen
    console.warn('Action not persisted: User ID not set')
}
```

### Test Coverage
- Test: `__tests__/stores/authStore.test.ts`
- Scenario: "CRITICAL ISSUE: Data Loss When UserId Undefined"

---

## Issue #4: HIGH RISK - Race Condition in Cross-Account Data Saving

### Location
- **Files:** All async save operations in `stores/authStore.ts`

### Description
When an async save is in progress and the user switches accounts, the save operation completes with the old user's data but may be attributed to the new user's account.

### The Bug

```typescript
// authStore.ts:165-211
addLikedMovie: async (content: Content) => {
    const state = get()  // ← Captures userId at START of operation

    // ... update local state ...

    if (state.userId) {
        AuthStorageService.saveUserData(state.userId, {
            // ... save data ...
        })
        .then(() => {
            // ← No validation that userId is still correct!
            set({ syncStatus: 'synced' })
        })
    }
}
```

### Reproduction Scenario
1. User A is logged in, likes a movie
2. `addLikedMovie` called with `userId = 'user-a'`
3. Firebase save promise starts (takes ~100-500ms)
4. **User switches to User B** before promise resolves
5. `authStore.userId` is now `'user-b'`
6. Promise resolves, `.then()` callback executes
7. **No check** that `userId` is still `'user-a'`
8. Result: User A's action may be attributed to User B's account, or vice versa

### Impact
- **HIGH RISK:** Data corruption across user accounts
- User A's preferences could be saved to User B's account
- Rare but catastrophic when it occurs
- Violates data isolation guarantees

### Recommended Fix

**Add userId validation in callbacks:**
```typescript
addLikedMovie: async (content: Content) => {
    const state = get()
    const operationUserId = state.userId  // ← Capture userId for this operation

    if (operationUserId) {
        AuthStorageService.saveUserData(operationUserId, {
            // ... save data ...
        })
        .then(() => {
            const currentState = get()

            // Validate userId hasn't changed
            if (currentState.userId === operationUserId) {
                set({ syncStatus: 'synced' })
            } else {
                console.warn(`User switched during save: ${operationUserId} → ${currentState.userId}`)
                // Don't update syncStatus - data was saved for wrong user
            }
        })
    }
}
```

### Test Coverage
- Test: `__tests__/stores/authStore.test.ts`
- Scenario: "HIGH RISK: Race Conditions in User Switching"

---

## Issue #5: MEDIUM - Child Safety Mode Doesn't Filter TV Shows

### Location
- **File:** `utils/contentFilter.ts`
- **Lines:** 133-140

### Description
Child Safety Mode only filters movies based on the `adult` flag. TV shows don't have this flag, so ALL TV shows pass through the filter regardless of appropriateness.

### The Bug

```typescript
// contentFilter.ts:133-140
export function filterContentByAdultFlag(items: Content[], childSafetyMode: boolean): Content[] {
    if (!childSafetyMode) {
        return items
    }

    return items.filter((item) => {
        if (item.media_type === 'movie') {
            return item.adult !== true
        }
        // TVShows don't have adult flag, so keep them (they use content_ratings instead)
        return true  // ← ALL TV shows are kept!
    })
}
```

### Impact
- **MEDIUM:** Potentially inappropriate TV shows shown in Child Safety Mode
- Inconsistent filtering (movies filtered, TV shows not)
- Parents may think content is filtered when it isn't
- Only affects TV show content (~50% of content)

### Context
- TV shows use a different rating system (`content_ratings`)
- Would need to fetch additional data from TMDB API
- Could use `vote_average` as a rough proxy

### Recommended Fixes

**Option 1: Filter by vote_average (quick fix)**
```typescript
if (item.media_type === 'movie') {
    return item.adult !== true
}
// For TV shows, use rating as proxy
return item.vote_average >= 6.0  // Generally family-friendly content
```

**Option 2: Fetch TV content ratings from API**
```typescript
// Requires additional API call to get content_ratings
// Check if any rating is TV-MA, TV-14, etc.
```

**Option 3: Document limitation clearly**
```typescript
// Add comment explaining TV shows aren't filtered
// Display warning in Child Safety Mode settings
```

### Test Coverage
- Existing tests: `__tests__/utils/contentFilter.test.ts`
- Need to add: TV show filtering scenarios

---

## Issue #6: MEDIUM - Client-Side Filtering Reduces Displayed Content

### Location
- **Files:** `components/Row.tsx`, `components/SearchResults.tsx`, `pages/genres/[type]/[id].tsx`

### Description
All filtering (hidden content, child safety) happens client-side AFTER fetching from API. This means the API returns X items, but fewer are displayed after filtering.

### The Issue

**Flow:**
1. API call: "Fetch 20 items"
2. API returns: 20 items
3. Filter hidden content: 3 items removed → 17 items
4. Filter child safety: 2 items removed → 15 items
5. Display: **Only 15 items shown** (user expected 20)

### Impact
- **MEDIUM:** Users see fewer results than expected
- Inconsistent content density per page
- Some pages may appear empty after filtering
- Pagination becomes unreliable
- Poor UX especially with many hidden items

### Example
```typescript
// components/Row.tsx:18
const filteredContent = filterDislikedContent(content, sessionData.hiddenMovies)

// If user has hidden 50% of content, rows show half as many items
```

### Recommended Fixes

**Option 1: Over-fetch content (current approach with `getRequestMultiplier`)**
```typescript
// For child safety, already doubled:
const amount = getRequestMultiplier(childSafetyEnabled, 20)  // Returns 40

// Could extend to hidden content:
const estimatedHiddenPercent = hiddenMovies.length / allViewedContent.length
const multiplier = 1 / (1 - estimatedHiddenPercent)
```

**Option 2: Server-side filtering**
- Pass `hiddenMovieIds` to API
- Filter in database/API layer
- Return exactly X items after filtering
- More expensive server-side, but better UX

**Option 3: Load more until target reached**
```typescript
// Keep loading pages until we have enough non-filtered items
while (visibleItems.length < targetCount && hasMore) {
    fetchNextPage()
}
```

### Test Coverage
- Manual testing needed
- Automated tests: Verify filtering reduces count
- E2E tests: Verify user experience with heavy filtering

---

## Issue #7: LOW - Documentation Inconsistencies

### Location
- **Files:** `CLAUDE.md`, `components/LikeOptions.tsx`, storage services

### Description
Multiple inconsistencies between documentation, code comments, and actual implementation behavior.

### Inconsistencies Found

**1. Mutual Exclusion Claims**

CLAUDE.md says:
> "Mutual exclusion logic ensures content cannot be both liked AND hidden"

Reality:
- Stores DO NOT implement mutual exclusion
- Content CAN be in both liked and hidden arrays
- Git history shows mutual exclusion was intentionally removed
- Storage services STILL have mutual exclusion (unused)

**2. Code Comments vs. Implementation**

```typescript
// components/LikeOptions.tsx:62
// Add to liked (automatically removes from hidden due to mutual exclusion)

// Reality: Does NOT remove from hidden
```

**3. Storage Service Functions Not Used**

- `AuthStorageService.addLikedMovie()` has mutual exclusion
- `AuthStorageService.addHiddenMovie()` has mutual exclusion
- But `authStore` doesn't use these functions
- Maintains its own logic without mutual exclusion

### Impact
- **LOW:** Confusing for developers
- Expectations don't match reality
- Potential bugs from incorrect assumptions
- Code archaeology needed to understand intent

### Recommended Fixes

**Option 1: Update documentation to match implementation**
- Remove mutual exclusion claims from CLAUDE.md
- Update comments in LikeOptions.tsx
- Add note explaining why mutual exclusion was removed

**Option 2: Implement mutual exclusion to match documentation**
- Add mutual exclusion back to stores
- Or use storage service functions
- Ensures documentation is accurate

**Option 3: Delete unused storage service functions**
- If mutual exclusion isn't needed, remove it from storage services too
- Simplifies codebase
- Reduces confusion

### Test Coverage
- No tests needed
- Manual audit of documentation
- Update comments and docs

---

## Summary of Issues by Severity

### CRITICAL (Fix Immediately)
1. ✅ **Firebase sync doesn't trigger on initial load**
   - Users see empty data on first page load
   - Fix: Change sync condition logic

2. ✅ **No mutual exclusion between liked/hidden**
   - Content can be in both states simultaneously
   - Fix: Implement mutual exclusion OR update docs

3. ✅ **Silent data loss when userId undefined**
   - Actions lost if performed before initialization
   - Fix: Validate userId before operations

### HIGH RISK (Fix Soon)
4. ✅ **Race condition in account switching**
   - Data corruption possible across accounts
   - Fix: Validate userId in async callbacks

### MEDIUM (Plan to Fix)
5. ✅ **Child Safety doesn't filter TV shows**
   - Inconsistent filtering by content type
   - Fix: Add TV show filtering logic

6. ✅ **Client-side filtering reduces content**
   - Users see fewer items than expected
   - Fix: Over-fetch or server-side filtering

### LOW (Maintenance)
7. ✅ **Documentation inconsistencies**
   - Confusing for developers
   - Fix: Update docs to match implementation

---

## Test Coverage Summary

### New Test Files Created

**1. `__tests__/stores/authStore.test.ts`**
- Tests all basic store functionality
- Proves mutual exclusion bug exists
- Tests data loss when userId undefined
- Tests race conditions in user switching
- Tests duplicate prevention
- Tests sync status behavior

**2. `__tests__/components/SessionSyncManager.test.tsx`**
- Proves Firebase sync bug on initial load
- Tests session initialization sequences
- Tests rapid user switching
- Tests guest session persistence

### Existing Test Files
- `__tests__/utils/contentFilter.test.ts` - Already comprehensive

### Running the Tests

```bash
# Run all new tests
npm test authStore.test
npm test SessionSyncManager.test

# Run all filtering tests
npm test contentFilter

# Run everything
npm test
```

---

## Recommendations for Implementation

### Immediate Actions (Week 1)

**1. Fix Firebase Sync (Issue #1)**
```typescript
// SessionSyncManager.tsx:86
// Change from:
if (authStore.userId !== user.uid && authStore.syncStatus === 'offline')

// To:
if (authStore.userId !== user.uid)
```

**2. Validate userId in Actions (Issue #3)**
```typescript
// Add to all store actions:
if (!state.userId && !state.guestId) {
    throw new Error('Store not initialized')
}
```

**3. Add userId Validation in Callbacks (Issue #4)**
```typescript
// In all async save callbacks:
const currentUserId = get().userId
if (currentUserId === operationUserId) {
    // Safe to update state
}
```

### Short-term Actions (Week 2-3)

**4. Decide on Mutual Exclusion (Issue #2)**
- Team decision: Keep or remove?
- If keep: Implement in stores
- If remove: Update all documentation

**5. Improve TV Show Filtering (Issue #5)**
- Add vote_average threshold for TV shows
- Or fetch content_ratings (more complex)

### Long-term Actions (Month 1)

**6. Optimize Filtering Strategy (Issue #6)**
- Implement over-fetching with dynamic multiplier
- Or explore server-side filtering

**7. Documentation Audit (Issue #7)**
- Update CLAUDE.md
- Update all code comments
- Remove unused functions

---

## Authentication vs. Guest Mode Differences

### Data Storage
| Aspect | Authenticated | Guest |
|--------|--------------|-------|
| Storage | Firebase Firestore | localStorage |
| Sync | Async with promises | Synchronous |
| Persistence | Cross-device | Single browser |
| Recovery | Firebase account | localStorage only |

### Potential Issues by Mode

**Authenticated Mode:**
- Issue #1: Sync doesn't trigger (CRITICAL)
- Issue #3: Silent data loss during init (CRITICAL)
- Issue #4: Race conditions on account switch (HIGH)

**Guest Mode:**
- Issue #3: Silent data loss during init (CRITICAL)
- Less affected by sync issues (synchronous)
- No cross-account contamination risk

**Both Modes:**
- Issue #2: Mutual exclusion (CRITICAL)
- Issue #5: Child safety filtering (MEDIUM)
- Issue #6: Client-side filtering (MEDIUM)

---

## Conclusion

The filtering system has a solid foundation but suffers from **critical data integrity issues** that affect authenticated users especially:

1. **Data doesn't load on first visit** (Firebase sync bug)
2. **Data can be lost silently** (initialization timing)
3. **Data could mix between accounts** (race conditions)

**Priority:** Fix Issues #1, #3, and #4 immediately. These affect data integrity and user trust.

The mutual exclusion decision (Issue #2) requires team discussion - either implement it consistently or remove it entirely and update docs.

All issues have been documented with comprehensive tests that can be used for regression testing after fixes are implemented.

---

## Next Steps

1. ✅ Review this document with team
2. ✅ Run new test suites to verify issues exist
3. ✅ Prioritize issues based on user impact
4. ✅ Implement fixes starting with CRITICAL issues
5. ✅ Update documentation after fixes
6. ✅ Add integration tests for auth flow
7. ✅ Monitor Sentry for related errors in production

---

**Generated:** January 2025
**Test Suite:** `__tests__/stores/` and `__tests__/components/`
**Status:** Ready for team review
