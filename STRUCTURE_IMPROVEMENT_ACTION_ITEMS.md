# Project Structure Improvement Action Items

This document provides a prioritized checklist for improving the NetTrailers project structure for maximum portfolio impact.

## Phase 1: Critical Fixes (2-3 hours)

### 1. Resolve Type Definition Duplication

**Status:** TODO
**Time:** 2-3 hours
**Impact:** HIGH - Prevents code quality concerns in portfolio reviews

**Problem:**

- `types/shared.ts` defines UserPreferences (OLD SCHEMA)
- `types/userData.ts` defines UserPreferences (NEW SCHEMA)
- Codebase imports from both locations
- Unclear which is canonical

**Solution:**

```bash
1. Review both files and decide which is correct
2. Keep the correct one (likely types/userData.ts)
3. Delete the duplicate
4. Find all imports and update:
   grep -r "from.*types/shared" --include="*.ts" --include="*.tsx"
   grep -r "from.*types/userData" --include="*.ts" --include="*.tsx"
5. Standardize on single import path
6. Test to ensure nothing breaks
```

**Files to check:**

- `/types/shared.ts` (has lastSyncedAt, createdAt)
- `/types/userData.ts` (labeled as "NEW SCHEMA")
- All files importing UserPreferences

---

## Phase 2: Portfolio Improvements (5-6 hours)

### 2. Organize Components by Type

**Status:** TODO
**Time:** 3-4 hours
**Impact:** CRITICAL - Shows architectural thinking to reviewers

**Problem:**

- 63 components in flat folder structure
- Hard to navigate for code reviewers
- Shows lack of organization/planning

**Solution:**

```bash
# Create new structure
mkdir -p components/{modals,ui,layout,forms,features,utilities,debug}

# Move files (use git mv for version control)
git mv components/AboutModal.tsx components/modals/
git mv components/AuthModal.tsx components/modals/
git mv components/ColorPickerModal.tsx components/modals/
# ... (continue for all 11 modal components)

git mv components/ContentCard.tsx components/ui/
git mv components/ContentImage.tsx components/ui/
# ... (continue for all 12 UI components)

git mv components/Header.tsx components/layout/
git mv components/Footer.tsx components/layout/
git mv components/Layout.tsx components/layout/
# ... (continue for layout components)

# Similar for forms, features, utilities, debug

# Create components/index.ts with barrel exports
# Update all imports in pages and other components
```

**Component Distribution (from report):**

- `modals/` - 11 components (AboutModal, AuthModal, ColorPickerModal, etc.)
- `ui/` - 12 components (ContentCard, Row, Banner, etc.)
- `layout/` - 4 components (Header, Footer, Layout, etc.)
- `forms/` - 5 components (SearchBar, GenresDropdown, etc.)
- `features/` - 20 components (VideoPlayer, AccountManagement, etc.)
- `utilities/` - 10 components (Analytics, ErrorBoundary, Toast, etc.)
- `debug/` - 6 components (AuthFlowDebugger, DebugControls, etc.)

**After reorganization:**

```typescript
// Before
import Header from '../components/Header'
import ContentCard from '../components/ContentCard'
import Modal from '../components/Modal'

// After
import { Header, Footer, Layout } from '../components/layout'
import { ContentCard, Row, Banner } from '../components/ui'
import { Modal, AuthModal } from '../components/modals'
```

---

### 3. Create Barrel Export Files

**Status:** TODO
**Time:** 1-2 hours
**Impact:** MEDIUM - Improves import cleanliness

**Files to create:**

**components/index.ts**

```typescript
// Layout
export { default as Header } from './layout/Header'
export { default as Footer } from './layout/Footer'
export { default as Layout } from './layout/Layout'

// Modals
export { default as Modal } from './modals/Modal'
export { default as AuthModal } from './modals/AuthModal'
// ... etc

// UI
export { default as ContentCard } from './ui/ContentCard'
export { default as Row } from './ui/Row'
// ... etc
```

**types/index.ts**

```typescript
export type { Content, Movie, TVShow, BaseContent } from '../typings'
export type { UserPreferences, UserSession, SessionType } from './userData'
export type { UserList, UserListItem } from './userLists'
export type { StateWithLists, StateWithPreferences } from './storeInterfaces'
```

**stores/index.ts**

```typescript
export { useAppStore } from './appStore'
export { useSessionStore } from './sessionStore'
export { useAuthStore } from './authStore'
export { useGuestStore } from './guestStore'
export { useCacheStore } from './cacheStore'
export { useSearchStore } from './searchStore'
```

**services/index.ts**

```typescript
export { AuthStorageService } from './authStorageService'
export { UserDataService } from './userDataService'
export { SessionManagerService } from './sessionManagerService'
// ... etc
```

**utils/index.ts**

```typescript
export { createErrorHandler } from './errorHandler'
export { filterContentByAdultFlag } from './contentFilter'
export { debounce } from './debounce'
// ... export commonly used utilities
```

---

### 4. Add Key Test Coverage

**Status:** TODO
**Time:** 3 hours
**Impact:** MEDIUM - Shows testing discipline

**Priority tests to add:**

**appStore.test.ts** (1 hour)

```typescript
describe('appStore', () => {
  it('should open/close modal', () => { ... })
  it('should add toast notification', () => { ... })
  it('should respect MAX_TOASTS limit', () => { ... })
  it('should set search state', () => { ... })
})
```

**sessionStore.test.ts** (45 min)

```typescript
describe('sessionStore', () => {
  it('should initialize guest session', () => { ... })
  it('should initialize auth session', () => { ... })
  it('should switch from guest to auth', () => { ... })
})
```

**API routes tests** (1.5 hours)

```typescript
// __tests__/api/search.test.ts
// __tests__/api/movies/trending.test.ts
// __tests__/api/tv/trending.test.ts
```

---

## Phase 3: Documentation Polish (4-5 hours)

### 5. Add JSDoc Comments

**Status:** TODO
**Time:** 4-5 hours
**Impact:** MEDIUM - Shows professional practices

**Priority areas:**

1. All Zustand store actions (appStore, sessionStore, etc.)
2. All custom hooks
3. All utility functions
4. All service methods

**Example:**

```typescript
/**
 * Opens the content modal for watching trailers
 * @param content - The movie or TV show to display
 * @param autoPlay - Whether to auto-play the trailer
 * @param autoPlayWithSound - Whether to play with sound or muted
 * @throws Will handle errors internally and show toast
 */
export const openModal = (content: Content, autoPlay?: boolean, autoPlayWithSound?: boolean) => {
    // ...
}
```

---

## Phase 4: Optional Improvements (2-10 hours)

### 6. Consolidate Duplicate Hooks

**Status:** TODO (lower priority)
**Time:** 3-4 hours
**Impact:** LOW - Code cleanliness

**Current duplicates:**

- `useAuthData.ts` + `useGuestData.ts` → merge into `useUserData.ts`
- `useAuthStatus.ts` → already good
- 5 SSR/hydration hooks → consolidate to 1-2

**Before:**

```typescript
const { userId, loading } = useAuthData()
const { guestId, loading } = useGuestData()
```

**After:**

```typescript
const { userId, guestId, isGuest, isAuthenticated, loading } = useUserData()
```

---

### 7. Add API Response Types

**Status:** TODO (lower priority)
**Time:** 2-3 hours
**Impact:** LOW - Type safety improvement

**Create:** `types/api.ts`

```typescript
export interface SearchResponse {
    page: number
    results: Content[]
    total_pages: number
    total_results: number
}

export interface MovieDetailsResponse extends Movie {
    credits?: Credits
    release_dates?: ReleaseDateResult[]
}
```

---

### 8. Organize Utilities into Subfolders

**Status:** TODO (lower priority)
**Time:** 2-3 hours
**Impact:** LOW - Better organization

**Proposed structure:**

```
utils/
├── api/              # TMDB API, requests
│   ├── tmdbApi.ts
│   └── requests.ts
├── cache/            # All caching logic
│   ├── apiCache.ts
│   ├── authCache.ts
│   ├── cacheManager.ts
│   └── prefetchCache.ts
├── filter/           # Content filtering
│   ├── contentFilter.ts
│   ├── contentRatings.ts
│   └── tvContentRatings.ts
├── debug/            # Debug utilities only
│   ├── debugLogger.ts
│   ├── childSafetyDebug.ts
│   └── hydrationDebug.ts
├── common/           # Shared utilities
│   ├── debounce.ts
│   ├── errorHandler.ts
│   ├── csvExport.ts
│   └── firstVisitTracker.ts
└── index.ts          # Barrel export
```

---

## Implementation Checklist

### Critical (MUST DO)

- [ ] Phase 1.1: Resolve UserPreferences duplication
    - [ ] Review types/shared.ts vs types/userData.ts
    - [ ] Delete duplicate file
    - [ ] Update all imports
    - [ ] Test app runs without errors

### High Priority (SHOULD DO)

- [ ] Phase 2.1: Reorganize components folder
    - [ ] Create subfolders (modals, ui, layout, etc.)
    - [ ] Move all component files
    - [ ] Update all imports in pages/
    - [ ] Update all imports in hooks/
    - [ ] Test app runs and builds

- [ ] Phase 2.2: Create barrel export files
    - [ ] Create components/index.ts
    - [ ] Create types/index.ts
    - [ ] Create stores/index.ts
    - [ ] Update imports throughout codebase

- [ ] Phase 2.3: Add key tests
    - [ ] Write appStore.test.ts
    - [ ] Write sessionStore.test.ts
    - [ ] Write API route tests
    - [ ] Verify all tests pass

### Medium Priority (NICE TO HAVE)

- [ ] Phase 3.1: Add JSDoc comments
    - [ ] Document appStore actions
    - [ ] Document all hooks
    - [ ] Document utility functions
    - [ ] Verify TypeScript compilation

### Lower Priority (OPTIONAL)

- [ ] Phase 4.1: Consolidate duplicate hooks
- [ ] Phase 4.2: Add API response types
- [ ] Phase 4.3: Organize utilities into subfolders

---

## Testing the Changes

After each phase:

```bash
# Type check
npm run type-check

# Build
npm run build

# Tests
npm test

# Lint
npm run lint:fix
```

---

## Git Commit Strategy

### For Component Reorganization:

```bash
git mv components/Header.tsx components/layout/Header.tsx
git commit -m "refactor: organize components by type (layout)"
# ... continue for other categories

git add components/index.ts
git commit -m "refactor: add barrel export for components"

git add pages/ hooks/ stores/
git commit -m "refactor: update imports after component reorganization"
```

### For Type Consolidation:

```bash
git rm types/shared.ts
git add types/userData.ts
git commit -m "fix: consolidate duplicate UserPreferences definitions"

# Find and update imports
git add .
git commit -m "fix: update imports to use canonical type definitions"
```

### For Tests:

```bash
git add __tests__/stores/
git commit -m "test: add comprehensive tests for appStore and sessionStore"
```

### For Barrel Exports:

```bash
git add components/index.ts types/index.ts stores/index.ts
git commit -m "refactor: add barrel export files for cleaner imports"

git add pages/ hooks/
git commit -m "refactor: update imports to use barrel exports"
```

---

## Success Metrics

After implementing all changes:

| Metric                      | Before          | Target                   | Status |
| --------------------------- | --------------- | ------------------------ | ------ |
| Code Organization Score     | 6/10            | 9/10                     |        |
| Component Organization      | Flat (1 folder) | Organized (7 subfolders) |        |
| Test Coverage               | ~5%             | 40%+                     |        |
| Type Definition Duplication | 2 locations     | 1 location               |        |
| Import Clarity              | Scattered       | Barrel exports           |        |
| JSDoc Coverage              | ~20%            | ~80%                     |        |
| Overall Portfolio Score     | 7.3/10          | 8.5/10                   |        |

---

## Estimated Timeline

| Phase                   | Effort        | Days         | Priority |
| ----------------------- | ------------- | ------------ | -------- |
| Phase 1 (Critical)      | 2-3 hrs       | 1 day        | MUST     |
| Phase 2 (High)          | 5-6 hrs       | 1-2 days     | SHOULD   |
| Phase 3 (Documentation) | 4-5 hrs       | 1-2 days     | NICE     |
| Phase 4 (Optional)      | 8-10 hrs      | 2-3 days     | LATER    |
| **TOTAL**               | **20-24 hrs** | **5-8 days** |          |

**Recommended:** Focus on Phases 1-3 (11-14 hours, 3-4 days) for portfolio-ready status.

---

## Notes

- Each item has been estimated based on project analysis
- Times assume familiar with the codebase
- Tests assume good testing practices already established
- Component reorganization is best done in focused session
- Consider pair programming for complex refactoring
- Remember to commit frequently during reorganization
