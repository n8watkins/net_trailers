# Plan: Create Collections from Actor/Director Search Results

## Current State Analysis

### Existing Architecture

1. **API Routes:**
    - `/api/discover/by-actor` - Fetches content by actor ID with pagination and media type filtering
    - Currently NO `/api/discover/by-director` route exists (gap identified)

2. **Person Pages:**
    - `/app/person/[id]/page.tsx` - Displays person's filmography with filters (role, media type, genre)
    - Filters work client-side on fetched credits
    - URL accepts `?role=` and `?genre=` query params (cleaned after reading)

3. **Collection Creation Flow:**
    - `CollectionCreatorModal` - Modal for creating manual collections from pre-fetched content array
    - `openCollectionCreatorModal(name, content[], mediaType, emoji?, color?)` - Action to trigger modal
    - Used by Smart Search and "More Like This" features
    - Creates **manual collections** with static content arrays

4. **Existing Collection Types:**
    - `manual` - Hand-picked static content (what we'll use)
    - `tmdb-genre` - Auto-updating genre-based collections
    - `ai-generated` - AI-powered smart search collections

### Gap Analysis

**Missing functionality:**

- No "Create Collection" button on person pages
- No by-director API route (only by-actor exists)
- Person page only displays credits, doesn't integrate with collection creation flow
- No way to capture filtered results (role + genre + media type) as a collection

## Implementation Plan

### Phase 1: Create By-Director API Route

**Goal:** Parity with by-actor API for directors

**Files to create/modify:**

- `app/api/discover/by-director/route.ts` (NEW)

**Implementation details:**

```typescript
// Similar structure to by-actor route but uses TMDB crew filters
// TMDB API: /discover/{movie|tv}?with_crew={directorId}
// Parameters: directorId, mediaType, childSafetyMode, page, sort_by
// Returns: { page, results, total_results, director_id }
```

**Differences from by-actor:**

- Use `with_crew={personId}` parameter instead of `with_people`
- Filter results server-side to only include directing credits
- Same child safety filtering and pagination logic

---

### Phase 2: Add "Create Collection" Button to Person Page

**Goal:** Allow users to create collections from filtered person credits

**Files to modify:**

- `app/person/[id]/page.tsx`

**UI Changes:**

1. Add floating action button or header button: "Save as Collection"
2. Position: Above or beside the filter controls
3. Only show when `contentToRender.length > 0`
4. Disabled state when no content after filtering

**Implementation approach:**

```tsx
import { useModalStore } from '../../../stores/modalStore'

const openCollectionCreatorModal = useModalStore((state) => state.openCollectionCreatorModal)

const handleCreateCollection = () => {
    // Use filtered content
    const collectionName = `${personDetails?.name} - ${getRoleFilterLabel(roleFilter)}`

    // Determine media type from filters
    const collectionMediaType = mediaTypeFilter === 'all' ? 'all' : mediaTypeFilter

    // Infer genre from filter if applied
    const emoji = inferEmojiFromRole(roleFilter) // 🎬 for directing, 🎭 for acting, etc.

    openCollectionCreatorModal(
        collectionName,
        contentToRender, // Already filtered by role/genre/mediaType
        collectionMediaType,
        emoji
    )
}
```

**UI Button Design:**

```tsx
<button
    onClick={handleCreateCollection}
    disabled={contentToRender.length === 0}
    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600
             hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
             transition-all duration-200"
>
    <PlusIcon className="h-5 w-5" />
    Save as Collection
</button>
```

**Smart Collection Naming:**
Generate contextual names based on active filters:

- No filters: "{Person Name}'s Filmography"
- Role filter: "{Person Name} - {Role}" (e.g., "Christopher Nolan - Directing")
- Role + Genre: "{Person Name} - {Role} in {Genre}" (e.g., "Greta Gerwig - Directing in Drama")
- Role + Media Type: "{Person Name} - {Role} (Movies)" or "(TV Shows)"

**Emoji Selection Logic:**

```typescript
const inferEmojiFromRole = (role: RoleFilter): string => {
    switch (role) {
        case 'directing':
            return '🎬'
        case 'acting':
            return '🎭'
        case 'writing':
            return '✍️'
        case 'production':
            return '🎥'
        case 'other_crew':
            return '🎞️'
        default:
            return '⭐'
    }
}
```

---

### Phase 3: Enhanced Search Results Integration (Optional Enhancement)

**Goal:** Create collections from actor/director search results on search page

**Files to modify:**

- `components/search/SearchResults.tsx` (if we want this on search page too)
- `components/actors/ActorCard.tsx` (optional: add quick-create button)
- `components/directors/DirectorCard.tsx` (optional: add quick-create button)

**Approach:**
This phase is **optional** since the main use case is covered by Phase 2 (person page).
Could add a "+" icon overlay on hover for ActorCard/DirectorCard that opens a mini-menu:

- "View Filmography" (existing behavior)
- "Create Collection" (new - pre-fetches top 20 credits and opens modal)

**Decision:** Recommend **NOT** implementing Phase 3 initially. The person page provides better filtering options and is the natural place for collection creation from person credits.

---

## Data Flow

### Current Flow (Smart Search → Collection)

```
Smart Search Results → SmartSearchActions component →
openCollectionCreatorModal(name, content[], mediaType) →
CollectionCreatorModal → Create manual collection
```

### New Flow (Person Page → Collection)

```
Person Page Filters (role/genre/media) → contentToRender (filtered) →
"Save as Collection" button →
openCollectionCreatorModal(name, contentToRender, mediaType) →
CollectionCreatorModal → Create manual collection
```

## Type Safety Considerations

### Content Type Compatibility

✅ Person credits from `/api/people/{id}/credits` return `Content[]` type
✅ `CollectionCreatorModal` accepts `Content[]` type
✅ `contentToRender` on person page is already `Content[]` after filtering
✅ No type conversions needed

### Media Type Mapping

Person page uses: `'all' | 'movie' | 'tv'`
Collection modal expects: `'movie' | 'tv' | 'all'`
✅ **Perfect match** - no mapping needed

## Edge Cases to Handle

1. **Empty Results After Filtering**
    - Disable "Save as Collection" button when `contentToRender.length === 0`
    - Show tooltip: "No content to save. Adjust filters to add content."

2. **Guest vs Auth Users**
    - Collection creation already checks user auth in modal
    - Modal will show "Sign in to create collections" if guest (existing behavior)
    - No additional checks needed on person page

3. **Collection Limits**
    - Modal handles max collection limits (20 auth, 3 guest)
    - No pre-check needed on person page button

4. **Large Result Sets**
    - Person page already loads all credits at once (no pagination)
    - `CollectionCreatorModal` has built-in pagination (10 items per page)
    - No performance concerns for typical person filmographies (usually < 100 items)

5. **Child Safety Mode**
    - Person credits API already respects `childSafetyMode` parameter
    - Filtered content is already child-safe if mode is enabled
    - Collection will inherit safe content automatically

## Testing Strategy

### Unit Tests Needed

1. **By-Director API Route** (`app/api/discover/by-director/route.ts`)
    - Test successful fetch with valid director ID
    - Test child safety filtering
    - Test pagination
    - Test media type filtering (movie, tv, both)
    - Test error handling (invalid ID, TMDB API failure)

2. **Person Page Collection Button**
    - Test button visibility with content
    - Test button disabled state (no content)
    - Test collection name generation with various filter combinations
    - Test emoji inference from role filter

### Integration Tests

1. Create collection from person page → verify collection appears in user's collection list
2. Create collection with genre filter → verify genre context is captured in name
3. Create collection as guest → verify auth modal appears

### Manual Testing Scenarios

- [ ] Navigate to Christopher Nolan's page → filter to Directing → create collection
- [ ] Navigate to Margot Robbie's page → filter to Acting in Action genre → create collection
- [ ] Navigate to unknown person → create collection with all roles
- [ ] Enable child safety → create collection → verify only safe content included
- [ ] Try creating 21st collection as auth user → verify limit enforcement
- [ ] Try creating as guest → verify auth prompt

## File Change Summary

### New Files (1)

- `app/api/discover/by-director/route.ts` - By-director API route

### Modified Files (1)

- `app/person/[id]/page.tsx` - Add "Save as Collection" button and logic

### Dependencies Added (0)

- No new packages required
- Uses existing `useModalStore` hook
- Uses existing `CollectionCreatorModal` component

## Migration/Rollback Plan

**No migration needed** - This is a purely additive feature.

**Rollback:**

- Remove button from person page
- Delete by-director API route
- No data migrations needed (collections are standard manual type)

## Performance Considerations

### API Calls

- Person page already fetches all credits on load
- "Save as Collection" button uses existing `contentToRender` data
- **Zero additional API calls** when creating collection from person page
- By-director API route is new but follows same caching strategy as by-actor (1 hour revalidate)

### Bundle Size

- No new dependencies
- Minimal JSX additions (~30 lines for button + handler)
- **Estimated increase:** < 1KB gzipped

## Security Considerations

### Input Validation

- Person ID already validated by existing API routes
- Collection creation goes through existing `CollectionCreatorModal` validation
- No new user input fields on person page (uses existing filters)

### Authorization

- Collection creation already checks authentication in modal
- By-director API uses same TMDB API key security as by-actor route
- No new security concerns

## Accessibility

### Keyboard Navigation

- Button should be keyboard accessible (native `<button>` element)
- Add `aria-label` for screen readers: "Save filtered content as collection"

### Screen Reader Support

```tsx
<button
    onClick={handleCreateCollection}
    disabled={contentToRender.length === 0}
    aria-label={`Save ${contentToRender.length} items as collection`}
    aria-disabled={contentToRender.length === 0}
>
    <PlusIcon className="h-5 w-5" aria-hidden="true" />
    Save as Collection
</button>
```

### Disabled State Communication

- Use `aria-describedby` to link to explanatory text when disabled
- Ensure sufficient color contrast for disabled state

## Success Metrics

**Feature adoption:**

- Track collection creations from person pages via analytics
- Compare to smart search collection creation rate

**User experience:**

- Monitor for error reports related to person page collections
- Track collection retention (are these collections kept or deleted?)

**Performance:**

- Monitor person page load times (should not increase)
- Monitor collection modal render time (should be same as smart search flow)

## Future Enhancements (Out of Scope)

1. **Auto-updating person collections**
    - Allow collections to auto-update when person has new releases
    - Would require new collection type: `person-based`
    - TMDB API call on cron: `/person/{id}/combined_credits`

2. **Collaborative filtering**
    - "People who liked {Person X} also created collections for {Person Y}"
    - Requires analytics and recommendation engine

3. **Quick-create from actor/director cards**
    - Hover overlay on cards with "+" button
    - Pre-fetches top 20 credits and opens modal
    - Requires additional API calls (not ideal for performance)

4. **Collection templates**
    - "Christopher Nolan's Sci-Fi Films" template
    - Pre-filtered by genre and role
    - Requires content curation database

## Open Questions

1. **Should we limit the number of items when creating from person page?**
    - Current behavior: Includes ALL filtered content (could be 100+ items)
    - Alternative: Limit to top 20 by popularity/rating
    - **Recommendation:** Keep all content, user can remove items in modal

2. **Should the button be sticky/floating or in header?**
    - Sticky: Always visible, good for long filmographies
    - Header: Less intrusive, follows standard pattern
    - **Recommendation:** Header button (consistent with other pages)

3. **Should we pre-apply genre filter from person page to collection settings?**
    - Current plan: Manual collection (no genre filter settings)
    - Alternative: If genre filter applied, create tmdb-genre collection with that genre
    - **Recommendation:** Keep as manual collection (simpler, matches smart search behavior)

## Timeline Estimate

### Phase 1: By-Director API Route

- Implementation: 1 hour
- Testing: 30 minutes
- **Total:** 1.5 hours

### Phase 2: Person Page Collection Button

- UI implementation: 1 hour
- Smart naming logic: 30 minutes
- Testing: 1 hour
- **Total:** 2.5 hours

### Phase 3: Optional Enhancements

- Skip initially
- **Total:** 0 hours

**Grand Total:** ~4 hours for complete feature

## Conclusion

This feature leverages the existing `CollectionCreatorModal` infrastructure and simply adds a new entry point from person pages. The implementation is straightforward, low-risk, and provides high user value by allowing collection creation from actor/director filmographies with rich filtering options (role, genre, media type).

The key insight is that **we don't need a new collection type** - manual collections work perfectly for this use case since the person page already does the filtering work and provides a static content array.
