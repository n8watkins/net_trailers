# My Ratings Refactor Plan

## Overview

This document outlines the plan to merge three separate rating/voting systems (`likedMovies`, `hiddenMovies`, `votedContent`) into a single unified `myRatings` system.

**Current State:**

- `likedMovies` - Content user has "liked" (stored separately)
- `hiddenMovies` - Content user has marked to hide (stored separately)
- `votedContent` - Content voted on in title quiz (stores `like`/`dislike` votes)

**Target State:**

- Single `myRatings` array with `vote: 'like' | 'dislike'` per item
- Profile "Liked Content" shows filtered view of ratings where `vote === 'like'`
- Hidden content filtering uses ratings where `vote === 'dislike'`

## Completed Work (Phase 1)

- [x] Removed neutral vote state from `VotedContent` type
- [x] Changed terminology from `love/not_for_me` to `like/dislike`
- [x] Updated `TitlePreferenceModal.tsx` - removed neutral button, changed to thumbs up icon
- [x] Updated `GenrePreferenceModal.tsx` - changed to thumbs up icon
- [x] Updated `app/votes/page.tsx` - removed neutral filter/stats
- [x] Updated `utils/recommendations/genreEngine.ts` - changed VOTE_WEIGHTS keys
- [x] Fixed documentation references (atoms.ts → shared.ts)

## Phase 2: Type Definitions

### Files to Modify

**`types/shared.ts`**

- Rename `VotedContent` to `RatedContent` (or keep as is, just ensuring vote is `'like' | 'dislike'`)
- Add `ratedAt` timestamp field if not present

**`types/atoms.ts`** → Note: Does not exist, using `types/shared.ts`

### Type Definition

```typescript
export interface RatedContent {
    contentId: number
    mediaType: 'movie' | 'tv'
    vote: 'like' | 'dislike'
    ratedAt: number // timestamp
    genreIds?: number[] // for recommendation engine
}
```

## Phase 3: Store Updates

### Files to Modify

**`stores/createUserStore.ts`**

- Remove `likedMovies` array from state
- Remove `hiddenMovies` array from state
- Keep/rename `votedContent` → `myRatings`
- Update actions:
    - Remove `addToLiked`, `removeFromLiked`
    - Remove `addToHidden`, `removeFromHidden`
    - Add `addRating(content, vote)` - upserts rating
    - Add `removeRating(contentId)` - removes rating entirely
    - Add `getRatingForContent(contentId)` - returns rating if exists
    - Add `getLikedContent()` - returns filtered ratings where vote === 'like'
    - Add `getDislikedContent()` - returns filtered ratings where vote === 'dislike'

**`stores/authStore.ts`**

- Update to use new myRatings structure
- Update Firebase sync to use single `myRatings` collection

**`stores/guestStore.ts`**

- Update localStorage structure for myRatings

### Migration Strategy

For existing users:

1. Read existing `likedMovies` → convert to ratings with `vote: 'like'`
2. Read existing `hiddenMovies` → convert to ratings with `vote: 'dislike'`
3. Read existing `votedContent` → keep as is (already has vote field)
4. Merge all into single `myRatings` array (deduplicate by contentId)
5. Write new structure, delete old fields

## Phase 4: Content Filtering Updates

### Files to Modify

**`utils/contentFilter.ts`**

- Update `filterHiddenContent()` to use `myRatings` instead of `hiddenMovies`
- Filter out content where rating exists with `vote === 'dislike'`

**`app/api/recommendations/personalized/route.ts`**

- Update to read from `myRatings` instead of separate arrays
- Liked content = ratings with `vote: 'like'`

**`utils/recommendations/genreEngine.ts`**

- Already updated VOTE_WEIGHTS
- Update `calculateGenrePreferences()` to use myRatings for all signals

**`components/recommendations/RecommendedForYouRow.tsx`**

- Update to get liked content from `myRatings` filtered view

## Phase 5: UI Component Updates

### Files to Modify

**`components/content/ContentCard.tsx`** (if exists)

- Update like/hide button logic to use new rating system

**`components/modals/Modal.tsx`** or **`components/modals/InfoModal.tsx`**

- Update like button to toggle rating
- Update hide button to toggle rating

**`app/votes/page.tsx`** → Rename to **`app/ratings/page.tsx`**

- Update page title to "My Ratings"
- Add search functionality
- Show all rated content (both liked and disliked)
- Update filtering to use new structure

**`app/liked/page.tsx`** → DELETE or redirect to `/ratings?filter=liked`

**`app/hidden/page.tsx`** → DELETE or redirect to `/ratings?filter=disliked`

### Profile Page Updates

**`app/profile/page.tsx`** or relevant component

- "Liked Content" section should show `myRatings.filter(r => r.vote === 'like')`
- This is a filtered view, not separate data

## Phase 6: API Route Updates

### Files to Check/Modify

**`app/api/user/*/route.ts`** (various user data endpoints)

- Update to use myRatings structure

**Firebase sync utilities**

- Update document structure for myRatings

## Phase 7: Testing & Verification

1. Test new user flow (no migration needed)
2. Test existing user migration
3. Test guest user localStorage migration
4. Verify content filtering works correctly
5. Verify recommendations use correct signals
6. Verify profile displays correctly
7. Test search on ratings page

## Files Summary

### Core Type/Store Files (Critical)

- `types/shared.ts`
- `stores/createUserStore.ts`
- `stores/authStore.ts`
- `stores/guestStore.ts`

### Content Filtering (High Priority)

- `utils/contentFilter.ts`
- `utils/recommendations/genreEngine.ts`

### UI Components (Medium Priority)

- `app/votes/page.tsx` → rename to `app/ratings/page.tsx`
- `app/liked/page.tsx` → delete
- `app/hidden/page.tsx` → delete
- `components/modals/Modal.tsx`
- `components/recommendations/RecommendedForYouRow.tsx`

### API Routes (Lower Priority)

- `app/api/recommendations/personalized/route.ts`
- Various user data endpoints

## Key Decisions

1. **Naming**: Use `myRatings` as the store property name
2. **Type name**: Keep `RatedContent` or `VotedContent`
3. **Page route**: `/ratings` (not `/my-ratings` or `/votes`)
4. **Search**: Add search functionality to ratings page
5. **Profile integration**: Liked content in profile is filtered view of ratings

## Migration Notes

- Guest users: localStorage key change from multiple keys to single `myRatings`
- Auth users: Firestore document restructure
- Consider running migration on first load after update
- Add migration version flag to prevent re-running

## Status

- [x] Phase 1: Neutral removal, terminology updates
- [x] Phase 2: Type definitions (RatedContent type, updated UserPreferences)
- [x] Phase 3: Store updates (rateContent, removeRating, getLikedContent, getDislikedContent)
- [x] Phase 4: Content filtering (filterByRatings, updated filterHiddenContent)
- [x] Phase 5: UI components (My Ratings page with search, updated useLikedHidden hook)
- [ ] Phase 6: API routes (recommendations still using legacy arrays)
- [ ] Phase 7: Testing
