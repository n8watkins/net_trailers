# NetTrailer Polish Action Plan

**Goal:** High-impact improvements without massive time investment
**Total Estimated Time:** 12-17 hours
**Focus:** Quick wins that significantly improve portfolio presentation

---

## Phase 1: Critical Quick Fixes (4-5 hours)

### 1. Remove Production Console.logs (1 hour) 🔴 PRIORITY 1

**Why:** Leaks debug information in production, looks unprofessional

**Files to Fix:**

#### stores/appStore.ts

```typescript
// Lines 171, 183, 227-230, 265, 317

// ❌ Current
console.log('🎬 [AppStore] Modal opened:', getTitle(content))

// ✅ Fix
if (process.env.NODE_ENV === 'development') {
    console.log('🎬 [AppStore] Modal opened:', getTitle(content))
}
```

**Quick Find Command:**

```bash
grep -n "console.log" stores/appStore.ts
grep -n "console.log" stores/sessionStore.ts
grep -n "console.log" pages/api/search.ts
```

**Files to Update:**

- `stores/appStore.ts` (5 console.log statements)
- `stores/sessionStore.ts` (4 console.log statements)
- `pages/api/search.ts` (1 console.error)
- `hooks/useSearch.ts` (check for any console.logs)

**Pattern to Apply:**

```typescript
// For development-only logs
if (process.env.NODE_ENV === 'development') {
    console.log('...')
}

// For errors that should always log
console.error('Critical error:', error) // Keep these
```

---

### 2. Fix Type Duplication (2 hours) 🔴 PRIORITY 2

**Why:** Maintenance nightmare, potential bugs from inconsistency

**Problem:** `UserPreferences` and related types exist in multiple locations:

- `types/atoms.ts`
- `types/shared.ts`
- Possibly duplicated in store files

**Solution:**

**Step 1: Audit Current Types (15 min)**

```bash
grep -r "interface UserPreferences" types/
grep -r "interface UserSession" types/
grep -r "type SessionType" types/
```

**Step 2: Consolidate to Single Source (45 min)**

Create `types/index.ts` as the single source of truth:

```typescript
// types/index.ts - SINGLE SOURCE OF TRUTH

// ==========================================
// USER & SESSION TYPES
// ==========================================

export type SessionType = 'guest' | 'authenticated' | 'initializing'

export interface UserPreferences {
    childSafetyMode: boolean
    theme: string
    language: string
    autoPlayTrailers: boolean
    adultContentFilter: boolean
}

export interface UserSession {
    sessionType: SessionType
    userId: string
    guestId?: string
    isInitialized: boolean
}

// ==========================================
// CONTENT TYPES (from typings.ts)
// ==========================================

export interface Genre {
    id: number
    name: string
}

export interface BaseContent {
    id: number
    backdrop_path: string
    genre_ids: number[]
    genres?: Genre[]
    // ... rest of BaseContent
}

export interface Movie extends BaseContent {
    media_type: 'movie'
    title: string
    original_title: string
    release_date: string
    runtime?: number
    adult?: boolean
    budget?: number
    revenue?: number
}

export interface TVShow extends BaseContent {
    media_type: 'tv'
    name: string
    original_name: string
    first_air_date: string
    number_of_seasons?: number
    number_of_episodes?: number
}

export type Content = Movie | TVShow

// Type guards
export function isMovie(content: Content): content is Movie {
    return content.media_type === 'movie'
}

export function isTVShow(content: Content): content is TVShow {
    return content.media_type === 'tv'
}

// ==========================================
// WATCHLIST TYPES
// ==========================================

export interface WatchlistItem {
    id: number
    addedAt: number
    media_type: 'movie' | 'tv'
}

export interface CustomList {
    id: string
    name: string
    description?: string
    color: string
    icon: string
    items: WatchlistItem[]
    createdAt: number
    updatedAt: number
}

// ==========================================
// UTILITY TYPES
// ==========================================

export interface ToastMessage {
    id: string
    type:
        | 'success'
        | 'error'
        | 'watchlist-add'
        | 'watchlist-remove'
        | 'content-hidden'
        | 'content-shown'
    title: string
    message?: string
    timestamp: number
}

export interface ModalContent {
    content: Content
    autoPlay: boolean
    autoPlayWithSound: boolean
}
```

**Step 3: Update All Imports (30 min)**

Search and replace across project:

```bash
# Find all imports
grep -r "from '../types/atoms'" --include="*.ts" --include="*.tsx"
grep -r "from './types/atoms'" --include="*.ts" --include="*.tsx"
grep -r "from '../../typings'" --include="*.ts" --include="*.tsx"

# Update to use barrel export
# Old: import { UserPreferences } from '../types/atoms'
# New: import { UserPreferences } from '@/types'
```

**Step 4: Delete Duplicate Files (15 min)**

After confirming all imports work:

```bash
# Keep only types/index.ts
# Delete or consolidate:
rm types/atoms.ts      # If fully migrated
rm types/shared.ts     # If fully migrated
# typings.ts can stay or be moved into types/index.ts
```

**Step 5: Update tsconfig.json paths (15 min)**

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["./*"],
            "@/types": ["./types"],
            "@/components": ["./components"],
            "@/hooks": ["./hooks"],
            "@/stores": ["./stores"],
            "@/utils": ["./utils"]
        }
    }
}
```

---

### 3. Basic Accessibility - Interactive Elements (1-2 hours) 🔴 PRIORITY 3

**Why:** Shows professionalism, improves UX for all users

**Focus on High-Impact Changes:**

#### Fix 1: ContentCard.tsx - Make Clickable Divs Semantic Buttons

```typescript
// components/ContentCard.tsx

// ❌ BEFORE (lines 102-111)
<div
    className="relative cursor-pointer transition-all duration-300 ease-out group"
    onClick={handleImageClick}
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
>

// ✅ AFTER
<button
    type="button"
    className="relative cursor-pointer transition-all duration-300 ease-out group text-left w-full"
    onClick={handleImageClick}
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleImageClick()
        }
    }}
    aria-label={content ? `View details for ${getTitle(content)}` : 'Content card'}
>
```

**Also fix the action buttons in ContentCard:**

```typescript
// Icon buttons (lines 190-250ish)

// ❌ BEFORE
<div
    onClick={(e) => {
        e.stopPropagation()
        handlePlay()
    }}
    className="..."
>
    <PlayIcon className="h-5 w-5" />
</div>

// ✅ AFTER
<button
    type="button"
    onClick={(e) => {
        e.stopPropagation()
        handlePlay()
    }}
    className="..."
    aria-label={`Play ${content ? getTitle(content) : 'content'}`}
>
    <PlayIcon className="h-5 w-5" aria-hidden="true" />
</button>
```

**Pattern for All Icon Buttons:**

```typescript
<button
    type="button"
    onClick={handleClick}
    aria-label="Descriptive action text"
    className="..."
>
    <Icon className="..." aria-hidden="true" />
</button>
```

#### Fix 2: SearchBar.tsx - Add ARIA Attributes

```typescript
// components/SearchBar.tsx

// ✅ Add to input
<input
    type="search"  // Changed from "text"
    placeholder="Search for movies and TV shows"
    value={query}
    onChange={handleChange}
    aria-label="Search for movies and TV shows"
    aria-autocomplete="list"
    aria-controls={showSuggestions ? "search-suggestions" : undefined}
    aria-expanded={showSuggestions}
    aria-activedescendant={activeId}  // If implementing keyboard navigation
    className="..."
/>

// ✅ Add to suggestions dropdown
{showSuggestions && (
    <div
        id="search-suggestions"
        role="listbox"
        aria-label="Search suggestions"
        className="..."
    >
        {suggestions.map((suggestion, index) => (
            <div
                key={index}
                role="option"
                aria-selected={index === activeIndex}
                className="..."
            >
                {suggestion}
            </div>
        ))}
    </div>
)}
```

#### Fix 3: Modal.tsx - Add Dialog Role and Focus Management

```typescript
// components/Modal.tsx

// ✅ Add dialog semantics
<div
    className="fixed inset-0 z-50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
>
    <div className="modal-content">
        {/* Ensure there's a title with id="modal-title" */}
        <h2 id="modal-title" className="text-2xl font-bold">
            {getTitle(content)}
        </h2>

        {/* Close button */}
        <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="..."
        >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
        </button>
    </div>
</div>
```

#### Fix 4: Header.tsx - Navigation Semantics

```typescript
// components/Header.tsx

// ✅ Wrap nav items in <nav>
<nav aria-label="Main navigation">
    <ul className="flex space-x-4">
        <li>
            <Link href="/">
                <a className="..." aria-current={router.pathname === '/' ? 'page' : undefined}>
                    Home
                </a>
            </Link>
        </li>
        <li>
            <Link href="/movies">
                <a className="..." aria-current={router.pathname === '/movies' ? 'page' : undefined}>
                    Movies
                </a>
            </Link>
        </li>
        {/* ... more nav items */}
    </ul>
</nav>

// ✅ Mobile menu toggle
<button
    type="button"
    onClick={() => setShowMobileMenu(!showMobileMenu)}
    aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
    aria-expanded={showMobileMenu}
    className="..."
>
    {showMobileMenu ? (
        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
    ) : (
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
    )}
</button>
```

#### Fix 5: Toast.tsx - Add ARIA Live Region

```typescript
// components/ToastContainer.tsx

// ✅ Add live region for screen readers
<div
    className="fixed bottom-4 right-4 z-[100]"
    aria-live="polite"  // or "assertive" for errors
    aria-atomic="true"
    role="status"
>
    {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
    ))}
</div>
```

**Quick Win Files to Update (in order of impact):**

1. ✅ `components/ContentCard.tsx` - Convert divs to buttons, add aria-labels
2. ✅ `components/SearchBar.tsx` - Add search semantics
3. ✅ `components/Modal.tsx` - Add dialog role
4. ✅ `components/InfoModal.tsx` - Add dialog role
5. ✅ `components/Header.tsx` - Add nav semantics
6. ✅ `components/ToastContainer.tsx` - Add live region
7. ✅ `components/Row.tsx` - Add list semantics if using divs

**Testing Your Changes:**

```bash
# Install axe DevTools extension for Chrome/Firefox
# Or use axe-core in tests (optional)

# Manual keyboard test:
# 1. Tab through the page
# 2. Can you reach all interactive elements?
# 3. Is focus visible?
# 4. Can you activate with Enter/Space?
```

---

## Phase 2: High Priority Improvements (6-7 hours)

### 4. Component Organization (3-4 hours) 🟡 PRIORITY 4

**Why:** Professional structure, easier maintenance, better DX

**Current Problem:** 63 components in flat directory

**Solution: Create Organized Folder Structure**

**Step 1: Create New Folder Structure (15 min)**

```bash
mkdir -p components/common
mkdir -p components/layout
mkdir -p components/content
mkdir -p components/search
mkdir -p components/auth
mkdir -p components/modals
mkdir -p components/debug
mkdir -p components/features
```

**Step 2: Categorize and Move Components (2 hours)**

**Common UI Components** → `components/common/`

```
Button/
  index.tsx
  Button.tsx (if you create one)
Toast/
  Toast.tsx
  ToastContainer.tsx
  ToastManager.tsx
  index.ts (barrel export)
Loading/
  NetflixLoader.tsx
  ContentMetadataSkeleton.tsx
  index.ts
Modal/
  Modal.tsx
  ConfirmationModal.tsx
  index.ts
```

**Layout Components** → `components/layout/`

```
Header/
  Header.tsx
  index.ts
Footer/
  Footer.tsx
  index.ts
Layout/
  Layout.tsx
  index.ts
```

**Content Components** → `components/content/`

```
ContentCard/
  ContentCard.tsx
  index.ts
ContentImage/
  ContentImage.tsx
  index.ts
ContentMetadata/
  ContentMetadata.tsx
  index.ts
Row/
  Row.tsx
  LazyRow.tsx
  index.ts
Banner/
  Banner.tsx
  PortfolioBanner.tsx
  index.ts
VideoPlayer/
  VideoPlayer.tsx
  VideoPlayerControls.tsx
  VolumeSlider.tsx
  index.ts
```

**Search Components** → `components/search/`

```
SearchBar/
  SearchBar.tsx
  SearchSuggestionsDropdown.tsx
  index.ts
SearchFilters/
  SearchFilters.tsx
  SearchFiltersDropdown.tsx
  index.ts
SearchResults/
  SearchResults.tsx
  SearchResultItem.tsx
  index.ts
```

**Auth Components** → `components/auth/`

```
AuthModal/
  AuthModal.tsx
  index.ts
AvatarDropdown/
  AvatarDropdown.tsx
  index.ts
AccountManagement/
  AccountManagement.tsx
  index.ts
GuestMode/
  GuestModeIndicator.tsx
  GuestModeNotification.tsx
  index.ts
```

**Modal Components** → `components/modals/`

```
InfoModal/
  InfoModal.tsx
  index.ts
AboutModal/
  AboutModal.tsx
  index.ts
TutorialModal/
  TutorialModal.tsx
  index.ts
KeyboardShortcutsModal/
  KeyboardShortcutsModal.tsx
  index.ts
UserSettingsModal/
  UserSettingsModal.tsx
  index.ts
ListSelectionModal/
  ListSelectionModal.tsx
  index.ts
ColorPickerModal/
  ColorPickerModal.tsx
  index.ts
IconPickerModal/
  IconPickerModal.tsx
  index.ts
```

**Feature Components** → `components/features/`

```
ChildSafety/
  ChildSafetyIndicator.tsx
  index.ts
Watchlist/
  WatchLaterButton.tsx
  SimpleLikeButton.tsx
  LikeOptions.tsx
  MyListsDropdown.tsx
  ListDropdown.tsx
  index.ts
Analytics/
  Analytics.tsx
  VercelAnalyticsWrapper.tsx
  index.ts
```

**Debug Components** → `components/debug/` (only in dev)

```
Debug/
  DebugControls.tsx
  AuthFlowDebugger.tsx
  FirebaseCallTracker.tsx
  WebVitalsHUD.tsx
  FirestoreTestButton.tsx
  index.ts
```

**Step 3: Create Barrel Exports (1 hour)**

Example for each folder:

```typescript
// components/common/Toast/index.ts
export { default as Toast } from './Toast'
export { ToastContainer } from './ToastContainer'
export { ToastManager } from './ToastManager'

// components/content/ContentCard/index.ts
export { default as ContentCard } from './ContentCard'

// components/layout/Header/index.ts
export { default as Header } from './Header'
```

**Step 4: Update All Imports (1 hour)**

Use VS Code's "Find and Replace in Files":

```typescript
// Old
import Header from '../components/Header'
import ContentCard from '../components/ContentCard'
import Toast from '../components/Toast'

// New
import { Header } from '@/components/layout/Header'
import { ContentCard } from '@/components/content/ContentCard'
import { Toast } from '@/components/common/Toast'

// Or even better, group imports:
import { Header } from '@/components/layout'
import { ContentCard } from '@/components/content'
import { Toast, ToastContainer } from '@/components/common'
```

**Migration Script (Optional):**

Create `scripts/organize-components.sh`:

```bash
#!/bin/bash

# Example: Move Header
mkdir -p components/layout/Header
mv components/Header.tsx components/layout/Header/Header.tsx
echo "export { default as Header } from './Header'" > components/layout/Header/index.ts

# Repeat for all components...
```

**Step 5: Create Root Barrel Export (15 min)**

```typescript
// components/index.ts
export * from './common'
export * from './layout'
export * from './content'
export * from './search'
export * from './auth'
export * from './modals'
export * from './features'
```

**Testing After Migration:**

```bash
npm run type-check  # Ensure no broken imports
npm run build       # Ensure build succeeds
npm run dev         # Ensure app runs
```

---

### 5. Fix ESLint Warnings in Production Code (2 hours) 🟡 PRIORITY 5

**Why:** Type safety, code quality

**Current Issue:** 61 `any` type warnings

**Focus: Fix Production Code Only** (Skip test files for now)

**Files to Fix:**

#### pages/api/search.ts (Lines 61, 74, 77)

```typescript
// ❌ BEFORE
let filteredResults = data.results.filter(
    (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
)

const tvShows = filteredResults.filter((item: any) => item.media_type === 'tv')
const movies = filteredResults.filter((item: any) => item.media_type === 'movie')

// ✅ AFTER

// Add type definition at top of file
interface TMDBSearchResult {
    id: number
    media_type: 'movie' | 'tv' | 'person'
    adult?: boolean
    // ... other TMDB fields
}

interface TMDBSearchResponse {
    results: TMDBSearchResult[]
    total_results: number
    total_pages: number
    page: number
}

// Use proper types
const data: TMDBSearchResponse = await response.json()

let filteredResults = data.results.filter(
    (item: TMDBSearchResult) => item.media_type === 'movie' || item.media_type === 'tv'
)

const tvShows = filteredResults.filter((item) => item.media_type === 'tv')
const movies = filteredResults.filter((item) => item.media_type === 'movie')
```

#### utils/contentRatings.ts (Line 188)

```typescript
// ❌ BEFORE
const rating: any = contentRatings[mpaaRating]

// ✅ AFTER
interface ContentRating {
    level: number
    description: string
}

const contentRatings: Record<string, ContentRating> = {
    G: { level: 1, description: 'General Audiences' },
    PG: { level: 2, description: 'Parental Guidance' },
    // ... rest
}

const rating: ContentRating | undefined = contentRatings[mpaaRating]
```

#### pages/genres/[type]/[id].tsx (Line 124)

```typescript
// ❌ BEFORE
const genreData: any = await response.json()

// ✅ AFTER
interface GenreResponse {
    results: Content[]
    total_results: number
    total_pages: number
}

const genreData: GenreResponse = await response.json()
```

**Pattern for API Responses:**

```typescript
// Define response shape
interface APIResponse<T> {
    data?: T
    error?: string
    message?: string
}

// Use generic
async function fetchData<T>(url: string): Promise<APIResponse<T>> {
    const response = await fetch(url)
    return response.json() as Promise<APIResponse<T>>
}
```

---

### 6. Add Security Headers (1 hour) 🟡 PRIORITY 6

**Why:** Production best practice, security audit compliance

**Add to next.config.js:**

```javascript
// next.config.js

async headers() {
    return [
        {
            source: '/:path*',
            headers: [
                // Existing headers
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'X-XSS-Protection', value: '1; mode=block' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },

                // ✅ ADD: Content Security Policy
                {
                    key: 'Content-Security-Policy',
                    value: [
                        "default-src 'self'",
                        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
                        "style-src 'self' 'unsafe-inline'",
                        "img-src 'self' data: https: blob:",
                        "font-src 'self' data:",
                        "connect-src 'self' https://api.themoviedb.org https://www.google-analytics.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com",
                        "frame-src 'self' https://www.youtube.com",
                        "media-src 'self' https:",
                        "object-src 'none'",
                        "base-uri 'self'",
                        "form-action 'self'",
                        "frame-ancestors 'none'",
                        "upgrade-insecure-requests"
                    ].join('; ')
                },

                // ✅ ADD: Strict Transport Security (HSTS)
                {
                    key: 'Strict-Transport-Security',
                    value: 'max-age=31536000; includeSubDomains'
                }
            ],
        },
    ]
},
```

**Test Security Headers:**

```bash
# After deploying or running locally
curl -I http://localhost:3000 | grep -i "content-security-policy"

# Or use online tool:
# https://securityheaders.com
```

---

## Phase 3: Performance & Documentation Polish (5-6 hours)

### 7. Performance Optimizations (3-4 hours) 🟢 OPTIONAL BUT RECOMMENDED

#### 7A. Re-enable Package Import Optimization (30 min)

**Why:** Reduces bundle size for @heroicons/react (currently ~100KB)

```javascript
// next.config.js

experimental: {
    optimizePackageImports: ['@heroicons/react'],  // Re-enable
},
```

**Test thoroughly after enabling:**

```bash
npm run build
npm run start
# Check that all icons render correctly
```

If errors occur, keep disabled and document why.

#### 7B. Add Image Blur Placeholders (1-2 hours)

**Why:** Better perceived performance, professional UX

**Option 1: Use plaiceholder library (Recommended)**

```bash
npm install plaiceholder sharp
```

```typescript
// utils/generateBlurPlaceholder.ts
import { getPlaiceholder } from 'plaiceholder'

export async function getImageWithBlur(src: string) {
    const buffer = await fetch(src).then(async (res) => Buffer.from(await res.arrayBuffer()))

    const { base64, img } = await getPlaiceholder(buffer, { size: 10 })

    return {
        ...img,
        blurDataURL: base64,
    }
}
```

**Option 2: Use shimmer placeholder (Faster, no external lib)**

```typescript
// utils/shimmer.ts
export const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#333" offset="20%" />
      <stop stop-color="#222" offset="50%" />
      <stop stop-color="#333" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#333" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`

export const toBase64 = (str: string) =>
    typeof window === 'undefined' ? Buffer.from(str).toString('base64') : window.btoa(str)

export const shimmerDataUrl = (w: number, h: number) =>
    `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`
```

**Usage in ContentCard.tsx:**

```typescript
import { shimmerDataUrl } from '@/utils/shimmer'

<Image
    src={`https://image.tmdb.org/t/p/w500${posterImage}`}
    alt={getTitle(content)}
    fill
    placeholder="blur"
    blurDataURL={shimmerDataUrl(500, 750)}  // Width x Height
    className="..."
/>
```

#### 7C. Bundle Analysis & Optimization (1 hour)

**Run Bundle Analyzer:**

```bash
npm run analyze
```

**Check for:**

1. Large dependencies (>100KB)
2. Duplicate dependencies
3. Unused code

**Common Optimizations:**

**Material-UI (if too large):**

```typescript
// ❌ Imports entire library
import { Button, TextField } from '@mui/material'

// ✅ Import only what you need
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
```

**Dynamic Imports for Heavy Components:**

```typescript
// pages/index.tsx

import dynamic from 'next/dynamic'

// ✅ Lazy load modals
const InfoModal = dynamic(() => import('@/components/modals/InfoModal'), {
    ssr: false,
    loading: () => <div>Loading...</div>
})

const UserSettingsModal = dynamic(() => import('@/components/modals/UserSettingsModal'), {
    ssr: false
})

const TutorialModal = dynamic(() => import('@/components/modals/TutorialModal'), {
    ssr: false
})
```

**Code Split by Route:**

```typescript
// Ensure heavy pages are code-split automatically
// Next.js does this by default, but verify with bundle analyzer
```

#### 7D. Add Service Worker for Offline Support (1-2 hours) ⚡ ADVANCED

**Why:** PWA capability, offline image caching, better performance

**Step 1: Create Service Worker**

```javascript
// public/sw.js
const CACHE_NAME = 'nettrailer-v1'
const TMDB_IMAGE_CACHE = 'nettrailer-images-v1'

// Cache TMDB images
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)

    // Cache TMDB images
    if (url.hostname === 'image.tmdb.org') {
        event.respondWith(
            caches.open(TMDB_IMAGE_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    return (
                        response ||
                        fetch(event.request).then((networkResponse) => {
                            // Cache for 7 days
                            cache.put(event.request, networkResponse.clone())
                            return networkResponse
                        })
                    )
                })
            })
        )
    }
})

// Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== TMDB_IMAGE_CACHE)
                    .map((name) => caches.delete(name))
            )
        })
    )
})
```

**Step 2: Register Service Worker**

```typescript
// pages/_app.tsx

useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => console.log('SW registered:', registration))
            .catch((error) => console.log('SW registration failed:', error))
    }
}, [])
```

**Step 3: Add PWA Manifest**

```json
// public/manifest.json
{
    "name": "NetTrailer - Movie Discovery",
    "short_name": "NetTrailer",
    "description": "Discover movies and TV shows with advanced filtering",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#141414",
    "theme_color": "#E50914",
    "icons": [
        {
            "src": "/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
```

**Step 4: Link Manifest in \_document.tsx**

```typescript
// pages/_document.tsx

<Head>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#E50914" />
</Head>
```

---

### 8. Enhanced Documentation (2 hours) 🟢 RECOMMENDED

#### 8A. Add JSDoc Comments to Public APIs (1 hour)

**Why:** Better DX, auto-complete, professional appearance

**Pattern:**

````typescript
// utils/contentFilter.ts

/**
 * Filters content based on child safety settings by removing adult-flagged items
 *
 * @param content - Array of content items (movies or TV shows) to filter
 * @param childSafe - Whether to apply child safety filtering
 * @returns Filtered array with adult content removed if childSafe is true
 *
 * @example
 * ```typescript
 * const movies = await fetchMovies()
 * const safeMovies = filterContentByAdultFlag(movies, true)
 * // Returns only movies where adult flag is false
 * ```
 */
export function filterContentByAdultFlag(content: Content[], childSafe: boolean): Content[] {
    if (!childSafe) return content
    return content.filter((item) => !item.adult)
}

/**
 * Fetches and filters TV shows based on content ratings to ensure child safety
 *
 * This function makes additional API calls to TMDB to fetch content ratings
 * for TV shows and filters out mature content (TV-MA, TV-14, etc.)
 *
 * @param shows - Array of TV shows to filter
 * @param apiKey - TMDB API key for fetching content ratings
 * @returns Promise resolving to filtered TV shows safe for children
 *
 * @example
 * ```typescript
 * const tvShows = await fetchTVShows()
 * const safeTVShows = await filterMatureTVShows(tvShows, process.env.TMDB_API_KEY)
 * ```
 */
export async function filterMatureTVShows(shows: TVShow[], apiKey: string): Promise<TVShow[]> {
    // ... implementation
}
````

**Files to Document:**

- `utils/contentFilter.ts` ✅
- `utils/errorHandler.ts` ✅
- `hooks/useSearch.ts` ✅
- `hooks/useUserData.ts` ✅
- `stores/*.ts` (store interfaces) ✅

#### 8B. Create CONTRIBUTING.md (30 min)

````markdown
# Contributing to NetTrailer

Thank you for your interest in contributing to NetTrailer!

## Development Setup

1. **Fork and Clone**
    ```bash
    git clone https://github.com/yourusername/net_trailers.git
    cd net_trailers
    ```
````

2. **Install Dependencies**

    ```bash
    npm install
    ```

3. **Set Up Environment**
    - Copy `.env.example` to `.env.local`
    - Add your Firebase and TMDB API keys

4. **Run Development Server**
    ```bash
    npm run dev
    ```

## Development Workflow

1. **Create a Feature Branch**

    ```bash
    git checkout -b feature/your-feature-name
    ```

2. **Make Your Changes**
    - Write clean, typed TypeScript code
    - Follow existing code patterns
    - Add JSDoc comments for public APIs

3. **Run Quality Checks**

    ```bash
    npm run type-check  # TypeScript
    npm run lint:fix    # ESLint
    npm test            # Jest tests
    ```

4. **Commit Your Changes**

    ```bash
    git add .
    git commit -m "feat: add feature description"
    ```

    We use conventional commits:
    - `feat:` - New features
    - `fix:` - Bug fixes
    - `docs:` - Documentation changes
    - `refactor:` - Code refactoring
    - `test:` - Test additions/changes
    - `chore:` - Maintenance tasks

5. **Push and Create PR**
    ```bash
    git push origin feature/your-feature-name
    ```

## Code Style

- **TypeScript**: Strict mode enabled, no `any` types in production code
- **Components**: Functional components with hooks
- **State Management**: Zustand stores with clear state/actions separation
- **Naming**:
    - Components: PascalCase (`ContentCard.tsx`)
    - Files: camelCase or PascalCase
    - Functions: camelCase
    - Constants: UPPER_SNAKE_CASE

## Project Structure

```
components/         # React components (organized by feature)
  common/          # Reusable UI components
  content/         # Content-related components
  layout/          # Layout components
hooks/             # Custom React hooks
stores/            # Zustand state stores
utils/             # Utility functions
types/             # TypeScript type definitions
pages/             # Next.js pages
  api/            # API routes
```

## Testing Guidelines

- Write tests for new features
- Aim for >70% coverage on new code
- Test user interactions with React Testing Library
- Test edge cases and error scenarios

## Pull Request Guidelines

1. **PR Title**: Use conventional commit format
2. **Description**: Explain what and why
3. **Screenshots**: Include for UI changes
4. **Tests**: Ensure all tests pass
5. **Documentation**: Update if needed

## Questions?

Open an issue or reach out to the maintainers!

---

**Happy Contributing!** 🎬

````

#### 8C. Create CHANGELOG.md (15 min)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive accessibility improvements (ARIA attributes, keyboard navigation)
- Organized component structure with barrel exports
- JSDoc documentation for public APIs
- Service worker for offline image caching
- Enhanced security headers (CSP, HSTS)

### Changed
- Migrated to centralized type definitions in `types/index.ts`
- Improved bundle size with package import optimization
- Updated all production code to remove `any` types

### Fixed
- Removed console.log statements from production code
- Fixed type duplication issues
- Improved focus management in modals

## [1.0.0] - 2025-11-01

### Added
- Child safety mode with content filtering (movies and TV shows)
- Custom watchlist creation with color and icon customization
- Guest mode authentication with localStorage persistence
- Dual authentication system (Firebase + Guest)
- Advanced search with filters (genre, year, rating, content type)
- Real-time search with debouncing and suggestions
- Unified toast notification system (6 types)
- Netflix-inspired UI with smooth animations
- Responsive design for all device sizes
- Keyboard shortcuts for power users
- CSV export for watchlists
- Sentry error monitoring
- Google Analytics 4 integration
- Vercel Analytics for performance tracking

### Technical Features
- Next.js 16 with React 19
- TypeScript strict mode
- Zustand state management
- Firebase Authentication and Firestore
- TMDB API integration with caching
- Comprehensive security headers
- Performance optimizations (lazy loading, code splitting, prefetching)

## [0.1.0] - Initial Development

### Added
- Basic movie browsing functionality
- TMDB API integration
- Firebase authentication
- Basic watchlist functionality

---

[Unreleased]: https://github.com/yourusername/net_trailers/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/net_trailers/releases/tag/v1.0.0
````

#### 8D. Add API Documentation (15 min)

Create `API_DOCUMENTATION.md`:

````markdown
# API Documentation

NetTrailer uses internal Next.js API routes to proxy TMDB API calls.

## Search Endpoint

**GET** `/api/search`

Search for movies and TV shows with optional child safety filtering.

### Query Parameters

| Parameter         | Type    | Required | Description                     |
| ----------------- | ------- | -------- | ------------------------------- |
| `query`           | string  | Yes      | Search query (min 2 characters) |
| `page`            | number  | No       | Page number (default: 1)        |
| `childSafetyMode` | boolean | No       | Enable child safety filtering   |

### Example Request

```bash
GET /api/search?query=inception&page=1&childSafetyMode=true
```
````

### Example Response

```json
{
    "results": [
        {
            "id": 27205,
            "media_type": "movie",
            "title": "Inception",
            "poster_path": "/path.jpg",
            "vote_average": 8.4,
            "release_date": "2010-07-16"
        }
    ],
    "total_results": 23,
    "total_pages": 2,
    "page": 1,
    "child_safety_enabled": true,
    "hidden_count": 3
}
```

## Content Details Endpoint

**GET** `/api/content/[id]`

Get detailed information about a movie or TV show.

### Parameters

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `id`      | number | Yes      | TMDB content ID                |
| `type`    | string | No       | Content type ('movie' or 'tv') |

### Example Request

```bash
GET /api/content/27205?type=movie
```

## Movies Endpoints

### Trending Movies

**GET** `/api/movies/trending`

### Top Rated Movies

**GET** `/api/movies/top-rated`

### Movies by Genre

**GET** `/api/movies/genre/[genre]`

## TV Shows Endpoints

### Trending TV Shows

**GET** `/api/tv/trending`

### Top Rated TV Shows

**GET** `/api/tv/top-rated`

## Error Responses

All endpoints return consistent error responses:

```json
{
    "message": "Error description",
    "error": "Detailed error (development only)"
}
```

### Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `405` - Method Not Allowed
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

TMDB API allows 40 requests per second. NetTrailer implements caching to reduce API calls:

- Search results: 10 minutes TTL
- Content details: 5 minutes TTL
- Lists (trending, top-rated): 5 minutes TTL

## Child Safety Filtering

When `childSafetyMode=true`:

1. **Movies**: Filters out content with `adult: true` flag
2. **TV Shows**: Fetches content ratings and filters:
    - TV-MA (Mature Audiences)
    - TV-14 (Parents Strongly Cautioned)
    - R, NC-17 rated content
3. **Genres**: Filters horror, crime, war, and adult genres

## Authentication

API routes are public but Firebase Authentication is required for:

- Saving watchlists
- User preferences
- Persistent data storage

Guest mode uses localStorage for temporary data storage.

````

---

## Testing & Verification Checklist

After completing each phase, verify:

### Phase 1 Verification
- [ ] No console.log in production build (`npm run build` → check output)
- [ ] TypeScript compiles with no errors (`npm run type-check`)
- [ ] No duplicate type definitions (search codebase)
- [ ] Tab navigation works through all interactive elements
- [ ] Screen reader announces toast messages
- [ ] All buttons have aria-labels

### Phase 2 Verification
- [ ] All imports resolve correctly
- [ ] Build succeeds after component reorganization
- [ ] No ESLint errors in production code (`npm run lint`)
- [ ] Security headers present (check with browser dev tools or securityheaders.com)

### Phase 3 Verification
- [ ] Bundle size reduced (run `npm run analyze` before/after)
- [ ] Images load with blur placeholder
- [ ] Lighthouse score improved (run in Chrome DevTools)
- [ ] All documentation links work

---

## Estimated Timeline

| Task | Estimated Time | Priority |
|------|---------------|----------|
| **Phase 1: Critical Fixes** | **4-5 hours** | 🔴 High |
| Remove console.logs | 1 hour | 🔴 |
| Fix type duplication | 2 hours | 🔴 |
| Basic accessibility | 1-2 hours | 🔴 |
| **Phase 2: Organization** | **6-7 hours** | 🟡 Medium |
| Component organization | 3-4 hours | 🟡 |
| Fix ESLint warnings | 2 hours | 🟡 |
| Security headers | 1 hour | 🟡 |
| **Phase 3: Polish** | **5-6 hours** | 🟢 Optional |
| Performance optimizations | 3-4 hours | 🟢 |
| Enhanced documentation | 2 hours | 🟢 |
| **TOTAL** | **15-18 hours** | |

---

## After Completion

### Update README.md

Add to top of README:

```markdown
## Portfolio Highlights

✅ **Accessibility**: WCAG 2.1 compliant with comprehensive ARIA attributes
✅ **Type Safety**: 100% TypeScript with strict mode, zero `any` in production
✅ **Organized Architecture**: Structured component folders with barrel exports
✅ **Security**: CSP headers, HSTS, secure API key management
✅ **Performance**: Optimized bundle, lazy loading, service worker caching
✅ **Professional Documentation**: JSDoc, API docs, contribution guide
````

### Deploy to Vercel

```bash
# Connect to Vercel
vercel

# Deploy to production
vercel --prod
```

### Create Demo Video

Record 2-3 minute walkthrough showing:

1. Child safety mode toggle
2. Search with filters
3. Creating custom watchlist
4. Keyboard navigation
5. Mobile responsive design

---

## Questions or Issues?

If you encounter any problems during implementation:

1. Check the CODE_REVIEW_REPORT.md for detailed context
2. Refer to PROJECT_STRUCTURE_ANALYSIS.md for architecture details
3. Use `git commit` frequently to save progress
4. Test each phase before moving to the next

Good luck! 🚀
