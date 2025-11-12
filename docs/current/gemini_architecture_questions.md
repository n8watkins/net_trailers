# Gemini Architecture Questions

1. **How do we enforce Child Safety Mode server-side for Gemini/TMDB powered endpoints?**
    - Current APIs such as `app/api/search/route.ts` and `app/api/custom-rows/[id]/content/route.ts` trust a `childSafetyMode` query parameter that any browser can toggle. We need a canonical server check (middleware or shared helper) that derives the preference from the authenticated user/session before calling Gemini or TMDB, otherwise the protection is bypassed with a URL edit.

2. **What is the plan for the unauthenticated `/api/ai-watchlist-style` endpoint?**
    - Decide whether it should be gated with `withAuth` + `consumeGeminiRateLimit`, or removed if the feature remains unused. Today it’s publicly callable, so either add auth + quotas or explicitly retire it.

3. **How do we remove the client-controlled child-safety flag once the server logic exists?**
    - After wiring the canonical source of truth server-side, delete the `childSafetyMode` query parameter from the frontend so users can’t override enforcement. Document the migration steps so API consumers update in lock step.
