# Child Safety Cookie Regression

## Overview

- `fetchHomeData` (`lib/serverData.ts`) determines whether to request restricted rows by checking the `nettrailer_child_safety` cookie via `getChildSafetyMode`. If the cookie is missing, every server-rendered page fetches unrestricted TMDB data.

## Status: FIXED

**This issue has been resolved.** The Settings screen now properly writes the cookie:

- **Authenticated users**: `handleChildSafetyModeChange` (`app/settings/page.tsx:573-595`) calls `await toggleChildSafetyAction(childSafetyMode)`, which delegates to `setChildSafetyModeCookie` to persist the preference server-side.
- **Guest users**: `handleChildSafetyModeChange` (`app/settings/page.tsx:606-618`) is guarded to prevent any state changes—guests are shown a "create account" modal and the toggle does not flip.

The UI badge, genre dropdowns, and server-rendered rows now stay synchronized because the cookie is written alongside the Zustand store update.

## Original Problem (Historical Context)

- No command originally wrote the cookie:
    - `setChildSafetyModeCookie` (`lib/childSafetyCookieServer.ts`) and `toggleChildSafetyAction` (`lib/actions/childSafety.ts`) had no callers.
    - `setChildSafetyModeClient` (`lib/childSafetyCookieClient.ts`) was exported but never imported.
- The Settings screen only updated Zustand stores, and the guest store stripped `childSafetyMode`. Consequently the UI badge and dropdowns showed "Child Safe" while server-rendered rows remained adult.

## Original Impact (Before Fix)

- Parents believed Child Safety mode was active, yet kids could still see mature titles—critical trust and compliance risk.
- UI indicators disagreed with the actual catalog: badge, genre dropdown, and client-side store showed filtered mode, but refreshed pages displayed horror/thriller rows.
- Any future analytics, caching, or parental features built on the cookie flag would misbehave because the source of truth never updated.
- Returning users (guest or authenticated) reloaded the site, the cookie stayed unset, and server-rendered pages ignored the saved preference.

## Implemented Fix

1. **Synchronized the preference with the cookie.**
    - In `handleChildSafetyModeChange` (`app/settings/page.tsx:573-595`):
        - Authenticated users: calls `await toggleChildSafetyAction(childSafetyMode)` so the server writes the cookie via `setChildSafetyModeCookie`.
        - Guests: prevented from changing the setting entirely—modal prompts account creation instead.
    - The Zustand store updates alongside the cookie write, ensuring UI reacts immediately.
2. **Guest protection.** Guest users are blocked from toggling Child Safety mode (`app/settings/page.tsx:606-618`), preventing the mismatch between client-side state and server-rendered content.

## Validation Checklist

- Toggle Child Safety on/off for guest and authenticated accounts; refresh `/`, `/movies`, `/tv` to confirm restricted genres disappear/return.
- Check that the header badge, genre dropdown titles, and API requests reflect the chosen mode after refresh.
- Run `npm run lint` and `npm run type-check`; optionally add/execute targeted tests for the cookie-writing logic.

## Summary

**Status: RESOLVED** ✓

The `nettrailer_child_safety` cookie is now properly written when authenticated users toggle Child Safety mode in Settings. The fix ensures that:

- Server-rendered data (`fetchHomeData`) respects the user's preference on every page load
- UI indicators (badge, genre dropdowns) stay synchronized with server-fetched content
- Guest users are prevented from changing the setting to avoid client/server mismatches
- The cookie and Zustand store are updated atomically for consistency

See `docs/child-safety-fix-technical-details.md` for comprehensive implementation details.
