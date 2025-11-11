# Ranking Generator Feature - Quick Reference Guide

## Key Files to Know

### Data Types
- **`/types/userLists.ts`** - Collection structure (extend for rankings)
- **`/types/interactions.ts`** - User interaction tracking
- **`/types/sharing.ts`** - Share settings structure
- **`/typings.ts`** - Content (Movie/TVShow) types

### State Management
- **`/stores/createUserStore.ts`** - Core state factory (add ranking actions here)
- **`/stores/authStore.ts`** - Firebase-synced auth data
- **`/stores/guestStore.ts`** - localStorage guest data
- **`/services/userListsService.ts`** - CRUD service (create RankingsService)

### UI Components to Adapt
- **`/components/common/ContentCard.tsx`** - Item display (add score overlay)
- **`/components/modals/ListSelectionModal.tsx`** - Management UI template
- **`/components/modals/CollectionBuilderModal.tsx`** - Creation flow template
- **`/components/customRows/SortableCustomRowCard.tsx`** - Drag-to-reorder (use @dnd-kit)
- **`/hooks/useToast.ts`** - Notifications
- **`/hooks/useUserData.ts`** - Data access layer

### Firestore Utilities
- **`/utils/firestore/interactions.ts`** - Interaction tracking (track ranking actions)
- **`/utils/firestore/shares.ts`** - Share infrastructure (reuse for rankings)

### Validation & Security
- **`/schemas/listSchema.ts`** - Validation schemas (create rankingSchema)
- **`/services/userListsService.ts`** - XSS prevention patterns

---

## Architecture Layers

```
UI Layer (React Components)
    ↓
State Management (Zustand)
    ↓
Business Logic (Services)
    ↓
Storage Layer (Adapters)
    ↓
Firestore / localStorage
```

---

## State Management Flow

```
Component
  ↓
useUserData() hook  [in /hooks/useUserData.ts]
  ↓
useSessionData()    [in /hooks/useSessionData.ts]
  ↓
useAuthStore() / useGuestStore()  [in /stores/]
  ↓
FirebaseStorageAdapter / LocalStorageAdapter
  ↓
Firestore / localStorage
```

---

## Implementation Checklist

### Phase 1: Data & State
- [ ] Create `/types/rankings.ts` with `Ranking` and `RankedContent` interfaces
- [ ] Add `userRankings: Ranking[]` to `UserState` in `/stores/createUserStore.ts`
- [ ] Add ranking actions to `UserActions` interface
- [ ] Update storage adapters to persist rankings
- [ ] Create `/services/rankingsService.ts` with CRUD + scoring logic

### Phase 2: Firestore
- [ ] Create `/utils/firestore/rankings.ts` with:
  - `createRanking(userId, ranking)`
  - `updateRanking(userId, rankingId, updates)`
  - `deleteRanking(userId, rankingId)`
  - `addToRanking(userId, rankingId, item, score)`
  - `getRankings(userId)`
- [ ] Add ranking interaction logging (`ranking_created`, `ranking_updated`, `item_ranked`)

### Phase 3: Components
- [ ] Create `/components/rankings/RankingItemCard.tsx` (with score display)
- [ ] Create `/components/rankings/SortableRankingItem.tsx` (draggable with @dnd-kit)
- [ ] Create `/components/rankings/RankingBuilderModal.tsx` (main creation interface)
- [ ] Create `/components/rankings/RankingList.tsx` (list of rankings)
- [ ] Create `/components/rankings/RankingDetailModal.tsx` (view/edit)

### Phase 4: Hooks
- [ ] Create `/hooks/useRankings.ts` (similar to useUserData but for rankings)
- [ ] Create `/hooks/useRankingScoring.ts` (scoring algorithms)

### Phase 5: Validation & Security
- [ ] Create `/schemas/rankingSchema.ts` with Zod validation
- [ ] Test XSS prevention (reuse UserListsService patterns)
- [ ] Test data isolation (auth vs guest)

### Phase 6: Sharing
- [ ] Update share infrastructure to support rankings
- [ ] Add `rankingId` field to ShareableLink
- [ ] Create share links for rankings (reuse existing infrastructure)

### Phase 7: Testing
- [ ] Unit tests for RankingsService
- [ ] Integration tests for Firestore persistence
- [ ] Component tests for UI
- [ ] E2E tests for creation/editing/reordering flow

---

## Scoring Algorithm Options

### Manual Scoring
User manually assigns 1-10 score to each item

### Interaction-Based Scoring
```
score = (likes × 5) + (watchlist_adds × 3) + (plays × 2) + (views × 1)
      - (hides × 5) - (dislikes × 2)
```
Reuse `INTERACTION_WEIGHTS` from `/types/interactions.ts`

### Popularity-Based Scoring
```
score = (vote_average / 10) × 100
      + (popularity / max_popularity) × 25
      + (vote_count / max_vote_count) × 25
```

### Hybrid Scoring
Combination of above with weighted factors

---

## Database Schema

### Firestore
```
users/{userId}/
  ├── rankings/
  │   └── {rankingId}: Ranking
  │       └── items: RankedContent[]
  └── ranking_interactions/  (optional, for analytics)
      └── {interactionId}: RankingInteraction
```

### localStorage (Guest)
```
nettrailer_guest_data_{guestId}: {
  userRankings: Ranking[]
}
```

---

## Key Design Decisions

1. **Extend UserList pattern**: Reuse existing collection infrastructure
2. **Store items array**: Keep full Content objects for rendering
3. **Add score metadata**: Track how score was calculated
4. **Support sharing**: Reuse existing ShareableLink infrastructure
5. **Track interactions**: Log ranking events via interactions system
6. **Drag-to-reorder**: Use @dnd-kit like custom rows
7. **Dual storage**: Support Firebase + localStorage like collections

---

## Component Communication Pattern

```
RankingBuilderModal
  ├── passes data to RankingsService
  ├── calls authStore.createRanking()
  └── triggers useToast() for feedback

RankingDetailModal
  ├── uses useRankings() hook
  ├── calls rankingsService for updates
  └── SortableRankingItems handle reordering

RankingList
  ├── renders multiple RankingCards
  └── each card opens RankingDetailModal
```

---

## Toast Messages

```typescript
// Success
showSuccess('Ranking Created', `"${name}" added to your rankings`)
showSuccess('Ranking Updated', 'Changes saved')
showSuccess('Item Added', `${title} ranked #${rank}`)

// Info
showSuccess('Ranking Shared', 'Share link copied to clipboard')

// Errors
showError('Ranking Failed', 'Could not create ranking')
showError('Validation Error', 'Name is required (3-50 characters)')
```

---

## Testing Considerations

- **Data Isolation**: Guest rankings don't affect auth rankings
- **Concurrent Updates**: Multiple tabs updating same ranking
- **Score Calculation**: Verify algorithms produce expected results
- **Drag-and-Drop**: Test reordering with 1, 5, 50+ items
- **Share Validation**: Test share link expiration and permissions
- **XSS Prevention**: Test emoji/name/description injection attempts
- **Firestore Limits**: Test with max items, max rankings per user

---

## Performance Tips

1. **Memoize Components**: Use `React.memo` for RankingItemCard
2. **Lazy Load Rankings**: Don't load all data on mount
3. **Debounce Scoring**: Batch score calculations
4. **Virtual Scroll**: For rankings with 100+ items
5. **Optimistic Updates**: Update UI before Firestore response
6. **Batch Writes**: Use writeBatch for multiple item updates

---

## Error Handling

All errors should route through `useToast()`:

```typescript
try {
  await createRanking(data)
  showSuccess('Ranking created')
} catch (error) {
  if (error.code === 'INVALID_INPUT') {
    showError('Invalid input', 'Check name and scores')
  } else if (error.code === 'QUOTA_EXCEEDED') {
    showError('Limit reached', 'Max 20 rankings per account')
  } else {
    showError('Error', 'Failed to save ranking')
  }
}
```

---

## Consistency with Existing Code

- Follow TypeScript strict mode
- Use discriminated unions for types
- No provider wrappers (Zustand direct usage)
- Sanitize user input (use UserListsService pattern)
- Validate at component + service + Firestore levels
- Use nanoid for IDs (already in dependencies)
- Follow commit message style from recent commits

---

## Related Documentation

- Main Architecture Report: `RANKING_GENERATOR_ARCHITECTURE.md`
- Collection System: `/types/userLists.ts`
- Interaction Tracking: `/types/interactions.ts`
- Sharing System: `/types/sharing.ts`

