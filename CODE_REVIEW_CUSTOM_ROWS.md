# Code Review: Custom Rows Feature

**Date**: 2025-11-03
**Reviewer**: Claude Code
**Scope**: Custom Rows feature implementation (types, Firestore, store, components, UI)

---

## Executive Summary

✅ **Overall Assessment**: **GOOD** - The implementation is well-structured, type-safe, and secure. There are several areas for improvement but no critical bugs.

**Key Strengths**:

- Comprehensive type safety with TypeScript
- Proper userId validation across all Firestore operations
- Clean separation of concerns (types, store, Firestore, components)
- Secure handling of guest vs authenticated users
- Good error handling patterns

**Areas for Improvement**:

- Type inconsistency in constraints (MIN_GENRES_PER_ROW vs special rows)
- Potential race conditions in concurrent operations
- Missing validation in some edge cases
- UI feedback could be more comprehensive

---

## 1. Type Definitions (`types/customRows.ts`)

### ✅ Strengths

- Well-documented interfaces with clear JSDoc comments
- Proper separation: BaseRowConfig, CustomRow, DisplayRow, SystemRowConfig
- Good use of discriminated unions (isSystemRow boolean)
- Comprehensive validation constraints with `as const`
- Helper functions for common operations

### ⚠️ Issues Found

#### **CRITICAL**: Type Inconsistency with Special Rows

**File**: `types/customRows.ts:79`
**Severity**: Medium
**Issue**: `MIN_GENRES_PER_ROW: 1` conflicts with special system rows (Trending, Top Rated) that have empty genres arrays.

```typescript
// Current:
MIN_GENRES_PER_ROW: 1,

// Reality: Special system rows have genres: []
```

**Impact**: Type system doesn't reflect reality. `BaseRowConfig.genres: number[]` should allow empty arrays for special rows.

**Recommendation**:

```typescript
export interface BaseRowConfig {
    id: string
    name: string
    genres: number[] // Can be empty for special rows (trending, top-rated)
    genreLogic: 'AND' | 'OR'
    mediaType: 'movie' | 'tv' | 'both'
    order: number
    isSpecialRow?: boolean // NEW: Flag for trending/top-rated rows
}

// Update validation to check for special rows
export const CUSTOM_ROW_CONSTRAINTS = {
    MIN_GENRES_PER_ROW: 1, // Only applies to custom rows
    MIN_GENRES_PER_SPECIAL_ROW: 0, // Special rows can have 0 genres
    // ...
}
```

#### **MINOR**: Missing Validation Type

**File**: `types/customRows.ts:96-103`
**Severity**: Low
**Issue**: Missing `INVALID_ROW_ID` validation error type for malformed row IDs.

**Recommendation**: Add to CustomRowValidationError union type.

---

## 2. Firestore Operations (`utils/firestore/customRows.ts`)

### ✅ Strengths

- Excellent userId validation (checks for null, undefined, and string 'undefined'/'null')
- Proper ownership verification before operations (getCustomRow checks userId match)
- Atomic operations where appropriate
- Clear error messages
- Consistent patterns across all methods

### ⚠️ Issues Found

#### **MEDIUM**: Race Condition in Reordering

**File**: `utils/firestore/customRows.ts:309-354`
**Severity**: Medium
**Issue**: `reorderCustomRows()` doesn't handle concurrent reorder operations. If two users (or same user in two tabs) reorder simultaneously, last write wins with no conflict detection.

```typescript
// Current implementation:
rowIds.forEach((rowId, index) => {
    customRows[rowId] = {
        ...customRows[rowId],
        order: index,
        updatedAt: now,
    }
})
```

**Impact**: Users could lose their reordering if operations overlap.

**Recommendation**: Implement optimistic locking with version timestamps or transaction-based updates.

#### **MINOR**: No Batch Size Limit

**File**: `utils/firestore/customRows.ts:309`
**Severity**: Low
**Issue**: `reorderCustomRows(userId, rowIds)` accepts any array length. Firestore has document size limits (~1MB).

**Recommendation**: Add validation:

```typescript
if (rowIds.length > 100) {
    // reasonable limit
    throw new Error('Too many rows to reorder at once')
}
```

#### **MINOR**: Missing Transaction for Create

**File**: `utils/firestore/customRows.ts:51-117`
**Severity**: Low
**Issue**: `createCustomRow()` checks max rows, then creates. Another tab could create a row between the check and creation, exceeding the limit.

**Recommendation**: Use Firestore transaction to atomically check and create.

---

## 3. State Management (`stores/customRowsStore.ts`)

### ✅ Strengths

- Clean Zustand implementation with proper typing
- Good use of Maps for per-user data isolation
- Selectors are pure functions
- Clear naming conventions
- Proper immutability patterns

### ⚠️ Issues Found

#### **MEDIUM**: No Stale Data Detection

**File**: `stores/customRowsStore.ts:282-305`
**Severity**: Medium
**Issue**: Store doesn't track when data was loaded. Stale data could be displayed if user leaves tab open for hours.

**Recommendation**: Add timestamps:

```typescript
interface CustomRowsState {
    customRowsByUser: Map<string, CustomRow[]>
    systemRowPreferences: Map<string, SystemRowPreferences>
    lastLoadTime: Map<string, number> // NEW: Track freshness
    // ...
}

// Add refresh check
getRows: (userId: string) => {
    const state = get()
    const lastLoad = state.lastLoadTime.get(userId) || 0
    const now = Date.now()

    if (now - lastLoad > 5 * 60 * 1000) {
        // 5 minutes
        console.warn('Custom rows data is stale')
    }

    return state.customRowsByUser.get(userId) || []
}
```

#### **LOW**: Memory Leak Potential

**File**: `stores/customRowsStore.ts:91-92`
**Severity**: Low
**Issue**: Maps never clear old user data. If app runs for days with many user switches, memory could grow.

**Recommendation**: Implement cleanup for inactive users or TTL-based expiration.

---

## 4. Component Architecture

### ✅ Strengths

- Proper separation: SortableCustomRowCard (drag logic) + CustomRowCard (display)
- Good use of React hooks for state management
- Props are well-typed
- Clear component responsibilities

### ⚠️ Issues Found

#### **MEDIUM**: Drag Handle Accessibility

**File**: `components/customRows/CustomRowCard.tsx:62-68`
**Severity**: Medium
**Issue**: Drag handle has no keyboard accessibility. Screen reader users can't reorder rows.

```typescript
// Current: No keyboard support
<div
    {...dragHandleProps}
    className="flex items-center..."
>
    <Bars3Icon className="w-5 h-5 text-gray-400" />
</div>
```

**Recommendation**: Add keyboard support:

```typescript
<button
    {...dragHandleProps}
    onKeyDown={(e) => {
        if (e.key === 'ArrowUp') moveUp(row.id)
        if (e.key === 'ArrowDown') moveDown(row.id)
    }}
    aria-label="Drag to reorder or use arrow keys"
    className="flex items-center..."
>
    <Bars3Icon className="w-5 h-5 text-gray-400" />
</button>
```

#### **LOW**: Delete Confirmation UX

**File**: `components/customRows/CustomRowCard.tsx:36-44`
**Severity**: Low
**Issue**: 3-second timeout for delete confirmation is arbitrary and user-unfriendly. Clicking away doesn't cancel.

**Recommendation**: Use a proper confirmation modal or keep confirmation active until explicitly cancelled.

---

## 5. API Integration (`components/customRows/CustomRowLoader.tsx`)

### ✅ Strengths

- Proper special row handling (empty genres for trending/top-rated)
- Child safety mode integration
- Good error handling with console logging
- Loading and error states properly managed

### ⚠️ Issues Found

#### **MEDIUM**: Hard-coded mediaType Fallback

**File**: `CustomRowLoader.tsx:48-62`
**Severity**: Medium
**Issue**: For 'both' mediaType, hardcodes to 'movies' API. Inconsistent behavior.

```typescript
const mediaType = row.mediaType === 'both' ? 'movies' : ...
```

**Impact**: Users expect "Trending (Home)" to show both movies and TV, but it only shows movies.

**Recommendation**: Either:

1. Make two API calls and merge results
2. Update row names to clarify (e.g., "Trending Movies & TV")
3. Create a combined API endpoint

#### **MINOR**: No Request Cancellation

**File**: `CustomRowLoader.tsx:30-101`
**Severity**: Low
**Issue**: If user rapidly switches pages, old requests aren't cancelled. Could show stale data.

**Recommendation**: Use AbortController:

```typescript
useEffect(() => {
    const abortController = new AbortController()

    fetch(url, { signal: abortController.signal })
    // ...

    return () => abortController.abort()
}, [dependencies])
```

---

## 6. Security Analysis

### ✅ Strengths

- **Excellent userId validation** - Checks for null, undefined, 'null', 'undefined' strings
- **Ownership verification** - All operations verify user owns the data
- **No SQL injection risks** - Uses Firestore SDK properly
- **Guest mode handling** - Proper separation and limits

### ⚠️ Issues Found

#### **LOW**: No Rate Limiting

**Severity**: Low
**Issue**: No client-side rate limiting for row creation. User could spam create requests.

**Recommendation**: Add rate limiting or debouncing:

```typescript
// In component
const [lastCreateTime, setLastCreateTime] = useState(0)

const handleCreate = () => {
    const now = Date.now()
    if (now - lastCreateTime < 1000) {
        // 1 second cooldown
        showError('Please wait before creating another row')
        return
    }
    setLastCreateTime(now)
    // ... proceed
}
```

#### **INFORMATIONAL**: No XSS Protection Needed

The implementation properly escapes all user input through React's default behavior. Row names are displayed safely.

---

## 7. UI/UX Review

### ✅ Strengths

- Clear visual distinction between system and custom rows
- Good use of icons and colors
- Responsive design
- Loading states handled well

### ⚠️ Issues Found

#### **MEDIUM**: No Empty State Guidance

**File**: `app/rows/page.tsx:348-356`
**Severity**: Medium
**Issue**: When filtering results in 0 rows, just shows "No matches" with no action.

**Recommendation**: Show helpful message with suggestion:

```typescript
{filteredMovieRows.length === 0 ? (
    <div className="text-center py-8">
        <p className="text-gray-400 text-sm">
            {searchQuery.trim()
                ? `No movie rows match "${searchQuery}". Try a different search.`
                : 'No movie rows yet. Create one with the button above!'}
        </p>
    </div>
) : (
    // ...
)}
```

#### **LOW**: System Row Badge Redundant

**File**: `CustomRowCard.tsx:60-68`
**Severity**: Low
**Issue**: System rows have both purple border AND "System" badge. Could be simplified.

**Recommendation**: Consider using just the badge OR just the border, not both.

---

## 8. Testing Coverage

### ⚠️ Issues Found

#### **HIGH**: No Tests for Custom Rows

**Severity**: High
**Issue**: No test files found for custom rows feature.

**Recommendation**: Add tests for:

1. Type validation and constraints
2. Firestore operations (with emulator)
3. Store state management
4. Component rendering and interactions
5. Drag and drop functionality
6. Special row handling (empty genres)

**Example test structure needed**:

```
__tests__/
  components/customRows/
    CustomRowCard.test.tsx
    CustomRowLoader.test.tsx
    SortableCustomRowCard.test.tsx
  stores/
    customRowsStore.test.ts
  utils/firestore/
    customRows.test.ts
```

---

## 9. Performance Considerations

### ✅ Strengths

- Proper use of React hooks and memoization potential
- Zustand store is performant
- Optimistic UI updates

### ⚠️ Issues Found

#### **LOW**: Unnecessary Re-renders

**File**: `app/rows/page.tsx`
**Severity**: Low
**Issue**: Could optimize with useMemo for filtered row calculations.

**Recommendation**:

```typescript
const filteredMovieRows = useMemo(
    () => movieRows.filter((row) => row.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [movieRows, searchQuery]
)
```

---

## 10. Documentation

### ✅ Strengths

- Good JSDoc comments on interfaces
- Clear naming conventions
- Inline comments for complex logic

### ⚠️ Issues Found

#### **MEDIUM**: Missing API Documentation

**Severity**: Medium
**Issue**: No documentation for CustomRowLoader special row behavior (genres.length === 0).

**Recommendation**: Add comment at top of CustomRowLoader.tsx explaining special rows.

---

## Summary of Action Items

### Critical (Fix Immediately)

None! 🎉

### High Priority (Fix Soon)

1. Add test coverage for custom rows feature
2. Fix type inconsistency with MIN_GENRES_PER_ROW

### Medium Priority (Fix This Sprint)

1. Add accessibility for drag handle (keyboard support)
2. Implement stale data detection in store
3. Handle 'both' mediaType properly in CustomRowLoader
4. Add race condition handling in reorderCustomRows
5. Improve empty state messages

### Low Priority (Technical Debt)

1. Add rate limiting for row creation
2. Implement request cancellation in CustomRowLoader
3. Add batch size validation
4. Optimize with useMemo
5. Clean up system row badge redundancy
6. Add memory cleanup for inactive users

---

## Conclusion

The custom rows feature is well-implemented with strong fundamentals:

- ✅ Type-safe
- ✅ Secure
- ✅ Well-structured
- ✅ Good separation of concerns

The main areas for improvement are:

- Testing (highest priority)
- Accessibility
- Edge case handling
- Performance optimizations

**Overall Grade**: B+ (Good, with room for improvement)

**Recommendation**: Safe to deploy with monitoring. Address high-priority items in next sprint.
