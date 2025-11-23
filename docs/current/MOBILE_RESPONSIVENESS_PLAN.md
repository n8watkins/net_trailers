# Mobile Responsiveness Implementation Plan

**Created:** 2025-11-22
**Updated:** 2025-11-22
**Status:** Planning Complete - Ready for Implementation
**Scope:** 38 components across 5 phases (including Phase 0)

---

## Executive Summary

Comprehensive audit identified **47 responsive design issues** across the codebase. The most critical issues involve fixed-width dropdowns, modals that overflow mobile viewports, and missing responsive breakpoints for screens under 640px.

### Target Viewports

| Viewport   | Device Examples      | Priority |
| ---------- | -------------------- | -------- |
| **320px**  | iPhone SE, Galaxy S8 | Critical |
| **375px**  | iPhone X/12/13/14    | Critical |
| **390px**  | iPhone 14 Pro        | High     |
| **428px**  | iPhone 14 Pro Max    | High     |
| **768px**  | iPad Portrait        | Medium   |
| **1024px** | iPad Landscape       | Low      |

---

## Phase 0: Prerequisites (REQUIRED FIRST)

### 0.1 Add Custom `xs` Breakpoint to Tailwind

**File:** `tailwind.config.js`

**Why Required:** Several Phase 2 fixes (Row.tsx, LazyRow.tsx card sizing) use `xs:` prefix which doesn't exist in default Tailwind. This MUST be completed before Phase 2 begins.

**Change:**

```js
module.exports = {
    theme: {
        screens: {
            xs: '375px', // Add this line
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
        },
    },
}
```

**Verification:** After adding, run `npm run dev` and confirm no build errors. Test that `xs:w-4` applies at 375px+ viewports.

**Estimated Changes:** ~5 lines

---

## Phase 1: Critical Fixes (5 Components)

### 1.1 NotificationPanel.tsx

**File:** `components/notifications/NotificationPanel.tsx`
**Lines:** 99-101
**Current Issue:**

```tsx
className={`absolute right-0 top-full z-50 mt-2 w-[520px] rounded-lg...`}
```

**Problem:** Fixed 520px width overflows on all mobile devices

**Fix Strategy:**

- Replace `w-[520px]` with responsive width: `w-[95vw] sm:w-[400px] md:w-[520px]`
- Add `max-w-[520px]` as upper bound
- Consider full-screen slide-up panel on mobile (`fixed inset-x-0 bottom-0` below `sm:`)
- Update positioning from `absolute right-0` to centered on mobile

**Estimated Changes:** ~15 lines

---

### 1.2 NotificationItem.tsx

**File:** `components/notifications/NotificationItem.tsx`
**Lines:** 135, 154
**Current Issue:**

```tsx
<div className="group relative flex gap-6 border-b...">
  <img className="h-40 w-28 rounded object-cover..."/>
```

**Problem:** Fixed poster size + large gap causes overflow

**Fix Strategy:**

- Make poster responsive: `h-24 w-16 sm:h-32 sm:w-20 md:h-40 md:w-28`
- Reduce gap on mobile: `gap-3 sm:gap-4 md:gap-6`
- Adjust padding: `p-3 sm:p-4 md:p-6`
- Make timestamp/category stack on mobile

**Estimated Changes:** ~20 lines

---

### 1.3 CollectionCreatorModal.tsx

**File:** `components/modals/CollectionCreatorModal.tsx`
**Lines:** 703
**Current Issue:**

```tsx
<div className="...max-w-6xl w-full mx-4 max-h-[90vh]...">
```

**Problem:** 1152px max-width exceeds all mobile viewports

**Fix Strategy:**

- Replace with responsive max-width: `max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl`
- Adjust internal grid layouts to single column on mobile
- Make form inputs full-width on mobile
- Reduce internal padding on mobile

**Estimated Changes:** ~30 lines

---

### 1.4 SmartSearchActions.tsx

**File:** `components/smartSearch/SmartSearchActions.tsx`
**Lines:** 323, 327, 349-350
**Current Issue:**

```tsx
<input style={{ minWidth: '250px' }} className="max-w-md..."/>
<span className="text-4xl md:text-4xl lg:text-5xl">...</span>
```

**Problem:** Fixed minWidth + large title overflow on mobile

**Fix Strategy:**

- Remove inline `minWidth: 250px`, use Tailwind: `w-full sm:min-w-[250px] sm:max-w-md`
- Reduce title sizes: `text-2xl sm:text-3xl md:text-4xl lg:text-5xl`
- Stack title and input on mobile with `flex-col sm:flex-row`
- Make buttons full-width on mobile

**Estimated Changes:** ~25 lines

---

### 1.5 ListItemsContainer.tsx

**File:** `components/modals/list-selection/ListItemsContainer.tsx`
**Lines:** 83
**Current Issue:**

```tsx
<div className="grid grid-cols-2 gap-2">
```

**Problem:** Hardcoded 2-column grid too narrow on mobile

**Fix Strategy:**

- Add responsive columns: `grid-cols-1 sm:grid-cols-2`
- Increase gap on larger screens: `gap-2 sm:gap-3`
- Ensure list item text has proper truncation

**Estimated Changes:** ~5 lines

---

## Phase 2: High Priority Fixes (12 Components)

### 2.1 Dropdown Components (5 files)

Each dropdown requires a **specific strategy** based on its trigger location and container context. Do NOT apply a blanket pattern.

#### SearchFiltersDropdown.tsx

**File:** `components/search/SearchFiltersDropdown.tsx:70`
**Trigger Location:** Header search area (right side)
**Container:** Relatively wide header

```tsx
// Current: w-96 (384px)
// Fix: Use vw-based width with max constraint
className = 'w-[90vw] sm:w-80 md:w-96 max-w-[384px]'
// Keep right-0 positioning - works with header context
```

#### GenresDropdown.tsx

**File:** `components/content/GenresDropdown.tsx:120`
**Trigger Location:** Sub-navigation, left-aligned
**Container:** Full-width nav bar

```tsx
// Current: w-80 (320px)
// Fix: Responsive width, maintain left alignment
className = 'w-[85vw] sm:w-72 md:w-80 max-w-[320px]'
// Keep left-0 positioning - trigger is on left side
```

#### AvatarDropdown.tsx

**File:** `components/auth/AvatarDropdown.tsx:115,291`
**Trigger Location:** Header right corner
**Container:** Header with avatar on far right

```tsx
// Current: w-64 sm:w-72
// Fix: Responsive with xs breakpoint (requires Phase 0)
className = 'w-[80vw] xs:w-64 sm:w-72 max-w-[288px]'
// Keep right-0 positioning
```

#### ProfileDropdown.tsx

**File:** `components/content/ProfileDropdown.tsx:102`
**Trigger Location:** Profile section
**Container:** Narrow profile card area

```tsx
// Current: w-52
// Fix: Constrained responsive width
className = 'w-[min(75vw,208px)] sm:w-52'
// Keep existing positioning
```

#### MyListsDropdown.tsx

**File:** `components/content/MyListsDropdown.tsx:60`
**Trigger Location:** Collection/list area
**Container:** Card or narrow container

```tsx
// Current: w-48
// Fix: Constrained responsive width
className = 'w-[min(70vw,192px)] sm:w-48'
// Keep existing positioning
```

**Estimated Changes:** ~5 lines per dropdown = 25 lines total

---

### 2.2 Page Headers (2 files)

#### Collections Page Header

**File:** `app/collections/page.tsx:615-643`

```tsx
// Current: Horizontal layout emoji + title + count + button
// Fix: Stack on mobile
<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
    <div className="flex items-center gap-2">
        <span className="text-3xl sm:text-4xl md:text-5xl">emoji</span>
        <h1 className="text-2xl sm:text-3xl md:text-4xl">title</h1>
    </div>
    <div className="flex items-center gap-2">{/* count + button */}</div>
</div>
```

#### Profile Page Header

**File:** `app/profile/page.tsx:248,280`

```tsx
// Current: Avatar + text side by side
// Fix: Stack on mobile
<div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
    <div className="w-24 h-24 sm:w-32 sm:h-32">avatar</div>
    <div className="text-center sm:text-left">profile info</div>
</div>
```

**Estimated Changes:** ~30 lines total

---

### 2.3 Content Cards & Rows (2 files)

#### Row.tsx

**File:** `components/content/Row.tsx:504-514`

```tsx
// Current: w-[160px] h-[240px] sm:w-[180px]...
// Fix: Add smaller base size with xs breakpoint (requires Phase 0)
className =
    'w-[130px] h-[195px] xs:w-[140px] xs:h-[210px] sm:w-[160px] sm:h-[240px] md:w-[180px] md:h-[270px]...'
```

#### LazyRow.tsx

**File:** `components/content/LazyRow.tsx:201-241`

- Same card sizing changes as Row.tsx
- Also reduce `gap-4` to `gap-2 sm:gap-3 md:gap-4`

**Estimated Changes:** ~20 lines total

---

### 2.4 Header Navigation

**File:** `components/layout/Header.tsx`

**Issues & Fixes:**
| Line | Current | Fix |
|------|---------|-----|
| 389 | `w-96` search bar | `w-full max-w-96` |
| 486 | `gap-8` nav items | `gap-4 sm:gap-6 md:gap-8` |
| 541 | `max-w-sm` mobile menu | `max-w-[90vw] sm:max-w-sm` |

**Estimated Changes:** ~15 lines

---

### 2.5 Modal.tsx

**File:** `components/modals/Modal.tsx:611`

```tsx
// Current: max-w-sm sm:max-w-2xl...
// Fix: Better mobile handling
className = 'w-[95vw] max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-5xl'

// Also fix padding (line ~611)
// Current: p-2 sm:p-4 md:p-8
// Fix: p-1 sm:p-2 md:p-4 lg:p-8
```

**Estimated Changes:** ~10 lines

---

### 2.6 RankingCreator.tsx

**File:** `components/rankings/RankingCreator.tsx:388,685,834`

```tsx
// Modal width fix
className = 'max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-[96vw]'

// Remove min-width constraints
// Current: min-w-[100px]
// Fix: min-w-0 sm:min-w-[100px]
```

**Estimated Changes:** ~15 lines

---

## Phase 3: Medium Priority Fixes (13 Components)

### 3.1 Smart Search Components (2 files)

#### SmartSearchResults.tsx

**File:** `components/smartSearch/SmartSearchResults.tsx:43`

```tsx
// Current: flex flex-wrap gap-8
// Fix: gap-3 sm:gap-4 md:gap-6 lg:gap-8
```

#### SmartSearchInput.tsx

**File:** `components/smartSearch/SmartSearchInput.tsx`

- Increase voice button tap target to 44px minimum
- Add touch-friendly padding

**Estimated Changes:** ~10 lines

---

### 3.2 Page Spacing Fixes (4 files)

#### Genres Page

**File:** `app/genres/[type]/[id]/page.tsx:253-254`

```tsx
// Add missing breakpoints
className = 'pl-2 sm:pl-4 md:pl-8 lg:pl-16 pb-8 sm:pb-12 md:pb-16'
className = 'space-y-4 sm:space-y-6 md:space-y-10 lg:space-y-24 py-8 sm:py-12 md:py-16 lg:py-20'
```

#### Security Page

**File:** `app/security/page.tsx:259-264`

- Monitor text wrapping in feature cards
- Consider `line-clamp-2` for long text

#### Liked Page

**File:** `app/liked/page.tsx`

- Apply same header fixes as collections page

#### Hidden Page

**File:** `app/hidden/page.tsx`

- Apply same header fixes as collections page

**Estimated Changes:** ~30 lines total

---

### 3.3 Hover-Only Interactions Fix (3 files)

**Pattern to apply:**

```tsx
// Current: opacity-0 group-hover:opacity-100
// Fix: opacity-100 sm:opacity-0 sm:group-hover:opacity-100
// OR: Add focus-visible states
className =
    'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100'
```

**Files to update:**

1. `components/content/Row.tsx:175,254` - Chevron scroll controls
2. `components/content/ContentCard.tsx` - Action buttons (watchlist, like, info)
3. `components/modals/CollectionCreatorModal.tsx:61` - Remove item button

**Estimated Changes:** ~15 lines total

---

### 3.4 Touch Target Fixes - Explicit Inventory (4 files)

**Minimum requirement:** 44x44px tap targets for all interactive elements

| File                                            | Component           | Current Size                | Fix                                 |
| ----------------------------------------------- | ------------------- | --------------------------- | ----------------------------------- |
| `components/search/SearchFiltersDropdown.tsx`   | Select dropdowns    | `px-3 py-2` (~12px padding) | `py-3 sm:py-2 px-4 sm:px-3`         |
| `components/notifications/NotificationBell.tsx` | Bell icon button    | `w-6 h-6` (24px)            | `min-w-[44px] min-h-[44px] p-2`     |
| `components/smartSearch/SmartSearchModeBar.tsx` | Mode toggle buttons | Small padding               | `min-h-[44px] px-4 py-2`            |
| `components/content/SimpleLikeButton.tsx`       | Like heart icon     | `w-5 h-5` (20px)            | `min-w-[44px] min-h-[44px]` wrapper |

**Acceptance Criteria:** Each button/control must have minimum 44x44px touch area when tested on mobile device.

**Estimated Changes:** ~20 lines total

---

### 3.5 Layout & Spacing Fixes (3 files)

#### SubPageLayout.tsx

**File:** `components/layout/SubPageLayout.tsx:57-58`

```tsx
// Current: pt-44 (176px top padding)
// Fix: pt-28 sm:pt-36 md:pt-44
```

#### Footer.tsx

**File:** `components/layout/Footer.tsx:55-87`

- Ensure link text doesn't truncate on 320px
- Add `text-sm sm:text-base` for readability

#### NetflixLoader.tsx

**File:** `components/common/NetflixLoader.tsx:116`

```tsx
// Current: max-w-md px-6
// Fix: max-w-[90vw] sm:max-w-md px-4 sm:px-6
```

**Estimated Changes:** ~15 lines total

---

## Phase 4: Low Priority Fixes (3 Components)

### 4.1 Minor Styling Adjustments

| Component               | File                                                           | Fix                                        |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| CustomScrollbar         | `components/common/CustomScrollbar.tsx`                        | Responsive scrollbar width on tablets      |
| ContentAdditionListItem | `components/modals/list-selection/ContentAdditionListItem.tsx` | Verify text truncation works at all widths |
| PollCard                | `components/forum/PollCard.tsx`                                | Reduce header spacing on mobile            |

**Estimated Changes:** ~10 lines total

---

## Implementation Checklist

### Phase 0 - Prerequisites (MUST COMPLETE FIRST)

- [ ] Add `xs: '375px'` breakpoint to `tailwind.config.js`
- [ ] Verify build succeeds with new breakpoint
- [ ] Test that `xs:` prefix works in components

### Phase 1 - Critical

- [ ] NotificationPanel.tsx - Responsive width, mobile panel
- [ ] NotificationItem.tsx - Responsive poster and spacing
- [ ] CollectionCreatorModal.tsx - Responsive max-width
- [ ] SmartSearchActions.tsx - Remove fixed minWidth, responsive title
- [ ] ListItemsContainer.tsx - Single column on mobile

### Phase 2 - High Priority

- [ ] SearchFiltersDropdown.tsx - Responsive width (right-aligned)
- [ ] GenresDropdown.tsx - Responsive width (left-aligned)
- [ ] AvatarDropdown.tsx - Responsive width with xs breakpoint
- [ ] ProfileDropdown.tsx - Constrained responsive width
- [ ] MyListsDropdown.tsx - Constrained responsive width
- [ ] app/collections/page.tsx - Stack header on mobile
- [ ] app/profile/page.tsx - Stack header on mobile
- [ ] Row.tsx - Smaller card base size with xs breakpoint
- [ ] LazyRow.tsx - Smaller card base size with xs breakpoint
- [ ] Header.tsx - Fix search bar and nav spacing
- [ ] Modal.tsx - Better mobile max-width
- [ ] RankingCreator.tsx - Responsive modal

### Phase 3 - Medium Priority

- [ ] SmartSearchResults.tsx - Responsive gap
- [ ] SmartSearchInput.tsx - Touch targets
- [ ] app/genres/[type]/[id]/page.tsx - Missing breakpoints
- [ ] app/security/page.tsx - Text wrapping
- [ ] app/liked/page.tsx - Header fix
- [ ] app/hidden/page.tsx - Header fix
- [ ] Row.tsx - Touch accessible hover states
- [ ] ContentCard.tsx - Touch accessible hover states
- [ ] CollectionCreatorModal.tsx - Touch accessible hover states
- [ ] SearchFiltersDropdown.tsx - Touch targets on selects
- [ ] NotificationBell.tsx - Touch target size
- [ ] SmartSearchModeBar.tsx - Touch target size
- [ ] SimpleLikeButton.tsx - Touch target size
- [ ] SubPageLayout.tsx - Responsive top padding
- [ ] Footer.tsx - Text sizing
- [ ] NetflixLoader.tsx - Responsive max-width

### Phase 4 - Low Priority

- [ ] CustomScrollbar.tsx - Responsive width
- [ ] ContentAdditionListItem.tsx - Verify truncation
- [ ] PollCard.tsx - Header spacing
- [ ] Final QA pass on all viewports

---

## Testing Strategy

### Manual Testing Viewports

1. **320px** - iPhone SE (critical)
2. **375px** - iPhone 12/13 (critical) - also tests `xs:` breakpoint
3. **390px** - iPhone 14 (high)
4. **428px** - iPhone 14 Pro Max (high)
5. **768px** - iPad Portrait (medium)
6. **1024px** - iPad Landscape (low)
7. **1280px** - Desktop (verify no regression)

### Testing Checklist Per Component

- [ ] Content visible without horizontal scroll
- [ ] Text readable without zooming
- [ ] Touch targets >= 44x44px (use Chrome DevTools "Show touch areas")
- [ ] Dropdowns don't overflow viewport
- [ ] Modals fit within viewport
- [ ] Images maintain aspect ratio
- [ ] Hover states accessible on touch (visible by default or on tap)
- [ ] Forms usable with on-screen keyboard

### Browser Testing

- [ ] Chrome DevTools mobile emulation
- [ ] Safari (iOS simulator or real device)
- [ ] Chrome Android (real device preferred)

---

## Success Metrics

| Metric                             | Current | Target | Verification Method           |
| ---------------------------------- | ------- | ------ | ----------------------------- |
| Components with overflow at 320px  | ~15     | 0      | Manual test each component    |
| Dropdowns exceeding viewport       | 6       | 0      | Visual inspection at 320px    |
| Touch targets < 44px               | 10      | 0      | Chrome DevTools touch overlay |
| Hover-only controls                | 3       | 0      | Test on real touch device     |
| Pages with missing sm: breakpoints | 4       | 0      | Code review                   |

---

## Estimated Total Changes

| Phase     | Components | Lines Changed  |
| --------- | ---------- | -------------- |
| Phase 0   | 1 (config) | ~5 lines       |
| Phase 1   | 5          | ~95 lines      |
| Phase 2   | 12         | ~115 lines     |
| Phase 3   | 13         | ~90 lines      |
| Phase 4   | 3          | ~10 lines      |
| **Total** | **34**     | **~315 lines** |

---

## Notes

- **Phase 0 is mandatory** - `xs:` breakpoint must be added before Phase 2 row/card work
- All fixes should be mobile-first (base styles for mobile, then scale up)
- Use `vw` units with `max-w-` constraints for dropdowns
- Each dropdown has a specific fix strategy based on its container context
- Prefer Tailwind responsive prefixes over CSS media queries
- Test on real devices when possible, not just DevTools
- Touch target fixes have explicit file list and acceptance criteria
