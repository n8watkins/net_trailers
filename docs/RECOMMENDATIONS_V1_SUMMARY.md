# Recommendations Row V1 - Implementation Summary

## Overview

This document summarizes the implementation and fixes for the "Recommended For You" row (Version 1), completed between commits `1da8a90` and `c6f52d8`.

## Commits in This Version

### 1. Initial Hydration & Pagination (`1da8a90`)

**Problem:**

- Missing `myRatings?.length` in effect dependencies
- GET handler used manual Firebase Admin init causing 500 errors

**Solution:**

- Added `myRatings?.length` to dependencies
- Fixed GET handler to use `getAdminDb()` helper
- Resolved 500 errors in pagination endpoint

### 2. Premature Fetch on Refresh (`2c7c8f8`)

**Problem:**

- Row disappeared after refresh because fetch ran with empty arrays
- `hasHydrated` set to true before Firebase loaded data

**Solution:**

- Reset `hasHydrated` to false when `syncStatus` becomes 'syncing'
- Added guard to prevent fetch until hydration completes
- Row now survives page refreshes with correct data

### 3. Mutation Refetch Prevention (`7c88013`)

**Problem:**

- `hasHydrated` mirrored `syncStatus`, triggering refetch on every like/watchlist change
- Offline state caused permanent lock (flag never recovered)

**Solution:**

- Renamed to `initialHydrationComplete` (only changes once: false → true)
- Flag stays true even during routine mutations
- Added offline handling to prevent permanent lock
- User interactions no longer cause jarring refetches

### 4. True Infinite Scroll (`d7a6d5b`)

**Problem:**

- API didn't know which IDs were already shown → duplicates
- Row stopped after 5 duplicate pages
- No fallback strategy when genre-based dried up

**Solution:**

**Client (Row.tsx):**

- Pass already-shown IDs as `&exclude=` parameter
- Special-case recommendations with 10-page duplicate threshold

**API (route.ts):**

- Accept and parse `exclude` query parameter
- Merge client exclude IDs with server-side seen IDs
- Add fallback strategy: TMDB similar + trending content
- Filter all fallback against full exclude list

### 5. Paginated Trending Fallback (`c6f52d8`)

**Problem:**

- Trending fallback always fetched page 1 → same content → duplicates
- Row still stopped after 10 duplicate pages

**Solution:**

**API (route.ts):**

- Use `Math.ceil(page/2)` to vary trending page
- Alternate movie/TV trending (`page % 2`)
- Each pagination request fetches different trending pool

**Row.tsx:**

- Remove hard limit for recommendations entirely
- Never stop on duplicates - only on total_pages limit
- Keep trying indefinitely (♾️ symbol in logs)

## Current Implementation Status

### ✅ What Works

- Recommendations load once after Firebase hydration
- User interactions (like/watchlist) don't trigger refetches
- Pagination works correctly (no 500 errors)
- API knows what's already shown (exclude IDs)
- Fallback content keeps scroll going (similar + trending)
- Truly infinite scroll until genuine content exhaustion
- Graceful offline recovery

### ⚠️ Limitations Identified

1. **Shallow Signal Depth**
    - Only first 10 likes/watchlist items reach server
    - Only first 20 ratings included
    - Heavy users' earlier history ignored
    - Optional quiz data (genre/title preferences) not always present

2. **Static Personalization**
    - After page 1, GET handler relies purely on genre-based discovery
    - No feedback loop for dislikes/skips
    - Late pages are essentially "trending in user's genres"

3. **Progressive Degradation**
    - Initial pages: Personalized (60% genre + 40% similar)
    - Later pages: Generic (100% genre-based)
    - Final pages: Trending fallback (loosely related)

4. **No Explicit Reasons**
    - UI doesn't show "Because you liked..." explanations
    - Users can't tell why content was recommended
    - No transparency into the personalization logic

## Technical Architecture

### Client Flow

```
RecommendedForYouRow.tsx (254-373)
    ↓
    Wait for initialHydrationComplete
    ↓
    POST /api/recommendations/personalized
    - myRatings (20 max)
    - likedMovies (10 max)
    - watchlist (10 max)
    - collectionItems (20 max)
    - genrePreferences, contentPreferences, votedContent
    ↓
    Render initial 40 items
    ↓
    Infinite scroll triggers GET with &exclude=...
```

### API Flow

```
POST Handler (initial):
    Build profile from limited data
    → 60% genre-based + 40% TMDB similar
    → Return 40 items

GET Handler (pagination):
    Reload user from Firestore
    → Parse exclude IDs from client
    → Merge with server seen IDs
    → Genre-based recommendations (page-aware)
    → If < limit/2: Add TMDB similar
    → If still < limit/2: Add trending (paginated)
    → Return filtered results
```

### Recommendation Engine

- **Genre weighting:** Liked (+3), Watchlist (+1), Quiz preferences (+4/+5)
- **Progressive relaxation:** Filters loosen from page 1 to 40+
- **Year preferences:** Decade-based clustering for genre+year combos
- **Fallback layers:** Genre → Similar → Trending

## Data Limitations

### What's Sent to API

```typescript
{
  myRatings: sessionData.myRatings?.slice(0, 20),           // Last 20 ratings
  likedMovies: sessionData.likedMovies.slice(0, 10),        // Last 10 likes
  watchlist: sessionData.defaultWatchlist.slice(0, 10),     // Last 10 watchlist
  collectionItems: collectionItems.slice(0, 20),            // 20 from collections
  hiddenMovies: sessionData.hiddenMovies.slice(0, 10),      // Last 10 hidden
  genrePreferences: genrePreferences,                       // All quiz preferences
  contentPreferences: contentPreferences,                   // All content prefs
  votedContent: votedContent,                               // All title quiz votes
}
```

### What's Available in Firestore

- Full `myRatings` array (unbounded)
- Full `likedMovies` array
- Full `defaultWatchlist` array
- All user collections with items
- Watch history (90-day TTL)
- Interaction events (90-day TTL)
- Genre/content/voted preferences

## Performance Characteristics

- **Initial fetch:** ~500-800ms (POST with profile building)
- **Pagination:** ~200-400ms (GET with Firestore reload)
- **Fallback trigger:** When genre-based returns < 50% of limit
- **Cache:** None (every request rebuilds profile)
- **Rate limits:** TMDB 40 req/s (multiple parallel calls per page)

## Next Steps (V2 Improvements Needed)

See separate planning document for proposed improvements to address limitations.

## Related Files

### Core Implementation

- `components/recommendations/RecommendedForYouRow.tsx`
- `app/api/recommendations/personalized/route.ts`
- `utils/recommendations/genreEngine.ts`
- `utils/recommendations/yearPreferenceDetector.ts`

### Supporting Components

- `components/recommendations/RecommendationInsightsModal.tsx`
- `components/recommendations/GenrePreferenceModal.tsx`
- `components/recommendations/TitlePreferenceModal.tsx`

### Types & Constants

- `types/recommendations.ts`
- `types/shared.ts`
- `constants/unifiedGenres.ts`

---

**Version:** 1.0
**Status:** Production-ready with known limitations
**Last Updated:** 2025-11-28
**Commits:** `1da8a90` → `c6f52d8` (5 commits)
