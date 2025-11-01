# Search Pagination Follow-Up Actions

## Context

A recent audit of the search pagination fixes surfaced a few gaps that prevent the new safeguards from catching future regressions or correctly signalling partial failure states. This document outlines targeted follow-up work to harden the feature and keep the UX consistent.

## Action Items

### 1. Strengthen Pagination Regression Tests

- **Problem**: `__tests__/hooks/useSearch.pagination.test.ts` currently verifies only the initial page fetch. If the multi-page loop is removed or the Math.ceil fix regresses, the tests still pass.
- **Plan**:
    1. Refactor the hook exports (or introduce a lightweight test-only helper) so tests can trigger `loadQuickSearchResults`/`loadAllResults` directly.
    2. Extend the tests to assert that `/api/search?page=2` (and higher) is requested when `total_results > 20`.
    3. Add a failing test for the pre-fix behaviour (set total_results = 25, ensure the second fetch happens), then confirm it passes with the current fix.
    4. Keep the existing Math.ceil unit coverage as supplemental safety.

### 2. Preserve Accurate `hasAllResults` State

- **Problem**: `hooks/useSearch.ts:325` now forces `hasAllResults: true` at the end of `loadAllResults`, even when we break out early (e.g., TMDB 500-page cap, API error). That informs the UI that all results are loaded when they may not be.
- **Plan**:
    1. Replace the hard-coded `true` assignment with `allResults.length >= search.totalResults`.
    2. Introduce an optional `isTruncated` marker when early exit conditions trigger:
        - `currentPage > TMDB_MAX_PAGE`
        - `response.ok === false`
        - `AbortError`
    3. Surface the truncated state in the UI (e.g., toast or banner) so the user can retry or narrow the search.
    4. Add regression coverage verifying `hasAllResults` remains `false` when truncation occurs.

### 3. Route Pagination Logging Through Debug Utilities

- **Problem**: The new `console.log/warn/error` calls re-introduce noisy logging in production, undoing earlier clean-up work.
- **Plan**:
    1. Wrap all pagination logging in the existing `guestLog` / `authLog` pattern or add a dedicated `searchLog` helper that respects log levels.
    2. Gate verbose logs behind `process.env.NODE_ENV !== 'production'` (or a dedicated feature flag) so production builds stay quiet.
    3. Add a lint rule or husky check to prevent raw `console.*` usage outside approved wrappers.

## Validation Checklist

- [ ] Extend pagination tests to assert multi-page fetches.
- [ ] Re-run the suite with the Math.ceil fix temporarily disabled to ensure the new tests fail.
- [ ] Update `loadAllResults` to compute `hasAllResults` truthfully and set a truncated flag on early exits.
- [ ] Add smoke coverage that asserts the truncated flag stays `false` for successful full loads.
- [ ] Replace raw `console.*` calls with the debug logger and verify lint passes with `no-console` enabled.

## Next Steps

Tackle the items above in a single PR so the tests evolve alongside the behavioural changes. Reference this doc and the original pagination bug commits (4be175f, 02c5d26) in the PR description for traceability.
