# Code Review Findings: Genre-Year Preference Detection

**Date**: 2025-11-27
**Reviewer**: Claude Code
**Status**: ⚠️ Not Ready for Production
**Overall Rating**: 7/10

## Executive Summary

The genre-year preference detection feature has been successfully implemented with core algorithm logic, type definitions, and API integration. However, **critical bugs must be fixed before production deployment**. The implementation is functionally sound but contains edge case handling gaps and a hardcoded media type bug that would break TV show recommendations.

**Estimated Time to Production-Ready**: 1-2 hours

---

## Critical Bugs (Must Fix)

### 🔴 Bug #1: Hardcoded Media Type in Genre Conversion

**Location**: `utils/recommendations/genreEngine.ts:275`

**Issue**: When looking up year preferences for selected genres, the code always converts TMDB genre IDs using `'movie'` as the media type, even when fetching TV show recommendations.

**Current Code**:

```typescript
// Line 275 - WRONG: Always uses 'movie' even for TV recommendations
const unifiedIds = convertLegacyGenresToUnified([selectedGenre.genreId], 'movie')
```

**Impact**:

- TV recommendations will look up the wrong unified genre IDs
- Year preferences calculated for TV content won't be found
- TV recommendations will never apply year filtering

**Example Scenario**:

```typescript
// User's TV preferences include Sci-Fi (TMDB ID 10765)
// System converts using 'movie' → gets 'scifi' (TMDB ID 878)
// Year preference stored under 'scifi' from TV content is missed
// Result: No year filtering applied to TV recommendations
```

**Recommended Fix**:

```typescript
// Determine media type from the current recommendation request
const mediaTypeForConversion =
    // Use 'movie' for movie requests, 'tv' for TV requests
    // For mixed requests, try both or use the genre's primary type

// Option 1: Try movie first, then TV
let unifiedIds = convertLegacyGenresToUnified([selectedGenre.genreId], 'movie')
if (unifiedIds.length === 0) {
    unifiedIds = convertLegacyGenresToUnified([selectedGenre.genreId], 'tv')
}

// Option 2: Pass media type from API call context
const unifiedIds = convertLegacyGenresToUnified(
    [selectedGenre.genreId],
    currentMediaType // From discoverByPreferences call
)
```

**Priority**: CRITICAL - Breaks TV recommendations

---

### 🟡 Bug #2: Incorrect Median Calculation

**Location**: `utils/recommendations/yearPreferenceDetector.ts:108`

**Issue**: Median calculation doesn't handle even-length arrays correctly.

**Current Code**:

```typescript
const yearMedian = sortedYears[Math.floor(sortedYears.length / 2)]
```

**Impact**:

- For even-length arrays, this picks the upper middle value instead of averaging the two middle values
- Example: `[2000, 2005, 2010, 2015]` → Returns 2010 instead of 2007.5
- Statistical accuracy is reduced

**Recommended Fix**:

```typescript
const yearMedian =
    sortedYears.length % 2 === 1
        ? sortedYears[Math.floor(sortedYears.length / 2)] // Odd length: middle value
        : (sortedYears[sortedYears.length / 2 - 1] + sortedYears[sortedYears.length / 2]) / 2 // Even: average of two middle
```

**Priority**: MEDIUM - Statistical accuracy

---

## Major Issues (Should Fix)

### 🟡 Issue #3: Missing Year Validation

**Location**: `utils/recommendations/yearPreferenceDetector.ts:40-51`

**Issue**: The `extractYear()` function doesn't validate that extracted years are reasonable.

**Current Code**:

```typescript
function extractYear(content: Content): number | undefined {
    try {
        if (content.media_type === 'movie' && content.release_date) {
            return new Date(content.release_date).getFullYear()
        } else if (content.media_type === 'tv' && content.first_air_date) {
            return new Date(content.first_air_date).getFullYear()
        }
        return undefined
    } catch {
        return undefined
    }
}
```

**Impact**:

- Malformed dates could produce invalid years (e.g., year 1, year 3000)
- Could accept negative years or unrealistic future years
- Edge cases: `new Date('invalid').getFullYear()` returns `NaN`

**Example Scenarios**:

```typescript
extractYear({ release_date: '0001-01-01' }) // Returns year 1
extractYear({ release_date: '9999-12-31' }) // Returns year 9999
extractYear({ release_date: 'invalid' }) // Returns NaN (not caught!)
```

**Recommended Fix**:

```typescript
function extractYear(content: Content): number | undefined {
    try {
        const dateString =
            content.media_type === 'movie' ? content.release_date : content.first_air_date

        if (!dateString) return undefined

        const year = new Date(dateString).getFullYear()

        // Validate year is reasonable (1900-2050 range)
        if (isNaN(year) || year < 1900 || year > 2050) {
            return undefined
        }

        return year
    } catch {
        return undefined
    }
}
```

**Priority**: MEDIUM - Data quality and edge case handling

---

## Minor Issues (Nice to Have)

### 🟢 Issue #4: Missing Logging for Empty Results

**Location**: `utils/recommendations/yearPreferenceDetector.ts:96-147`

**Observation**: No logging when a genre has no valid year data.

**Recommended Enhancement**:

```typescript
for (const [genreId, years] of genreYearsMap.entries()) {
    const sampleSize = years.length

    // Skip if no data
    if (sampleSize === 0) {
        console.debug(`[YearPreferences] Skipping genre ${genreId}: no valid years`)
        continue
    }

    // ... rest of processing
}
```

**Priority**: LOW - Debugging aid

---

## Architecture Concerns

### Union Merge Strategy May Be Too Broad

**Location**: `utils/recommendations/genreEngine.ts:292-298`

**Current Implementation**:

```typescript
// Merge year ranges from selected genres (use union: min of mins, max of maxes)
const yearRange =
    yearRanges.length > 0
        ? {
              min: Math.min(...yearRanges.map((r) => r.min)),
              max: Math.max(...yearRanges.map((r) => r.max)),
          }
        : undefined
```

**Concern**: If user likes Action movies from the 1990s and Sci-Fi movies from the 2010s, the merged range becomes 1988-2022 (entire span), which may dilute the personalization.

**Example**:

- Action: 1988-2002 (user loves 90s action)
- Sci-Fi: 2008-2022 (user loves modern sci-fi)
- Merged: 1988-2022 (basically everything)

**Alternative Approach**: Make separate API calls per genre with distinct year ranges, then merge results. This maintains genre-specific year preferences.

**Recommendation**: Monitor effectiveness in production. If results feel too broad, consider per-genre API calls.

**Priority**: LOW - Monitor in production

---

## Testing Gaps

**Missing Test Coverage**:

1. Unit tests for `extractYear()` edge cases (invalid dates, boundary years)
2. Unit tests for `extractPreferredDecades()` with various decade distributions
3. Unit tests for `calculateEffectiveYearRange()` buffer calculations
4. Integration tests for genre conversion with both movie and TV content
5. E2E tests for year filtering in recommendation API

**Recommended Test Cases**:

```typescript
describe('yearPreferenceDetector', () => {
    describe('extractYear', () => {
        it('handles invalid dates gracefully')
        it('rejects years before 1900')
        it('rejects years after 2050')
        it('handles NaN years from malformed dates')
        it('extracts year from movie release_date')
        it('extracts year from TV first_air_date')
    })

    describe('calculateGenreYearPreferences', () => {
        it('calculates correct median for odd-length arrays')
        it('calculates correct median for even-length arrays')
        it('handles both movie and TV content')
    })

    describe('extractPreferredDecades', () => {
        it('returns empty array when no decades meet MIN_ITEMS_PER_DECADE')
        it('applies 60% coverage threshold correctly')
        it('handles single decade with many items')
    })

    describe('calculateEffectiveYearRange', () => {
        it('returns undefined for low confidence')
        it('applies correct buffer (±2) for high confidence')
        it('applies correct buffer (±5) for medium confidence')
    })
})

describe('genreEngine integration', () => {
    it('applies year filtering to movie recommendations')
    it('applies year filtering to TV recommendations')
    it('handles unified genre conversion correctly for both media types')
})
```

---

## Production Readiness Checklist

- [x] **Fix Bug #1**: Hardcoded media type in genre conversion ✅
- [x] **Fix Bug #2**: Correct median calculation ✅
- [x] **Fix Issue #3**: Add year validation (1900-2050) ✅
- [x] **Optional - Issue #4**: Add debug logging for empty genre data ✅
- [ ] **Write unit tests**: Core functions (extractYear, extractPreferredDecades, calculateEffectiveYearRange)
- [ ] **Integration test**: End-to-end recommendation flow with year filtering
- [ ] **Manual testing**: Verify TV recommendations apply year filtering correctly
- [ ] **Performance test**: Ensure no significant slowdown in recommendation API
- [ ] **Monitor**: Track effectiveness of year filtering in production analytics

---

## Positive Aspects

✅ **Well-structured algorithm**: Decade-based clustering is sound
✅ **Type definitions**: `GenreYearPreference` interface is comprehensive
✅ **Configuration constants**: `YEAR_PREFERENCE_CONFIG` makes tuning easy
✅ **Clean integration**: Minimal changes to existing recommendation flow
✅ **Unified genre system**: Properly integrated with string-based genre IDs
✅ **Confidence levels**: Three-tier system is appropriate
✅ **Documentation**: Excellent inline comments explaining logic

---

## Recommended Action Plan

### Phase 1: Critical Fixes (1 hour)

1. Fix Bug #1: Hardcoded media type in genre conversion
2. Fix Bug #2: Correct median calculation for even-length arrays
3. Fix Issue #3: Add year validation (1900-2050 range with NaN check)

### Phase 2: Optional Enhancements (15 minutes)

1. Add debug logging for empty genre data (Issue #4)

### Phase 3: Testing (30-45 minutes)

1. Write unit tests for core functions (extractYear, median calculation)
2. Manual testing with TV and movie recommendations
3. Verify year filtering works correctly for both media types

### Phase 4: Deploy & Monitor

1. Deploy to production
2. Monitor recommendation quality metrics
3. Gather user feedback
4. Consider per-genre API calls if union merge is too broad

---

## Conclusion

The implementation demonstrates solid understanding of the algorithm and clean code structure. The critical bugs are straightforward to fix and don't require architectural changes. With 1-2 hours of focused work, this feature will be production-ready and provide meaningful personalization improvements to the recommendation system.

**Key Findings Summary**:

- **Bug #1 (Critical)**: Hardcoded 'movie' media type breaks TV recommendations
- **Bug #2 (Medium)**: Incorrect median calculation for even-length arrays
- **Issue #3 (Medium)**: Missing year validation allows invalid data
- **Issue #4 (Optional)**: Add debug logging for troubleshooting

**Recommendation**: Fix Bug #1, Bug #2, and Issue #3 before merging to main branch.
