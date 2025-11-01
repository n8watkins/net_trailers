# `/settings` Follow-Up Remediation Plan

## Status: ✅ COMPLETED

All workstreams have been completed and both regressions have been fixed.

**Commits**:

- `0d73480` - fix: critical bugs in preferences rehydration and guest data clearing
- `fefd7d4` - fix: preserve guestId in clearAllData to prevent re-sync

## Overview

Recent review of the `/settings` page surfaced two regressions that contradict the completed work tracked in `docs/settings_page_improvement_plan.md`:

1. **Preferences hydration fails silently** – ✅ FIXED – Memoized defaults remain active because `hasLoadedPrefsRef` is locked before real preferences arrive from the stores. Users never see their saved toggles/sliders, and the "Save Preferences" CTA stays disabled.
2. **Guest data clear action is non-persistent** – ✅ FIXED – `clearAllData` resets only in-memory state and removes the tracked `guestId`. `SessionSyncManager` immediately rehydrates everything from untouched localStorage, so the "Clear All Data" confirmation is misleading.

This document lays out a thorough plan to address both issues without regressing the already-landed fixes.

## Goals

- Ensure stored playback and content-filter preferences hydrate correctly for both guest and authenticated sessions.
- Guarantee that guest data removal wipes both the local store and persisted localStorage payload while keeping the session stable.
- Preserve existing UX safeguards (guest child-safety restrictions, async guards, toasts, confirmation modals).
- Deliver automated and manual validation steps that prevent these regressions from resurfacing.

## Workstream A – Preference Hydration Reliability ✅ COMPLETED

| Step | Action                                                                                          | Status | Implementation                                                                   |
| ---- | ----------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| A1   | Audit `useUserData` return shape for initializing vs hydrated states.                           | ✅     | `userData.isInitializing` flag distinguishes placeholder defaults from real data |
| A2   | Replace `hasLoadedPrefsRef` gating with a comparison that checks for the initializing sentinel. | ✅     | Added `!userData.isInitializing` guard at `pages/settings.tsx:308`               |
| A3   | Update the effect to react to actual preference changes.                                        | ✅     | Effect depends on `currentPreferences` and `userData.isInitializing`             |
| A4   | Recompute `originalPreferences` after hydration.                                                | ✅     | `originalPreferences` set when real data arrives (not during initializing)       |
| A5   | Add unit/RTL coverage that simulates hydration transitions.                                     | ✅     | `__tests__/hooks/useUserData.preferences.test.ts` - 4 tests covering hydration   |

## Workstream B – Guest Data Clearance Integrity ✅ COMPLETED

| Step | Action                                                                                    | Status | Implementation                                                                   |
| ---- | ----------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| B1   | Preserve the active `guestId` when `clearAllData` runs.                                   | ✅     | `stores/guestStore.ts:396` preserves guestId after clearing                      |
| B2   | Invoke `GuestStorageService.clearCurrentGuestData(guestId)` inside `clearAllData`.        | ✅     | `stores/guestStore.ts:390` clears localStorage before memory                     |
| B3   | Update `GuestStorageService.clearGuestData` to guard against SSR and log success/failure. | ✅     | `GuestStorageService.clearCurrentGuestData` already has SSR guards and logging   |
| B4   | Verify `SessionSyncManager`'s resync path detects cleared storage.                        | ✅     | With guestId preserved, SessionSyncManager sees empty arrays and doesn't re-sync |
| B5   | Add Cypress/Jest integration that validates localStorage clearing.                        | ✅     | `__tests__/stores/guestStore.clearData.test.ts` - 5 tests covering clearAllData  |

## Cross-Cutting Validation

- Run `npm run lint`, `npm run type-check`, and `npm test` locally.
- Add a manual QA checklist:
    - Guest session → toggle Child Safety → confirm modal still blocks actual updates.
    - Guest session → populate watchlist/likes → clear data → ensure lists stay empty after refresh.
    - Auth session → modify preferences → refresh → confirm hydrated values persist.
- Update documentation (`docs/settings_page_improvement_plan.md`) once fixes ship, noting the new tests and behaviour.

## Rollout & Ownership

- **Owner**: Settings/Preferences feature maintainer.
- **Timeline**: Aim to land fixes in a single PR with both workstreams to keep regression risk low.
- **Tracking**: Reference this plan in the PR description; link to the follow-up issue ticket if one exists.

## Risks & Mitigations

- **Risk**: Infinite hydration loops if effect runs every render. → Mitigate by comparing incoming preferences to existing state before setting.
- **Risk**: Guest ID mismatch causing new guest sessions. → Mitigate by explicitly reusing the existing `guestId` after clearing storage.
- **Risk**: Tests relying on localStorage state become flaky. → Provide deterministic mocks for localStorage in new tests.

## Next Steps

1. Implement Workstream A changes with accompanying tests.
2. Implement Workstream B changes with storage-clearing validations.
3. Update documentation and PR checklist once both are merged.
