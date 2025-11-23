# System Recommendations + Default Collections Plan

## Overview

This plan separates **System Recommendations** (Trending, Top Rated, Recommended For You) from **Default Collections** (genre-based collections like Action, Sci-Fi, Comedy).

- **System Recommendations**: A separate data type for TMDB-powered rows that users can customize but not add manual content to
- **Default Collections**: Real collections seeded on user creation that users can fully edit, add content to, and delete

---

## Phase 1: Data Types & Store Updates

### 1.1 Create SystemRecommendation type

**File**: `types/recommendations.ts`

```typescript
interface SystemRecommendation {
    id: 'trending' | 'top-rated' | 'recommended-for-you'
    name: string
    enabled: boolean
    order: number
    mediaType: 'movie' | 'tv' | 'both'
    genres: string[] // Unified genre IDs
    color?: string
    emoji?: string
}
```

### 1.2 Add recommendation settings to authStore/guestStore

- Add `systemRecommendations: SystemRecommendation[]` to user data
- Add actions: `updateRecommendation`, `reorderRecommendations`
- Sync to Firebase/localStorage

### 1.3 Create default recommendation settings

```typescript
const DEFAULT_RECOMMENDATIONS: SystemRecommendation[] = [
    { id: 'trending', name: 'Trending', enabled: true, order: 0, mediaType: 'both', genres: [] },
    { id: 'top-rated', name: 'Top Rated', enabled: true, order: 1, mediaType: 'both', genres: [] },
    {
        id: 'recommended-for-you',
        name: 'Recommended For You',
        enabled: true,
        order: 2,
        mediaType: 'both',
        genres: [],
    },
]
```

---

## Phase 2: Remove Trending/Top Rated from Collections

### 2.1 Update `constants/systemCollections.ts`

- Remove `system-trending` and `system-top-rated`
- Keep only genre-based defaults:
    - Action-Packed
    - Sci-Fi & Fantasy
    - Comedy

### 2.2 Update migration script

- Remove Trending/Top Rated from collections migration
- Only migrate genre-based collections to `userCreatedWatchlists`

---

## Phase 3: Settings Page

### 3.1 Create `/settings/recommendations/page.tsx`

- List system recommendations with toggle switches
- Edit button opens collection-style edit modal
- Drag-and-drop reordering

### 3.2 Create/adapt edit modal for recommendations

- Reuse existing collection edit modal structure
- Fields: name, enabled, mediaType, genres, color, emoji
- Same UX as editing a collection

### 3.3 Update Settings navigation

- Add "Recommendations" link to settings menu/sidebar

---

## Phase 4: Homepage Row Components

### 4.1 Create `TrendingRow` component

- Fetch from `/api/movies/trending` and `/api/tv/trending`
- Apply user's mediaType and genre settings from store
- Similar structure to `RecommendedForYouRow`

### 4.2 Create `TopRatedRow` component

- Fetch from `/api/movies/top-rated` and `/api/tv/top-rated`
- Apply user's mediaType and genre settings from store

### 4.3 Update `RecommendedForYouRow`

- Read settings from store (enabled, order, name, etc.)
- Respect user customizations

---

## Phase 5: Homepage Integration

### 5.1 Update `HomeClient.tsx`

- Fetch system recommendations from store
- Render enabled recommendations in user-defined order
- Render user collections separately (also ordered)
- Combine both in final display order on homepage

---

## Phase 6: Cleanup & Testing

### 6.1 Migration for existing users

- Add default recommendation settings to users who don't have them
- Optionally clean up any Trending/Top Rated items from `userCreatedWatchlists`

### 6.2 Test all flows

- [ ] New user gets default recommendations + default collections
- [ ] Settings > Recommendations page works
- [ ] Edit modal saves correctly
- [ ] Homepage renders recommendations and collections in correct order
- [ ] Disabling a recommendation hides it from homepage

### 6.3 Commit changes

---

## Data Flow Summary

```
User Data
├── systemRecommendations: SystemRecommendation[]
│   ├── trending (TMDB trending endpoint)
│   ├── top-rated (TMDB top-rated endpoint)
│   └── recommended-for-you (personalization algorithm)
│
└── userCreatedWatchlists: Collection[]
    ├── system-action (seeded default)
    ├── system-scifi (seeded default)
    ├── system-comedy (seeded default)
    └── ... (user-created collections)
```

---

## Key Differences

| Aspect            | System Recommendations        | Default Collections                     |
| ----------------- | ----------------------------- | --------------------------------------- |
| Data source       | TMDB endpoints / algorithm    | User-defined filters or manual          |
| Can add items     | No                            | Yes                                     |
| Can edit settings | Yes (name, mediaType, genres) | Yes (full editing)                      |
| Can delete        | No (only disable)             | Yes                                     |
| Stored in         | `systemRecommendations`       | `userCreatedWatchlists`                 |
| Managed in        | `/settings/recommendations`   | `/collections`, `/settings/collections` |
