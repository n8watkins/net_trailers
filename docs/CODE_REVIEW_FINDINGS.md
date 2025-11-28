# Code Review Findings: Genre-Year Preference Detection

**Date**: 2025-11-27
**Reviewer**: Claude Code
**Status**: ✅ Ready for Production (pending tests)
**Overall Rating**: 9/10

## Executive Summary

All previously reported blocking issues have been resolved in the implementation: unified genre conversion now respects TV-only IDs, the median calculation handles even sample sizes, `extractYear()` validates malformed dates, and debug logging captures empty-genre scenarios. Remaining work revolves around test coverage and monitoring, but no functional bugs are blocking release.

**Estimated Time to Production-Ready**: 30-45 minutes (tests + verification)

---

## Critical Bugs (Now Fixed)

### ✅ Bug #1: Hardcoded Media Type in Genre Conversion

**Location**: `utils/recommendations/genreEngine.ts:265-287`

**Resolution**: The engine now combines movie + TV unified mappings before looking up stored preferences, so TV-only TMDB IDs still resolve to the proper unified genres.

```typescript
const movieUnifiedIds = convertLegacyGenresToUnified([selectedGenre.genreId], 'movie')
const tvUnifiedIds = convertLegacyGenresToUnified([selectedGenre.genreId], 'tv')
const unifiedIds = [...new Set([...movieUnifiedIds, ...tvUnifiedIds])]
```

**Result**: Year ranges are applied consistently for both movie and TV recommendation calls.

---

### ✅ Bug #2: Incorrect Median Calculation

**Location**: `utils/recommendations/yearPreferenceDetector.ts:116-126`

**Resolution**: Even-length samples now average the two middle items (rounded to the nearest year) instead of picking the upper midpoint.

```typescript
const yearMedian =
    sortedYears.length % 2 === 1
        ? sortedYears[Math.floor(sortedYears.length / 2)]
        : Math.round(
              (sortedYears[sortedYears.length / 2 - 1] + sortedYears[sortedYears.length / 2]) / 2
          )
```

**Result**: Reported medians accurately represent both odd and even-sized datasets.

---

## Major Issues (Now Fixed)

### ✅ Issue #3: Missing Year Validation

**Location**: `utils/recommendations/yearPreferenceDetector.ts:40-63`

**Resolution**: `extractYear()` now normalizes the date lookup, validates the parsed year, and rejects anything outside the 1900-2050 range or any `NaN` result.

```typescript
const dateString = content.media_type === 'movie' ? content.release_date : content.first_air_date

if (!dateString) return undefined

const year = new Date(dateString).getFullYear()

if (isNaN(year) || year < 1900 || year > 2050) {
    return undefined
}
```

**Result**: Only realistic years feed into the clustering algorithm, preventing skew from malformed TMDB data.

---

## Minor Issues (Addressed)

### ✅ Issue #4: Missing Logging for Empty Results

**Location**: `utils/recommendations/yearPreferenceDetector.ts:96-144`

**Resolution**: A debug log now fires whenever a genre is skipped due to zero valid years, giving us quick visibility into sparse datasets during development.

```typescript
if (sampleSize === 0) {
    console.debug(`[YearPreferences] Skipping genre ${genreId}: no valid years`)
    continue
}
```

**Result**: Easier troubleshooting when user libraries lack usable release dates.

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

### Phase 1: Testing & Verification (30-45 minutes)

1. Add unit tests for `extractYear`, median calculation, and `calculateEffectiveYearRange`.
2. Exercise the recommendation API with both movie and TV requests to confirm year filters behave identically.
3. Perform manual sanity checks in the UI (movies + TV) using accounts with known decade preferences.

### Phase 2: Deploy & Monitor

1. Deploy the updated build.
2. Monitor recommendation quality metrics, perf, and logs for the new debug statements.
3. Revisit per-genre API call strategy if analytics show the merged range is still too broad.

---

## Conclusion

The implementation now enforces correct media-type conversion, statistically sound medians, and validated year data, so no functional bugs remain. The remaining work is confidence-building: add the targeted tests, manually verify both media types, and monitor analytics post-deploy. Keep an eye on the union year-range strategy, but otherwise this feature is ready to ship once the verification checklist is complete.
