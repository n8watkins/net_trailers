# /settings Page Audit & Remediation Plan

## Issue 1 – Delete Account Flow Is Non-Functional (High)

- **Where**: `pages/settings.tsx:434-444`, `hooks/useUserData.ts:238-241`
- **Impact**: The UI reports success even though `deleteAccount` is a stub, so user data remains intact and users are misled.
- **Resolution Plan**:
    1. Implement a real `deleteAccount` action in the authenticated session layer (likely in `hooks/useAuthData.ts` or related service) that calls Firebase Auth deletion and cascades Firestore cleanup.
    2. Wrap the call with error handling and explicit guest safeguards; surface actionable failure messaging.
    3. Update the settings handler to await the promise, show loading state, and redirect/log the user out on success.
    4. Add integration coverage (mocking Firebase) to verify success and error paths.

## Issue 2 – Child Safety Mode Toggle Bypasses Guest Restrictions (High)

- **Where**: `pages/settings.tsx:79-103`, `pages/settings.tsx:252-263`
- **Impact**: Keyboard toggles (Space/Enter) skip the pointer guard, letting guests persist restricted settings.
- **Resolution Plan**:
    1. Replace the pointer-only tracking with an interaction flag that covers keyboard events (`onKeyDown`, `onFocus` via `:focus-visible`).
    2. Reset the flag on `pointerup`/`keyup` instead of a zero-delay timeout so it spans the full gesture.
    3. Fallback: block guest preference updates in `guestStoreUpdatePrefs` to guarantee enforcement server-side.
    4. Add a regression test simulating keyboard activation to confirm the modal appears and the underlying state remains unchanged.

## Issue 3 – Account Management Forms Lack Submission Logic (High)

- **Where**: Profile (`pages/settings.tsx:680-699`), Email (`pages/settings.tsx:732-754`), Password (`pages/settings.tsx:772-808`)
- **Impact**: Primary buttons perform no action, leaving core account settings unusable and confusing.
- **Resolution Plan**:
    1. Introduce controlled form state (React Hook Form or local state) with validation for each section.
    2. Connect email/password updates to Firebase Auth helpers; show inline success/error feedback.
    3. Disable submit buttons until inputs are valid and dirty; add loading indicators while awaiting responses.
    4. Cover the flows with unit tests (form submission success/failure) and update manual QA scripts.

## Issue 4 – Clear Data Handler Ignores Async Errors (Medium)

- **Where**: `pages/settings.tsx:423-431`, `hooks/useUserData.ts:228-236`
- **Impact**: `clearAccountData` is async for authenticated users, but the handler is synchronous, so rejections slip through and the UI always confirms success.
- **Resolution Plan**:
    1. Mark `handleClearData` as `async`, await the call, and guard the guest vs auth implementations.
    2. Add guarded loading/disabled states on the confirmation modal to prevent double-submission.
    3. Ensure the toast and modal only resolve after the promise settles; handle errors with actionable messaging.
    4. Write a test that forces a rejected promise to confirm the error path is surfaced.

## Issue 5 – Debug Logging Leaks to Production Console (Low)

- **Where**: `pages/settings.tsx:87-103`, `pages/settings.tsx:518-520`
- **Impact**: Verbose console logs clutter the browser console and can expose internal reasoning in production builds.
- **Resolution Plan**:
    1. Remove or gate the console statements behind an environment check (e.g., `if (process.env.NODE_ENV !== 'production')`).
    2. Use the existing toast system for user-visible feedback instead of console logging.
    3. Add lint rule or CI check (if desired) to prevent console usage outside debug utilities.

## Cross-Cutting Validation

- Re-run `npm run lint`, `npm run type-check`, and `npm run test:coverage` after implementing the fixes.
- Smoke-test the `/settings` page as both guest and authenticated users to ensure modals, redirects, and toasts behave as expected.
