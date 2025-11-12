# Store Migration Plan - useAppStore → Focused Stores

**Date**: 2025-11-12
**Status**: In Progress
**Priority**: 🔴 Critical (9/10)

---

## Overview

The `useAppStore` has been deprecated and split into focused stores for better performance. Currently **20 files** still use the deprecated store, causing unnecessary re-renders.

### Performance Impact

**Problem**: Using `useAppStore` subscribes to ALL state changes:

```tsx
// ❌ Re-renders when ANY state changes (modal, toast, loading, UI)
const { showToast } = useAppStore()
```

**Solution**: Use focused stores for specific state:

```tsx
// ✅ Only re-renders when toast state changes
const { showToast } = useToastStore()
```

---

## Focused Stores Available

| Store              | Purpose                | Key Actions                                      |
| ------------------ | ---------------------- | ------------------------------------------------ |
| `modalStore`       | All modal state        | `openModal`, `closeModal`, `openListModal`, etc. |
| `toastStore`       | Toast notifications    | `showToast`, `dismissToast`                      |
| `loadingStore`     | Global loading state   | `setLoading`                                     |
| `uiStore`          | Misc UI state          | `setAuthMode`, `setShowDemoMessage`              |
| `searchStore`      | Search functionality   | Search-related actions                           |
| `childSafetyStore` | Child safety filtering | Safety-related actions                           |

---

## Migration Mapping

### Modal Actions → `useModalStore`

```tsx
// BEFORE
import { useAppStore } from '@/stores/appStore'
const { openModal, closeModal, modal } = useAppStore()

// AFTER
import { useModalStore } from '@/stores/modalStore'
const { openModal, closeModal, modal } = useModalStore()
```

### Toast Actions → `useToastStore`

```tsx
// BEFORE
import { useAppStore } from '@/stores/appStore'
const { showToast } = useAppStore()

// AFTER
import { useToastStore } from '@/stores/toastStore'
const { showToast } = useToastStore()
```

### Loading Actions → `useLoadingStore`

```tsx
// BEFORE
import { useAppStore } from '@/stores/appStore'
const { setLoading, isLoading } = useAppStore()

// AFTER
import { useLoadingStore } from '@/stores/loadingStore'
const { setLoading, isLoading } = useLoadingStore()
```

### UI Actions → `useUIStore`

```tsx
// BEFORE
import { useAppStore } from '@/stores/appStore'
const { authMode, setAuthMode, showDemoMessage } = useAppStore()

// AFTER
import { useUIStore } from '@/stores/uiStore'
const { authMode, setAuthMode, showDemoMessage } = useUIStore()
```

---

## Files to Migrate (20 files)

### Priority 1: High-Traffic Components (Migrate First)

#### 1. `components/content/Row.tsx`

**Usage**: `openRowEditorModal`
**Migration**: `useModalStore()`
**Impact**: HIGH - Row components are used extensively

#### 2. `components/layout/Header.tsx`

**Usage**: Multiple modal actions
**Migration**: `useModalStore()`
**Impact**: HIGH - Rendered on every page

#### 3. `components/common/ContentCard.tsx`

**Usage**: `openModal`
**Migration**: `useModalStore()`
**Impact**: HIGH - Rendered for every content item

#### 4. `components/modals/Modal.tsx`

**Usage**: `modal`, `closeModal`
**Migration**: `useModalStore()`
**Impact**: HIGH - Core modal component

#### 5. `components/search/SearchBar.tsx`

**Usage**: Modal actions
**Migration**: `useModalStore()`
**Impact**: HIGH - Search is frequently used

### Priority 2: Modal Components

#### 6. `components/modals/ListSelectionModal.tsx`

**Usage**: `listModal`, `closeListModal`
**Migration**: `useModalStore()`
**Impact**: MEDIUM

#### 7. `components/modals/CollectionCreatorModal.tsx`

**Usage**: `collectionCreatorModal`, modal actions
**Migration**: `useModalStore()`
**Impact**: MEDIUM

#### 8. `components/modals/CollectionBuilderModal.tsx`

**Usage**: Modal actions
**Migration**: `useModalStore()`
**Impact**: MEDIUM

#### 9. `components/modals/TutorialModal.tsx`

**Usage**: Modal actions
**Migration**: `useModalStore()`
**Impact**: LOW

### Priority 3: Page Components

#### 10. `components/pages/HomeClient.tsx`

**Usage**: `isLoading`
**Migration**: `useLoadingStore()`
**Impact**: MEDIUM

#### 11. `app/rows/page.tsx`

**Usage**: `showToast`, `setLoading`, `openCustomRowModal`
**Migration**: `useToastStore()`, `useLoadingStore()`, `useModalStore()`
**Impact**: MEDIUM

#### 12. `components/layout/Banner.tsx`

**Usage**: `modal`
**Migration**: `useModalStore()`
**Impact**: MEDIUM

### Priority 4: UI Components

#### 13. `components/layout/ClientLayout.tsx`

**Usage**: `authMode`
**Migration**: `useUIStore()`
**Impact**: MEDIUM

#### 14. `components/auth/UpgradeAccountBanner.tsx`

**Usage**: UI state
**Migration**: `useUIStore()`
**Impact**: LOW

#### 15. `components/utility/PostHydrationEffects.tsx`

**Usage**: `showDemoMessage`, `setShowDemoMessage`
**Migration**: `useUIStore()`
**Impact**: LOW

### Priority 5: Content Actions

#### 16. `components/content/ListDropdown.tsx`

**Usage**: `openListModal`
**Migration**: `useModalStore()`
**Impact**: MEDIUM

#### 17. `components/content/SimpleLikeButton.tsx`

**Usage**: Modal actions
**Migration**: `useModalStore()`
**Impact**: MEDIUM

#### 18. `components/content/LikeOptions.tsx`

**Usage**: `modal`, `showDemoMessage`, `setShowDemoMessage`
**Migration**: `useModalStore()`, `useUIStore()`
**Impact**: MEDIUM

#### 19. `components/content/ChildSafetyIndicator.tsx`

**Usage**: Various
**Migration**: TBD
**Impact**: LOW

### Priority 6: Search Components

#### 20. `components/search/SearchResults.tsx`

**Usage**: Modal actions
**Migration**: `useModalStore()`
**Impact**: MEDIUM

#### 21. `components/smartSearch/SmartSearchActions.tsx`

**Usage**: `setLoading`
**Migration**: `useLoadingStore()`
**Impact**: LOW

---

## Migration Strategy

### Phase 1: High-Traffic Components (Week 1)

Migrate the 5 highest-traffic components first for maximum performance impact:

1. ContentCard.tsx
2. Row.tsx
3. Header.tsx
4. Modal.tsx
5. SearchBar.tsx

**Expected Impact**: 60-70% of unnecessary re-renders eliminated

### Phase 2: Modal Components (Week 1-2)

Migrate all modal-related components:

- ListSelectionModal.tsx
- CollectionCreatorModal.tsx
- CollectionBuilderModal.tsx
- TutorialModal.tsx

### Phase 3: Page & UI Components (Week 2)

Migrate remaining page and UI components:

- HomeClient.tsx
- ClientLayout.tsx
- Banner.tsx
- UpgradeAccountBanner.tsx
- PostHydrationEffects.tsx

### Phase 4: Content & Search Components (Week 2)

Complete migration of content interaction and search components:

- ListDropdown.tsx
- SimpleLikeButton.tsx
- LikeOptions.tsx
- SearchResults.tsx
- SmartSearchActions.tsx
- ChildSafetyIndicator.tsx

### Phase 5: Testing & Cleanup (Week 2-3)

1. Test all migrated components
2. Add ESLint rule to prevent useAppStore usage
3. Update documentation
4. (Optional) Remove useAppStore backward compatibility

---

## ESLint Rule Configuration

Add to `.eslintrc.json`:

```json
{
    "rules": {
        "no-restricted-imports": [
            "error",
            {
                "paths": [
                    {
                        "name": "@/stores/appStore",
                        "importNames": ["useAppStore"],
                        "message": "useAppStore is deprecated. Use focused stores instead: useModalStore, useToastStore, useLoadingStore, useUIStore"
                    }
                ]
            }
        ]
    }
}
```

---

## Testing Checklist

For each migrated component:

- [ ] Import statements updated
- [ ] No TypeScript errors
- [ ] Component renders correctly
- [ ] Actions work as expected
- [ ] No performance regressions
- [ ] ESLint passes

---

## Performance Metrics

### Before Migration

- Components subscribe to all state changes
- Unnecessary re-renders across the app
- Larger bundle size due to monolithic store

### After Migration (Expected)

- Components only subscribe to needed state
- 60-70% reduction in unnecessary re-renders
- Better code splitting potential
- Improved developer experience (clearer dependencies)

---

## Component Splitting Integration

Some components need both migration AND splitting:

1. **ListSelectionModal.tsx** (1,001 lines, 345 duplicated)
    - Migrate to `useModalStore()`
    - Split into smaller components
    - Eliminate code duplication

2. **Modal.tsx** (949 lines)
    - Migrate to `useModalStore()`
    - Split by feature (video player, info sections, etc.)

3. **Header.tsx** (652 lines)
    - Migrate to `useModalStore()`
    - Split into mobile/desktop variants

4. **SearchBar.tsx** (602 lines)
    - Migrate to `useModalStore()`
    - Extract voice search functionality

---

## Rollback Plan

If migration causes issues:

1. `useAppStore` maintains backward compatibility
2. Can revert individual component changes
3. Old imports will continue to work
4. No database/state schema changes required

---

## Success Criteria

Migration is successful when:

- ✅ All 20 files migrated to focused stores
- ✅ ESLint rule prevents new useAppStore usage
- ✅ All tests pass
- ✅ No performance regressions
- ✅ Lighthouse scores improve or maintain
- ✅ Developer experience improved (clearer code)

---

**Estimated Effort**: 2-3 weeks
**Risk Level**: LOW (backward compatible)
**Performance Impact**: HIGH (60-70% reduction in re-renders)
