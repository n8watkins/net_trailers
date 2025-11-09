# Review Notes

## 2025-XX-XX Firebase Permissions Review

- `firestore.rules`: Rules only cover `/users/{userId}` docs plus `settings/childSafety`, yet the code reads/writes `users/{uid}/interactions/*`, `/notifications/*`, `/collections/*`, and top-level `/shares/*`, so every one of those paths is implicitly denied. Add explicit `match` blocks mirroring the access patterns (auth-scoped checks for user subcollections, broader validation for `/shares`) and redeploy the rules.
- `utils/firestore/childSafetyPIN.ts:189-197,220-223,289-295`: The PIN helpers set `rateLimitResetAt: null` whenever the rate limit resets, but `isValidPINData` only allows numbers. Those writes fail validation and surface as “Missing or insufficient permissions.” Either stop sending `null` (delete the field) or loosen the rule to tolerate nullish values.
- `app/api/shares/create/route.ts`, `app/api/collections/duplicate/route.ts`, `app/api/cron/update-collections/route.ts` (and any other server handlers calling Firestore): They use the client SDK without a signed-in user, so `request.auth` is `null` in production and rules reject every request. Move these endpoints to the Admin SDK (verifying `x-user-id` or an ID token) or run the Firestore operations on the client with the user’s Firebase Auth session.

## 2025-XX-XX Code Review Snapshot

- `components/recommendations/RecommendedForYouRow.tsx`: `useSessionStore()` destructuring assumes a `userId` field that no longer exists; the hook only exposes `getUserId()`. As a result the row never fetches personalized data. Fix by reading from `getUserId` (same issue in `NotificationBell`, `NotificationPanel`, and `NotificationItem`).
- `hooks/useAuth.tsx`: the Strict Mode double-invoke sets `isMountedRef.current = false` during the first cleanup and never restores it before the second effect runs, so `onAuthStateChanged` short-circuits and auth state stays stuck. Reset the ref (or remove it) when the effect re-runs.
- `components/modals/CustomRowModal.tsx` / `firestore.rules`: guest sessions call `CustomRowsFirestore.createCustomRow`, but Firestore rules require `request.auth.uid`. Guest-mode custom rows therefore fail unless anonymous auth is introduced—either gate the feature or provide an authenticated path.
- `app/api/cron/update-collections/route.ts`: falls back to a default `dev-secret` when `CRON_SECRET` is unset, meaning the cron can be triggered by anyone who knows the placeholder. Fail closed if the secret is missing.
- `__tests__/hooks/useSearch.pagination.test.ts`: all meaningful pagination tests are `it.skip`, so the regression that motivated `Math.ceil` isn’t actually covered. Rework the Zustand mocks so these tests run (or replace them) to keep pagination guarded.

## Infinite Row Dedupe (components/content/Row.tsx)

- `loadMoreContent` depends on `allContent` but the `useCallback` excludes it, so the dedupe set can be stale and append duplicates after consecutive fetches.
- Fix by including `allContent` (and any other captured state) in the dependency array or by using functional `setAllContent` logic exclusively.

## Session Sync Effect (components/utility/SessionSyncManager.tsx)

- Final `useEffect` omits `authStore`/`guestStore` from its deps even though it reads their state.
- After `authStore.syncWithFirebase` populates `userId`, the effect never re-evaluates, so `needsSync` stays `true` and Firebase sync can loop; guest data may also fail to load.
- Add the relevant store references (or specific primitives) to the dependency list.

## Filtered Row Reorder (components/modals/RowEditorModal.tsx)

- Drag operations act on the filtered subset (`filteredRows`), so reindexing while “Enabled only” or similar filters are active corrupts the overall order.
- Disabled/hidden rows keep stale order values and later jump unexpectedly. Either disable drag when filters are active or recompute indexes against the full `displayRows`.

## Voice Input Stream Leak (hooks/useVoiceInput.ts)

- `checkMicrophonePermission` acquires a `MediaStream` via `getUserMedia` but never stops tracks if permission is granted, leaving the microphone active even when recognition does not start.
- Release the stream immediately after prompting (`stream.getTracks().forEach(track => track.stop())`) in both success and error paths.

## Gemini API Logging (app/api/generate-row/route.ts)

- The route logs full user prompts and Gemini responses, which can contain sensitive text. Those logs appear in production unless explicitly filtered.
- Gate or remove the logging; avoid logging the parsed response body altogether.

## Smart Search Cache/Ratelimit (app/api/smart-search/route.ts)

- Uses in-memory `Map` objects for caching and rate limiting, which do not persist in serverless environments. Provides a false sense of protection and wastes memory.
- Consider `unstable_cache`, an external cache, or remove the mechanism and document the limitation.
