# Deploying NetTrailers

NetTrailers runs on Cloudflare Workers as the `net-trailers` Worker in the owner's Cloudflare account, built by the OpenNext adapter (`@opennextjs/cloudflare`).
Until a custom domain is attached, it is served at https://net-trailers.nathancwatkins23.workers.dev, and https://net-trailers.vercel.app keeps serving the Vercel deployment.

## How it fits together

- `npm run build:worker` runs `next build` (Turbopack) and turns its output into `.open-next/`: the server bundle (`.open-next/worker.js`) and the static assets.
- `worker/index.ts` is the Worker's entry point (`main` in `wrangler.jsonc`).
  It serves uploaded images, runs the Cron Triggers, and passes everything else to Next.
- **Database:** Turso through `@libsql/client` (`db/index.ts`), unchanged.
- **Uploads:** images go to the R2 bucket `net-trailers-uploads` (binding `UPLOADS`), replacing Vercel Blob.
  `/api/upload` stores them under `uploads/<userId>/<uuid>.<ext>` and returns the site-relative path `/uploads/...`, which `worker/uploads.ts` serves (immutable, `nosniff`, sandboxed).
  Only JPEG, PNG, WebP, GIF and AVIF are accepted, because uploads are served from the site's own origin (`lib/uploads.ts`).
  The Vercel Blob store was empty on 2026-11-03, so nothing had to be copied.
- **Images:** `next/image` resizes through the Cloudflare Images binding (`IMAGES`); uploads reach the optimizer through the same handler.
- **Caching:** the API routes' `export const revalidate` and the revalidated TMDB fetches live in the R2 bucket `net-trailers-opennext-cache`, with a regional Cache API layer and a Durable Object queue (`DOQueueHandler`) for background revalidation (`open-next.config.ts`).
  Nothing calls `revalidateTag` or `revalidatePath`, so there is no tag cache.
- **Calls to its own API:** the home page and shared-collection pages fetch the app's own API routes.
  `lib/selfFetch.ts` sends them through the service binding `WORKER_SELF_REFERENCE` instead of the public internet.
- **URLs:** links and those calls use the request's own origin (`lib/requestOrigin.ts`), so nothing reads `VERCEL_URL` or `VERCEL_ENV` any more, and the CSRF check always allows same-origin requests.
  `APP_ENV=production` (a `wrangler.jsonc` var) marks the Worker.
- **Analytics:** Cloudflare Web Analytics (`components/utility/WebAnalytics.tsx`) replaces Vercel Analytics once `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN` is set at build time; Google Analytics (`@next/third-parties`) is unchanged.
- **Changelog:** `/api/changelog` imports `CHANGELOG.md` at build time (a raw module, `next.config.js`), because the Worker has no filesystem.
  `/api/debug/next-logs` reads a local flag file only under `next dev` and answers 403 everywhere else.

## Cron Triggers

The three Vercel crons are Cron Triggers with the same times (`worker/crons.ts`), each calling its `/api/cron/*` route in-process with `Authorization: Bearer $CRON_SECRET`:

| Route                                | Vercel      | Worker        |
| ------------------------------------ | ----------- | ------------- |
| `/api/cron/update-trending`          | `0 2 * * 1` | `0 2 * * MON` |
| `/api/cron/refresh-collection-cache` | `0 2 * * 0` | `0 2 * * SUN` |
| `/api/cron/social-digest`            | `0 2 * * 3` | `0 2 * * WED` |

Weekdays are named because Cloudflare counts them from 1 = Sunday, so Vercel's numbers would run a day early or be refused.
They do nothing while the `CRONS_ENABLED` var is `"false"`: Vercel still runs the same crons against the same database, and two social digests at once could email people twice.
Set it to `"true"` in `wrangler.jsonc` in the same change that turns off the Vercel project.

## Configuration

Plain values live in `wrangler.jsonc` (`vars`).
Secrets are set with `npx wrangler secret put <NAME>` (it reads the value from stdin) and listed with `npx wrangler secret list`:

| Secret                                                                           | Used for                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`                                         | the database (`turso db show net-trailers --url`, `turso db tokens create net-trailers`) |
| `AUTH_SECRET`                                                                    | Auth.js                                                                                  |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`                                           | GitHub sign-in (the OAuth App's callback must be `<app-url>/api/auth/callback/github`)   |
| `ADMIN_GITHUB_LOGIN`                                                             | the admin's GitHub login                                                                 |
| `BREVO_API_KEY`, `EMAIL_FROM` (or `EMAIL_PROVIDER=resend` with `RESEND_API_KEY`) | magic-link and notification email                                                        |
| `TMDB_API_KEY`                                                                   | every movie and TV page                                                                  |
| `GEMINI_API_KEY`                                                                 | smart search and the other AI features                                                   |
| `CRON_SECRET`                                                                    | the Cron Triggers                                                                        |

Build-time values (inlined into the pages, all public) are set in the deploy workflow: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_SENTRY_DSN`, and `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN` from a repository variable.
For a deploy by hand, export the same values in the shell first.
Never put a `.env` file in the project when building: OpenNext would bundle it into the Worker.

After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen` (CI checks it).

## Automatic deploys

`.github/workflows/deploy.yml` builds and deploys on every push to `main`, and on demand from the Actions tab.
It needs a `CLOUDFLARE_API_TOKEN` repository secret: a Cloudflare API token made from the "Edit Cloudflare Workers" template, limited to the owner's account.
Until that secret exists, the workflow builds and then skips the deploy with a notice.

## Deploy by hand

Log in once with `npx wrangler login`, export the build-time values, then run `npm run deploy`.
To check the Worker locally, run `npm run preview` and open http://localhost:8787.
To try the crons locally, run `npx wrangler dev --test-scheduled --var CRONS_ENABLED:true` after a build and open `http://localhost:8787/__scheduled?cron=0+2+*+*+MON`.

## Reading the logs

Workers Logs keeps every request (`observability` in `wrangler.jsonc`, `head_sampling_rate: 1`).
In the Cloudflare dashboard, open Workers & Pages, then the `net-trailers` Worker, then Logs.
To stream them live, run `npx wrangler tail net-trailers --format pretty`.
`--search` matches log messages only, not request URLs, so use `--status error` or no filter to see requests.
Failures log one JSON line with `event`, `reason` and `route`: Auth.js errors (GitHub and magic-link sign-in) as `auth_error` with the error type (such as `CallbackRouteError` or `EmailSignInError`), a masked message and the provider's OAuth error code, and errors thrown in pages, route handlers or the proxy as `unhandled_exception` with the route (`instrumentation.ts`).
They never carry secrets, tokens, OAuth codes or state values, cookies, emails or other personal data.

## Testing a deployment

The deployed Worker uses the production database, so only read-only checks run against it: pages, the TMDB-backed API routes, the changelog, and the locked routes (`/api/cron/*` answers 401 without the secret).
Anything that writes (uploads, cron runs, sign-ups) is tested against a throwaway copy of the database instead: `turso db create net-trailers-cf-test --from-db net-trailers`, run the Worker locally with `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` and that copy's URL and token in the environment, and `turso db destroy net-trailers-cf-test` afterwards.

## Roll back

Run `npx wrangler deployments list`, then `npx wrangler rollback` (or `npx wrangler rollback <version-id>`).
Fix forward afterwards by reverting the commit and deploying again.

## Moving off Vercel

1. Set the remaining secrets (the table above).
2. Pick the domain (the planned `trailers.n8builds.dev`), add it as a Workers custom domain in `wrangler.jsonc`, and point the GitHub OAuth App's callback at it.
3. Set `NEXT_PUBLIC_APP_URL` in the deploy workflow to the new address, and `CRONS_ENABLED` to `"true"`.
4. Turn off the Vercel project (its crons stop with it), leaving a redirect from net-trailers.vercel.app if people use that address.
5. Remove `vercel.json` afterwards; `__tests__/worker/crons.test.ts` compares against it, so move the schedules into the test then.

## Taking it down

Run `npx wrangler delete net-trailers`; the R2 buckets stay until `npx wrangler r2 bucket delete <name>`.
