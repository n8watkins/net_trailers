# Net Trailers handoff

## Current state and open work (2026-10-27): start here

This section is the entry point for a fresh session.
Where older docs disagree with it, this section wins.

### What this is and where it lives

Net Trailers is a Netflix-style movie and TV discovery app: TMDB browsing and trailers, Gemini-powered smart search, collections, rankings, polls and notifications.
Stack: Next.js 16, React 19, Turso (libSQL) with Drizzle, Auth.js (GitHub and magic link), Sentry, Tailwind 4 plus MUI.
Live at https://net-trailers.vercel.app (Vercel; every push to `main` deploys to production).
The planned address is `trailers.n8builds.dev`; that DNS step belongs to the owner and is not done.
Setup and features: `README.md`; architecture and conventions for agents: `CLAUDE.md`; deploy and env vars: `DEPLOYMENT.md`; AI endpoints: `docs/gemini-api-usage.md`.

### Status today

- The site is up (HTTP 200; the first response took about 6 seconds in the audit and 2.9 seconds on 2026-10-27).
- The last change that reached production is from June 2026 (the Firebase to Turso migration, PR #2).
  PR #3 (MIT license) and PR #4 (plain hyphens instead of em dashes) are merged but **not live yet**: Vercel refused both builds with "Deployment rate limited - retry in 24 hours".
  The next push to `main` after the limit lifts deploys them.
- PR #5 (switch every AI feature to `gemini-3.5-flash-lite`) is **open on purpose** until a new Gemini key exists.
- The repo has no GitHub Actions CI.
  Before merging, run `npx tsc --noEmit`, `npx eslint .`, `npx jest --ci` and `npx next build` locally.
  On 2026-10-27 all four passed (lint: 0 errors, 340 warnings; tests: 283 passed, 18 skipped).
- Two stray hosting integrations report failures on every push, and neither serves the app:
  GitHub Pages (`pages-build-deployment`, failing its build) and a Netlify site (`silly-palmier-862249`, "Deploy Preview failed").
  The owner should switch both off; agents must not change hosting settings.
- Analytics go to a separate GA4 property (`NEXT_PUBLIC_GA_MEASUREMENT_ID`, loaded in `components/utility/Analytics.tsx`) plus Vercel Analytics.
  The owner may later unify it with the other n8builds properties.

### Open problems, highest first

1. **Security, HIGH: `next` 16.2.7 has known critical advisories on a live public site.**
   GitHub's advisory database (checked 2026-10-27) lists 5 critical, 6 high, 8 moderate and 1 low advisories for the locked `next` 16.2.7, including unauthenticated remote code execution through `use cache`, Image Optimization and `next/og`.
   All are fixed in `next` 16.4.1 and later.
   `npm audit --omit=dev` reports 31 production advisories in total (5 critical, 16 high), also covering `next-auth`/`@auth/core`, `@sentry/nextjs`, `@vercel/blob`, `@tiptap/*`, `zod` and others.
   Reproduce: `npm ls next` shows 16.2.7; `npm audit --omit=dev`.
   Fix: upgrade `next` and `eslint-config-next` to the latest 16.x (16.4.3 on 2026-10-27), then `npm audit fix` for the rest without `--force`, then lint, type check, tests, `next build`, merge, and check the live site (home page, a title modal with a trailer, sign-in, smart search).
2. **AI features need a new Gemini key.**
   Every AI endpoint (`app/api/gemini/analyze`, `smart-suggestions`, `ai-suggestions`, `generate-collection-name`, `generate-ranking-content`) calls Gemini through `lib/geminiRouter.ts`, which reads the server-side `GEMINI_API_KEY`.
   The production key is set in Vercel (all environments) and is 342 days old; whether it still works has not been verified.
   The key in local `.env.local` is rejected by Google (HTTP 400).
   Reproduce locally without printing the key: `K=$(grep '^GEMINI_API_KEY=' .env.local | cut -d= -f2-); curl -s -o /dev/null -w "%{http_code}\n" "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite?key=$K"`.
   On production: sign in, run a smart search, and look for `[Gemini Router] ✗ Error` in the Vercel runtime logs.
3. **Vercel builds on Node 22.**
   The owner moved the other projects to Node 24.
   Node 22 is supported until April 2027, so this is lower priority than the `next` upgrade.
   `package.json` has no `engines` field, so the version comes from the Vercel project setting (owner's step), optionally pinned with `"engines": { "node": "24.x" }` once the build is checked on 24.
4. **Code and dependency debt** (cleanup list, in order):
    1. Dependencies beyond the security fixes: `@types/node` is 18 while the runtime is 22; `@google/generative-ai` is in `dependencies` but nothing imports it (remove it); `@mui/material` 5 (latest 9) sits alongside Tailwind and is a candidate for removal; `@babel/core` is pinned to 7.28.4 for no recorded reason.
    2. Add a GitHub Actions CI workflow (type check, lint, tests, build) so PRs get a real gate.
    3. Firebase leftovers after the Turso migration: `storage.rules`, `FIREBASE_CONFIG` in `config/constants.ts`, Firebase wording in `services/storageAdapter.ts` and several API routes, and Firebase references in `AGENTS.md`.
    4. Dead docs: 32 Markdown files at the root and 116 under `docs/`, most of them finished plans, reviews and migration notes (`MIGRATION_*.md`, `RANKING_*.md`, `docs/*CODE_REVIEW*.md`, `TODO.md`, `PLAN.md`, `docs/current/current-priorities.md`).
       Move them to `docs/archive/` or delete them, keeping `README.md`, `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `DEPLOYMENT.md`, `CHANGELOG.md` and this file.
       `docs/INDEX.md` (last updated November 2025) has mojibake in its headings; rewrite or remove it.
    5. Lint warnings: 340, almost all `@typescript-eslint/no-explicit-any`.

### Blocked on the owner

- A new Gemini API key, set as `GEMINI_API_KEY` in the Vercel project env (Production and Preview) and in `.env.local`; never with a `NEXT_PUBLIC_` prefix.
- Switching Vercel to Node 24 (project setting).
- Turning off the GitHub Pages and Netlify integrations.
- The `trailers.n8builds.dev` DNS record and Vercel domain.
- Optionally, deciding whether to unify the GA4 property.

### Next steps in order

1. Upgrade `next` to the latest 16.x and clear the other production advisories (problem 1); verify on the live site.
2. Owner adds the new Gemini key and checks it with the curl above.
3. Merge PR #5, then on the live site sign in, run a smart search and generate a collection name; the Vercel logs should show `[Gemini Router] ✓ Success with gemini-3.5-flash-lite`.
4. Confirm PRs #3 and #4 are live once Vercel deploys again.
5. Add CI, then work through the cleanup list (problem 4).
6. Move Vercel to Node 24 once the build passes on it.
