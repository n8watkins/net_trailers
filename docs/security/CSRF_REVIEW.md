```markdown
# CSRF Review

## Findings

1. **Server actions bypass CSRF (High)**
    - The proxy (`proxy.ts:45-124`) only guards `/api/*` paths. Server actions (App Router POST endpoints that live under page URLs) never pass through it, so they skip `applyCsrfProtection`.
    - Example: `toggleChildSafetyAction` (`lib/actions/childSafety.ts:1-14`). The client settings page (`app/settings/preferences/page.tsx:97-149`) calls this action whenever a signed-in user toggles child safety mode. The server action sets the `nettrailer_child_safety` cookie but never inspects the request origin, so a forged POST from another site can force the victim’s browser to accept attacker-chosen cookie values. Any new server actions that mutate Firestore or user data would inherit the same flaw.

2. **CRON_SECRET disables CSRF for all routes (Medium)**
    - `applyCsrfProtection` treats any request bearing the `CRON_SECRET` as “server-to-server” (`lib/csrfProtection.ts:96-137`) and returns early. Because the proxy unconditionally calls this helper for every non-cron POST/PUT/PATCH (`proxy.ts:52-72`), the single cron secret now bypasses CSRF on unrelated endpoints (password reset, share toggles, etc.).
    - If the secret leaks (logs, preview builds, third-party integrations), an attacker can hit any state-changing route from another origin and succeed without Origin/Referer headers. The secret was meant to protect `/api/cron/*`; keeping it as a global CSRF override significantly increases blast radius.

3. **No regression tests (Low)**
    - `__tests__` contains no coverage for `parseOrigin`, `validateOrigin`, or proxy enforcement (`rg -n "csrf" __tests__`). Without tests, future refactors could reintroduce the prefix-matching bug or another bypass without detection. Jest tests targeting origin parsing/matching and proxy behavior (allowed vs. rejected Origin, CRON_SECRET success/failure) would harden the fixes.

## Open Questions

1. How should server actions satisfy CSRF requirements? Options include removing the `/api/` guard so the proxy runs on all POST/PUT/PATCH requests, or routing server actions through API helpers that explicitly call `applyCsrfProtection`.
2. Is there a legitimate case for using `CRON_SECRET` outside `/api/cron/*`? If yes, would separate secrets per integration reduce risk compared to one global bypass?

## Next Steps

1. Update `proxy.ts` (and/or a dedicated server-action hook) so every state-changing request, including App Router server actions, invokes `applyCsrfProtection`. Detect the `Next-Action` header if needed and enforce Origin/Referer validation there.
2. Restrict the CRON_SECRET bypass to cron endpoints (e.g., only allow the exception when `pathname.startsWith('/api/cron/')`) and rotate the secret after deploying the change.
3. Add Jest coverage for:
    - `parseOrigin` and `validateOrigin` to ensure exact matching stays in place.
    - Proxy behavior for allowed vs. disallowed Origins, CRON_SECRET present/absent, and safe vs. unsafe methods.
```
