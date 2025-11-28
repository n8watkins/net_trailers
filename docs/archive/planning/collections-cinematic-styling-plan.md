# Plan: Apply Cinematic Hero Styling to Collections Page

## Summary

Apply the same cinematic hero styling pattern used in Notifications, My Ratings, and Community Rankings pages to the Collections page for visual consistency across the app.

## Current State Analysis

### Collections Page (`app/collections/page.tsx`)

- **Current Implementation**: Basic SubPageLayout with simple title/icon/description
- **Layout**: Simple pill-based collection links in a bordered card
- **Features**:
    - No search functionality
    - No filtering options
    - No atmospheric background
    - Basic loading state
    - Simple empty state
- **Styling**: Standard SubPageLayout with gray theme

### Reference Pages with Cinematic Hero Styling

#### 1. **Notifications Page** (`app/notifications/NotificationsPageClient.tsx`)

- Theme: Red/Rose gradient
- Icon: BellIcon with red glow
- Features: Search, "Mark all read" button, Manage dropdown
- Background: Red-900/20 atmospheric gradient
- Layout: SubPageLayout with `hideHeader`

#### 2. **My Ratings Page** (`app/ratings/page.tsx`)

- Theme: Purple/Violet gradient
- Icon: StarIcon with purple glow
- Features: Search, Category pills (Liked/Disliked), Rate Titles button, Manage dropdown
- Background: Purple-900/20 atmospheric gradient
- Layout: SubPageLayout with `hideHeader`
- Grid: Content cards with fadeInUp animations

#### 3. **Community Rankings** (`components/community/RankingsContent.tsx`)

- Theme: Yellow/Amber gradient
- Icon: TrophyIcon with yellow glow
- Features: Search with voice input, Main navigation tabs, Category pills (All/Movies/TV), Load more button
- Background: Yellow-900/20 atmospheric gradient
- Layout: Direct implementation (not using SubPageLayout header)
- Grid: Multi-column responsive grid with fadeInUp animations

## Proposed Changes

### 1. Theme Selection

**Color Theme**: Blue/Cyan gradient (matches `RectangleStackIcon` color from current implementation)

- Primary: `blue-500/blue-400`
- Secondary: `cyan-500/cyan-400`
- Background gradient: `blue-900/20`

### 2. Component Restructure (`app/collections/page.tsx`)

#### Structure Overview:

```
SubPageLayout (hideHeader={true})
  └─ Cinematic Hero Section
      ├─ Atmospheric Background (fixed)
      ├─ Animated Background Gradients
      ├─ Hero Content
      │   ├─ Icon (RectangleStackIcon) with blue glow
      │   ├─ Title: "Collections"
      │   ├─ Subtitle with collection count
      │   ├─ Filter Pills (All, Auto-Update, Manual, AI-Generated)
      │   └─ Enhanced Search Bar
      └─ Main Content Area
          ├─ Loading State (NetflixLoader with blue theme)
          ├─ Empty State (styled with blue theme)
          └─ Collections Grid (improved layout with cards)
```

#### Atmospheric Background:

```tsx
<div className="fixed inset-0 pointer-events-none">
    <div className="absolute inset-0 bg-black" />
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-blue-900/20 via-transparent to-transparent opacity-50" />
    <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
</div>
```

#### Hero Header:

```tsx
<div className="relative overflow-hidden pt-4">
    {/* Animated Background Gradients */}
    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
    <div
        className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-cyan-900/10 to-black/50 animate-pulse"
        style={{ animationDuration: '4s' }}
    />
    <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-blue-900/5 to-transparent" />

    {/* Soft edge vignetting */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

    {/* Hero Content */}
    <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
        {/* Icon with glow */}
        {/* Title with gradient */}
        {/* Subtitle */}
        {/* Filter Pills */}
        {/* Search Bar */}
    </div>
</div>
```

### 3. New Features to Add

#### A. **Filter Pills**

Categories:

- **All** - Show all collections (default)
- **Auto-Update** - Collections with auto-update enabled
- **Manual** - Manually curated collections
- **AI-Generated** - Collections created via AI/smart search

Implementation:

```tsx
const [collectionFilter, setCollectionFilter] = useState<'all' | 'auto' | 'manual' | 'ai'>('all')

// Filter logic
const filteredCollections = useMemo(() => {
    let filtered = allLists

    if (collectionFilter === 'auto') {
        filtered = filtered.filter((list) => list.autoUpdate === true)
    } else if (collectionFilter === 'manual') {
        filtered = filtered.filter((list) => list.type === 'manual')
    } else if (collectionFilter === 'ai') {
        filtered = filtered.filter((list) => list.type === 'ai')
    }

    // Apply search filter
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(
            (list) =>
                list.name.toLowerCase().includes(query) ||
                list.description?.toLowerCase().includes(query)
        )
    }

    return filtered
}, [allLists, collectionFilter, searchQuery])
```

#### B. **Enhanced Search Bar**

- Magnifying glass icon (left)
- Clear button when text entered (right)
- Blue glow on focus
- Placeholder: "Search collections..."

#### C. **Improved Collections Grid**

Current: Simple flex-wrap of pills
Proposed: Card-based grid layout similar to RankingsContent

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {filteredCollections.map((list, index) => (
        <div
            key={list.id}
            className="animate-fadeInUp"
            style={{
                animationDelay: `${Math.min(index * 50, 500)}ms`,
                animationFillMode: 'both',
            }}
        >
            <CollectionCard collection={list} />
        </div>
    ))}
</div>
```

#### D. **Collection Card Component** (New)

Location: `components/collections/CollectionCard.tsx`

Features:

- Hover effects with scale
- Color-coded border (using list.color)
- Emoji/icon display
- Collection name
- Item count badge
- Auto-update badge (if applicable)
- "Updated X ago" timestamp (for auto-update collections)

### 4. Enhanced States

#### Loading State:

```tsx
{
    isLoading && (
        <div className="py-16">
            <NetflixLoader inline={true} message="Loading collections..." />
        </div>
    )
}
```

#### Empty State:

```tsx
{
    !isLoading && filteredCollections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl scale-150" />
                <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                    <RectangleStackIcon className="w-12 h-12 text-blue-500" />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
                {searchQuery ? 'No collections match your search' : 'No collections yet'}
            </h3>
            <p className="text-gray-400 mb-8 max-w-md text-lg">
                {searchQuery ? 'Try a different search term' : 'Create your first collection!'}
            </p>
        </div>
    )
}
```

### 5. Animations

Add fadeInUp keyframe animation:

```tsx
<style jsx>{`
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    :global(.animate-fadeInUp) {
        animation: fadeInUp 0.5s ease-out;
    }
`}</style>
```

## Implementation Steps

### Phase 1: Component Restructure

1. Update `app/collections/page.tsx` to wrap in `SubPageLayout` with `hideHeader={true}`
2. Add atmospheric background layer (blue theme)
3. Implement cinematic hero header section
4. Move existing collection list logic into main content area

### Phase 2: Add Search & Filters

5. Implement search state and input field in hero
6. Add filter pills for collection types (All/Auto/Manual/AI)
7. Implement filter logic to work with search

### Phase 3: Collection Card Component

8. Create `components/collections/CollectionCard.tsx`
9. Design card layout with hover effects, badges, timestamps
10. Replace pill-based links with card grid

### Phase 4: Enhanced States & Polish

11. Implement styled loading state with NetflixLoader
12. Implement styled empty state with blue theme
13. Add fadeInUp animations to collection cards
14. Test responsive layout (mobile, tablet, desktop)

### Phase 5: Testing & Refinement

15. Test all filter combinations
16. Test search functionality
17. Test empty states (no collections, no search results)
18. Verify animations work smoothly
19. Check color consistency with blue theme
20. Test with various collection counts (0, 1, 5, 20+)

## Files to Create/Modify

### New Files:

- `components/collections/CollectionCard.tsx` - Card component for individual collections

### Modified Files:

- `app/collections/page.tsx` - Complete restructure with cinematic hero styling

## Design Consistency

### Color Mappings by Page:

- **Notifications**: Red (`red-500`, `rose-500`)
- **My Ratings**: Purple (`purple-500`, `violet-500`)
- **Community Rankings**: Yellow (`yellow-500`, `amber-500`)
- **Collections**: Blue (`blue-500`, `cyan-500`) ← **NEW**

### Shared Patterns:

- SubPageLayout with `hideHeader`
- 4-second pulsing animated gradients
- Icon with colored glow effect
- Enhanced search bar with glowing focus effect
- Category/filter pills with selection state
- Atmospheric background with radial gradients
- Soft edge vignetting (black/60-80 opacity)
- fadeInUp animations on content items
- Consistent empty/loading states

## Notes & Considerations

1. **Maintain Existing Functionality**: All current features must work (collection sorting, Watch Later priority, color coding)

2. **Collection Type Detection**: Collections may not have explicit `type` field - infer from properties:
    - Auto-update: `list.autoUpdate === true`
    - AI-Generated: Check for AI-related metadata or creation method
    - Manual: Default type

3. **Performance**: Ensure animations don't cause jank with large collection counts (test with 20+ collections)

4. **Accessibility**: Maintain keyboard navigation and screen reader support

5. **Mobile Responsiveness**: Test hero section on small screens (search bar, filter pills should wrap gracefully)

6. **Future Enhancement Opportunities**:
    - Sort options (Name, Date Created, Last Updated, Item Count)
    - Bulk actions (Delete multiple collections)
    - Collection preview on hover
    - Drag-to-reorder collections

## Success Criteria

✅ Collections page matches visual style of Notifications/Ratings/Rankings pages
✅ Cinematic hero section with blue theme implemented
✅ Search functionality works across collection names and descriptions
✅ Filter pills work correctly for all collection types
✅ Collection cards display all relevant information (name, count, badges, timestamps)
✅ Animations are smooth and performant
✅ Empty and loading states are properly styled
✅ Page is fully responsive on all screen sizes
✅ All existing functionality preserved
✅ Code follows existing patterns and conventions
