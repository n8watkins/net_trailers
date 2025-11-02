# Child Safety Cookie Regression

## Overview

- `fetchHomeData` (`lib/serverData.ts`) determines whether to request restricted rows by checking the `nettrailer_child_safety` cookie via `getChildSafetyMode`. If the cookie is missing, every server-rendered page fetches unrestricted TMDB data.
- No command currently writes the cookie:
    - `setChildSafetyModeCookie` (`lib/childSafetyCookieServer.ts`) and `toggleChildSafetyAction` (`lib/actions/childSafety.ts`) have no callers.
    - `setChildSafetyModeClient` (`lib/childSafetyCookieClient.ts`) is exported but never imported.
- The Settings screen still updates only the Zustand stores (`app/settings/page.tsx:745-760`), and the guest store strips `childSafetyMode` (`stores/createUserStore.ts:432-441`). Consequently the UI badge and dropdowns show "Child Safe" while server-rendered rows remain adult.

## Impact

- Parents believe Child Safety mode is active, yet kids still see mature titles—critical trust and compliance risk.
- UI indicators disagree with the actual catalog: badge, genre dropdown, and client-side store show filtered mode, but refreshed pages display horror/thriller rows.
- Any future analytics, caching, or parental features built on the cookie flag will misbehave because the source of truth never updates.
- Returning users (guest or authenticated) reload the site, the cookie stays unset, and server-rendered pages ignore the saved preference.

## Recommended Fix

1. **Synchronise the preference with the cookie.**
    - On save in `handleSavePreferences` (`app/settings/page.tsx`):
        - Authenticated users: call `await toggleChildSafetyAction(childSafetyMode)` so the server writes the cookie.
        - Guests: call `setChildSafetyModeClient(childSafetyMode)` so the browser cookie mirrors their local store.
    - After the existing Zustand updates, ensuring UI still reacts immediately.
2. **Align on hydration.** Once preferences load, compare the store value with the cookie and, if different, write it using the same helpers. This keeps returning users in sync before any server fetch.
3. **Optional guardrails.** Consider logging or asserting if the cookie and store diverge to catch future regressions early.

## Validation Checklist

- Toggle Child Safety on/off for guest and authenticated accounts; refresh `/`, `/movies`, `/tv` to confirm restricted genres disappear/return.
- Check that the header badge, genre dropdown titles, and API requests reflect the chosen mode after refresh.
- Run `npm run lint` and `npm run type-check`; optionally add/execute targeted tests for the cookie-writing logic.

## Summary

Without writing `nettrailer_child_safety`, Child Safety mode is effectively disabled wherever server-rendered data matters. Writing the cookie alongside the store update—and re-aligning on hydration—will keep server fetches, UI indicators, and downstream analytics honest.
