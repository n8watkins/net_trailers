# NetTrailers Architecture Report: Ranking Generator Feature Planning

## Executive Summary

The NetTrailers codebase has a well-architected, production-ready foundation with comprehensive state management, data persistence, interaction tracking, and reusable UI components. This report identifies key architectural patterns and components that can be leveraged for building a ranking generator feature.

---

## 1. CURRENT DATA STRUCTURES

### 1.1 Core Content Types (`/typings.ts`)

```typescript
// Discriminated Union Pattern with Type Guards
export type Content = Movie | TVShow

export interface BaseContent {
    id: number
    backdrop_path: string
    genre_ids: number[]
    genres?: Genre[]
    popularity: number
    poster_path: string
    vote_average: number
    vote_count: number
    overview: string
    credits?: Credits  // Cast/crew info
    external_ids?: ExternalIds
}

export interface Movie extends BaseContent {
    media_type: 'movie'
    title: string
    release_date: string
    runtime?: number
}

export interface TVShow extends BaseContent {
    media_type: 'tv'
    name: string
    first_air_date: string
    number_of_seasons?: number
}

// Type guards for runtime checking
export function isMovie(content: Content): content is Movie
export function isTVShow(content: Content): content is TVShow
export function getTitle(content: Content): string
```

**Key Insight**: Movies and TV shows are unified through discriminated unions with type-safe utility functions. Perfect for ranking both types together.

### 1.2 Collections/User Lists (`/types/userLists.ts`)

```typescript
export interface UserList {
    id: string
    name: string
    description?: string
    items: Content[]  // Actual content objects
    emoji?: string
    color?: string
    isPublic: boolean
    createdAt: number
    updatedAt: number
    
    // Collection type determines source
    collectionType: 'ai-generated' | 'tmdb-genre' | 'manual'
    
    // Display settings
    displayAsRow: boolean
    order: number  // For ordering multiple collections
    enabled: boolean
    
    // Advanced filtering (for TMDB-based)
    genres?: number[]
    genreLogic?: 'AND' | 'OR'
    mediaType?: 'movie' | 'tv' | 'both'
    advancedFilters?: AdvancedFilters
    
    // Sharing & metadata
    shareSettings?: ShareSettings
    sharedLinkId?: string
}

export interface AdvancedFilters {
    yearMin?: number
    yearMax?: number
    ratingMin?: number  // 0-10 scale
    ratingMax?: number
    popularity?: number  // 0-4 scale
    voteCount?: number   // 0-4 scale
    withCast?: string[]
    withDirector?: string
    contentIds?: number[]  // For curated lists
}
```

**Key Insight**: Collections are flexible containers that can hold curated content with metadata. Perfect parent structure for rankings.

### 1.3 User Interactions (`/types/interactions.ts`)

```typescript
export type InteractionType = 
    | 'like' | 'unlike'
    | 'add_to_watchlist' | 'remove_from_watchlist'
    | 'play_trailer'
    | 'hide_content' | 'unhide_content'
    | 'view_modal'
    | 'search'

export interface UserInteraction {
    id: string
    userId: string
    contentId: number
    mediaType: 'movie' | 'tv'
    interactionType: InteractionType
    genreIds: number[]
    timestamp: number
    trailerDuration?: number
    searchQuery?: string
    collectionId?: string  // Track source
    source?: InteractionSource  // 'home', 'search', 'collection', etc.
}

// Weighted scoring system for recommendations
export const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
    like: 5,                    // Strongest positive
    add_to_watchlist: 3,
    play_trailer: 2,
    view_modal: 1,
    unlike: -2,
    remove_from_watchlist: -2,
    hide_content: -5,          // Strongest negative
}
```

**Key Insight**: Rich interaction tracking with weighted scoring. Can be leveraged for ranking algorithms.

### 1.4 Sharing System (`/types/sharing.ts`)

```typescript
export interface ShareableLink {
    id: string
    collectionId: string
    userId: string
    collectionName: string
    itemCount: number
    createdAt: number
    expiresAt: number | null
    isActive: boolean
    viewCount: number
    allowDuplicates: boolean
    settings: ShareSettings
}

export interface ShareSettings {
    visibility: 'private' | 'public' | 'link-only'
    showOwnerName: boolean
    allowComments: boolean  // Future feature
}
```

**Key Insight**: Sharing infrastructure exists. Rankings could leverage the same sharing mechanism.

---

## 2. STATE MANAGEMENT ARCHITECTURE

### 2.1 Zustand Stores Structure

The app uses **Zustand** for all state management with a clean, modular approach:

#### Core User Store (`/stores/createUserStore.ts`)

Factory pattern that powers both `authStore` and `guestStore`:

```typescript
export interface UserState {
    userId?: string           // Firebase Auth UID
    guestId?: string
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]  // Collections & Rankings!
    lastActive: number
    syncStatus?: 'synced' | 'syncing' | 'offline'  // For Firebase
}

export interface UserActions {
    addToWatchlist: (content: Content) => Promise<void> | void
    addLikedMovie: (content: Content) => Promise<void> | void
    createList: (request) => Promise<string> | string
    addToList: (listId: string, content: Content) => Promise<void> | void
    removeFromList: (listId: string, contentId: number) => Promise<void> | void
    updateList: (listId: string, updates) => Promise<void> | void
    deleteList: (listId: string) => Promise<void> | void
    updatePreferences: (prefs) => Promise<void> | void
    syncWithFirebase?: (userId: string) => Promise<void>  // Auth only
}
```

**Architecture Pattern**:
- **Firebase Adapter** (AuthStore): Syncs to Firestore `users/{userId}` document
- **localStorage Adapter** (GuestStore): Persists to browser storage
- **Both use unified interface**: `StorageAdapter` abstract interface
- **Factory reuses logic**: ~400 lines of duplication eliminated

#### Related Stores

| Store | Purpose | Key State |
|-------|---------|-----------|
| `authStore` | Authenticated user data | Firebase-synced collections, watchlists |
| `guestStore` | Guest user data | localStorage-persisted data |
| `sessionStore` | Session management | Current user/guest ID, session type |
| `appStore` | App-wide UI state | Modals, toasts, loading, search |
| `watchHistoryStore` | Watch tracking | History entries with timestamps |

**Key Insight**: `userCreatedWatchlists` is where collections live. Add a `userRankings` field following same pattern.

### 2.2 Data Persistence Pattern

**Firebase Structure**:
```
users/{userId}/
  ├── (main document with user preferences & lists)
  ├── interactions/
  │   ├── {interactionId}: UserInteraction
  │   └── ...
  ├── interactionSummary/
  │   └── summary: UserInteractionSummary
  └── watchHistory/
      ├── {entryId}: WatchHistoryEntry
      └── ...
```

**localStorage Structure** (Guest):
```
nettrailer_guest_data_{guestId}: {
  likedMovies: Content[]
  hiddenMovies: Content[]
  defaultWatchlist: Content[]
  userCreatedWatchlists: UserList[]
}
```

**Key Insight**: Rankings would follow same pattern - add `userRankings: Ranking[]` to both Firebase & localStorage structures.

---

## 3. UI COMPONENTS FOR LEVERAGE

### 3.1 Content Display Components

#### ContentCard (`/components/common/ContentCard.tsx`)
```typescript
interface Props {
    content?: Content
    className?: string
    size?: 'small' | 'medium' | 'large'
}

// Features:
// - Image lazy loading with prefetch on hover
// - Context menu: like, hide, add to watchlist
// - Type-safe Content handling
// - Modal opening with autoPlay options
// - Toast notifications for actions
```

**Use for**: Display movies/TV shows in ranking list with all interaction options.

#### Row Component (`/components/content/Row.tsx`)
```typescript
interface Props {
    title: string
    content: Content[]
    apiEndpoint?: string  // For infinite scrolling
    pageType?: 'home' | 'movies' | 'tv'
}

// Features:
// - Horizontal scrolling with arrow buttons
// - Infinite scroll pagination
// - Content filtering (respects hidden movies)
// - Hover-based card actions
// - Responsive design
```

**Use for**: Display rankings in row layout with horizontal scroll.

### 3.2 Collection/List Management Components

#### ListSelectionModal (`/components/modals/ListSelectionModal.tsx`)
- Create new lists/collections inline
- Add/remove content from lists
- Edit list names, emojis, colors
- Delete lists with confirmation
- Icon/color picker modals

**Use for**: Ranking creation & management UI

#### CollectionBuilderModal (`/components/modals/CollectionBuilderModal.tsx`)
- Two creation modes: "Traditional" (manual) and "Smart" (AI-powered)
- Form handling with validation
- Preview content before saving
- Reuses CustomRowWizard and SmartRowBuilder components

**Use for**: Create rankings from scratch or with AI suggestions

#### CustomRowWizard (`/components/customRows/CustomRowWizard.tsx`)
- Multi-step form for creating collections
- Step 1: Basic info (name, emoji, color)
- Step 2: Advanced filters
- Step 3: Preview
- Step 4: Confirmation

**Use for**: Ranking creation wizard

### 3.3 Sorting/Reordering Components

#### SortableCustomRowCard (`/components/customRows/SortableCustomRowCard.tsx`)
```typescript
// Uses @dnd-kit for drag-and-drop
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableCustomRowCardProps {
    row: DisplayRow
    onEdit: (row) => void
    onDelete: (row) => void
    onMoveUp?: (row) => void
    onMoveDown?: (row) => void
}

// Features:
// - Drag handle for reordering
// - Visual feedback (opacity on drag)
// - CSS transforms for smooth animations
// - Integrated edit/delete buttons
```

**Use for**: Reordering ranking items via drag-and-drop

**Dependencies Already Installed**:
```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2"
```

### 3.4 Toast Notification System

```typescript
// From useToast hook
{
    showSuccess: (title, message?) => void
    showError: (title, message?) => void
    showWatchlistAdd: () => void
    showWatchlistRemove: () => void
    showContentHidden: () => void
    showContentShown: () => void
}

// Types
type ToastType = 'success' | 'error' | 'watchlist-add' | 'watchlist-remove' | 'content-hidden' | 'content-shown'
```

**Use for**: User feedback on ranking actions (create, update, delete, reorder)

### 3.5 Modal System

Central modal management through `appStore`:
```typescript
openModal(content, autoPlay?, autoPlayWithSound?)
openListModal(content?)  // For list management
closeModal()
```

**Use for**: Ranking preview/detail view, ranking builder, sharing dialogs

---

## 4. FIRESTORE DATA PERSISTENCE PATTERNS

### 4.1 Interaction Tracking (`/utils/firestore/interactions.ts`)

Complete interaction logging system:

```typescript
// Log single interaction
export async function logInteraction(
    userId: string,
    interaction: Omit<UserInteraction, 'id' | 'timestamp' | 'userId'>
): Promise<UserInteraction>

// Batch log interactions
export async function logInteractionBatch(
    userId: string,
    interactions: Omit<UserInteraction, 'id' | 'timestamp' | 'userId'>[]
): Promise<UserInteraction[]>

// Query interactions
export async function getRecentInteractions(userId: string, limitCount: number): Promise<UserInteraction[]>
export async function getInteractionsByType(userId: string, type: InteractionType): Promise<UserInteraction[]>

// Analytics
export async function getInteractionSummary(userId: string): Promise<UserInteractionSummary | null>
export async function calculateInteractionSummary(userId: string): Promise<UserInteractionSummary>
export async function getInteractionAnalytics(userId: string): Promise<InteractionAnalytics>

// Data retention
export async function cleanupOldInteractions(userId: string, retentionDays?: number): Promise<number>
```

**Key Insight**: Built-in analytics and summary calculation. Can adapt for ranking analytics.

### 4.2 Lists/Collections Service (`/services/userListsService.ts`)

```typescript
export class UserListsService {
    static createList<T extends StateWithLists>(state: T, request: CreateListRequest): T
    static updateList<T extends StateWithLists>(state: T, request: UpdateListRequest): T
    static deleteList<T extends StateWithLists>(state: T, listId: string): T
    static addToList<T extends StateWithLists>(state: T, request: AddToListRequest): T
    static removeFromList<T extends StateWithLists>(state: T, request: RemoveFromListRequest): T
    
    // Validation & sanitization
    private static sanitizeText(text: string): string  // XSS prevention
    private static isValidEmoji(emoji: string): boolean
    // Color validation: only hex format #RRGGBB
}
```

**Key Insight**: Reusable service for CRUD operations with built-in XSS prevention and validation.

---

## 5. EXISTING SHARING MECHANISMS

### 5.1 Share Infrastructure (`/utils/firestore/shares.ts`)

```typescript
// Create shareable link
export async function createShare(
    userId: string,
    request: CreateShareRequest
): Promise<CreateShareResponse>

// Validate share access
export async function validateShare(shareId: string): Promise<ShareValidationResult>

// Increment view count
export async function recordShareView(shareId: string): Promise<void>

// Get share statistics
export async function getShareStats(userId: string): Promise<ShareStats>
```

**Firestore Structure**:
```
shares/{shareId}:
  {
    id: string
    collectionId: string
    userId: string
    createdAt: number
    expiresAt: number | null
    isActive: boolean
    viewCount: number
    settings: ShareSettings
  }
```

**Key Insight**: Production-ready sharing system. Rankings could use identical infrastructure.

---

## 6. INTERACTION & TRACKING PATTERNS

### 6.1 User Interaction Hook (`/hooks/useInteractionTracking.ts`)

```typescript
export function useInteractionTracking() {
    // Tracks: like, unlike, add_to_watchlist, remove_from_watchlist, 
    //         play_trailer, hide_content, view_modal, etc.
    
    const addToWatchlist = (content: Content) => void
    const removeFromWatchlist = (contentId: number) => void
    const likeContent = (content: Content) => void
    const unlikeContent = (contentId: number) => void
    const hideContent = (content: Content) => void
    const unhideContent = (contentId: number) => void
    const playTrailer = (content: Content, duration?: number) => void
}
```

**Pattern**: Uses `createInteractionFromContent()` helper to extract data from Content objects:

```typescript
export function createInteractionFromContent(
    content: Content,
    interactionType: InteractionType,
    options?: {
        trailerDuration?: number
        searchQuery?: string
        collectionId?: string
        source?: InteractionSource
    }
): Omit<UserInteraction, 'id' | 'timestamp' | 'userId'>
```

**Use for**: Track ranking creation, item additions, reordering, viewing, etc.

### 6.2 User Data Hook (`/hooks/useUserData.ts`)

Unified interface for user data access:

```typescript
const {
    // Watchlist operations
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    defaultWatchlist,
    
    // Liked movies
    addLikedMovie,
    removeLikedMovie,
    isLiked,
    likedMovies,
    
    // Collection management
    createList,
    updateList,
    deleteList,
    addToList,
    removeFromList,
    getAllLists,
    getListsContaining,
    isContentInList,
    
    // Session info
    isGuest,
    isAuthenticated,
    
    // Account data
    getAccountDataSummary: () => Promise<AccountDataSummary>
} = useUserData()
```

---

## 7. VALIDATION & SANITIZATION PATTERNS

### 7.1 Zod Schema Validation

The codebase uses Zod for runtime type validation:

```typescript
// Example from listSchema
export const listNameSchema = z.string()
    .min(3, { message: 'Name must be at least 3 characters' })
    .max(50, { message: 'Name must be at most 50 characters' })
    .trim()

export async function validateListNameUnique(
    name: string,
    userId: string,
    excludeListId?: string
): Promise<boolean>
```

**Use for**: Ranking name/description validation

### 7.2 XSS Prevention

Built into `UserListsService`:
```typescript
private static sanitizeText(text: string): string {
    return DOMPurify.sanitize(text.trim(), {
        ALLOWED_TAGS: [],        // No HTML allowed
        ALLOWED_ATTR: [],        // No attributes allowed
    })
}

// Emoji validation prevents injection
private static isValidEmoji(emoji: string): boolean {
    // Checks: length <= 10, no dangerous chars, no alphanumeric
    // Rejects control characters (0-31, 127)
}

// Color validation - only hex format
const sanitizedColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : undefined
```

---

## 8. AVAILABLE LIBRARIES & TOOLS

### 8.1 UI & Form Libraries
- **@dnd-kit**: Drag-and-drop (already installed)
- **react-hook-form**: Form handling
- **zod**: Type-safe validation
- **@heroicons/react**: Icons
- **@mui/material**: Material UI components
- **tailwindcss**: Styling

### 8.2 Data & Storage
- **firebase**: Firestore, Auth
- **zustand**: State management
- **nanoid**: ID generation
- **lodash**: Utility functions

### 8.3 Other Utilities
- **isomorphic-dompurify**: XSS prevention
- **uuid**: UUID generation
- **react-player**: Video playback

---

## 9. ARCHITECTURE RECOMMENDATIONS FOR RANKING GENERATOR

### 9.1 Data Structure Proposal

Add new type to `/types/userLists.ts` or create `/types/rankings.ts`:

```typescript
export interface Ranking extends Omit<UserList, 'collectionType'> {
    // Ranking-specific fields
    items: RankedContent[]  // Ordered items with scores
    totalScore: number      // Sum of all item scores
    
    // Metadata
    description?: string    // Why was this ranking created
    criteria?: string[]     // What criteria was used
    
    // Sharing (inherits from UserList structure)
    isPublic: boolean
    shareSettings?: ShareSettings
    sharedLinkId?: string
}

export interface RankedContent {
    content: Content
    rank: number           // 1-based ranking
    score: number          // Score for this item (0-100)
    scoreBreakdown?: {     // How score was calculated
        likeWeight: number
        watchlistWeight: number
        interactionCount: number
        popularity: number
    }
    reasoning?: string     // Why this score
}
```

### 9.2 Store Enhancement

In `createUserStore.ts`, add:

```typescript
export interface UserState {
    // ... existing fields
    userRankings: Ranking[]  // Add this
}

export interface UserActions {
    // New ranking actions
    createRanking: (request: CreateRankingRequest) => Promise<string> | string
    updateRanking: (rankingId: string, updates: UpdateRankingRequest) => Promise<void> | void
    deleteRanking: (rankingId: string) => Promise<void> | void
    addToRanking: (rankingId: string, content: Content, score: number) => Promise<void> | void
    removeFromRanking: (rankingId: string, contentId: number) => Promise<void> | void
    reorderRankingItems: (rankingId: string, newOrder: RankedContent[]) => Promise<void> | void
}
```

### 9.3 Component Structure

```
components/rankings/
├── RankingCard.tsx              # Display single ranking
├── RankingList.tsx              # List of rankings
├── RankingBuilderModal.tsx       # Main creation interface
├── RankingItemCard.tsx           # Individual ranked item with score
├── SortableRankingItem.tsx       # Drag-to-reorder
├── RankingScoreInput.tsx         # Manual score entry
├── RankingShareDialog.tsx        # Share ranking
└── RankingDetailModal.tsx        # View/edit ranking details
```

### 9.4 Service Pattern

Similar to `UserListsService`:

```typescript
export class RankingsService {
    static createRanking<T extends StateWithRankings>(
        state: T,
        request: CreateRankingRequest
    ): T
    
    static updateRanking<T extends StateWithRankings>(
        state: T,
        request: UpdateRankingRequest
    ): T
    
    static addToRanking<T extends StateWithRankings>(
        state: T,
        rankingId: string,
        content: Content,
        score: number,
        reasoning?: string
    ): T
    
    static calculateRankingScores<T extends StateWithRankings>(
        state: T,
        rankingId: string,
        algorithm: 'manual' | 'interaction-based' | 'popularity-based'
    ): T
}
```

### 9.5 Firestore Structure

```
users/{userId}/
  ├── (main document with user preferences)
  ├── rankings/
  │   ├── {rankingId}: Ranking
  │   └── ...
  └── rankings_items/{rankingId}/
      ├── {itemId}: RankedContent
      └── ...
```

---

## 10. SECURITY & DATA ISOLATION

The codebase has strong patterns for data isolation:

### 10.1 User ID Validation

Before all state updates:
```typescript
// Always validate userId matches current session
if (state.userId !== currentUserId) {
    throw new Error('User ID mismatch - data isolation violation')
}
```

### 10.2 Session Switching

Clean separation between guest and authenticated:
```typescript
// Guest data never migrates to auth
// Auth data never visible in guest mode
// Session switch clears stores before loading new data
```

### 10.3 Firestore Security Rules

```firestore
match /users/{userId}/rankings/{rankingId} {
    allow read, write: if request.auth.uid == userId
    allow read: if resource.data.isPublic == true
}
```

---

## 11. SUMMARY TABLE: REUSABLE COMPONENTS

| Component | Path | Purpose | Adaptability |
|-----------|------|---------|--------------|
| **ContentCard** | `components/common/` | Display movies/TV | Rank items with score overlay |
| **Row** | `components/content/` | Horizontal scroll | Display ranking preview |
| **SortableCustomRowCard** | `components/customRows/` | Drag-to-reorder | Reorder ranking items |
| **ListSelectionModal** | `components/modals/` | Create/manage lists | Create/manage rankings |
| **CollectionBuilderModal** | `components/modals/` | Multi-step builder | Build ranking wizard |
| **CustomRowWizard** | `components/customRows/` | 4-step form | Ranking creation form |
| **Toast system** | `hooks/useToast` | Notifications | User feedback |
| **Modal system** | `stores/appStore` | Modal management | Ranking modals |
| **UserListsService** | `services/` | CRUD operations | RankingsService |
| **Interaction tracking** | `hooks/useInteractionTracking` | Log user actions | Track ranking events |
| **Share infrastructure** | `utils/firestore/shares.ts` | Share links | Share rankings |

---

## 12. KEY PATTERNS TO FOLLOW

1. **Use Zustand stores directly** - No provider wrappers needed
2. **Dual adapter pattern** - Support Firebase (auth) and localStorage (guest)
3. **Type-safe utilities** - Discriminated unions with type guards
4. **XSS prevention** - Sanitize all user inputs
5. **Interaction tracking** - Log all user actions with weights
6. **Firestore subcollections** - Organize related data hierarchically
7. **Optimistic updates** - Update UI before Firebase response
8. **Error handling** - Use unified toast system for all errors
9. **Drag-and-drop** - @dnd-kit is already integrated
10. **Data isolation** - Always validate user ID before operations

---

## 13. DEVELOPMENT ENVIRONMENT

- **Package Manager**: npm (migrated from pnpm)
- **Dev Server**: Port 3000 (Next.js)
- **Build Tool**: Next.js 16 with Turbopack
- **Testing**: Jest with React Testing Library
- **Linting**: ESLint
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged

Commands:
```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint:fix         # Fix linting issues
npm run type-check       # Type checking
npm test                 # Run tests
```

---

## CONCLUSION

NetTrailers has a production-ready, well-designed architecture that:

✅ Uses proven patterns (Zustand + Adapters, Discriminated Unions, Services)
✅ Has comprehensive type safety (TypeScript + Zod)
✅ Includes security best practices (XSS prevention, data isolation)
✅ Has interaction tracking infrastructure ready to use
✅ Has sharing mechanisms already built
✅ Uses reusable component patterns throughout
✅ Has drag-and-drop libraries installed
✅ Supports both authenticated and guest users

**For Ranking Generator**: Follow the existing collection/list patterns, adapt components, and use the same Zustand + Firestore architecture for consistency and maintainability.

