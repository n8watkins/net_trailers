# Phase 2: Helper Hooks Documentation

## Overview

Phase 2 created direct Zustand hooks that provide clean APIs for components to use instead of Recoil atoms. These hooks are the bridge for migrating components away from Recoil.

## New Hooks Created

### 1. `useModal` (/hooks/useModal.ts)

Direct replacement for modal-related Recoil atoms.

**Replaces:**

- `modalState` atom
- `movieState` atom
- `autoPlayWithSoundState` atom

**Usage Example:**

```typescript
// Before (Recoil)
const [modalOpen, setModalOpen] = useRecoilState(modalState)
const [movie, setMovie] = useRecoilState(movieState)
const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)

// After (Zustand)
import { useModal } from '@/hooks/useModal'
const { isOpen, content, openModal, closeModal, openWithSound } = useModal()
```

**Key Features:**

- `isOpen` - Boolean for modal visibility
- `content` - The current content in modal
- `openModal(content, autoPlay?, autoPlayWithSound?)` - Open with options
- `openWithSound(content)` - Convenience method for playing with sound
- `openMuted(content)` - Convenience method for muted playback

### 2. `useSearchDirect` (/hooks/useSearchDirect.ts)

Direct Zustand access for search functionality.

**Replaces:**

- `searchState` atom
- `searchHistoryState` atom
- `recentSearchesState` atom

**Usage Example:**

```typescript
// Before (Recoil)
const [searchState, setSearchState] = useRecoilState(searchState)
const [history, setHistory] = useRecoilState(searchHistoryState)

// After (Zustand)
import { useSearchDirect } from '@/hooks/useSearchDirect'
const { query, results, setSearchQuery, addToSearchHistory, hasResults } = useSearchDirect()
```

**Key Features:**

- All search state properties directly accessible
- Helper methods like `resetSearch()`, `updateFilters()`
- Computed properties: `hasResults`, `isSearching`, `hasActiveFilters`
- LocalStorage persistence for search history built-in

### 3. `useToastDirect` (/hooks/useToastDirect.ts)

Direct Zustand access for toast notifications.

**Replaces:**

- `toastsState` atom

**Usage Example:**

```typescript
// Before (Recoil)
import { useToast } from '@/hooks/useToast' // Used Recoil internally
const { showSuccess, showError } = useToast()

// After (Zustand)
import { useToastDirect } from '@/hooks/useToastDirect'
const { showSuccess, showError, showWatchlistAdd } = useToastDirect()
```

**Key Features:**

- Same API as existing `useToast` for easy migration
- All toast types supported: success, error, watchlist-add/remove, content-hidden/shown
- Helper properties: `hasToasts`, `latestToast`
- Auto-dismiss handled by appStore (5 seconds)

### 4. `useListModal` (/hooks/useListModal.ts)

Direct Zustand access for list selection modal.

**Replaces:**

- `listModalState` atom

**Usage Example:**

```typescript
// Before (Recoil)
const [listModal, setListModal] = useRecoilState(listModalState)

// After (Zustand)
import { useListModal } from '@/hooks/useListModal'
const { isOpen, content, mode, openForContent, openForManage, close } = useListModal()
```

**Key Features:**

- Mode-specific openers: `openForContent()`, `openForManage()`, `openForCreate()`
- State checks: `isAddMode`, `isManageMode`, `isCreateMode`
- Content validation: `isOpenWithContent(content)`

## Migration Strategy

### Step 1: Import New Hook

Replace Recoil imports with new Zustand hooks:

```typescript
// Remove
import { useRecoilState } from 'recoil'
import { modalState } from '@/atoms/modalAtom'

// Add
import { useModal } from '@/hooks/useModal'
```

### Step 2: Update Hook Usage

Replace Recoil hook calls with new API:

```typescript
// Remove
const [isOpen, setIsOpen] = useRecoilState(modalState)

// Add
const { isOpen, setModalState } = useModal()
```

### Step 3: Update State Updates

Adapt state update patterns:

```typescript
// Remove
setModalState(true)
setMovie(content)

// Add
openModal(content)
```

## Testing Checklist

✅ **TypeScript Compilation**

- All hooks compile without errors
- Type exports available for components

✅ **API Compatibility**

- Hooks provide equivalent functionality to Recoil atoms
- Backward-compatible methods included where needed

✅ **State Management**

- State updates propagate correctly
- No unnecessary re-renders
- LocalStorage persistence working (search history)

## Benefits of New Hooks

1. **Performance**: Direct Zustand access avoids compatibility layer overhead
2. **Type Safety**: Full TypeScript support with exported types
3. **Developer Experience**: Cleaner API with convenience methods
4. **Migration Path**: Gradual component-by-component migration possible
5. **Testing**: Easier to test without Recoil providers

## Next Steps

With these helper hooks in place, we can now:

1. Start migrating individual components to use new hooks
2. Remove Recoil dependencies from migrated components
3. Eventually remove compatibility shim once all components migrated
4. Delete unused Recoil atoms

## Files Created in Phase 2

- `/hooks/useModal.ts` - Modal state management
- `/hooks/useSearchDirect.ts` - Search functionality
- `/hooks/useToastDirect.ts` - Toast notifications
- `/hooks/useListModal.ts` - List modal management

## Migration Priority

High priority components to migrate first:

1. Modal.tsx - Uses modal state heavily
2. SearchBar.tsx - Core search functionality
3. Toast/ToastContainer - Notification system
4. ListSelectionModal.tsx - List management

These hooks provide the foundation for Phase 3: Migrating critical components.
