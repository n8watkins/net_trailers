# Component Splitting Plan - NetTrailers Project

**Date**: 2025-11-12
**Status**: Planning Complete, Ready for Implementation
**Priority**: 🟠 High (8/10)

---

## Overview

This document outlines the plan to split 5 monolithic components into smaller, focused components:

1. **ListSelectionModal.tsx** (1,001 lines, 345 duplicated) - PRIORITY 1
2. **RankingCreator.tsx** (1,471 lines) - PRIORITY 2
3. **Modal.tsx** (949 lines) - PRIORITY 3
4. **Header.tsx** (652 lines) - PRIORITY 4
5. **SearchBar.tsx** (602 lines) - PRIORITY 5

**Total Lines to Refactor**: 4,675 lines
**Estimated Reduction**: ~2,000 lines (43%)

---

## 1. ListSelectionModal.tsx - DETAILED PLAN ✅

**Current**: 1,001 lines with 345 lines of duplicated code
**Target**: ~656 lines total (200 main + 456 in subcomponents)
**Reduction**: 345 lines (34.5%)

### Identified Duplication

The inline edit form appears twice (294 lines):

- Lines 383-529: Management mode
- Lines 588-734: Content addition mode

### Component Hierarchy (18 new components)

```
ListSelectionModal (Main)
├── ListModalHeader
├── ContentInfoCard
├── EmptyStateMessage
├── ListItemsContainer
│   └── ListItem (wrapper)
│       ├── InlineListEditor ⭐ (KEY - eliminates 294 lines)
│       │   ├── IconPickerButton
│       │   ├── ColorPickerButton
│       │   ├── ListNameInput
│       │   ├── ToggleSwitch (×2)
│       │   └── EditActionButtons
│       ├── ManagementModeListItem
│       └── ContentAdditionListItem
├── CreateListSection
│   ├── GuestSignInPrompt
│   └── CreateListForm
│       ├── IconPickerButton
│       ├── ColorPickerButton
│       └── ListNameInput
└── DeleteConfirmationModal
```

### Implementation Order

**Phase 1: Shared UI (5 components)**

1. ToggleSwitch.tsx (~20 lines)
2. EditActionButtons.tsx (~20 lines)
3. ListNameInput.tsx (~30 lines)
4. IconPickerButton.tsx (~40 lines)
5. ColorPickerButton.tsx (~40 lines)

**Phase 2: Complex Composed (2 components)** 6. InlineListEditor.tsx (~120 lines) ⭐ KEY COMPONENT 7. CreateListForm.tsx (~80 lines)

**Phase 3: List Item Variants (3 components)** 8. ManagementModeListItem.tsx (~50 lines) 9. ContentAdditionListItem.tsx (~70 lines) 10. ListItem.tsx (~40 lines - wrapper)

**Phase 4: Containers (1 component)** 11. ListItemsContainer.tsx (~80 lines)

**Phase 5: Secondary UI (5 components)** 12. ListModalHeader.tsx (~25 lines) 13. ContentInfoCard.tsx (~55 lines) 14. EmptyStateMessage.tsx (~15 lines) 15. GuestSignInPrompt.tsx (~30 lines) 16. DeleteConfirmationModal.tsx (~65 lines)

**Phase 6: Section Containers (1 component)** 17. CreateListSection.tsx (~60 lines)

**Phase 7: Main Refactor** 18. Refactor ListSelectionModal.tsx (1,001 → ~200 lines)

### File Structure

```
components/modals/
├── ListSelectionModal.tsx (refactored)
├── list-selection/
│   ├── InlineListEditor.tsx
│   ├── ListItem.tsx
│   ├── ManagementModeListItem.tsx
│   ├── ContentAdditionListItem.tsx
│   ├── ListItemsContainer.tsx
│   ├── ContentInfoCard.tsx
│   ├── EmptyStateMessage.tsx
│   ├── CreateListSection.tsx
│   ├── CreateListForm.tsx
│   ├── GuestSignInPrompt.tsx
│   ├── DeleteConfirmationModal.tsx
│   └── ListModalHeader.tsx
└── list-selection/shared/
    ├── IconPickerButton.tsx
    ├── ColorPickerButton.tsx
    ├── ToggleSwitch.tsx
    ├── ListNameInput.tsx
    └── EditActionButtons.tsx
```

---

## 2. RankingCreator.tsx - INITIAL ANALYSIS

**Current**: 1,471 lines
**Estimated Target**: ~800 lines total
**Estimated Reduction**: ~670 lines (45%)

### Responsibilities

1. **Drag-and-Drop Interface** (~400 lines)
2. **Content Search/Selection** (~300 lines)
3. **Ranking State Management** (~200 lines)
4. **Save/Share Logic** (~150 lines)
5. **UI Controls** (~200 lines)
6. **Filters/Sorting** (~200 lines)

### Proposed Components (TBD - needs detailed analysis)

```
RankingCreator (Main)
├── RankingHeader
├── DragDropArea
│   ├── DraggableContentItem
│   └── DropZone
├── ContentSearchPanel
│   ├── SearchInput
│   └── SearchResults
├── RankingControls
│   ├── FilterDropdown
│   ├── SortDropdown
│   └── ViewToggle
└── RankingSaveModal
    ├── ShareOptions
    └── PrivacySettings
```

**Status**: Needs detailed analysis (similar to ListSelectionModal)

---

## 3. Modal.tsx - INITIAL ANALYSIS

**Current**: 949 lines
**Estimated Target**: ~600 lines total
**Estimated Reduction**: ~350 lines (37%)

### Responsibilities

1. **Video Player Section** (~250 lines)
2. **Content Metadata** (~150 lines)
3. **Action Buttons** (~100 lines)
4. **"More Like This" Section** (~200 lines)
5. **User Interactions** (~150 lines)
6. **Modal Controls** (~100 lines)

### Proposed Components (TBD)

```
Modal (Main)
├── ModalHeader
│   └── CloseButton
├── VideoPlayerSection
│   ├── ModalVideoPlayer
│   └── VideoControls
├── ContentInfoSection
│   ├── ContentMetadata
│   ├── ContentDescription
│   └── ContentStats
├── ActionButtonRow
│   ├── PlayButton
│   ├── AddToListButton
│   ├── LikeButton
│   └── HideButton
└── MoreLikeThisSection
```

**Status**: Needs detailed analysis

---

## 4. Header.tsx - INITIAL ANALYSIS

**Current**: 652 lines
**Estimated Target**: ~400 lines total
**Estimated Reduction**: ~250 lines (38%)

### Responsibilities

1. **Main Navigation** (~150 lines)
2. **Mobile Menu** (~200 lines)
3. **Search Integration** (~100 lines)
4. **User Menu** (~100 lines)
5. **Sub-Navigation** (~100 lines)

### Proposed Components (TBD)

```
Header (Main)
├── DesktopHeader
│   ├── Logo
│   ├── MainNav
│   ├── SearchBar
│   └── UserMenu
└── MobileHeader
    ├── Logo
    ├── MenuButton
    └── MobileMenu
        ├── MobileNav
        └── MobileUserMenu
```

**Status**: Needs detailed analysis

---

## 5. SearchBar.tsx - INITIAL ANALYSIS

**Current**: 602 lines
**Estimated Target**: ~350 lines total
**Estimated Reduction**: ~250 lines (42%)

### Responsibilities

1. **Search Input** (~150 lines)
2. **Voice Search** (~150 lines)
3. **Search Suggestions** (~150 lines)
4. **Search Filters** (~150 lines)

### Proposed Components (TBD)

```
SearchBar (Main)
├── SearchInput
│   └── Typewriter placeholder
├── VoiceSearchButton
│   └── VoiceInputModal
├── SearchSuggestionsDropdown
│   └── SuggestionItem
└── SearchFiltersDropdown
    └── FilterOptions
```

**Status**: Needs detailed analysis

---

## Implementation Strategy

### Recommended Order

1. **Week 1**: ListSelectionModal.tsx (PRIORITY 1)
    - Biggest duplication win (345 lines)
    - 18 components, well-defined plan
    - Test thoroughly before moving on

2. **Week 2**: RankingCreator.tsx (PRIORITY 2)
    - Largest file (1,471 lines)
    - Complex state management
    - Needs detailed analysis first

3. **Week 3**: Modal.tsx (PRIORITY 3)
    - High visibility component
    - Affects user experience
    - Moderate complexity

4. **Week 4**: Header.tsx + SearchBar.tsx (PRIORITY 4-5)
    - Both are related (Header uses SearchBar)
    - Can be done together
    - Lower complexity

### Testing Strategy

For each component split:

1. **Before Refactoring**:
    - Write integration tests for current behavior
    - Take screenshots of all states
    - Document all user flows

2. **During Refactoring**:
    - Unit test each new component
    - Test prop flow between components
    - Verify TypeScript types

3. **After Refactoring**:
    - Run integration tests (should still pass)
    - Visual regression testing
    - Performance testing (should improve or maintain)

### Risk Mitigation

1. **Keep Old Code**: Comment out old code, don't delete until verified
2. **Incremental**: Build new components alongside old code
3. **Feature Flags**: Use env var to toggle between old/new if needed
4. **Rollback Plan**: Git commits at each phase for easy rollback

---

## Success Criteria

### Overall Goals

- ✅ Reduce total lines from 4,675 to ~2,675 (43% reduction)
- ✅ Eliminate all code duplication
- ✅ Create reusable components
- ✅ Improve maintainability
- ✅ No functionality regressions
- ✅ Maintain or improve performance

### Per-Component Goals

- ✅ Each component < 200 lines
- ✅ Single responsibility principle
- ✅ Clear, typed interfaces
- ✅ 90%+ test coverage
- ✅ Proper documentation

---

## Timeline

| Component          | Lines       | Reduction | Duration | Start  | End    |
| ------------------ | ----------- | --------- | -------- | ------ | ------ |
| ListSelectionModal | 1,001 → 656 | 345 (34%) | 1 week   | Week 1 | Week 1 |
| RankingCreator     | 1,471 → 800 | 671 (46%) | 1 week   | Week 2 | Week 2 |
| Modal              | 949 → 600   | 349 (37%) | 1 week   | Week 3 | Week 3 |
| Header + SearchBar | 1,254 → 750 | 504 (40%) | 1 week   | Week 4 | Week 4 |

**Total Estimated Time**: 4 weeks
**Total Line Reduction**: ~1,869 lines (40%)

---

## Next Steps

1. ✅ **COMPLETED**: Store migration (25 components migrated)
2. ✅ **COMPLETED**: Detailed analysis of ListSelectionModal
3. 🔄 **IN PROGRESS**: Implement ListSelectionModal split
4. **PENDING**: Detailed analysis of RankingCreator
5. **PENDING**: Detailed analysis of Modal
6. **PENDING**: Detailed analysis of Header
7. **PENDING**: Detailed analysis of SearchBar

---

**Estimated Total Effort**: 4 weeks full-time or 8 weeks part-time
**Risk Level**: MEDIUM (well-planned, incremental approach reduces risk)
**Impact**: HIGH (significantly improves maintainability and reduces duplication)
