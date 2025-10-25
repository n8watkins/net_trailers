# Recoil to Zustand Migration Plan

**Status:** In Progress (Partial Migration with Compatibility Layer)
**Last Updated:** October 24, 2025
**Current Approach:** Hybrid - Using `atoms/compat.ts` shim to bridge Recoil API calls to Zustand stores

---

## Executive Summary

The codebase is currently in a **hybrid state** where:

- **Surface level**: Components use `useRecoilState` and `useRecoilValue` from 'recoil'
- **Under the hood**: A compatibility layer (`atoms/compat.ts`) intercepts these calls and redirects to Zustand stores
- **Actual state**: Lives in 4 Zustand stores (`/stores/*.ts`)
- **Migration status**: ~40% complete - core data management migrated, UI state partially migrated

### Critical Issue: React 19 / Next.js 16 Blocker

⛔ **Recoil was archived on January 1, 2025** and is incompatible with React 19.
⛔ **Next.js 16 requires React 19** - migration MUST be completed before upgrading.

---

## Current Architecture

### Zustand Stores (Active - 4 stores)

| Store            | File                     | Size  | Purpose                                       | Status      |
| ---------------- | ------------------------ | ----- | --------------------------------------------- | ----------- |
| **authStore**    | `stores/authStore.ts`    | 29KB  | Authenticated user data with Firebase sync    | ✅ Complete |
| **guestStore**   | `stores/guestStore.ts`   | 15KB  | Guest user data with localStorage persistence | ✅ Complete |
| **sessionStore** | `stores/sessionStore.ts` | 3.4KB | Session management and user switching         | ✅ Complete |
| **appStore**     | `stores/appStore.ts`     | 12KB  | App-wide state (modals, search, toasts)       | 🟡 Partial  |

**Total Zustand Code:** ~60KB across 4 files

### Recoil Atoms (Legacy - Still in use)

| Atom                     | File                        | Usage Count | Migrated To                                | Can Remove?                      |
| ------------------------ | --------------------------- | ----------- | ------------------------------------------ | -------------------------------- |
| `modalState`             | `atoms/modalAtom.ts`        | ~15 files   | `appStore.modal`                           | 🔴 Via compat.ts only            |
| `movieState`             | `atoms/modalAtom.ts`        | ~10 files   | `appStore.modal.content`                   | 🔴 Via compat.ts only            |
| `autoPlayWithSoundState` | `atoms/modalAtom.ts`        | ~5 files    | `appStore.modal.content.autoPlayWithSound` | 🔴 Via compat.ts only            |
| `listModalState`         | `atoms/listModalAtom.ts`    | ~8 files    | `appStore.listModal`                       | 🔴 Via compat.ts only            |
| `searchState`            | `atoms/searchAtom.ts`       | ~12 files   | `appStore.search`                          | 🔴 Via compat.ts only            |
| `toastsState`            | `atoms/toastAtom.ts`        | ~10 files   | `appStore.toasts`                          | 🔴 Via compat.ts only            |
| `loadingState`           | `atoms/errorAtom.ts`        | ~6 files    | `appStore.isLoading`                       | 🔴 Via compat.ts only            |
| `userSessionState`       | `atoms/userDataAtom.ts`     | ~8 files    | `sessionStore` + `useSessionData()`        | 🟡 Partially - uses old schema   |
| `authSessionState`       | `atoms/authSessionAtom.ts`  | ~5 files    | `authStore`                                | ✅ Yes - but via compat only     |
| `guestSessionState`      | `atoms/guestSessionAtom.ts` | ~5 files    | `guestStore`                               | ✅ Yes - but via compat only     |
| `authModalState`         | `atoms/authModalAtom.ts`    | ~3 files    | None                                       | 🔴 No - still using real Recoil! |
| `errorAtom`              | `atoms/errorAtom.ts`        | ~4 files    | `appStore.isLoading` (partial)             | 🟡 Partial                       |
| `cacheAtom`              | `atoms/cacheAtom.ts`        | ~2 files    | None                                       | 🔴 No migration                  |

**Total Atom Files:** 13 files in `/atoms/` directory

### Compatibility Layer

**File:** `atoms/compat.ts` (252 lines)

**Strategy:** Provides fake Recoil hooks that internally call Zustand:

```typescript
export const useRecoilState = (atom: Symbol) => {
    const appStore = useAppStore()
    const sessionStore = useSessionStore()

    if (atom === modalState) {
        return [appStore.modal, appStore.openModal]
    }
    // ... etc
}
```

**Pros:**

- ✅ Allows incremental migration
- ✅ Components work without changes
- ✅ Reduces risk during migration

**Cons:**

- ⚠️ Adds complexity and indirection
- ⚠️ Still requires `recoil` package dependency
- ⚠️ **CRITICAL**: Recoil package is archived and incompatible with React 19
- ⚠️ Performance overhead from double hook calls
- ⚠️ Confusing for new developers

---

## Files Using Recoil

### Direct Recoil Imports (44 files)

**Atoms (13 files):**

- `atoms/authModalAtom.ts` ⚠️ **STILL USING REAL RECOIL**
- `atoms/authSessionAtom.ts`
- `atoms/cacheAtom.ts` ⚠️ **STILL USING REAL RECOIL**
- `atoms/errorAtom.ts`
- `atoms/guestSessionAtom.ts`
- `atoms/listModalAtom.ts`
- `atoms/modalAtom.ts`
- `atoms/searchAtom.ts`
- `atoms/sessionManagerAtom.ts`
- `atoms/toastAtom.ts`
- `atoms/userDataAtom.ts`

**Components (17 files):**

- `components/ChildSafetyIndicator.tsx`
- `components/DemoMessage.tsx`
- `components/GuestModeNotification.tsx`
- `components/Header.tsx`
- `components/LikeOptions.tsx`
- `components/ListDropdown.tsx`
- `components/ListSelectionModal.tsx`
- `components/Modal.tsx`
- `components/Row.tsx`
- `components/SearchBar.tsx`
- `components/SearchFilters.tsx`
- `components/SearchFiltersDropdown.tsx`
- `components/TutorialModal.tsx`
- `components/UpgradeAccountBanner.tsx`
- `components/WatchLaterButton.tsx`

**Pages (10 files):**

- `pages/_app.tsx`
- `pages/genres/[type]/[id].tsx`
- `pages/hidden.tsx`
- `pages/index.tsx`
- `pages/liked.tsx`
- `pages/movies.tsx`
- `pages/search.tsx`
- `pages/settings.tsx`
- `pages/tv.tsx`
- `pages/watchlists.tsx`

**Hooks (4 files):**

- `hooks/useAuth.tsx`
- `hooks/useAuthData.ts`
- `hooks/useGuestData.ts`
- `hooks/useSearch.ts`
- `hooks/useSessionManager.ts`
- `hooks/useToast.ts`

**Services (1 file):**

- `services/sessionManagerService.ts`

**Tests (2 files):**

- `__tests__/components/Header.test.tsx`
- `__tests__/hooks/useAuth.test.tsx`

---

## Migration Phases Analysis

### ✅ Phase 0-5: COMPLETED

- [x] Created Zustand stores (authStore, guestStore, sessionStore, appStore)
- [x] Migrated core data management
- [x] Built compatibility layer (`compat.ts`)
- [x] Tested hybrid approach
- [x] Migrated user data hooks

### 🟡 Phase 6: IN PROGRESS (Current)

**Goal:** Convert all component imports from `'recoil'` to `'../atoms/compat'`

**Status:** Not started systematically

**Remaining Work:**

- 17 components still import from 'recoil'
- 10 pages still import from 'recoil'
- 6 hooks still import from 'recoil'

### 🔴 Phase 7-9: NOT STARTED

**Phase 7:** Direct Zustand Migration

- Convert components to use Zustand stores directly
- Remove compat.ts dependency layer by layer

**Phase 8:** Remove Recoil Atoms

- Delete unused atom files
- Remove `recoil` from package.json

**Phase 9:** Cleanup & Optimization

- Remove compat.ts entirely
- Optimize Zustand store structure

---

## Atoms Still Using Real Recoil

### ⛔ CRITICAL: authModalAtom.ts

**File:** `atoms/authModalAtom.ts`
**Status:** ❌ Still using real Recoil atom
**Usage:** 3 files (settings.tsx, Header.tsx, \_app.tsx)

**Current Code:**

```typescript
import { atom } from 'recoil'

export const authModalState = atom({
    key: 'authModalState_v1',
    default: { isOpen: false, mode: 'signin' as const },
})
```

**This is NOT in compat.ts** - it's a real Recoil atom that will break with React 19!

**Migration Path:**

1. Add to `appStore.ts` as `authModal` state
2. Add `openAuthModal(mode)` and `closeAuthModal()` actions
3. Update 3 files to use Zustand
4. Remove atom file

### ⛔ CRITICAL: cacheAtom.ts

**File:** `atoms/cacheAtom.ts`
**Status:** ❌ Still using real Recoil atom
**Usage:** 2 files (prefetch logic)

**Migration Path:**

1. Move to `appStore.ts` or create dedicated `cacheStore.ts`
2. Implement cache logic in Zustand with middleware
3. Update usages
4. Remove atom file

---

## Compatibility Layer Issues

### Problems in compat.ts

**Lines 186-188:** ❌ **Type Errors**

```typescript
// These properties don't exist in new schema!
watchlist: sessionData.watchlist,  // ❌ Should be defaultWatchlist
ratings: sessionData.ratings,       // ❌ Removed from new schema
userLists: sessionData.userLists,   // ❌ Should be userCreatedWatchlists
```

**Impact:** Any code still using `userSessionState` through compat layer will receive wrong/missing data.

**Fix Required:**

```typescript
if (atom === userSessionState) {
    return [
        {
            defaultWatchlist: sessionData.defaultWatchlist,
            likedMovies: sessionData.likedMovies,
            hiddenMovies: sessionData.hiddenMovies,
            userCreatedWatchlists: sessionData.userCreatedWatchlists,
        },
        () => {
            console.warn('Use sessionStore actions instead')
        },
    ]
}
```

---

## Recommendations

### 🔴 CRITICAL PRIORITY: Remove Real Recoil Atoms

**Timeline:** MUST complete before Next.js 16 / React 19 upgrade

1. **authModalAtom.ts** (3 files affected)
    - Add to appStore
    - Update: settings.tsx, Header.tsx, \_app.tsx
    - **Effort:** 2 hours

2. **cacheAtom.ts** (2 files affected)
    - Create cacheStore or add to appStore
    - Update prefetch logic
    - **Effort:** 3 hours

### 🟡 HIGH PRIORITY: Fix compat.ts

1. **Fix userSessionState mapping** (lines 186-188)
    - Update to use new schema property names
    - Test all components using this atom
    - **Effort:** 1 hour

2. **Add tests for compat layer**
    - Ensure all atom mappings work correctly
    - **Effort:** 2 hours

### 🟢 MEDIUM PRIORITY: Systematic Component Migration

**Strategy:** Convert imports from `'recoil'` to `'../atoms/compat'` as first step

**Order of Migration:**

1. **Hooks first** (6 files) - Foundation for components
2. **Shared components** (17 files) - Used across pages
3. **Pages** (10 files) - Top-level usage
4. **Tests** (2 files) - Ensure nothing breaks

**Estimated Effort:** 1-2 days (mechanical find-replace work)

### 🟢 LOW PRIORITY (Post-Migration): Direct Zustand Conversion

Once all files use compat.ts, start converting to direct Zustand:

**Phase 1: appStore conversions** (modal, search, toasts, loading)

- Components: Modal.tsx, SearchBar.tsx, Header.tsx
- **Effort:** 3-4 days

**Phase 2: sessionStore conversions** (user data, auth state)

- Components: All user data displays
- **Effort:** 2-3 days

**Phase 3: Remove compat.ts entirely**

- Delete atoms/ directory
- Remove recoil from package.json
- **Effort:** 1 day

---

## What to Keep vs Replace

### ✅ KEEP (Already Migrated to Zustand)

| Feature            | Old (Recoil)                  | New (Zustand)             | Status      |
| ------------------ | ----------------------------- | ------------------------- | ----------- |
| Auth user data     | `authSessionState`            | `authStore`               | ✅ Complete |
| Guest user data    | `guestSessionState`           | `guestStore`              | ✅ Complete |
| Session management | `sessionManagerAtom`          | `sessionStore`            | ✅ Complete |
| User data hooks    | `useAuthData`, `useGuestData` | `useSessionData` + stores | ✅ Complete |

### 🟡 KEEP BUT FIX (Partial Migration)

| Feature       | Old (Recoil)   | New (Zustand)        | Action Needed                                        |
| ------------- | -------------- | -------------------- | ---------------------------------------------------- |
| Modal state   | `modalState`   | `appStore.modal`     | Convert imports to compat.ts, then to direct Zustand |
| Search state  | `searchState`  | `appStore.search`    | Convert imports to compat.ts, then to direct Zustand |
| Toast state   | `toastsState`  | `appStore.toasts`    | Convert imports to compat.ts, then to direct Zustand |
| Loading state | `loadingState` | `appStore.isLoading` | Convert imports to compat.ts, then to direct Zustand |

### 🔴 REPLACE (Still Using Real Recoil)

| Feature     | Current                           | Action Required                          | Priority    |
| ----------- | --------------------------------- | ---------------------------------------- | ----------- |
| Auth modal  | `authModalAtom` (real Recoil)     | Add to `appStore`, update 3 files        | 🔴 CRITICAL |
| Cache       | `cacheAtom` (real Recoil)         | Create `cacheStore` or add to `appStore` | 🔴 CRITICAL |
| Error state | `errorAtom` (partial in appStore) | Fully migrate to `appStore.error`        | 🟡 Medium   |

---

## Migration Roadmap

### Week 1: Critical Blockers

**Day 1-2:** Remove Real Recoil Atoms

- [ ] Migrate `authModalAtom.ts` → `appStore.authModal`
- [ ] Update 3 files using authModalAtom
- [ ] Migrate `cacheAtom.ts` → `cacheStore` or `appStore.cache`
- [ ] Update 2 files using cacheAtom
- [ ] Test auth modal and cache functionality

**Day 3:** Fix compat.ts Issues

- [ ] Fix `userSessionState` mapping (lines 186-188)
- [ ] Add type safety improvements
- [ ] Write tests for compat layer
- [ ] Test all components using compat atoms

**Day 4-5:** Systematic Import Conversion

- [ ] Convert 6 hooks from `'recoil'` → `'../atoms/compat'`
- [ ] Convert 17 components from `'recoil'` → `'../atoms/compat'`
- [ ] Run tests after each batch
- [ ] Fix any breakages

**Weekend:** Testing & Documentation

- [ ] Full regression testing
- [ ] Update this migration plan with progress
- [ ] Document any issues found

### Week 2: Direct Zustand Conversion (Post-Week 1)

**Day 1-3:** appStore Direct Conversion

- [ ] Modal.tsx → direct `useAppStore()`
- [ ] SearchBar.tsx → direct `useAppStore()`
- [ ] Header.tsx → direct `useAppStore()`
- [ ] Toast components → direct `useAppStore()`
- [ ] Remove modal/search/toast from compat.ts

**Day 4-5:** sessionStore Direct Conversion

- [ ] User data displays → direct `useSessionStore()`
- [ ] Auth status components → direct `useAuthStore()`/`useGuestStore()`
- [ ] Remove session atoms from compat.ts

### Week 3: Cleanup

**Day 1-2:** Remove compat.ts

- [ ] Verify no remaining `'../atoms/compat'` imports
- [ ] Delete `atoms/compat.ts`
- [ ] Delete unused atom files
- [ ] Update imports across codebase

**Day 3:** Remove Recoil Dependency

- [ ] Remove `recoil` from `package.json`
- [ ] Run `npm install`
- [ ] Verify build works
- [ ] Run full test suite

**Day 4-5:** Optimization & Documentation

- [ ] Optimize Zustand store structure
- [ ] Add JSDoc comments
- [ ] Update CLAUDE.md with new architecture
- [ ] Create developer guide for Zustand patterns

---

## Risk Assessment

### 🔴 HIGH RISK

1. **React 19 Incompatibility**
    - Recoil archived, no React 19 support
    - **Mitigation:** Complete migration before Next.js 16 upgrade

2. **Auth Modal Breaking**
    - Still using real Recoil atom
    - **Mitigation:** Migrate to appStore immediately

3. **Data Loss from Schema Mismatch**
    - compat.ts returns wrong property names
    - **Mitigation:** Fix userSessionState mapping

### 🟡 MEDIUM RISK

1. **Complexity of compat.ts**
    - Hard to debug issues
    - **Mitigation:** Add comprehensive tests, gradually remove

2. **Performance Overhead**
    - Multiple hook calls per render
    - **Mitigation:** Profile after migration, optimize stores

### 🟢 LOW RISK

1. **Import Conversion**
    - Mechanical find-replace work
    - **Mitigation:** Automated scripts, careful testing

2. **Store Structure Changes**
    - Well-defined Zustand patterns
    - **Mitigation:** Follow existing store patterns

---

## Testing Strategy

### Unit Tests

- [ ] Test each Zustand store in isolation
- [ ] Test compat.ts atom mappings
- [ ] Test hooks that use stores

### Integration Tests

- [ ] Test user flows (auth, guest mode, data persistence)
- [ ] Test modal interactions
- [ ] Test search functionality
- [ ] Test toast notifications

### E2E Tests

- [ ] Full user journey (signup → use app → logout)
- [ ] Guest mode → account creation → data migration
- [ ] Multi-session scenarios

### Manual Testing Checklist

- [ ] Auth modal (signup, signin, forgot password)
- [ ] Guest mode functionality
- [ ] Watchlist add/remove
- [ ] Liked movies add/remove
- [ ] Hidden content
- [ ] Custom lists creation
- [ ] Search with filters
- [ ] Modal video playback
- [ ] Toast notifications (all types)
- [ ] Settings page (all sections)
- [ ] User data export
- [ ] Account deletion

---

## Success Criteria

### Must Have (Blocker for Next.js 16)

- [x] All 4 Zustand stores functional
- [ ] Zero real Recoil atoms remaining
- [ ] All components using compat.ts or direct Zustand
- [ ] `recoil` package removed from dependencies
- [ ] All tests passing
- [ ] No runtime errors in dev/prod

### Should Have

- [ ] compat.ts removed entirely
- [ ] Direct Zustand usage in all components
- [ ] Performance benchmarks improved
- [ ] Developer documentation updated

### Nice to Have

- [ ] Zustand devtools integration
- [ ] Store optimization (selectors, middleware)
- [ ] Migration guide for future developers

---

## Estimated Total Effort

| Phase                     | Tasks                                           | Time Estimate         |
| ------------------------- | ----------------------------------------------- | --------------------- |
| Week 1: Critical fixes    | Remove real Recoil, fix compat, convert imports | 5 days                |
| Week 2: Direct conversion | Convert to direct Zustand                       | 5 days                |
| Week 3: Cleanup           | Remove compat, remove Recoil, optimize          | 5 days                |
| **Total**                 | **Complete migration**                          | **15 days (3 weeks)** |

**With testing and buffer:** 4 weeks total

---

## Next Steps

### Immediate (This Week)

1. **Fix compat.ts Type Errors** ⚠️
    - Lines 186-188: Update userSessionState mapping
    - Add proper TypeScript types
    - Test all components using this atom

2. **Migrate authModalAtom** 🔴
    - Add to appStore
    - Update 3 files
    - Delete atom file

3. **Migrate cacheAtom** 🔴
    - Create cacheStore or add to appStore
    - Update 2 files
    - Delete atom file

### Short Term (Next 2 Weeks)

4. **Convert All Imports to compat.ts**
    - Systematically update 33 files
    - Use find-replace scripts
    - Test after each batch

5. **Begin Direct Zustand Conversion**
    - Start with appStore (modal, search, toasts)
    - Convert 5-10 components per day
    - Remove from compat.ts incrementally

### Long Term (Week 3-4)

6. **Remove compat.ts Entirely**
    - Verify no remaining usage
    - Delete file and unused atoms
    - Remove Recoil dependency

7. **Polish & Optimize**
    - Zustand devtools
    - Performance optimization
    - Documentation

---

## Conclusion

The migration is **50% complete** with core data management in Zustand but UI state still transitioning. The **critical blocker** is 2 atoms still using real Recoil (`authModalAtom`, `cacheAtom`) which will break with React 19.

**Recommended Approach:**

1. ✅ **Week 1**: Fix critical issues (real Recoil atoms, compat.ts bugs)
2. ✅ **Week 2**: Convert all imports to compat.ts (low risk)
3. ✅ **Week 3**: Direct Zustand conversion (medium risk)
4. ✅ **Week 4**: Cleanup and optimize

**This migration MUST be completed before upgrading to Next.js 16 / React 19.**
