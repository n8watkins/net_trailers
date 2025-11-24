# Z-Index Hierarchy

This document outlines the z-index layering system used throughout the application. All z-index values are centralized in `constants/zIndex.ts`.

## Quick Reference

| Layer | Z-Index      | Constant                                   | Use Case                           |
| ----- | ------------ | ------------------------------------------ | ---------------------------------- |
| 1     | 10-40        | `CONTENT_*`                                | Card content, badges, hover states |
| 2     | 50-60        | `MODAL_BASE`, `FLOATING_ACTION`            | Basic modals, FABs                 |
| 3     | 105-110      | `MOBILE_BACKDROP`, `DROPDOWN`              | Dropdowns, mobile overlays         |
| 4     | 200          | `HEADER`                                   | Fixed navigation                   |
| 5     | 250          | `DROPDOWN_ABOVE_HEADER`, `RANKING_CREATOR` | Elements above header              |
| 6     | 1500         | `PICKER`                                   | Icon/color pickers                 |
| 7     | 9999         | `AUTH_MODAL`                               | Authentication modal               |
| 8     | 9998-9999    | `DEBUG_*`                                  | Debug tools                        |
| 9     | 10000        | `SETTINGS_MODAL`                           | User settings                      |
| 10    | 50000        | `MODAL_STANDARD`                           | Standard modals                    |
| 11    | 55000        | `MODAL_LIST_SELECTION`                     | List selection                     |
| 12    | 56000        | `MODAL_COLLECTION_BUILDER`                 | Collection builder                 |
| 13    | 60000        | `MODAL_DELETE`                             | Delete confirmations               |
| 14    | 99998-100000 | `MODAL_EDITOR_*`                           | Editor modal layers                |
| 15    | 100001       | `TOAST`, `MODAL_EDITOR_DELETE`             | Top layer                          |

---

## Detailed Layer Breakdown

### Layer 1: Base Content (10-40)

Elements within content cards and interactive areas.

| Constant             | Value | Components                                    |
| -------------------- | ----- | --------------------------------------------- |
| `CONTENT_DECORATION` | 10    | SmartInput shimmer effects, input decorations |
| `CONTENT_BADGE`      | 20    | ContentCard badges (rating, new release)      |
| `CONTENT_OVERLAY`    | 30    | Text overlays, action buttons on cards        |
| `CONTENT_HOVER`      | 40    | ContentCard hover elevation                   |

**Files:**

- `components/common/ContentCard.tsx`
- `components/common/SmartInput.tsx`

---

### Layer 2: Page-Level UI (50-60)

Basic floating UI elements at page level.

| Constant          | Value | Components                                       |
| ----------------- | ----- | ------------------------------------------------ |
| `MODAL_BASE`      | 50    | CreatePollModal, ReportModal                     |
| `FLOATING_ACTION` | 60    | ScrollToTopButton, CollectionModal mode switcher |

**Files:**

- `components/forum/CreatePollModal.tsx`
- `components/forum/ReportModal.tsx`
- `components/common/ScrollToTopButton.tsx`
- `components/modals/CollectionModal.tsx`

---

### Layer 3: Dropdowns & Overlays (105-110)

Navigation dropdowns and mobile overlay backdrops.

| Constant          | Value | Components                                                                       |
| ----------------- | ----- | -------------------------------------------------------------------------------- |
| `MOBILE_BACKDROP` | 105   | Mobile menu backdrop, notification panel backdrop                                |
| `DROPDOWN`        | 110   | SearchFiltersDropdown, GenresDropdown, AvatarDropdown, SearchSuggestionsDropdown |

**Files:**

- `components/layout/Header.tsx`
- `components/search/SearchFiltersDropdown.tsx`
- `components/search/SearchSuggestionsDropdown.tsx`
- `components/content/GenresDropdown.tsx`
- `components/auth/AvatarDropdown.tsx`
- `components/notifications/NotificationPanel.tsx`

---

### Layer 4: Fixed Navigation (200)

The main header that stays fixed at the top.

| Constant | Value | Components             |
| -------- | ----- | ---------------------- |
| `HEADER` | 200   | Main navigation header |

**Files:**

- `components/layout/Header.tsx`

---

### Layer 5: Above Navigation (250)

Elements that must render above the fixed header.

| Constant                | Value | Components                         |
| ----------------------- | ----- | ---------------------------------- |
| `DROPDOWN_ABOVE_HEADER` | 250   | MyListsDropdown, ProfileDropdown   |
| `RANKING_CREATOR`       | 250   | RankingCreator full-screen overlay |

**Files:**

- `components/rankings/RankingCreator.tsx`
- `components/content/MyListsDropdown.tsx`
- `components/content/ProfileDropdown.tsx`
- `components/content/Row.tsx` (edit buttons)

---

### Layer 6: Inline Pickers (1500)

Small picker modals positioned relative to trigger elements.

| Constant | Value | Components                        |
| -------- | ----- | --------------------------------- |
| `PICKER` | 1500  | IconPickerModal, ColorPickerModal |

**Files:**

- `components/modals/IconPickerModal.tsx`
- `components/modals/ColorPickerModal.tsx`

---

### Layer 7: Authentication Modal (9999)

Authentication requires high priority to ensure users can always sign in.

| Constant     | Value | Components |
| ------------ | ----- | ---------- |
| `AUTH_MODAL` | 9999  | AuthModal  |

**Files:**

- `components/modals/AuthModal.tsx`

---

### Layer 8: Debug Tools (9998-9999)

Development and debugging overlays (production: hidden or minimal).

| Constant      | Value | Components                                 |
| ------------- | ----- | ------------------------------------------ |
| `DEBUG_BADGE` | 9998  | FirebaseCallTracker badge                  |
| `DEBUG_PANEL` | 9999  | DebugControls, WebVitalsHUD, NetflixLoader |

**Files:**

- `components/debug/FirebaseCallTracker.tsx`
- `components/debug/DebugControls.tsx`
- `components/debug/WebVitalsHUD.tsx`
- `components/common/NetflixLoader.tsx`

---

### Layer 9: Settings Modal (10000)

User settings modal needs to be above debug tools.

| Constant         | Value | Components        |
| ---------------- | ----- | ----------------- |
| `SETTINGS_MODAL` | 10000 | UserSettingsModal |

**Files:**

- `components/modals/UserSettingsModal.tsx`

---

### Layer 10: Standard Modals (50000)

Most application modals for viewing information.

| Constant         | Value | Components                                                                                                                                                                          |
| ---------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MODAL_STANDARD` | 50000 | InfoModal, AboutModal, ConfirmationModal, TutorialModal, KeyboardShortcutsModal, RecommendationInsightsModal, GenrePreferenceModal, TitlePreferenceModal, PreferenceCustomizerModal |

**Files:**

- `components/modals/InfoModal.tsx`
- `components/modals/AboutModal.tsx`
- `components/modals/ConfirmationModal.tsx`
- `components/modals/TutorialModal.tsx`
- `components/modals/KeyboardShortcutsModal.tsx`
- `components/recommendations/RecommendationInsightsModal.tsx`
- `components/recommendations/GenrePreferenceModal.tsx`
- `components/recommendations/TitlePreferenceModal.tsx`
- `components/recommendations/PreferenceCustomizerModal.tsx`

---

### Layer 11: List Selection (55000)

List and collection selection workflows.

| Constant               | Value | Components                                                                 |
| ---------------------- | ----- | -------------------------------------------------------------------------- |
| `MODAL_LIST_SELECTION` | 55000 | ListSelectionModal, CollectionCreatorModal base, FirebaseCallTracker panel |

**Files:**

- `components/modals/ListSelectionModal.tsx`
- `components/modals/CollectionCreatorModal.tsx`
- `components/debug/FirebaseCallTracker.tsx` (expanded panel)

---

### Layer 12: Collection Builder (56000)

Collection building with multi-step workflows.

| Constant                   | Value | Components                                                       |
| -------------------------- | ----- | ---------------------------------------------------------------- |
| `MODAL_COLLECTION_BUILDER` | 56000 | CollectionBuilderModal, DeleteConfirmationModal (list-selection) |

**Files:**

- `components/modals/CollectionBuilderModal.tsx`
- `components/modals/list-selection/DeleteConfirmationModal.tsx`

---

### Layer 13: Delete Confirmation (60000)

Destructive action confirmations need to be clearly visible.

| Constant       | Value | Components                  |
| -------------- | ----- | --------------------------- |
| `MODAL_DELETE` | 60000 | CollectionCard delete modal |

**Files:**

- `components/collections/CollectionCard.tsx`

---

### Layer 14: Editor Modal (99998-100000)

Full-screen editor modal with internal layered components.

| Constant                | Value  | Components                     |
| ----------------------- | ------ | ------------------------------ |
| `MODAL_EDITOR_BACKDROP` | 99998  | CollectionEditorModal backdrop |
| `MODAL_EDITOR`          | 99999  | CollectionEditorModal content  |
| `MODAL_EDITOR_INTERNAL` | 100000 | Genre picker within editor     |

**Files:**

- `components/modals/CollectionEditorModal.tsx`
- `components/modals/CollectionCreatorModal.tsx` (genre modal)

---

### Layer 15: Top Layer (100001)

Elements that must always be visible above everything else.

| Constant              | Value  | Components                        |
| --------------------- | ------ | --------------------------------- |
| `TOAST`               | 100001 | ToastContainer                    |
| `MODAL_EDITOR_DELETE` | 100001 | Delete confirmation within editor |

**Files:**

- `components/common/ToastContainer.tsx`
- `components/modals/CollectionEditorModal.tsx` (delete modal)

---

## Usage Guide

### Importing Constants

```typescript
import { Z_INDEX, getZIndexClass, getZIndexStyle } from '@/constants/zIndex'
```

### Using with Tailwind (Recommended)

```tsx
// Direct class
<div className={`fixed inset-0 z-[${Z_INDEX.MODAL_STANDARD}]`}>

// Helper function
<div className={`fixed inset-0 ${getZIndexClass('MODAL_STANDARD')}`}>
```

### Using with Inline Styles

```tsx
<div style={getZIndexStyle('HEADER')}>
// Or
<div style={{ zIndex: Z_INDEX.HEADER }}>
```

---

## Adding New Z-Index Values

1. **Check existing layers** - Does an existing constant fit your use case?
2. **Determine the layer** - Where should it appear in the stacking order?
3. **Add to constants** - Add the constant in `constants/zIndex.ts`
4. **Update this document** - Add the component to the appropriate layer section
5. **Use the constant** - Import and use in your component

### Example: Adding a new modal

```typescript
// In constants/zIndex.ts
export const Z_INDEX = {
    // ... existing constants

    /** New feature modal - above standard modals */
    MODAL_NEW_FEATURE: 51000,
}
```

---

## Troubleshooting

### Element hidden behind another

1. Check this document to find the z-index values
2. Ensure the element's z-index constant is higher than what's covering it
3. Check for `position` (z-index only works on positioned elements)
4. Check for stacking contexts created by `transform`, `opacity`, `filter`, etc.

### Modal not appearing above other content

1. Verify the modal uses a portal (renders outside normal DOM hierarchy)
2. Check that the modal backdrop has the correct z-index
3. Ensure no parent has `isolation: isolate` or creates a new stacking context

---

## Migration Status

**Status: Completed**

All modals have been migrated to use the standardized Tailwind z-index classes defined in `tailwind.config.js`. The migration was completed on 2025-11-23.

### Tailwind Classes Used

| Class                  | Value  | Use Case                                 |
| ---------------------- | ------ | ---------------------------------------- |
| `z-modal`              | 50000  | Standard modals                          |
| `z-modal-nested`       | 55000  | List selection, collection creator       |
| `z-modal-builder`      | 56000  | Collection builder, delete confirmations |
| `z-modal-delete`       | 60000  | Delete confirmation modals               |
| `z-modal-editor-bg`    | 99998  | Editor modal backdrop                    |
| `z-modal-editor`       | 99999  | Editor modal content                     |
| `z-modal-editor-inner` | 100000 | Nested modals within editor              |
| `z-auth`               | 9999   | Authentication modal                     |
| `z-settings`           | 10000  | Settings modal                           |
| `z-picker`             | 1500   | Icon/color pickers                       |
| `z-toast`              | 100001 | Toast notifications                      |

### Constants File

For programmatic use (e.g., MUI components), import from `constants/zIndex.ts`:

```typescript
import { Z_INDEX } from '@/constants/zIndex'

// Usage with MUI
sx={{ zIndex: Z_INDEX.MODAL_STANDARD }}
```
