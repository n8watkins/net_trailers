# Deploying NetTrailers

NetTrailers runs on Cloudflare Workers as the `net-trailers` Worker in the owner's Cloudflare account, built by the OpenNext adapter (`@opennextjs/cloudflare`).
It is served at https://net-trailers.n8builds.dev, a Workers custom domain (`routes` in `wrangler.jsonc`; Cloudflare manages its DNS record and certificate).
The old address, https://nettrailers.n8builds.dev, stays a custom domain of the same Worker only so it can answer a permanent 301 to the new one, keeping the path and query (`worker/canonical.ts`).
The workers.dev address, https://net-trailers.nathancwatkins23.workers.dev, forwards there too, with a 308, so sign-in cookies and magic links all live on one address.
https://net-trailers.vercel.app still serves an old Vercel deployment until the owner turns it into a redirect ("Moving off Vercel" below).

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
They run while the `CRONS_ENABLED` var is `"true"`, and do nothing otherwise; never run them on two platforms against the same database, or the social digest emails people twice.
Set it to `"true"` in `wrangler.jsonc` in the same change that turns off the Vercel project.

## Configuration

Plain values live in `wrangler.jsonc` (`vars`): `APP_ENV`, `CRONS_ENABLED`, `PUBLIC_URL`, `ADMIN_EMAILS` (the admin accounts' sign-in emails, comma-separated) and `EMAIL_FROM`.
Secrets are set with `npx wrangler secret put <NAME>` (it reads the value from stdin) and listed with `npx wrangler secret list`:

| Secret                                   | Used for                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | the database (`turso db show net-trailers --url`, `turso db tokens create net-trailers`) |
| `AUTH_SECRET`                            | Auth.js                                                                                  |
| `TMDB_API_KEY`                           | every movie and TV page                                                                  |
| `GEMINI_API_KEY`                         | smart search and the other AI features                                                   |
| `CRON_SECRET`                            | the Cron Triggers                                                                        |
| `TURNSTILE_SECRET_KEY`                   | the Turnstile check on the email sign-in form (`lib/turnstile.ts`)                       |

Build-time values (inlined into the pages, all public) are set in the deploy workflow: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_SENTRY_DSN`, and `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN` from a repository variable.
For a deploy by hand, export the same values in the shell first.
Never put a `.env` file in the project when building: OpenNext would bundle it into the Worker.

After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen` (CI checks it).

## Email

Every email (sign-in links, digests, forum replies, admin email) goes through Cloudflare Email Service: the `send_email` binding `EMAIL` in `wrangler.jsonc`, from `net-trailers@n8builds.dev` (the `EMAIL_FROM` var), with the display name "NetTrailers".
`n8builds.dev` is onboarded for sending (`npx wrangler email sending list`), so there is no API key, and the binding may send from that one address only (`allowed_sender_addresses`).
Any address on an onboarded domain can send without further setup, so changing the sender is a `wrangler.jsonc` change alone.
Replies to the sender address are not routed anywhere unless an Email Routing rule is added for it.
Before anything is sent, the email gate (`lib/email/gate.ts`) spends one unit from the site-wide caps (200 a day, 2,000 a month) and any per-caller limits (sign-in links: 5 a day per address, 20 per IP), kept in Turso.
Cloudflare includes 3,000 emails a month across the whole account, then charges $0.35 per 1,000; the site cap keeps this app inside that on its own.
Off Workers (`next dev`, `next start`, tests) there is no binding, so nothing is sent; the end-to-end tests write sign-in links to disk instead.

## Content Security Policy

Every page gets a fresh script nonce and its Content-Security-Policy from the proxy (`proxy.ts`, `lib/csp.ts`).
Scripts run only with that nonce, plus what those scripts load themselves (`'strict-dynamic'`: YouTube's player, Google Analytics, Turnstile, lazily loaded chunks), so production allows neither `'unsafe-inline'` nor `'unsafe-eval'` for scripts.
Next puts the nonce on its own scripts; the root layout reads it (which renders every page per request) and passes it to the analytics scripts.
Styles keep `'unsafe-inline'` for React style attributes and MUI.
A new third-party script must be loaded by a nonced script or get the nonce; a new host the browser talks to goes in `connect-src` or `frame-src`.

## Turnstile on sign-in

The email sign-in form runs Cloudflare Turnstile in the background as it opens (managed mode, "interaction-only" appearance: most people see nothing, and a small challenge appears only when Cloudflare is unsure).
Its token goes with the request for a link, and the Auth.js route checks it with siteverify before anything else (`lib/turnstile.ts`), so a request without a valid token never spends the sign-in email limits or sends an email.
The widget is "NetTrailers sign-in" in the Cloudflare dashboard (Turnstile), for `net-trailers.n8builds.dev`, `nettrailers.n8builds.dev` (the old address, until nothing links to it), `net-trailers.nathancwatkins23.workers.dev` and `localhost`.
A new host must be added to the widget's hostnames before the site is served from it, or the challenge fails there and nobody can sign in.
Its site key is public and set in the deploy workflow; its secret is the Worker secret `TURNSTILE_SECRET_KEY`.
The production Worker refuses every request for a link while that secret is missing.
Local runs and the end-to-end tests use Cloudflare's always-pass test keys.

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
Failures log one JSON line with `event`, `reason` and `route`: Auth.js errors (magic-link sign-in) as `auth_error` with the error type (such as `CallbackRouteError` or `EmailSignInError`) and a masked message, and errors thrown in pages, route handlers or the proxy as `unhandled_exception` with the route (`instrumentation.ts`).
They never carry secrets, tokens, OAuth codes or state values, cookies, emails or other personal data.

## Testing a deployment

The deployed Worker uses the production database, so only read-only checks run against it: pages, the TMDB-backed API routes, the changelog, and the locked routes (`/api/cron/*` answers 401 without the secret).
Anything that writes (uploads, cron runs, sign-ups) is tested against a throwaway copy of the database instead: `turso db create net-trailers-cf-test --from-db net-trailers`, run the Worker locally with `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` and that copy's URL and token in the environment, and `turso db destroy net-trailers-cf-test` afterwards.

## Roll back

Run `npx wrangler deployments list`, then `npx wrangler rollback` (or `npx wrangler rollback <version-id>`).
Fix forward afterwards by reverting the commit and deploying again.

## Moving off Vercel

Done on the Cloudflare side: the custom domain, `NEXT_PUBLIC_APP_URL` (email links, sitemap, metadata), the workers.dev forward, email through Cloudflare, and the Cron Triggers.
The Vercel project `net-trailers` stopped deploying on 2026-11-03, and its production deployment became a redirect (step 1), which ended its crons; the Worker now runs them.
The ops decision is to keep Vercel projects as redirect-only (they hold the `*.vercel.app` name), not to delete them.
Owner steps, in order:

1. **Turn the Vercel project into a redirect.**
   In an empty folder, save this as `vercel.json`:
    ```json
    {
        "$schema": "https://openapi.vercel.sh/vercel.json",
        "framework": null,
        "buildCommand": "",
        "installCommand": "",
        "redirects": [
            {
                "source": "/:path(.*)",
                "destination": "https://net-trailers.n8builds.dev/:path",
                "permanent": true
            }
        ]
    }
    ```
    Then run `vercel link --yes --project net-trailers` and `vercel deploy --prod --yes` there.
    Check with `curl -sI https://net-trailers.vercel.app/search?q=x`: a 308 to `https://net-trailers.n8builds.dev/search?q=x`.
    A deployment made before the address change still points at `nettrailers.n8builds.dev`, which then 301s to the new address; redeploying it with this file saves the extra hop.
    The new deployment has no crons, so Vercel's crons stop with it.
    In the Vercel project settings, disconnect the Git repository so a push never redeploys the app there.
2. **Rotate the Turso token**, which also cuts off the old Vercel deployment:
    ```
    turso db tokens invalidate net-trailers
    turso db tokens create net-trailers | npx wrangler secret put TURSO_AUTH_TOKEN --name net-trailers
    ```
    The site errors for the seconds between the two commands.
3. **Delete leftover email secrets:** `npx wrangler secret delete RESEND_API_KEY --name net-trailers`, and remove Resend and Brevo variables from the Vercel project if it keeps any.

## Sign-in and admin

Sign-in is by emailed link only (Auth.js email provider, `auth.ts`); GitHub sign-in was removed on 2026-11-10.
An account is an admin when its sign-in email is in `ADMIN_EMAILS` (`lib/admin.ts`), so the owner signs in with that address like anyone else.
The Worker secrets `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are no longer read and can be deleted with `npx wrangler secret delete <NAME> --name net-trailers`; the GitHub OAuth App can be deleted too.

## Taking it down

Run `npx wrangler delete net-trailers`; the R2 buckets stay until `npx wrangler r2 bucket delete <name>`.
