# Complete Recoil to Zustand Migration Plan - Phased Implementation

## 🎯 Objective

Completely remove Recoil from the codebase and migrate all state management to Zustand

## 📊 Current State Analysis

### Components Still Using Recoil (22 total)

- **Modal System**: 8 components
- **Search System**: 2 components
- **List Management**: 3 components
- **Others**: 9 components

### Risk Assessment

- **HIGH RISK**: Compatibility shim only handles modalState - other atoms will crash
- **MEDIUM RISK**: 15+ zombie dev servers running
- **LOW RISK**: Some TypeScript errors in test files

---

## 📋 PHASE 1: Foundation & Preparation

**Duration: 1-2 hours**
**Risk: Low**

### Step 1.1: Environment Cleanup

```bash
# Kill all zombie dev servers
pkill -f "npm run dev"
pkill -f "next dev"

# Verify no servers running
ps aux | grep "next dev"
```

### Step 1.2: Create Backup Branch

```bash
git add .
git commit -m "Pre-Recoil migration checkpoint"
git checkout -b recoil-migration-backup
git checkout main
git checkout -b feature/complete-recoil-migration
```

### Step 1.3: Analyze Current appStore

- [ ] Read current appStore implementation
- [ ] List what's already implemented
- [ ] Identify what's missing
- [ ] Check for any coupling issues

### Step 1.4: Document Current Behavior

Create test checklist:

- [ ] Modal opens when clicking movie/show
- [ ] Modal closes with X button
- [ ] Modal closes with ESC key
- [ ] Search filters work
- [ ] List dropdown opens
- [ ] List selection modal works
- [ ] Autoplay setting persists

### ✅ PHASE 1 TEST CHECKPOINT

- [ ] Clean git status
- [ ] No dev servers running
- [ ] Test checklist documented
- [ ] Current functionality verified and working

---

## 📋 PHASE 2: Complete appStore Implementation

**Duration: 2-3 hours**
**Risk: Low-Medium**

### Step 2.1: Enhance appStore Schema

```typescript
// stores/appStore.ts

interface AppState {
    // Modal Management
    modal: {
        isOpen: boolean
        content: Content | null
    }
    currentContent: Content | null // Replaces movieState
    autoPlayWithSound: boolean // Replaces autoPlayWithSoundState

    // List Modal
    listModal: {
        isOpen: boolean
        content: Content | null
    }

    // Search Filters
    searchFilters: {
        genre: number | null
        year: string | null
        sortBy: 'popularity' | 'vote_average' | 'release_date'
        mediaType: 'all' | 'movie' | 'tv'
        minRating?: number
    }

    // Toast/Notifications (already exists)
    toast: ToastState | null
}

interface AppActions {
    // Modal Actions
    openModal: (content: Content, autoPlay?: boolean) => void
    closeModal: () => void
    setCurrentContent: (content: Content | null) => void
    setAutoPlayWithSound: (value: boolean) => void

    // List Modal Actions
    openListModal: (content: Content) => void
    closeListModal: () => void

    // Search Actions
    updateSearchFilters: (filters: Partial<SearchFilters>) => void
    resetSearchFilters: () => void

    // Existing toast actions...
}
```

### Step 2.2: Implement Missing Actions

- [ ] Add currentContent state and setters
- [ ] Add autoPlayWithSound state and setters
- [ ] Add listModal state and actions
- [ ] Add searchFilters state and actions
- [ ] Ensure all state updates are immutable

### Step 2.3: Update Compatibility Shim (Temporary)

```typescript
// atoms/compat.ts
// Map ALL atoms to appStore to prevent crashes
export const useRecoilState = (atom: any) => {
    const store = useAppStore()

    if (atom === modalState) {
        return [
            store.modal.isOpen,
            (open: boolean) => (open ? store.openModal(store.currentContent) : store.closeModal()),
        ]
    }

    if (atom === movieState) {
        return [store.currentContent, store.setCurrentContent]
    }

    if (atom === autoPlayWithSoundState) {
        return [store.autoPlayWithSound, store.setAutoPlayWithSound]
    }

    if (atom === listModalState) {
        return [
            store.listModal.isOpen,
            (open: boolean) =>
                open ? store.openListModal(store.listModal.content) : store.closeListModal(),
        ]
    }

    if (atom === searchState) {
        return [store.searchFilters, store.updateSearchFilters]
    }

    // Default fallback
    console.warn(`Unmapped atom in compatibility shim:`, atom)
    return [null, () => {}]
}
```

### ✅ PHASE 2 TEST CHECKPOINT

```bash
npm run type-check  # Should not increase errors
npm run dev         # Start dev server
```

- [ ] Modal still opens/closes
- [ ] No console errors about unmapped atoms
- [ ] Search filters still work
- [ ] List modals still open

---

## 📋 PHASE 3: Migrate Critical Path (Modal System)

**Duration: 2-3 hours**
**Risk: Medium-High**

### Step 3.1: Create Migration Helper

```javascript
// scripts/migrate-component.js
const fs = require('fs')
const path = require('path')

function migrateComponent(componentPath) {
    let content = fs.readFileSync(componentPath, 'utf8')

    // Replace imports
    content = content.replace(
        /import \{ useRecoilState, useRecoilValue, useSetRecoilState \} from 'recoil'/g,
        "import { useAppStore } from '../stores/appStore'"
    )

    // Replace atom imports
    content = content.replace(
        /import \{.*\} from '..\/atoms\/modalAtom'/g,
        '// Modal state now in appStore'
    )

    // Save with .new extension for review
    fs.writeFileSync(componentPath + '.new', content)
    console.log(`Created ${componentPath}.new for review`)
}
```

### Step 3.2: Migrate Modal.tsx (Pilot)

- [ ] Backup original Modal.tsx
- [ ] Replace Recoil imports with useAppStore
- [ ] Update state access patterns:

    ```typescript
    // OLD
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentMovie, setCurrentMovie] = useRecoilState(movieState)

    // NEW
    const { modal, currentContent, openModal, closeModal, setCurrentContent } = useAppStore()
    const showModal = modal.isOpen
    const currentMovie = currentContent
    ```

- [ ] Test modal thoroughly
- [ ] Commit if working

### Step 3.3: Migrate Banner.tsx

- [ ] Apply same pattern as Modal.tsx
- [ ] Test banner play button
- [ ] Test "More Info" button
- [ ] Verify autoplay behavior

### Step 3.4: Migrate Content Components

Order of migration:

1. ContentCard.tsx
2. ContentImage.tsx
3. SearchResults.tsx
4. Row.tsx

### ✅ PHASE 3 TEST CHECKPOINT

- [ ] All modal triggers work (Banner, Cards, Search)
- [ ] Modal displays correct content
- [ ] Modal closes properly
- [ ] No console errors
- [ ] Autoplay settings respected

---

## 📋 PHASE 4: Migrate Secondary Systems

**Duration: 2 hours**
**Risk: Low-Medium**

### Step 4.1: Migrate List System

1. ListDropdown.tsx
2. ListSelectionModal.tsx
3. WatchLaterButton.tsx

### Step 4.2: Migrate Search System

1. SearchFilters.tsx
2. SearchFiltersDropdown.tsx
3. SearchBar.tsx

### Step 4.3: Migrate Remaining Components

1. Layout.tsx
2. SimpleLikeButton.tsx
3. LikeOptions.tsx
4. DemoMessage.tsx

### ✅ PHASE 4 TEST CHECKPOINT

- [ ] Search filters work
- [ ] List management works
- [ ] All components render without errors
- [ ] No Recoil imports remain in components

---

## 📋 PHASE 5: Complete Cleanup

**Duration: 1 hour**
**Risk: Low**

### Step 5.1: Remove Recoil from Pages

- [ ] Update pages/index.tsx
- [ ] Update pages/genres/[type]/[id].tsx
- [ ] Update pages/watchlists.tsx
- [ ] Update pages/liked.tsx
- [ ] Update pages/hidden.tsx

### Step 5.2: Remove Recoil Infrastructure

```bash
# Remove RecoilRoot from _app.tsx
# Delete atoms directory
rm -rf atoms/

# Remove Recoil package
npm uninstall recoil

# Clean up
npm run build
```

### Step 5.3: Final Cleanup

- [ ] Delete compatibility shim
- [ ] Remove any Recoil types
- [ ] Update imports in test files
- [ ] Run full test suite

### ✅ PHASE 5 TEST CHECKPOINT

```bash
# Verify no Recoil references
grep -r "from 'recoil'" --include="*.tsx" --include="*.ts" .
grep -r "from '../atoms" --include="*.tsx" --include="*.ts" .

# Full build test
npm run build
npm run type-check
npm run lint
```

---

## 🎯 Success Criteria

### Technical Requirements

- [ ] Zero imports from 'recoil' package
- [ ] All atom files deleted
- [ ] appStore handles all UI state
- [ ] No increase in TypeScript errors
- [ ] Build succeeds

### Functional Requirements

- [ ] Modal system works
- [ ] Search filters work
- [ ] List management works
- [ ] Autoplay settings persist
- [ ] No UI regressions

### Performance Requirements

- [ ] No increase in re-renders
- [ ] Page load time same or better
- [ ] Bundle size reduced (no Recoil)

---

## 🚨 Rollback Plan

If critical issues arise at any phase:

```bash
# Stash current changes
git stash

# Return to last known good state
git checkout main

# Or restore from backup branch
git checkout recoil-migration-backup
```

---

## 📅 Timeline

- **Phase 1**: 1-2 hours (Today - Prep)
- **Phase 2**: 2-3 hours (Today - appStore)
- **Phase 3**: 2-3 hours (Tomorrow - Critical Path)
- **Phase 4**: 2 hours (Tomorrow - Secondary)
- **Phase 5**: 1 hour (Tomorrow - Cleanup)

**Total**: 8-11 hours over 2 days

---

## 📝 Notes

### Why This Order?

1. **Foundation first** - appStore must be complete before migration
2. **Critical path second** - Modal system is most used feature
3. **Secondary systems** - Less critical but still important
4. **Cleanup last** - Only after everything works

### Key Principles

- **Test after each component migration**
- **Commit working states frequently**
- **Keep compatibility shim until Phase 5**
- **Don't rush - better safe than broken**

### Common Pitfalls to Avoid

- Don't delete compatibility shim too early
- Don't migrate multiple components without testing
- Don't forget to update both read and write operations
- Don't assume patterns - each component may differ

---

## 🚀 Ready to Start?

Begin with Phase 1, Step 1.1: Environment Cleanup

```bash
# Let's start!
pkill -f "npm run dev"
git status
```
