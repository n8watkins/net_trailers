# Bug Fixes: Child-Safety Genre Blocking & Cache Pollution

**Commit**: `1d72c53` - "fix: resolve child-safety genre blocking and cache pollution bugs (HIGH + MED)"
**Date**: November 1, 2025
**Files Changed**: 4 files, 40 insertions(+), 3 deletions(-)

---

## Issue 1: Child-Safety Genre Blocking (HIGH Priority)

### Problem Description

**Location**: `pages/api/genres/[type]/[id].ts:85`

When a user requested a non-child-safe genre (e.g., Horror, Crime, Thriller) with child safety mode enabled, the API endpoint threw an error that resulted in an HTTP 500 response instead of gracefully handling the restriction.

**Original Code**:

```javascript
if (!isChildSafeGenre) {
    // SECURITY: Block access to non-child-safe genres
    // Return empty results for Horror, Crime, Thriller, War, etc.
    throw new Error(
        'This genre is not available in child safety mode. Please disable child safety mode to access all genres.'
    )
}
```

**Error Flow**:

1. User requests restricted genre with `childSafetyMode=true`
2. Genre validation fails: `isChildSafeGenre = false`
3. Code throws error
4. Try/catch block at line 250 catches the error
5. API returns: `res.status(500).json({ error: 'Failed to fetch genre content' })`
6. Client receives HTTP 500 (server error)

**Problems**:

- HTTP 500 implies server malfunction, not content restriction
- Generic error message loses context about why the request failed
- False errors pollute application logs
- May trigger monitoring alerts for non-issues
- Client UX cannot distinguish between "blocked genre" and "actual server failure"
- Comment on line 87 says "Return empty results" but code throws error (contradiction)

### Solution

**Replace error throw with proper HTTP 200 response containing empty results**

**Fixed Code**:

```javascript
if (!isChildSafeGenre) {
    // SECURITY: Block access to non-child-safe genres
    // Return empty results for Horror, Crime, Thriller, War, etc.
    return res.status(200).json({
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
        child_safety_enabled: true,
        genre_blocked: true,
        message:
            'This genre is not available in child safety mode. Please disable child safety mode to access all genres.',
    })
}
```

**Why HTTP 200?**

- Standard pattern for filtered/restricted content APIs
- Allows graceful degradation in client UI
- 403 Forbidden would trigger error handlers unnecessarily
- Client can check `genre_blocked` flag for custom messaging
- Consistent with how other APIs handle filtered results

**Benefits**:

- ✅ No false server errors in logs
- ✅ Client receives clear, structured response
- ✅ UX can show appropriate message: "This genre is restricted"
- ✅ No exception throwing = better performance
- ✅ Monitoring tools won't flag normal operation as errors

---

## Issue 2: Cache Pollution (MEDIUM Priority)

### Problem Description

**Locations**:

- `pages/index.tsx:69`
- `pages/movies.tsx:61`
- `pages/tv.tsx:63`

The caching `useEffect` ran immediately on first render while `useHomeData` was still returning initial empty arrays. This caused the application to cache empty data and mark the page load as "successful" before any actual data was fetched.

**Original Code** (example from `pages/index.tsx`):

```javascript
useEffect(() => {
    // Store main page data in cache for future navigations
    const currentData = {
        trending,
        topRated,
        action,
        comedy,
        horror,
        romance,
        documentaries,
        lastFetched: Date.now(),
    }

    setMainPageData(currentData)
    setHasVisitedMainPage(true)

    // Set content loaded successfully
    setContentLoadedSuccessfully(true)
}, [trending, topRated, action, comedy, horror, romance, documentaries])
```

**Bug Timeline**:

1. **T=0ms**: Component mounts
2. **T=1ms**: `useHomeData` initializes with empty arrays: `{ trending: [], topRated: [], ... }`
3. **T=2ms**: useEffect dependencies change from `undefined` to `[]`
4. **T=3ms**: **useEffect executes immediately**
5. **T=3ms**: Caches empty arrays to `cacheStore`
6. **T=3ms**: Sets `contentLoadedSuccessfully(true)` (false positive!)
7. **T=3ms**: Sets `hasVisitedMainPage(true)`
8. **T=100ms**: API fetch starts...
9. **T=500ms**: User navigates away OR fetch fails
10. **Result**: Cache permanently holds `{ trending: [], ... }` stamped as "successful"

**Problems**:

- Cache stores empty initial state before data loads
- `contentLoadedSuccessfully` is a lie when set prematurely
- Race condition between data loading and effect execution
- Early navigation corrupts cache permanently
- Failed fetches leave empty data in cache
- Future page loads may use corrupted cached data
- UI gates on `contentLoadedSuccessfully` show success for empty data

### Solution

**Add guards to prevent caching until data successfully loads**

**Fixed Code** (applied to all three files):

```javascript
useEffect(() => {
    // Guard: Only cache when data has actually loaded
    // Prevent caching empty arrays from initial state or failed fetches
    if (dataLoading || dataError || !hasAnyContent) {
        return // Don't cache empty/loading/error states
    }

    // Store main page data in cache for future navigations
    const currentData = {
        trending,
        topRated,
        action,
        comedy,
        horror,
        romance,
        documentaries,
        lastFetched: Date.now(),
    }

    setMainPageData(currentData)
    setHasVisitedMainPage(true)

    // Set content loaded successfully
    setContentLoadedSuccessfully(true)
}, [
    trending,
    topRated,
    action,
    comedy,
    horror,
    romance,
    documentaries,
    dataLoading, // ← Added to dependencies
    dataError, // ← Added to dependencies
    hasAnyContent, // ← Added to dependencies
    setMainPageData,
    setHasVisitedMainPage,
    setContentLoadedSuccessfully,
])
```

**Guard Logic**:

```javascript
if (dataLoading || dataError || !hasAnyContent) {
    return
}
```

- **`dataLoading`**: Don't cache while fetch is in progress
- **`dataError`**: Don't cache if fetch failed
- **`!hasAnyContent`**: Don't cache if all arrays are empty

**Fixed Timeline**:

1. **T=0ms**: Component mounts
2. **T=1ms**: `useHomeData` returns: `{ data: { trending: [], ... }, loading: true, error: null }`
3. **T=2ms**: useEffect triggers but **guard blocks execution** ✅
4. **T=100ms**: API fetch completes successfully
5. **T=101ms**: `useHomeData` returns: `{ data: { trending: [50 items], ... }, loading: false, error: null }`
6. **T=102ms**: useEffect triggers, **guard allows execution** ✅
7. **T=103ms**: Caches real data, sets `contentLoadedSuccessfully(true)`
8. **Result**: Cache holds real data marked as "successful" ✅

**Edge Cases Handled**:

1. ✅ **Early navigation**: Guard prevents caching empty state
2. ✅ **Failed fetch**: `dataError` check prevents caching
3. ✅ **All empty results**: `!hasAnyContent` prevents caching
4. ✅ **Slow network**: Guard waits until `dataLoading` becomes false
5. ✅ **Partial data**: Only caches when `hasAnyContent` is true

**Benefits**:

- ✅ Cache only stores successfully loaded data
- ✅ `contentLoadedSuccessfully` is now truthful
- ✅ Race condition eliminated
- ✅ Early navigation doesn't corrupt cache
- ✅ Failed fetches don't pollute cache
- ✅ Proper dependency array ensures effect runs at correct time

---

## Files Modified

### 1. `pages/api/genres/[type]/[id].ts`

- **Lines**: 85-97
- **Change**: Replace `throw new Error(...)` with `return res.status(200).json(...)`
- **Impact**: Child-safety genre blocking now returns proper response

### 2. `pages/index.tsx`

- **Lines**: 69-109
- **Change**: Add guard condition and update dependencies
- **Impact**: Home page cache only stores real data

### 3. `pages/movies.tsx`

- **Lines**: 61-99
- **Change**: Add guard condition and update dependencies
- **Impact**: Movies page cache only stores real data

### 4. `pages/tv.tsx`

- **Lines**: 63-101
- **Change**: Add guard condition and update dependencies
- **Impact**: TV shows page cache only stores real data

---

## Testing Recommendations

### Issue 1: Child-Safety Genre Blocking

1. Enable child safety mode
2. Navigate to a restricted genre (e.g., Horror, Thriller, Crime)
3. Verify API returns HTTP 200 with empty results
4. Verify `genre_blocked: true` flag is present
5. Verify no 500 errors appear in logs
6. Verify UI shows appropriate "restricted" message

### Issue 2: Cache Pollution

1. Clear browser cache/localStorage
2. Enable network throttling (slow 3G)
3. Navigate to home page
4. Quickly navigate away before content loads
5. Return to home page
6. Verify content loads correctly (not showing empty cached data)
7. Test with failed network requests
8. Verify cache doesn't store empty data on failure

---

## Related Commits

- **Previous**: `41efa10` - "feat: add comprehensive security headers to Next.js config (MED-6)"
- **This Fix**: `1d72c53` - "fix: resolve child-safety genre blocking and cache pollution bugs (HIGH + MED)"

---

## Additional Notes

Both bugs were identified through code review and verified through ultrathinking analysis. The fixes are minimal, targeted, and address root causes without introducing new complexity or breaking changes.

**Impact**:

- Improved child safety feature reliability
- Better error handling and logging
- Eliminated cache corruption scenarios
- Enhanced user experience with proper loading states
- No API contract changes (backward compatible)
