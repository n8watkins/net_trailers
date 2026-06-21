# NetTrailers Production Deployment Guide

This guide walks you through deploying NetTrailers to production using Vercel.

## Prerequisites

- Vercel account (https://vercel.com)
- Turso database (https://turso.tech)
- GitHub OAuth App (https://github.com/settings/developers) - for sign-in
- Brevo account (https://www.brevo.com) - for magic-link / email
- TMDB API key (https://www.themoviedb.org/settings/api)
- Google Gemini API key (https://ai.google.dev) - for smart search

## Pre-Deployment Checklist

### 1. Environment Variables

All environment variables must be set in Vercel dashboard. Copy from `.env.example`:

**Required Variables:**

- `TURSO_DATABASE_URL` (from `turso db show <db> --url`)
- `TURSO_AUTH_TOKEN` (from `turso db tokens create <db>`)
- `AUTH_SECRET` (generate with: `openssl rand -base64 32`)
- `AUTH_GITHUB_ID` (from your GitHub OAuth App)
- `AUTH_GITHUB_SECRET` (from your GitHub OAuth App)
- `AUTH_URL` (your production URL, e.g. `https://your-app.vercel.app`)
- `ADMIN_GITHUB_LOGIN` (the admin's GitHub username, server-side only)
- `BREVO_API_KEY` (for magic-link / transactional email)
- `EMAIL_FROM` (verified sender address)
- `TMDB_API_KEY` (server-side only, no NEXT_PUBLIC prefix)
- `GEMINI_API_KEY` (server-side only, no NEXT_PUBLIC prefix)
- `CRON_SECRET` (generate with: `openssl rand -base64 32`)

**Optional Variables:**

- `EMAIL_PROVIDER` - `brevo` (default) or `resend`
- `RESEND_SENDER_EMAIL` - sender used when `EMAIL_PROVIDER=resend`
- `BLOB_READ_WRITE_TOKEN` - for Vercel Blob image uploads
- `NEXT_PUBLIC_SENTRY_DSN` - for error monitoring
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - for analytics
- `NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS` - defaults to 50
- `NEXT_PUBLIC_APP_NAME` - defaults to "NetTrailer"
- `NEXT_PUBLIC_APP_URL` - your production URL

### 2. Turso Database Setup

1. **Create the database:**

    ```bash
    # Install the Turso CLI if not already installed
    curl -sSfL https://get.tur.so/install.sh | bash

    # Authenticate
    turso auth login

    # Create the database
    turso db create nettrailers

    # Get the connection URL → TURSO_DATABASE_URL
    turso db show nettrailers --url

    # Create an auth token → TURSO_AUTH_TOKEN
    turso db tokens create nettrailers
    ```

2. **Apply the schema:**
   Run the Drizzle migrations against your Turso database:

    ```bash
    npm run db:migrate
    ```

    Use `npm run db:studio` at any time to inspect the database.

### 3. GitHub OAuth App Setup

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Set the **Authorization callback URL** to `<app-url>/api/auth/callback/github`
   (e.g. `https://your-app.vercel.app/api/auth/callback/github`)
3. Copy the **Client ID** → `AUTH_GITHUB_ID`
4. Generate a **Client secret** → `AUTH_GITHUB_SECRET`

### 4. Brevo Email Setup

1. Create a Brevo account and generate an API key → `BREVO_API_KEY`
2. Verify a sender email address in Brevo and set it as `EMAIL_FROM`
3. Magic-link sign-in and notification emails are sent through Brevo by default.
   To use Resend instead, set `EMAIL_PROVIDER=resend` and provide `RESEND_SENDER_EMAIL`.

### 5. Vercel Blob (optional)

If you want user image uploads, create a Vercel Blob store (Vercel Dashboard →
Storage → Create → Blob) and copy its `BLOB_READ_WRITE_TOKEN` into your environment.

### 6. Set Your Admin

1. Set `ADMIN_GITHUB_LOGIN` to the admin's GitHub username (server-side only,
   no NEXT_PUBLIC prefix)
2. Sign in to your deployed app with that GitHub account
3. The session is flagged with `session.user.isAdmin`, unlocking the admin panel

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI:**

    ```bash
    npm install -g vercel
    ```

2. **Login to Vercel:**

    ```bash
    vercel login
    ```

3. **Deploy:**

    ```bash
    # First deployment
    vercel

    # Production deployment
    vercel --prod
    ```

4. **Set Environment Variables:**
    ```bash
    # Set each variable
    vercel env add TURSO_DATABASE_URL production
    vercel env add TMDB_API_KEY production
    # ... repeat for all variables
    ```

### Option 2: Deploy via Vercel Dashboard

1. **Import Project:**
    - Go to https://vercel.com/new
    - Import your GitHub repository
    - Select the `net_trailers` directory

2. **Configure Project:**
    - Framework Preset: Next.js
    - Root Directory: `./`
    - Build Command: `npm run build`
    - Output Directory: `.next`
    - Install Command: `npm install`

3. **Set Environment Variables:**
    - Go to Project Settings → Environment Variables
    - Add all required variables from `.env.example`
    - Important: Set `NODE_ENV=production`

4. **Deploy:**
    - Click "Deploy"
    - Wait for build to complete (~2-3 minutes)

## Post-Deployment Verification

### 1. Test Core Features

- [ ] Homepage loads correctly
- [ ] User can sign in with GitHub
- [ ] User can sign in with an email magic-link
- [ ] Search works (both regular and AI-powered)
- [ ] Content cards display properly
- [ ] Modal player works with YouTube trailers
- [ ] Collections can be created and managed
- [ ] Child safety mode toggles correctly

### 2. Test Admin Portal

1. Visit `/admin` (only accessible when signed in as `ADMIN_GITHUB_LOGIN`)
2. Verify admin dashboard loads
3. Test email composer (if `BREVO_API_KEY` set)
4. Check analytics page
5. Verify debug console works

### 3. Test Community Features

- [ ] Rankings can be created and viewed
- [ ] Forum threads can be posted
- [ ] Polls can be created and voted on
- [ ] Comments and replies work
- [ ] Likes/unlikes work

### 4. Verify Cron Jobs

Cron jobs are configured in `vercel.json`:

- **Daily trending update** - 2 AM UTC

To verify:

1. Go to Vercel Dashboard → Project → Settings → Cron Jobs
2. Confirm jobs are scheduled
3. Check logs after first run

### 5. Monitor Error Logs

If Sentry is configured:

1. Go to https://sentry.io
2. Check for any errors after deployment
3. Monitor for first 24 hours

## Troubleshooting

### Build Fails

**Error: TypeScript errors**

- Run `npm run type-check` locally to identify issues
- Fix errors and commit

**Error: Missing environment variable**

- Verify all required variables are set in Vercel dashboard
- Check for typos in variable names

### Runtime Errors

**Authentication not working**

- Verify `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `AUTH_URL` are correct
- Confirm the GitHub OAuth App callback URL is `<app-url>/api/auth/callback/github`
- For magic-link sign-in, verify `BREVO_API_KEY` and a verified `EMAIL_FROM` sender
- Confirm Turso is reachable (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) since sessions are stored in the database

**TMDB API not working**

- Verify `TMDB_API_KEY` is set (server-side, no NEXT_PUBLIC prefix)
- Test API key at: https://www.themoviedb.org/settings/api

**Admin portal returns 403**

- Verify `ADMIN_GITHUB_LOGIN` matches your GitHub username exactly
- Confirm you are signed in with that GitHub account (`session.user.isAdmin` must be true)

**Cron jobs not running**

- Verify `CRON_SECRET` is set
- Check Vercel Dashboard → Project → Settings → Cron Jobs
- View cron logs in Vercel Dashboard → Project → Logs

### Performance Issues

**Slow initial load**

- Enable Vercel Edge caching
- Check Vercel Analytics for bottlenecks
- Consider enabling Image Optimization

**API rate limiting**

- TMDB allows 40 requests/second
- Implement caching if hitting limits
- Consider Redis for persistent caching

## Security Checklist

- [ ] `ADMIN_GITHUB_LOGIN` is set as server-side only (no NEXT_PUBLIC prefix)
- [ ] Server-side ownership checks enforced in API routes (session-derived user id)
- [ ] `AUTH_SECRET` and `TURSO_AUTH_TOKEN` are kept secret (server-side only)
- [ ] `CRON_SECRET` is random and secure (32+ characters)
- [ ] CSP headers are enabled (already configured in next.config.js)
- [ ] Sentry error monitoring is active
- [ ] Vercel Blob uploads scoped per user (`uploads/{userId}/...`) with type/size validation

## Scaling Considerations

### Database (Turso)

**Free Tier Limits:**

- 500 databases
- 9GB total storage
- ~1 billion row reads/month
- ~25 million row writes/month

**When to upgrade:**

- Monitor usage in the Turso dashboard
- Upgrade to a paid plan when approaching limits

### API Quotas

**TMDB API:**

- Rate limit: 40 requests/second
- No daily limit on free tier
- Consider caching responses

**Gemini API:**

- Free tier: 60 requests/minute
- Consider implementing request queue if hitting limits

### Vercel Limits

**Hobby Plan:**

- 100GB bandwidth/month
- 100 hours build time/month
- Serverless function timeout: 10 seconds

**When to upgrade:**

- Monitor usage in Vercel Dashboard → Analytics
- Upgrade to Pro if exceeding limits

## Maintenance

### Regular Tasks

**Weekly:**

- Check error logs in Sentry
- Monitor Turso usage
- Review cron job logs

**Monthly:**

- Update dependencies: `npm update`
- Check for security vulnerabilities: `npm audit`
- Review analytics and user feedback

**Quarterly:**

- Optimize bundle size
- Review and optimize Drizzle/Turso queries
- Update API integrations

### Backup Strategy

**Turso:**

- Rely on Turso's built-in point-in-time recovery / backups
- Export the database periodically (`turso db dump`)
- Test restore procedures

**Code:**

- GitHub repository is source of truth
- Tag releases: `git tag v1.0.0 && git push --tags`
- Keep production branch stable

## Support

For issues or questions:

- Create issue on GitHub repository
- Check CLAUDE.md for development documentation
- Review README.md for feature documentation

---

**Last Updated:** 2025-12-03
**Version:** 1.0.0
