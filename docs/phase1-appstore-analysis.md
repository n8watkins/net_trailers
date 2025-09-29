# Phase 1: AppStore Analysis and Documentation

## Current AppStore Implementation

### ✅ Already Implemented in AppStore

1. **Modal State**
    - `modal: ModalState` - Main content modal
    - `openModal()`, `closeModal()`, `setAutoPlay()`, `setAutoPlayWithSound()`

2. **List Modal State**
    - `listModal: ListModalState` - List selection/management modal
    - `openListModal()`, `closeListModal()`, `setListModalMode()`

3. **Toast State**
    - `toasts: ToastMessage[]` - Toast notifications
    - `showToast()`, `dismissToast()` with auto-dismiss

4. **Search State**
    - `search: SearchState` - Complete search functionality
    - Includes query, results, filters, history, recent searches
    - Full set of search actions

5. **Loading State**
    - `isLoading: boolean`, `loadingMessage?: string`
    - `setLoading()` action

6. **Auth Mode**
    - `authMode: 'login' | 'register' | 'guest'`
    - `setAuthMode()` action

7. **Demo Message & Content Loading**
    - `showDemoMessage: boolean`
    - `contentLoadedSuccessfully: boolean`

### 🔍 Recoil Atoms Still in Use

Based on the `atoms/compat.ts` shim, these atoms are referenced but not fully mapped:

- `movieState` - Selected movie content (DEPRECATED - now in modal.content)
- `autoPlayWithSoundState` - Audio preference (DEPRECATED - now in modal.content.autoPlayWithSound)
- `loadingState` - Global loading (MAPPED to appStore.isLoading)
- `listModalState` - List modal (MAPPED to appStore.listModal)
- `searchState` - Search functionality (MAPPED to appStore.search)

### ⚠️ Missing from Compatibility Shim

The compatibility shim only maps `modalState`. These atoms will crash if accessed:

- `listModalState`
- `searchState`
- `toastsState`
- `loadingState`
- `searchHistoryState`
- `recentSearchesState`

## State Comparison

| Recoil Atom            | AppStore Location                        | Status         |
| ---------------------- | ---------------------------------------- | -------------- |
| modalState             | appStore.modal                           | ✅ Shim exists |
| movieState             | appStore.modal.content                   | ❌ No shim     |
| autoPlayWithSoundState | appStore.modal.content.autoPlayWithSound | ❌ No shim     |
| listModalState         | appStore.listModal                       | ❌ No shim     |
| toastsState            | appStore.toasts                          | ❌ No shim     |
| searchState            | appStore.search                          | ❌ No shim     |
| searchHistoryState     | appStore.search.history                  | ❌ No shim     |
| recentSearchesState    | appStore.search.recentSearches           | ❌ No shim     |
| loadingState           | appStore.isLoading                       | ❌ No shim     |

## Required Actions for Phase 1.5

1. **Extend Compatibility Shim** - Add mappings for all atoms still in use
2. **Fix localStorage persistence** - searchHistory needs localStorage effect
3. **Add missing helper hooks** - Create useModal, useSearch, useToasts hooks
4. **Test all state transitions** - Ensure compatibility layer works correctly

## Components Using Recoil (need migration)

Need to check which components import from 'recoil' directly to understand migration scope.
