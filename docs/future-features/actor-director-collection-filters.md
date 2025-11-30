# Future Feature: Actor/Director Collection Filters

## Overview

Allow users to create collections based on specific actors or directors. For example, a collection that automatically includes all Christopher Nolan movies, or all content featuring Margot Robbie.

## User Request

> "I want the ability to be able to add certain actors or directors into what we might be interested in. I.e. like we can add to a collection certain types of actors or directors."

## Current State

### Existing Infrastructure

The `AdvancedFilters` interface in `types/collections.ts` already contains fields for this:

```typescript
export interface AdvancedFilters {
    // ... other filters
    withCast?: string[] // Actor names or TMDB person IDs
    withDirector?: string // Director name or TMDB person ID
    // ...
}
```

**Gap**: UI does not expose these fields. Users cannot currently specify actors or directors when creating collections.

## Proposed Feature

### Use Cases

1. **Director-Based Collections**
    - "All Christopher Nolan Films"
    - "Greta Gerwig Movies"
    - "Denis Villeneuve Sci-Fi"

2. **Actor-Based Collections**
    - "Margot Robbie Filmography"
    - "Everything with Tom Hanks"
    - "Leonardo DiCaprio Thrillers"

3. **Multi-Person Collections**
    - "Nolan & DiCaprio Collaborations" (director + actor)
    - "MCU Cast Members" (multiple actors)

### Collection Types

This feature would work with two collection types:

1. **Manual Collections** - User picks specific actors/directors, content is static
2. **Auto-Updating Collections** - Collection automatically includes new releases featuring those people

### UI Implementation

#### Collection Builder Modal Enhancement

Add a new section to the collection creation flow:

**People Filters** (collapsible section)

- Actor/Director autocomplete search
- Uses TMDB `/search/person` API
- Shows person card with photo on selection
- Supports multiple actors (stored in `withCast` array)
- Supports single director (stored in `withDirector` string)

**Mockup**:

```
┌─────────────────────────────────────────┐
│ Collection Builder                      │
├─────────────────────────────────────────┤
│ Name: [Christopher Nolan Sci-Fi]        │
│                                         │
│ Media Type: ○ Movies  ○ TV  ○ Both     │
│                                         │
│ ▼ People Filters                        │
│   Director:                             │
│   [Search directors...        ][+]      │
│   ┌─────────────────────────────────┐  │
│   │ 🎬 Christopher Nolan       [×]   │  │
│   └─────────────────────────────────┘  │
│                                         │
│   Actors:                               │
│   [Search actors...           ][+]      │
│   ┌─────────────────────────────────┐  │
│   │ 🎭 Matthew McConaughey     [×]   │  │
│   │ 🎭 Anne Hathaway           [×]   │  │
│   └─────────────────────────────────┘  │
│                                         │
│ ▼ Genre Filters                         │
│   ☑ Sci-Fi  ☑ Thriller  ☐ Drama        │
│                                         │
│ [ Create Collection ]                   │
└─────────────────────────────────────────┘
```

### TMDB API Integration

TMDB's `/discover/movie` and `/discover/tv` endpoints support:

**Actor filtering**:

- `with_cast={personId}` - Single actor
- `with_cast={personId},{personId}` - Multiple actors (AND logic)

**Director filtering**:

- `with_crew={personId}` - Any crew member
- Server-side filtering by job="Director"

**Example API call**:

```
/discover/movie?with_cast=138&with_crew=525&with_genres=878
(Movies with Christian Bale, directed by Christopher Nolan, in Sci-Fi genre)
```

### Data Flow

```
User creates collection with actors/directors
    ↓
AdvancedFilters populated with:
  - withCast: [personId1, personId2]
  - withDirector: personId3
    ↓
Saved to collection document in Firestore
    ↓
API route `/api/custom-rows/[id]/content` reads filters
    ↓
Translates to TMDB discover parameters:
  - with_cast=personId1,personId2
  - with_crew=personId3
    ↓
Fetches and returns matching content
```

### Auto-Update Integration

For auto-updating collections with actor/director filters:

1. Daily cron job (`/api/cron/update-collections`)
2. Fetches latest content matching person filters
3. Compares with existing collection content
4. Adds new releases to collection
5. Creates notification: "New release from Christopher Nolan added to 'Nolan Sci-Fi'"

## Technical Considerations

### Person Search Component

Create reusable `PersonPicker` component:

```typescript
interface PersonPickerProps {
    role: 'actor' | 'director' | 'any'
    multiple?: boolean
    selected: Person[]
    onSelect: (person: Person) => void
    onRemove: (personId: number) => void
}

interface Person {
    id: number // TMDB person ID
    name: string
    profile_path: string | null
    known_for_department: string
}
```

### Type Safety

Update type guards to validate person filters:

```typescript
const isValidPersonFilter = (filter: AdvancedFilters): boolean => {
    // Validate TMDB person IDs are numeric
    if (filter.withCast?.some((id) => isNaN(Number(id)))) return false
    if (filter.withDirector && isNaN(Number(filter.withDirector))) return false
    return true
}
```

### Performance

**Caching strategy**:

- Cache TMDB person search results (30 minutes)
- Cache person profile images (24 hours)
- Revalidate collection content when person filters change

**Limits**:

- Max 5 actors per collection (prevent API overload)
- Max 1 director per collection (TMDB API limitation)

### Child Safety Integration

- Person-based collections respect child safety mode
- Filtered content already passes through rating checks
- No additional safety logic needed

## Edge Cases

1. **Person with no credits**
    - Show empty state: "No content found for {Person Name}"
    - Suggest removing person filter or changing media type

2. **Deprecated person IDs**
    - TMDB sometimes merges duplicate person entries
    - Handle 404 responses gracefully
    - Suggest re-searching for the person

3. **Person with 100+ credits**
    - Paginate results (20 per page in collection)
    - Sort by popularity or release date
    - Allow filtering within person's filmography

4. **Multiple directors selected**
    - UI should prevent (withDirector is string, not array)
    - Alternative: Support OR logic with multiple directors (requires multiple API calls)

## Migration Plan

**No migration needed** - This is an additive feature. Existing collections without person filters continue working as before.

## Rollback Plan

- Remove PersonPicker component
- Remove person filter section from CollectionBuilderModal
- Person filter fields in AdvancedFilters remain (backward compatible)

## Success Metrics

1. **Adoption Rate**
    - Track % of new collections using person filters
    - Compare engagement with person-based vs non-person collections

2. **Popular Filters**
    - Track most-used actors/directors
    - Identify trending people for featured collections

3. **Auto-Update Value**
    - Monitor notification engagement for person-based collections
    - Track retention of person-filtered auto-updating collections

## Future Enhancements (Out of Scope)

1. **Person Collections Page**
    - Dedicated page: `/collections/by-person/[personId]`
    - Browse all user collections featuring that person

2. **Smart Suggestions**
    - "Users who like Christopher Nolan also created collections for Denis Villeneuve"
    - AI-powered person recommendations based on collection patterns

3. **Collaboration Filters**
    - "Movies where Nolan directed DiCaprio"
    - Requires intersection logic (director AND actor)

4. **Person Watchlists**
    - Auto-add new releases from favorite directors/actors to Watch Later
    - Requires new feature: followed people

## Related Features

- **Person Pages** (`/person/[id]`) - Could link to "Create Collection" with person pre-selected
- **Smart Search** - Natural language: "Christopher Nolan sci-fi movies" could auto-fill person filters
- **Sharing** - Share person-based collections with embedded person metadata

## Open Questions

1. **Should we allow OR logic for multiple directors?**
    - Current: withDirector is single string
    - Alternative: withDirector could be string[] and fetch separately, merge results
    - **Recommendation**: Start with single director, add multi-director in v2 if requested

2. **Should person filters work with manual collections?**
    - Current plan: Works with auto-updating collections
    - Alternative: Manual collections show person picker but only for initial content fetch
    - **Recommendation**: Support both - manual for static snapshot, auto-update for live tracking

3. **Should we integrate with existing person page "Create Collection" feature?**
    - See: `docs/future-features/person-collections-feature.md`
    - Potential synergy: Person page button could pre-fill person filters
    - **Recommendation**: Implement person filters first, then enhance person page integration

## Implementation Estimate

### Phase 1: Core Person Filters UI

- PersonPicker component (search, select, remove)
- CollectionBuilderModal integration
- TMDB person search API integration
- **Estimate**: 3-4 hours

### Phase 2: Collection Content Fetching

- Update `/api/custom-rows/[id]/content` to handle person filters
- Translate person filters to TMDB discover parameters
- Test with various person + genre combinations
- **Estimate**: 2-3 hours

### Phase 3: Auto-Update Integration

- Enhance cron job to handle person-based collections
- Create notifications for new person content
- Test with real TMDB person IDs
- **Estimate**: 1-2 hours

### Phase 4: Polish & Edge Cases

- Empty states for no results
- Loading states for person search
- Error handling for invalid person IDs
- **Estimate**: 1-2 hours

**Total Estimate**: 7-11 hours for complete feature

## Conclusion

Actor/director collection filters leverage existing `AdvancedFilters` infrastructure and TMDB API capabilities. The feature provides high user value by enabling curated collections based on favorite filmmakers and actors, with optional auto-updating to track new releases.

The key technical insight: **Backend already supports this** via `withCast` and `withDirector` fields - we just need to build the UI to expose it.
