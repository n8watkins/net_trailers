# NetTrailers Architecture - Quick Reference Guide

## At a Glance

**Netflix-inspired movie/TV show discovery platform** | Next.js 16 + React 19 + Zustand + Firebase

| Metric               | Value                             |
| -------------------- | --------------------------------- |
| **Framework**        | Next.js 16 + React 19             |
| **State Management** | Zustand (10 stores)               |
| **Database**         | Firebase Firestore + localStorage |
| **TypeScript Files** | 19,090                            |
| **Components**       | 100+                              |
| **Test Files**       | 20+                               |
| **API Routes**       | 18 (TMDB proxy)                   |
| **Hooks**            | 25+ custom hooks                  |

---

## Directory Structure (What Goes Where)

```
Root                      Purpose
────────────────────────────────────────────
app/                      Next.js 16 App Router + API routes
components/               100+ reusable React components
stores/                   Zustand state management
hooks/                    Custom React hooks
services/                 Business logic (Firebase, storage)
utils/                    Utility functions & helpers
types/                    TypeScript type definitions
lib/                      Server-side data fetching
styles/                   Global Tailwind CSS
public/                   Static assets (images, icons)
__tests__/                Jest test files
scripts/                  Dev utilities & automation
firebase.ts               Firebase initialization
```

---

## State Management (Zustand Stores)

### Store Purpose Map

| Store                | Purpose                                  | Data                                | Storage        |
| -------------------- | ---------------------------------------- | ----------------------------------- | -------------- |
| **appStore**         | Global UI state (modals, toasts, search) | 6 modals, 6 toast types             | Memory         |
| **authStore**        | Authenticated user data                  | Watchlists, preferences, auth data  | Firestore      |
| **guestStore**       | Guest user data                          | Watchlists, preferences (guest)     | localStorage   |
| **sessionStore**     | Session management                       | Session type, user ID, auth state   | Memory         |
| **cacheStore**       | API response caching                     | Page data, cache metadata           | sessionStorage |
| **searchStore**      | Search state                             | Query, results, filters, pagination | Memory         |
| **customRowsStore**  | Custom row management                    | User-created rows, ordering         | Firestore      |
| **smartSearchStore** | AI search state                          | Smart suggestions, queries          | Memory         |

**Key Pattern**: No context providers needed - Zustand stores are self-contained

---

## Component Organization

### By Layer

```
components/
├── pages/                 # Route-level components (HomeClient, etc)
├── layout/                # Layout components (Header, Footer, Banner)
├── content/               # Content display (ContentCard, Row)
├── search/                # Search UI (SearchFilters, SearchResults)
├── modals/                # Modal dialogs (Modal, CustomRowModal, etc)
├── auth/                  # Authentication UI
├── common/                # Reusable utilities (Toast, Loader, etc)
└── ...                    # Feature-specific folders
```

### Component Tiers

1. **Page Components** - Mount at routes (HomeClient)
2. **Feature Components** - Complex features (CustomRowWizard, Modal)
3. **Reusable Components** - Used throughout (ContentCard, Row, Toast)
4. **Utility Components** - Helpers (ErrorBoundary, Loader)

---

## Data Flow Diagram

```
User Action
    ↓
Zustand Store Update (setState)
    ↓
Persist to Storage (Firebase/localStorage)
    ↓
Component Re-render (via hook subscription)
    ↓
Optional: API Call (via useEffect)
    ↓
Cache Update
    ↓
Toast Notification (showSuccess/showError)
```

---

## Authentication & User Data

### Flow

```
Firebase Auth (Email/Google/Guest)
    ↓
useAuth() Hook
    ↓
sessionStore (session type + user ID)
    ↓
authStore (Firebase) OR guestStore (localStorage)
    ↓
Components read from store
    ↓
Data persisted to Firestore or localStorage
```

### User Data Structure

```typescript
{
  userId: string
  preferences: {
    defaultWatchlist: Content[]
    likedMovies: Content[]
    hiddenMovies: Content[]
    userCreatedWatchlists: UserList[]
    autoMute: boolean
    childSafetyMode: boolean
  }
  lastSyncedAt: number
}
```

---

## Content Type System

### Type-Safe Content Handling

```typescript
// Base type
interface BaseContent {
    id: number
    media_type?: 'movie' | 'tv'
    title?: string // Movie
    name?: string // TV
    // ... shared fields
}

// Discriminated unions
type Content = Movie | TVShow

// Type guards
isMovie(content) // true if movie
isTVShow(content) // true if TV show

// Utility functions
getTitle(content) // Works for both
getYear(content) // Works for both
```

---

## Search Implementation

### Flow

```
User Types → 300ms Debounce → URL Sync → API Call → Filter → Render
```

### Key Components

- **useSearch.ts** - Hook with debounce + filtering logic
- **searchStore.ts** - Query, results, filters state
- **SearchFilters.tsx** - Filter UI
- **SearchResults.tsx** - Results display

### Filters Available

- Content Type: all, movie, tv
- Rating: all, 7.0+, 8.0+, 9.0+
- Year: all, 2020s, 2010s, 2000s, 1990s
- Genre: Multiple selection
- Sort: Popularity, rating, date

---

## API Architecture

### Pattern

```
Client → Next.js Route → TMDBApiClient → TMDB API → Cache → Client
```

### Key Routes

| Route                           | Purpose                   |
| ------------------------------- | ------------------------- |
| `/api/search`                   | Multi-type content search |
| `/api/movies/trending`          | Trending movies           |
| `/api/tv/trending`              | Trending TV shows         |
| `/api/movies/top-rated`         | Top-rated movies          |
| `/api/tv/top-rated`             | Top-rated TV shows        |
| `/api/genres/[type]/[id]`       | Genre-specific content    |
| `/api/smart-search`             | AI-powered search         |
| `/api/custom-rows/[id]/content` | Custom row content        |

### Caching Strategy

- **apiCache.ts** - In-memory cache
- **cacheStore.ts** - Zustand-based
- **TTL** - 30 min for main data, 5 min for search

---

## Key Hooks Reference

### Authentication & Session

```typescript
useAuth() // Firebase auth + user
useSessionStore() // Session type, user ID
useAuthStatus() // Is authenticated?
useSessionData() // Sync user data
```

### Data Management

```typescript
useSearch() // Search logic + filtering
useWatchlist() // Watchlist operations
useUserData() // User preferences
useGuestData() // Guest-specific data
useLikedHidden() // Liked/hidden content
```

### UI & Effects

```typescript
useToast() // Toast notifications
useModal() // Modal control
useKeyboardShortcuts() // Keyboard handling
useChildSafety() // Child safety preference
useHydrationSafe() // Hydration safety
```

---

## Error Handling

### Pattern

All errors → ErrorHandler → Toast Notification

```typescript
// In API routes or components:
const { showError } = useToast()
const handler = createErrorHandler(showError)

try {
    // operation
} catch (error) {
    handler.handleApiError(error, 'fetch user data')
    // Automatically shows toast to user
}
```

### Toast Types

- `success` - Green checkmark
- `error` - Red X
- `watchlist-add` - Blue plus
- `watchlist-remove` - Orange minus
- `content-hidden` - Red eye-slash
- `content-shown` - Green eye

---

## Configuration

### Environment Variables

**Required**:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `TMDB_API_KEY`

**Optional**:

- `GEMINI_API_KEY` (for AI features)
- `SENTRY_DSN` (error monitoring)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (analytics)

---

## Common Development Tasks

### Start Development

```bash
npm run dev              # Safe server with port detection
npm run dev:next         # Raw Next.js dev server
```

### Build & Deploy

```bash
npm run build            # Production build
npm run start            # Start production server
npm run analyze          # Bundle size analysis
```

### Code Quality

```bash
npm run lint             # Check linting
npm run lint:fix         # Auto-fix linting
npm run type-check       # TypeScript type checking
```

### Testing

```bash
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:ci          # CI mode
```

---

## Important Patterns

### Zustand Store Usage

```typescript
// Select entire store
const store = useAppStore()

// Select specific values (better performance)
const modal = useAppStore((state) => state.modal)
const openModal = useAppStore((state) => state.openModal)

// Update state
openModal(content, autoPlay, sound)
```

### Firebase Firestore Access

```typescript
// User data is at: /users/{userId}
// Auto-synced via authStore + authStorageService
// 5-second timeout protection built in

// Add to watchlist
authStore.addToWatchlist(content) // Auto-saves to Firestore
```

### Server Components

```typescript
// In app/page.tsx, app/movies/page.tsx, etc.
async function HomeContent() {
  const data = await fetchHomeData()  // Server-side fetch
  return <HomeClient data={data} />   // Client component
}
```

---

## Architecture Strengths

✓ **Type Safety** - Full TypeScript with strict mode
✓ **State Management** - Zustand with minimal boilerplate
✓ **Authentication** - Multi-provider with proper isolation
✓ **Error Handling** - Unified toast-based system
✓ **Content Handling** - Discriminated unions for type safety
✓ **Performance** - Caching, lazy loading, debouncing
✓ **Developer Experience** - Clear organization, good docs
✓ **Monitoring** - Sentry, Google Analytics, Vercel Analytics

---

## Known Issues to Address

⚠ **appStore.ts** - Manages too many concerns (split into modalStore, toastStore)
⚠ **Component Size** - Some components are 500+ lines
⚠ **Test Coverage** - Currently 70%, target 80%+
⚠ **Cache Invalidation** - Multiple layers, unclear strategy
⚠ **Rate Limiting** - TMDB limit not formally enforced
⚠ **Type Coverage** - Some `any` types, optional fields

---

## Quick Links

- Full Analysis: `PROJECT_ARCHITECTURE_ANALYSIS.md`
- Installation: `README.md`
- Development Guide: `CLAUDE.md`
- Recent Features: `IMPLEMENTATION_STATUS.md`

---

## Support

For detailed architecture information, see: **PROJECT_ARCHITECTURE_ANALYSIS.md**

This quick reference covers the essentials. The full document provides:

- Detailed store descriptions
- Component organization
- API architecture details
- Testing setup
- Monitoring & analytics
- Deployment information
