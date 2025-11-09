# Custom Rows Feature - V1 MVP Implementation Plan

## Executive Summary

**Status:** IN PROGRESS - Phase 1 Complete, Starting Phase 2

**Current Architecture:** Client-side Firestore (no API routes for CRUD)

**V1 Scope:** Simplified MVP focusing on core functionality with proven patterns

**Timeline:** 3-4 days remaining (Phase 1 done)

**Key Decision:** Direct Firestore access from client, matches existing patterns

---

## 🎯 V1 MVP Scope (What We're Building)

### ✅ INCLUDED

- Genre selection (multi-select, max 5)
- AND/OR logic for genre combinations
- Movie, TV, or Both media types
- **Simple display logic**: mediaType determines page placement
    - `movie` → Shows on `/movies` page only
    - `tv` → Shows on `/tv` page only
    - `both` → Shows on `/` (home) page only
- Basic CRUD operations via **client-side Firestore**
- Auth-gated (authenticated users only, no guest support)
- Client-side loading (no SSR complexity)
- Child safety mode integration
- Cache integration (disabled for now, will revisit)

### ❌ EXCLUDED (Deferred to V2)

- AI name generation (Gemini integration)
- Advanced filters (year, rating, certification)
- Drag-and-drop reordering
- Row analytics/view tracking
- Sharing functionality
- Row templates
- Guest user support (requires localStorage, complex)

---

## 📋 PHASE 1 STATUS - ✅ COMPLETE

### What's Been Built

1. ✅ **Data Model** - `types/customRows.ts` with all interfaces
2. ✅ **Firestore Utilities** - `utils/firestore/customRows.ts` (client-side SDK)
3. ✅ **Zustand Store** - `stores/customRowsStore.ts` with helpers
4. ✅ **Content API** - `/api/custom-rows/[id]/content` with query params (no server-side Firestore)
5. ✅ **CustomRowLoader** - Component that loads and displays custom rows
6. ✅ **Page Integration** - Movies & TV pages load custom rows
7. ✅ **Child Safety** - Integrated with existing child safety mode
8. ✅ **Firestore Structure** - Using `/users/{userId}` document with `customRows` map

### Architecture Decisions Made

- **No API routes for CRUD** - Using `CustomRowsFirestore` directly from client
- **No `displayOn` config** - `mediaType` determines page placement
- **Both media type supported** - Interleaves movies/TV on home page
- **No guest support** - Authenticated users only (requires Firebase Auth)

---

## 🔧 Technical Architecture (Corrected)

### Data Model (Current Implementation)

```typescript
// types/customRows.ts - ACTUAL CURRENT IMPLEMENTATION

export interface CustomRow {
    // Identity
    id: string // UUID v4
    userId: string // Firebase Auth UID (guests not supported)

    // Configuration
    name: string // User-facing title (3-50 chars)
    genres: number[] // TMDB genre IDs (1-5)
    genreLogic: 'AND' | 'OR' // How to combine genres
    mediaType: 'movie' | 'tv' | 'both' // Determines page placement

    // Organization
    order: number // Display order (0-based, lower = higher)
    enabled: boolean // Toggle visibility without deletion

    // Metadata
    createdAt: number // Unix timestamp
    updatedAt: number // Unix timestamp
}

export interface CustomRowFormData {
    name: string
    genres: number[]
    genreLogic: 'AND' | 'OR'
    mediaType: 'movie' | 'tv' | 'both'
    enabled: boolean
}

export const CUSTOM_ROW_CONSTRAINTS = {
    MAX_ROWS_PER_USER: 10,
    MAX_GENRES_PER_ROW: 5,
    MIN_GENRES_PER_ROW: 1,
    MIN_NAME_LENGTH: 3,
    MAX_NAME_LENGTH: 50,
} as const
```

### Page Display Logic

The `mediaType` field determines where a row appears:

| mediaType | Appears On      | Content Type            |
| --------- | --------------- | ----------------------- |
| `'movie'` | `/movies` only  | Movies only             |
| `'tv'`    | `/tv` only      | TV shows only           |
| `'both'`  | `/` (home) only | Interleaved movies & TV |

### Store Integration (FIXED)

```typescript
// stores/sessionStore.ts - ADD THIS HELPER

export const useSessionStore = create<SessionState>((set, get) => ({
    // ... existing state

    // NEW: Helper to get effective user ID
    getUserId: (): string | null => {
        const { sessionType } = get()

        if (sessionType === 'authenticated') {
            return useAuthStore.getState().userId
        } else if (sessionType === 'guest') {
            return useGuestStore.getState().guestId
        }

        return null
    },
}))

// Usage in components:
const getUserId = useSessionStore((state) => state.getUserId)
const userId = getUserId()
```

### Row Component Integration (FIXED)

```typescript
// components/customRows/CustomRowLoader.tsx - NEW COMPONENT

'use client'

import { useEffect, useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { Content } from '../../typings'
import Row from '../content/Row'

interface Props {
  rowId: string
  rowName: string
}

export default function CustomRowLoader({ rowId, rowName }: Props) {
  const [content, setContent] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getUserId = useSessionStore(state => state.getUserId)
  const userId = getUserId()

  useEffect(() => {
    async function loadInitialContent() {
      try {
        const response = await fetch(
          `/api/custom-rows/${rowId}/content?page=1&userId=${userId}`
        )

        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        setContent(data.results)
        setLoading(false)
      } catch (err) {
        console.error('Error loading custom row:', err)
        setError('Failed to load content')
        setLoading(false)
      }
    }

    if (userId) {
      loadInitialContent()
    }
  }, [rowId, userId])

  if (loading) {
    return (
      <div className="space-y-4 px-4 md:px-8">
        <div className="h-8 w-48 bg-gray-800 animate-pulse rounded" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="min-w-[200px] h-[300px] bg-gray-800 animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error || content.length === 0) {
    return null // Silently hide failed custom rows
  }

  return (
    <Row
      title={rowName}
      content={content}
      apiEndpoint={`/api/custom-rows/${rowId}/content`}
      isCustomRow={true}
    />
  )
}
```

### Child Safety Integration (ADDED)

```typescript
// app/api/custom-rows/[id]/content/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { filterMatureTVShows } from '../../../../../utils/tvContentRatings'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const searchParams = request.nextUrl.searchParams
        const userId = searchParams.get('userId')
        const page = parseInt(searchParams.get('page') || '1', 10)
        const childSafetyMode = searchParams.get('childSafetyMode') === 'true'

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get row config
        const row = await getCustomRow(userId, params.id)
        if (!row || !row.enabled) {
            return NextResponse.json({ error: 'Row not found' }, { status: 404 })
        }

        // Check cache first
        const cacheKey = `custom-row-${params.id}-page-${page}-safe-${childSafetyMode}`
        const cached = cacheStore.get(cacheKey)
        if (cached) {
            return NextResponse.json(cached)
        }

        // Build TMDB URL
        const tmdbURL = buildCustomRowURL(row, page, childSafetyMode)

        // Fetch from TMDB
        const response = await fetch(tmdbURL)
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        let data = await response.json()

        // Add media_type to results
        data.results = data.results.map((item) => ({
            ...item,
            media_type: row.mediaType,
        }))

        // Apply child safety filtering for TV
        if (childSafetyMode && row.mediaType === 'tv') {
            const beforeCount = data.results.length
            data.results = await filterMatureTVShows(data.results, process.env.TMDB_API_KEY!)
            const hiddenCount = beforeCount - data.results.length

            data.child_safety_enabled = true
            data.hidden_count = hiddenCount
        }

        // Cache for 1 hour
        cacheStore.set(cacheKey, data, 3600)

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        })
    } catch (error) {
        console.error('Error fetching custom row content:', error)
        return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
    }
}

// Helper: Build TMDB URL with child safety
function buildCustomRowURL(row: CustomRow, page: number, childSafetyMode: boolean): string {
    const baseURL =
        row.mediaType === 'movie'
            ? 'https://api.themoviedb.org/3/discover/movie'
            : 'https://api.themoviedb.org/3/discover/tv'

    const params = new URLSearchParams({
        api_key: process.env.TMDB_API_KEY!,
        language: 'en-US',
        page: page.toString(),
        include_adult: 'false',
        sort_by: 'popularity.desc',
    })

    // Genre filtering
    const genreString =
        row.genreLogic === 'AND'
            ? row.genres.join(',') // 16,10402 = Animation AND Music
            : row.genres.join('|') // 16|10402 = Animation OR Music
    params.append('with_genres', genreString)

    // Child safety filters
    if (childSafetyMode) {
        if (row.mediaType === 'movie') {
            // Movies: Use certification filter
            params.append('certification_country', 'US')
            params.append('certification.lte', 'PG-13')
            params.append('vote_count.gte', '100')
        } else {
            // TV: Genre-based filtering (API level)
            // Additional filtering happens in filterMatureTVShows()
            const safeGenres = row.genres.filter((id) => {
                // Filter out mature-oriented genres if in child mode
                const matureGenres = [80, 9648] // Crime, Mystery can have mature content
                return !matureGenres.includes(id)
            })

            if (safeGenres.length > 0) {
                const safeGenreString =
                    row.genreLogic === 'AND' ? safeGenres.join(',') : safeGenres.join('|')
                params.set('with_genres', safeGenreString)
            }
        }
    }

    return `${baseURL}?${params.toString()}`
}
```

### Simplified Firestore Rules

```javascript
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Custom rows - simple auth check only
    match /users/{userId}/customRows/{rowId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.userId == userId
        && request.resource.data.genres.size() >= 1
        && request.resource.data.genres.size() <= 5
        && request.resource.data.name.size() >= 3
        && request.resource.data.name.size() <= 50;
    }
  }
}
```

### Firestore Composite Index

```json
// firestore.indexes.json

{
    "indexes": [
        {
            "collectionGroup": "customRows",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "userId", "order": "ASCENDING" },
                { "fieldPath": "order", "order": "ASCENDING" }
            ]
        }
    ]
}
```

---

## 🚀 PHASED IMPLEMENTATION

### Phase 1: Foundation ✅ COMPLETE

**Goal:** Backend + data structures working

**Completed Tasks:**

- [x] Created `types/customRows.ts` with full interfaces
- [x] Created Firestore utility functions (`utils/firestore/customRows.ts`)
- [x] Built `stores/customRowsStore.ts` with CRUD operations
- [x] Created content API route: `GET /api/custom-rows/[id]/content`
    - Accepts row config via query params (no server-side Firestore)
    - Integrates with child safety mode
    - Supports both mediaTypes with interleaving
- [x] Set up Firestore structure in user documents
- [x] Built `CustomRowLoader` component
- [x] Integrated into Movies & TV pages
- [x] Fixed permissions errors with client-side approach

**Architecture Used:** Direct client-side Firestore access (no API routes for CRUD), matching existing patterns for watchlists/ratings

**Deliverable:** ✅ Custom rows can be created/read/updated/deleted programmatically and display on pages

---

### Phase 2: Management UI (Days 2-3) 🚧 NEXT

**Goal:** Users can create, edit, and manage custom rows via UI

**Overview:**
Build the `/rows` page where authenticated users manage their custom rows. This will be similar to the existing `/watchlists` or `/liked` pages in structure.

---

#### 2.1: Core Page Structure (4-6 hours)

**File:** `/app/rows/page.tsx`

**Requirements:**

- Client component (`'use client'`)
- Auth check - redirect guests to sign-in or show premium prompt
- Load user's custom rows from Firestore on mount
- Display row count and enabled count
- Show create button (disabled if at max 10 rows)
- Handle loading, error, and empty states

**Implementation Notes:**

```typescript
'use client'

import { useEffect } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useCustomRowsStore } from '@/stores/customRowsStore'
import { useAuthStatus } from '@/hooks/useAuthStatus'
import { CustomRowsFirestore } from '@/utils/firestore/customRows'

export default function RowsPage() {
  const { isGuest, isInitialized } = useAuthStatus()
  const getUserId = useSessionStore(state => state.getUserId)
  const { getRows, setRows, setLoading, setError } = useCustomRowsStore()

  const userId = getUserId()
  const rows = userId ? getRows(userId) : []
  const atMaxRows = rows.length >= 10

  useEffect(() => {
    if (!userId || !isInitialized) return
    if (isGuest) {
      setLoading(false)
      return
    }

    const loadRows = async () => {
      setLoading(true)
      try {
        const rows = await CustomRowsFirestore.getUserCustomRows(userId)
        setRows(userId, rows)
      } catch (error) {
        console.error('Error loading rows:', error)
        setError((error as Error).message)
      } finally {
        setLoading(false)
      }
    }

    loadRows()
  }, [userId, isGuest, isInitialized])

  // Guest users see sign-in prompt
  if (isGuest) {
    return <GuestModeNotification />
  }

  // Show loading/empty/list states...
}
```

**Tasks:**

- [ ] Create page file with basic structure
- [ ] Add auth guard for guests
- [ ] Implement row loading with useEffect
- [ ] Add loading skeleton
- [ ] Add error state banner
- [ ] Add header with title and create button
- [ ] Show row count stats
- [ ] Handle max rows warning

---

#### 2.2: Row Card Component (3-4 hours)

**File:** `components/customRows/CustomRowCard.tsx`

**Requirements:**

- Display row name, genres, media type, enabled status
- Show genre chips with AND/OR badge
- Action buttons: Edit, Delete, Enable/Disable toggle
- Confirmation dialog for delete
- Visual indicator for disabled rows

**Features:**

```typescript
interface CustomRowCardProps {
    row: CustomRow
    onEdit: (row: CustomRow) => void
    onDelete: (row: CustomRow) => void
    onToggleEnabled: (row: CustomRow) => void
}

// Display:
// - Row name + AI badge (if applicable in v2)
// - Genre tags (styled chips)
// - Genre logic badge (AND/OR)
// - Media type badge (Movie/TV/Both)
// - Enabled/disabled indicator
// - Action buttons (edit, delete, toggle)
```

**Tasks:**

- [ ] Create card component with layout
- [ ] Add genre display with chips
- [ ] Add action buttons with icons
- [ ] Add toggle enabled functionality
- [ ] Add delete confirmation
- [ ] Style with hover states
- [ ] Add disabled row visual indicator

---

#### 2.3: Row Editor Modal (6-8 hours)

**File:** `components/customRows/RowEditorModal.tsx`

**Requirements:**

- Modal overlay with backdrop
- Create and Edit modes
- Step-by-step form:
    1. Row name input
    2. Media type selector (Movie/TV/Both)
    3. Genre selection (multi-select, max 5)
    4. Genre logic (AND/OR)
- Client-side validation
- Cancel/Save buttons
- Loading state during save

**Form Structure:**

```typescript
interface RowEditorModalProps {
    isOpen: boolean
    onClose: () => void
    editingRow?: CustomRow | null // null = create mode
}

const [formData, setFormData] = useState<CustomRowFormData>({
    name: editingRow?.name || '',
    genres: editingRow?.genres || [],
    genreLogic: editingRow?.genreLogic || 'OR',
    mediaType: editingRow?.mediaType || 'movie',
    enabled: editingRow?.enabled ?? true,
})
```

**Validation Rules:**

- Name: 3-50 characters, required
- Genres: 1-5 genres, at least 1 required
- All fields required before save

**Tasks:**

- [ ] Create modal component with overlay
- [ ] Build form with controlled inputs
- [ ] Add row name input with character counter
- [ ] Add media type selector (3 buttons)
- [ ] Build GenreMultiSelect component (separate)
- [ ] Add genre logic selector (AND/OR buttons)
- [ ] Implement validation logic
- [ ] Add save/cancel handlers
- [ ] Handle create vs edit modes
- [ ] Show loading state during save
- [ ] Close modal on successful save

---

#### 2.4: Genre Multi-Select Component (3-4 hours)

**File:** `components/customRows/GenreMultiSelect.tsx`

**Requirements:**

- Grid of genre buttons
- Toggle selection on click
- Show selected count
- Disable selection when at max (5)
- Load correct genre list based on media type
- Visual feedback for selected/disabled states

**Implementation:**

```typescript
interface GenreMultiSelectProps {
    mediaType: 'movie' | 'tv' | 'both'
    selectedGenres: number[]
    onChange: (genres: number[]) => void
    maxGenres?: number // default 5
}

// Genre lists from constants/genres.ts
// MOVIE_GENRES, TV_GENRES
// For "both", show union of both lists (no duplicates)
```

**Tasks:**

- [ ] Create component with grid layout
- [ ] Load genre list based on media type
- [ ] Implement toggle selection logic
- [ ] Add visual states (selected, unselected, disabled)
- [ ] Show genre count indicator
- [ ] Handle "both" media type (union of genres)
- [ ] Add responsive grid (2-3 cols mobile, 4+ desktop)

---

#### 2.5: Empty State Component (1-2 hours)

**File:** `components/customRows/EmptyState.tsx`

**Requirements:**

- Friendly illustration/icon
- Clear call to action
- Explain feature benefits
- Create button

**Tasks:**

- [ ] Create empty state component
- [ ] Add icon/illustration
- [ ] Add headline and description
- [ ] Add "Create Your First Row" button
- [ ] Add feature benefit cards (optional)

---

#### 2.6: Navigation Integration (1 hour)

**File:** `components/layout/Header.tsx` or navigation component

**Requirements:**

- Add "My Rows" link to user menu/dropdown
- Show only for authenticated users
- Badge or indicator showing it's a premium feature

**Tasks:**

- [ ] Find navigation dropdown component
- [ ] Add "My Rows" menu item
- [ ] Add auth guard (only show if authenticated)
- [ ] Style consistently with other menu items
- [ ] Add route to `/rows`

---

#### 2.7: Integration & Testing (2-3 hours)

**Tasks:**

- [ ] Test create flow end-to-end
- [ ] Test edit flow
- [ ] Test delete flow
- [ ] Test toggle enabled
- [ ] Test validation errors
- [ ] Test max rows limit (create 10, try 11th)
- [ ] Test with no rows (empty state)
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test guest user experience
- [ ] Verify rows appear on pages after creation

---

### Phase 2 Summary

**Total Estimated Time:** 20-30 hours (2.5-4 days)

**Components to Build:**

1. `/app/rows/page.tsx` - Main management page
2. `CustomRowCard.tsx` - Individual row display
3. `RowEditorModal.tsx` - Create/edit modal
4. `GenreMultiSelect.tsx` - Genre picker
5. `EmptyState.tsx` - No rows state
6. Navigation link

**Key Dependencies:**

- Existing: `useCustomRowsStore`, `CustomRowsFirestore`, `MOVIE_GENRES`, `TV_GENRES`
- New: Modal overlay, form validation, toast notifications

**Deliverable:** ✅ Users can create, edit, delete, and toggle custom rows through the UI

---

### Phase 3: Display Integration ✅ MOSTLY COMPLETE

**Goal:** Custom rows show on main/movies/TV pages

**Completed Tasks:**

- [x] Created `components/customRows/CustomRowLoader.tsx`
- [x] Integrated into `app/movies/page.tsx` (MoviesClient)
- [x] Integrated into `app/tv/page.tsx` (TVClient)
- [x] Added child safety mode support
- [x] Content API accepts row config via query params
- [x] Handle loading/error states (silent failures)

**Remaining Tasks:**

- [ ] Integrate into `app/page.tsx` (home page for "both" rows)
- [ ] Test infinite scroll with custom rows
- [ ] Re-enable cache integration (currently disabled)
- [ ] Add row display order sorting

**Notes:**

- Movies and TV pages already load custom rows filtered by `mediaType`
- Home page needs integration for rows with `mediaType: 'both'`
- Cache was temporarily disabled during debugging, needs re-enabling

**Deliverable:** ✅ Custom rows display on Movies/TV pages, need home page integration

---

### Phase 4: Polish & Testing (Day 7)

**Goal:** Production-ready

**Tasks:**

- [ ] Add loading skeletons
- [ ] Improve error messages
- [ ] Add empty row detection (warn if <5 results)
- [ ] Responsive design testing
- [ ] Cross-browser testing
- [ ] Write unit tests (store)
- [ ] Write integration tests (API)
- [ ] Security audit
- [ ] Performance testing

**Deliverable:** Stable, tested, production-ready feature

---

## 📦 Component Specifications

### GenreMultiSelect Component

```typescript
// components/customRows/GenreMultiSelect.tsx

'use client'

interface Props {
  mediaType: 'movie' | 'tv'
  selectedGenres: number[]
  onChange: (genres: number[]) => void
  maxGenres?: number
}

export default function GenreMultiSelect({
  mediaType,
  selectedGenres,
  onChange,
  maxGenres = 5
}: Props) {
  const genreList = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES

  const handleToggle = (genreId: number) => {
    if (selectedGenres.includes(genreId)) {
      // Remove
      onChange(selectedGenres.filter(id => id !== genreId))
    } else {
      // Add (if under limit)
      if (selectedGenres.length < maxGenres) {
        onChange([...selectedGenres, genreId])
      }
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Select Genres (max {maxGenres})
      </label>

      <div className="grid grid-cols-3 gap-2 p-4 bg-[#141414] rounded-lg border border-gray-700">
        {genreList.map(genre => {
          const isSelected = selectedGenres.includes(genre.id)
          const isDisabled = !isSelected && selectedGenres.length >= maxGenres

          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => handleToggle(genre.id)}
              disabled={isDisabled}
              className={`
                px-3 py-2 rounded-lg text-sm transition
                ${isSelected
                  ? 'bg-red-600 text-white'
                  : isDisabled
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              {genre.name}
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {selectedGenres.length}/{maxGenres} genres selected
      </p>
    </div>
  )
}
```

### EmptyState Component

```typescript
// components/customRows/EmptyState.tsx

'use client'

import { PlusIcon } from '@heroicons/react/24/outline'

interface Props {
  onCreateClick: () => void
}

export default function EmptyState({ onCreateClick }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mb-6">
        <PlusIcon className="w-10 h-10 text-red-600" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        Create Your First Custom Row
      </h2>

      <p className="text-gray-400 text-center max-w-md mb-8">
        Combine genres to discover unique content. Create rows like "Musical Anime"
        or "Sci-Fi Dramas" tailored to your taste.
      </p>

      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
      >
        <PlusIcon className="h-5 w-5" />
        Create Custom Row
      </button>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
        <div className="text-center">
          <div className="text-3xl mb-2">🎬</div>
          <h3 className="font-semibold text-white mb-1">Pick Genres</h3>
          <p className="text-sm text-gray-400">Select up to 5 genres</p>
        </div>

        <div className="text-center">
          <div className="text-3xl mb-2">🎯</div>
          <h3 className="font-semibold text-white mb-1">AND/OR Logic</h3>
          <p className="text-sm text-gray-400">Combine with precision</p>
        </div>

        <div className="text-center">
          <div className="text-3xl mb-2">✨</div>
          <h3 className="font-semibold text-white mb-1">Discover</h3>
          <p className="text-sm text-gray-400">Find hidden gems</p>
        </div>
      </div>
    </div>
  )
}
```

---

## 🎨 UI Flow

### My Rows Page States

1. **Empty State** (no rows)
    - Hero illustration
    - "Create Your First Custom Row" CTA
    - Feature explanation cards

2. **List State** (has rows)
    - Header with "Create Row" button
    - Grid of CustomRowCard components
    - Each card shows: name, genres, display pages, actions

3. **Loading State**
    - Skeleton cards

4. **Error State**
    - Error message banner
    - Retry button

### Row Editor Modal Flow

1. **Step 1: Media Type**
    - Radio buttons: Movies | TV Shows

2. **Step 2: Genres**
    - Grid of genre chips
    - Max 5 selection
    - Visual feedback when limit reached

3. **Step 3: Logic**
    - Two large buttons: "Must have ALL" vs "Can have ANY"
    - Explanatory text below each

4. **Step 4: Display**
    - Checkboxes for Main/Movies/TV pages

5. **Step 5: Name**
    - Text input
    - Character counter
    - (Future: AI generate button)

6. **Footer**
    - Cancel | Create Row

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// stores/customRowsStore.test.ts

describe('CustomRowsStore', () => {
    beforeEach(() => {
        useCustomRowsStore.getState().reset()
    })

    it('should create a custom row', async () => {
        const { createRow } = useCustomRowsStore.getState()

        const rowData: CustomRowFormData = {
            name: 'Musical Anime',
            genres: [16, 10402],
            genreLogic: 'AND',
            mediaType: 'movie',
            displayOn: { main: true, movies: true, tvShows: false },
            enabled: true,
        }

        const rowId = await createRow('testUserId', rowData)

        expect(rowId).toBeTruthy()
        expect(useCustomRowsStore.getState().rows).toHaveLength(1)
    })

    it('should enforce max 10 rows limit', async () => {
        // Create 10 rows...

        await expect(
            useCustomRowsStore.getState().createRow('testUserId', rowData)
        ).rejects.toThrow('Maximum 10 custom rows allowed')
    })

    it('should build correct TMDB URL for AND logic', () => {
        const row: CustomRow = {
            genres: [16, 10402],
            genreLogic: 'AND',
            mediaType: 'movie',
            // ...
        }

        const url = buildCustomRowURL(row, 1, false)
        expect(url).toContain('with_genres=16,10402')
        expect(url).toContain('sort_by=popularity.desc')
    })
})
```

### Integration Tests

```typescript
// __tests__/api/custom-rows.test.ts

describe('Custom Rows API', () => {
    it('should create a row', async () => {
        const res = await POST('/api/custom-rows', {
            body: {
                name: 'Test Row',
                genres: [16],
                genreLogic: 'AND',
                mediaType: 'movie',
                displayOn: { main: true, movies: false, tvShows: false },
                enabled: true,
            },
        })

        expect(res.status).toBe(201)
        expect(res.body.rowId).toBeTruthy()
    })

    it('should fetch row content from TMDB', async () => {
        const res = await GET('/api/custom-rows/test-id/content?page=1&userId=test')

        expect(res.status).toBe(200)
        expect(res.body.results).toBeInstanceOf(Array)
    })

    it('should apply child safety filters', async () => {
        const res = await GET(
            '/api/custom-rows/test-id/content?page=1&userId=test&childSafetyMode=true'
        )

        expect(res.status).toBe(200)
        expect(res.body.child_safety_enabled).toBe(true)
    })
})
```

---

## 📊 Success Metrics

**V1 Launch Criteria:**

- [ ] Users can create up to 10 custom rows
- [ ] Rows display correctly on all pages
- [ ] Infinite scroll works with custom rows
- [ ] Child safety mode respected
- [ ] No console errors
- [ ] <2s load time for custom rows
- [ ] Mobile responsive
- [ ] All tests passing

**User Engagement Goals:**

- 30% of authenticated users create at least 1 custom row
- Average 3 custom rows per user
- Custom rows account for 15% of content views

---

## 🚫 Out of Scope (V2 Features)

1. **AI Name Generation**
    - Gemini API integration
    - Rate limiting infrastructure
    - Cost: ~$0.01 per generation

2. **Advanced Filters**
    - Year range
    - Min rating
    - Certification
    - Language

3. **"Both" Media Type**
    - Requires pagination strategy
    - Client-side merge/cache
    - OR alternating fetch pattern

4. **Drag-and-Drop Reordering**
    - @dnd-kit integration
    - Optimistic updates

5. **Analytics**
    - View tracking
    - Click tracking
    - Popular content per row

6. **Sharing**
    - Public row links
    - Read-only display

---

## 📝 Migration Path to V2

Once V1 is stable:

1. **Add "both" media type** with alternating strategy
2. **Add Gemini integration** for name generation
3. **Add FilterPanel** component for advanced filters
4. **Add analytics** tracking
5. **Add sharing** with public links
6. **Add templates** for quick row creation

---

## ❓ Open Questions - ANSWERED

### 1. Gemini API Key

**Answer:** Skip for V1, add in V2 with proper setup docs

### 2. Row Limits

**Answer:** 10 rows per user (enforced in API)

### 3. Implementation Priority

**Answer:** Phased approach (Foundation → UI → Integration → Polish)

### 4. Guest Users

**Answer:** Show PremiumFeaturePrompt (drives sign-ups)

### 5. Advanced Features

**Answer:** All deferred to V2 (see Out of Scope)

### 6. Empty Rows

**Answer:** Allow creation but show warning if <5 results in preview

---

## 🎬 Ready to Start?

**Recommended Order:**

1. ✅ **Phase 1: Foundation** (Days 1-2) - Backend working
2. ✅ **Phase 2: UI Components** (Days 3-4) - Management page functional
3. ✅ **Phase 3: Display Integration** (Days 5-6) - Rows appear on pages
4. ✅ **Phase 4: Polish & Testing** (Day 7) - Production ready

**Next Step:** Start Phase 1 - Foundation

Shall I begin implementing Phase 1?
