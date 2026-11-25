# Security

This document describes what NetTrailers does today to protect accounts and data.
Every statement names the file that makes it true, so you can check it.
The short version for visitors is on the site at `/security`; its text lives in `app/security/content.ts`.

NetTrailers is a portfolio project and has not had an independent security audit.

**Last verified against the code:** November 2026.

## Reporting a problem

Open an issue at <https://github.com/n8watkins/net_trailers/issues/new> and leave out anything that would help someone exploit the problem.
GitHub private vulnerability reporting is not turned on for this repository.

## Signing in

- There are no passwords.
  Sign-in is a link emailed to you, or GitHub when it is configured (`auth.ts`, `lib/authConfig.ts`).
  The live site offers both.
- Emailed links expire after 24 hours (`auth.ts`, `maxAge`) and work once: the Auth.js Drizzle adapter deletes the token row when it is used.
- Asking for a link must first pass a Cloudflare Turnstile check on the server.
  The check fails closed: a missing token, a network error or anything but `success: true` refuses the request (`lib/turnstile.ts`, `app/api/auth/[...nextauth]/route.ts`).
- Sign-in emails are limited per address (5 a day by default), per caller IP (20 a day by default) and site-wide (`lib/email/signInLimits.ts`, `lib/email/gate.ts`).
  Addresses and IPs are stored only as salted hashes (`lib/durableLimit.ts`).
- A GitHub sign-in is accepted only when GitHub reports a primary, verified email (`lib/githubAuth.ts`), because it links to the existing account with that email.
- Sessions are database sessions (`auth.ts`, `session: { strategy: 'database' }`) carried by the Auth.js HttpOnly cookie.
  The client sends no bearer or ID tokens.
- Admin access needs a signed-in session whose email is in `ADMIN_EMAILS` (`lib/admin.ts`, `utils/adminMiddleware.ts`).
  A GitHub username never grants admin.

## Your data

- The browser never talks to the database.
  The Turso client (`db/index.ts`) is server-only; every read and write goes through a route handler or server code.
- Routes that change account data take the user from the session with `withAuth` (`lib/auth-middleware.ts`), never from the request body or query.
  Examples: `app/api/watch-history/route.ts`, `app/api/child-safety/pin/route.ts`, `app/api/notifications/[id]/route.ts`, `app/api/collections/duplicate/route.ts`, `app/api/upload/route.ts`.
- Rankings and forum threads can be edited or deleted only by their author, or by an admin (`db/queries/rankings.ts`, `db/queries/threads.ts`, `app/api/rankings/[id]/delete/route.ts`).
- Public reads honour profile visibility: a public watch history is returned only when the owner turned it on (`app/api/watch-history/route.ts`).
- Uploaded images go to a Cloudflare R2 bucket under `uploads/<userId>/`.
  Only JPEG, PNG, WebP, GIF and AVIF are accepted, up to 5 MB, and SVG is refused because it could carry script.
  You can delete only your own uploads (`lib/uploads.ts`, `app/api/upload/route.ts`).
- Collection names and descriptions have tag-shaped text stripped (`services/userListsService.ts`), emoji are validated, and React escapes what it renders.
  Custom HTML in admin emails is cleaned with `sanitize-html` (`lib/email/email-validation.ts`).
- Sentry reports have the email address and IP address removed (`instrumentation-client.ts`, `instrumentation.ts`).
- `console.log` is removed from production builds (`next.config.js`, `removeConsole`).

## Limits and checks on the API

- State-changing API requests (POST, PUT, PATCH, DELETE) must carry an Origin or Referer that matches this site exactly (`proxy.ts`, `lib/csrfProtection.ts`).
  See `docs/security/CSRF_STATUS.md`.
- API requests that declare a body over 1 MB, or over 500 KB for JSON, are refused with 413.
  Unexpected content types are refused with 415 (`proxy.ts`).
  The check reads the `Content-Length` header.
- Live AI searches have a daily cap per visitor and a site-wide cap, counted in the `ai_usage` table and reset at 00:00 UTC (`lib/aiQuota.ts`).
  The defaults are 10 per visitor and 300 for the site, and both can be changed with environment variables.
- Scheduled jobs under `/api/cron/*` and `/api/internal/*` need `CRON_SECRET`, compared in constant time with `crypto.timingSafeEqual` (`lib/cronAuth.ts`, `proxy.ts`).
  See `docs/security/CRON_SECRET_SCOPE.md`.
- The other rate limits are durable counters in the database, so they hold across Worker instances and deploys (`lib/durableLimit.ts`).

## Browser protections

- The Content Security Policy is built per request with a fresh script nonce and `strict-dynamic` (`lib/csp.ts`, applied in `proxy.ts`).
  Production allows no `unsafe-eval` and no inline scripts without the nonce.
  It also sets `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` and `frame-ancestors 'none'`.
  Styles still allow `unsafe-inline`.
- Other headers, set in `next.config.js`:

| Header                      | Value                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| `X-Frame-Options`           | `DENY`                                                             |
| `X-Content-Type-Options`    | `nosniff`                                                          |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                  |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`                              |
| `Permissions-Policy`        | `camera=(), microphone=(self), geolocation=(), interest-cohort=()` |
| `X-XSS-Protection`          | `1; mode=block` (legacy)                                           |

- Images may be loaded from any HTTPS host under the CSP (`img-src`), while the image optimizer accepts only the hosts listed in `next.config.js`.

## Child safety PIN

- The optional PIN is 4 to 6 digits.
  Only a bcrypt hash with 10 rounds is stored, and it is never returned (`types/childSafety.ts`, `db/queries/childSafety.ts`).
- After 5 wrong PINs, verify, change and remove are refused until the current 5-minute window ends.
  The count is kept in the database and a correct PIN resets it (`app/api/child-safety/pin/route.ts`).
- A correct PIN is remembered only in the open page, so it is asked for again after a reload (`stores/childSafetyStore.ts`).
- Child safety mode itself is a plain cookie (`lib/childSafetyCookieServer.ts`).
  The PIN guards the settings in the app; it does not make the mode tamper-proof against someone who edits their own cookies.

## Logging

- Auth.js errors are logged as an error type and a masked message only, and `debug` stays off because it prints cookies (`lib/log.ts`).

## Not covered

- No independent audit or penetration test has been done.
- Input limits are applied route by route, not by one global validator.
- The request size check reads `Content-Length`, so it does not stop a chunked body.

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Auth.js documentation](https://authjs.dev)
- [Next.js security headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
