# /settings Page Audit & Remediation Plan

## Status Summary

- ✅ Issue #2 - COMPLETED
- ✅ Issue #4 - COMPLETED
- ✅ Issue #5 - COMPLETED
- ⏳ Issue #1 - PENDING (requires Firebase implementation)
- ⏳ Issue #3 - PENDING (requires form implementation)

## Issue 1 – Delete Account Flow Is Non-Functional (High)

- **Where**: `pages/settings.tsx:434-444`, `hooks/useUserData.ts:238-241`
- **Impact**: The UI reports success even though `deleteAccount` is a stub, so user data remains intact and users are misled.
- **Resolution Plan**:
    1. Implement a real `deleteAccount` action in the authenticated session layer (likely in `hooks/useAuthData.ts` or related service) that calls Firebase Auth deletion and cascades Firestore cleanup.
    2. Wrap the call with error handling and explicit guest safeguards; surface actionable failure messaging.
    3. Update the settings handler to await the promise, show loading state, and redirect/log the user out on success.
    4. Add integration coverage (mocking Firebase) to verify success and error paths.

## Issue 2 – Child Safety Mode Toggle Bypasses Guest Restrictions (High) ✅ COMPLETED

- **Where**: `pages/settings.tsx:79-103`, `pages/settings.tsx:252-263`
- **Impact**: Keyboard toggles (Space/Enter) skip the pointer guard, letting guests persist restricted settings.
- **Resolution Implemented** (commit eac6221):
    1. ✅ Added keyboard event tracking (onKeyDown for Space/Enter, onKeyUp for cleanup)
    2. ✅ Replaced setTimeout(0) with explicit onPointerUp/onKeyUp cleanup
    3. ✅ Added server-side enforcement in guestStore.updatePreferences() to block childSafetyMode changes
    4. ✅ Cleaned up debug console.log statements

## Issue 3 – Account Management Forms Lack Submission Logic (High)

- **Where**: Profile (`pages/settings.tsx:680-699`), Email (`pages/settings.tsx:732-754`), Password (`pages/settings.tsx:772-808`)
- **Impact**: Primary buttons perform no action, leaving core account settings unusable and confusing.
- **Resolution Plan**:
    1. Introduce controlled form state (React Hook Form or local state) with validation for each section.
    2. Connect email/password updates to Firebase Auth helpers; show inline success/error feedback.
    3. Disable submit buttons until inputs are valid and dirty; add loading indicators while awaiting responses.
    4. Cover the flows with unit tests (form submission success/failure) and update manual QA scripts.

## Issue 4 – Clear Data Handler Ignores Async Errors (Medium) ✅ COMPLETED

- **Where**: `pages/settings.tsx:423-431`, `hooks/useUserData.ts:228-236`
- **Impact**: `clearAccountData` is async for authenticated users, but the handler is synchronous, so rejections slip through and the UI always confirms success.
- **Resolution Implemented** (commit 0563282):
    1. ✅ Made handleClearData async with proper await for clearAccountData()
    2. ✅ Added isClearingData state with double-submission prevention
    3. ✅ Added isLoading prop to ConfirmationModal with spinner and disabled states
    4. ✅ Toast and modal only update after promise settles with proper error handling

## Issue 5 – Debug Logging Leaks to Production Console (Low) ✅ COMPLETED

- **Where**: `pages/settings.tsx:87-103`, `pages/settings.tsx:527`
- **Impact**: Verbose console logs clutter the browser console and can expose internal reasoning in production builds.
- **Resolution Implemented** (commits eac6221 + current):
    1. ✅ Removed debug console.log from child safety toggle (eac6221)
    2. ✅ Removed console.log from preferences save handler
    3. ✅ Kept console.error statements for production debugging
    4. ✅ User feedback now exclusively through toast system

## Cross-Cutting Validation

- Re-run `npm run lint`, `npm run type-check`, and `npm run test:coverage` after implementing the fixes.
- Smoke-test the `/settings` page as both guest and authenticated users to ensure modals, redirects, and toasts behave as expected.
