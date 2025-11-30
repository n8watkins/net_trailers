# CSRF Audit – December 2025

## Scope

- Review CSRF controls across the proxy (`proxy.ts`), shared middleware (`lib/csrfProtection.ts`), server actions, and representative API routes.
- Validate documentation/tests that assert CSRF compliance (`SECURITY.md`, `__tests__/lib/csrfProtection.test.ts`, `__tests__/security/serverActionCsrf.test.ts`).
- Identify any remaining bypasses or brittle areas that could regress protection.

## Architecture Snapshot

- **Proxy enforcement**: `proxy.ts:45-130` fronts every `/api/*` request, requiring CRON_SECRET for `/api/cron/*` and otherwise invoking `applyCsrfProtection()` on unsafe methods. Payload size/content-type checks ride along.
- **Origin validation**: `lib/csrfProtection.ts:10-108` builds a deterministic allow list and validates Origin → Referer, rejecting prefix/subdomain tricks. Wrappers (`withCsrfProtection`, `withCsrfForAuthRoute`) help route authors.
- **Server actions**: `lib/actions/childSafety.ts:1-27` shows the required pattern—call `headers()` + `validateServerActionOrigin()` before touching mutable state.
- **Regression safety nets**: `__tests__/lib/csrfProtection.test.ts:1-195`, `__tests__/proxy.test.ts`, and `__tests__/security/serverActionCsrf.test.ts:1-107` cover parser edge cases, cron exemptions, and lint for `'use server'` files under `lib/actions/**`.

## Strengths

1. **Exact origin matching** prevents `https://nettrailers.app.attacker.com` style bypasses (`lib/csrfProtection.ts:39-73`) and rejects `Origin: null`.
2. **Cron secret blast radius** is limited; only `/api/cron/*` honors CRON_SECRET, and even those handlers (e.g., `app/api/cron/update-trending/route.ts:1-74`) re-check secrets/admin auth.
3. **Public unsubscribe flow** moved all state change logic to POST, so GET links can be prefetched safely (`app/api/email/unsubscribe/route.ts:22-105`).
4. **Cookies default to SameSite=Lax** for stateful toggles (`lib/childSafetyCookieServer.ts:21-33`), reducing fallout if a handler slips past the proxy.

## Findings

1. **GET performs a write** – `app/api/shares/[shareId]/route.ts:1-88` increments view counts inside its GET handler. Because `applyCsrfProtection()` exempts GET, any external site can inflate analytics.
2. **Server-action lint has blind spots** – `__tests__/security/serverActionCsrf.test.ts:42-66` only globs `lib/actions/**/*.ts`. The repo already has `'use server'` files elsewhere (`app/community/threads/[id]/page.tsx:1-11`), so future stateful actions outside `lib/actions` would bypass both proxy and lint.
3. **Proxy matcher can be sidestepped** – `proxy.ts:49-70` keys solely on `/api/`. A developer adding `app/<segment>/route.ts` with POST/DELETE logic (or a server component mutation) would never hit `applyCsrfProtection()` unless they remember to call `validateServerActionOrigin()` manually.

## Recommendations

1. **Move share view increments off GET**: shift the counter update to a POST (e.g., `/api/shares/[id]/view`) or async job invoked from authenticated clients; leave GET purely read-only to keep the proxy’s “safe method” assumption valid.
2. **Expand the `'use server'` guard**: either update the glob to scan the whole repo (or at least `app/**`) or enforce via ESLint rule that all server actions live under `lib/actions/**`. Include AST-level checks so simple string matches cannot be bypassed.
3. **Detect new non-`/api/` mutations**: add CI that fails if `route.tsx?|ts` outside `app/api` exports POST/PUT/PATCH/DELETE without importing `validateServerActionOrigin()` (or an equivalent guard). This makes “proxy or explicit validation” a hard requirement.
4. **Keep running the dedicated suites**: ensure `npm test -- --testPathPatterns="csrf|proxy|serverAction"` is part of PR pipelines whenever middleware, proxy, or server-action files change to catch regressions early.
