# NetTrailers Production Deployment Guide

This guide walks you through deploying NetTrailers to production using Vercel.

## Prerequisites

- Vercel account (https://vercel.com)
- Firebase project (https://console.firebase.google.com)
- TMDB API key (https://www.themoviedb.org/settings/api)
- Google Gemini API key (https://ai.google.dev) - for smart search
- Resend account (https://resend.com) - optional, for email notifications

## Pre-Deployment Checklist

### 1. Environment Variables

All environment variables must be set in Vercel dashboard. Copy from `.env.example`:

**Required Variables:**

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `TMDB_API_KEY` (server-side only, no NEXT_PUBLIC prefix)
- `NEXT_PUBLIC_GEMINI_API_KEY`
- `CRON_SECRET` (generate with: `openssl rand -base64 32`)
- `ADMIN_UID` (your Firebase UID from Firebase Console → Authentication)
- `FIREBASE_ADMIN_PRIVATE_KEY` (from Firebase service account JSON)
- `FIREBASE_ADMIN_CLIENT_EMAIL` (from Firebase service account JSON)

**Optional Variables:**

- `RESEND_API_KEY` - for email notifications
- `RESEND_SENDER_EMAIL` - defaults to `onboarding@resend.dev`
- `NEXT_PUBLIC_SENTRY_DSN` - for error monitoring
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - for analytics
- `NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS` - defaults to 50
- `NEXT_PUBLIC_APP_NAME` - defaults to "NetTrailer"
- `NEXT_PUBLIC_APP_URL` - your production URL

### 2. Firebase Setup

1. **Enable Authentication Providers:**
    - Go to Firebase Console → Authentication → Sign-in method
    - Enable Google and Email/Password providers

2. **Deploy Firestore Security Rules:**

    ```bash
    # Install Firebase CLI if not already installed
    npm install -g firebase-tools

    # Login to Firebase
    firebase login

    # Initialize Firebase (if not done)
    firebase init firestore

    # Deploy security rules
    firebase deploy --only firestore:rules
    ```

3. **Create Firestore Indexes:**
   The app will create indexes automatically on first use, or you can deploy manually:

    ```bash
    firebase deploy --only firestore:indexes
    ```

4. **Get Firebase Admin SDK Key:**
    - Go to Firebase Console → Project Settings → Service Accounts
    - Click "Generate new private key"
    - Download the JSON file
    - Copy `private_key` to `FIREBASE_ADMIN_PRIVATE_KEY`
    - Copy `client_email` to `FIREBASE_ADMIN_CLIENT_EMAIL`

    **Important**: Format the private key correctly for environment variables:

    ```
    FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
    ```

### 3. Get Your Admin UID

1. Sign up for an account in your deployed app
2. Go to Firebase Console → Authentication → Users
3. Find your user and copy the UID
4. Set as `ADMIN_UID` environment variable in Vercel

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
    vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
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
- [ ] User can sign up/login with Google
- [ ] User can sign up/login with email/password
- [ ] Search works (both regular and AI-powered)
- [ ] Content cards display properly
- [ ] Modal player works with YouTube trailers
- [ ] Collections can be created and managed
- [ ] Child safety mode toggles correctly

### 2. Test Admin Portal

1. Visit `/admin` (only accessible with `ADMIN_UID` set)
2. Verify admin dashboard loads
3. Test email composer (if RESEND_API_KEY set)
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

**Firebase authentication not working**

- Verify all `NEXT_PUBLIC_FIREBASE_*` variables are correct
- Check Firebase Console → Authentication is enabled
- Ensure domain is authorized in Firebase Console → Authentication → Settings → Authorized domains

**TMDB API not working**

- Verify `TMDB_API_KEY` is set (server-side, no NEXT_PUBLIC prefix)
- Test API key at: https://www.themoviedb.org/settings/api

**Admin portal returns 403**

- Verify `ADMIN_UID` matches your Firebase UID exactly
- Check Firebase Console → Authentication → Users for correct UID

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

- [ ] `ADMIN_UID` is set as server-side only (no NEXT_PUBLIC prefix)
- [ ] Firebase security rules deployed
- [ ] `CRON_SECRET` is random and secure (32+ characters)
- [ ] CORS is properly configured in Firebase
- [ ] CSP headers are enabled (already configured in next.config.js)
- [ ] Sentry error monitoring is active
- [ ] Firebase Admin SDK credentials are secure

## Scaling Considerations

### Database (Firestore)

**Free Tier Limits:**

- 1GB storage
- 50K reads/day
- 20K writes/day
- 20K deletes/day

**When to upgrade:**

- Monitor usage in Firebase Console → Usage and billing
- Upgrade to Blaze (pay-as-you-go) when approaching limits

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
- Monitor Firestore usage
- Review cron job logs

**Monthly:**

- Update dependencies: `npm update`
- Check for security vulnerabilities: `npm audit`
- Review analytics and user feedback

**Quarterly:**

- Optimize bundle size
- Review and optimize Firestore queries
- Update API integrations

### Backup Strategy

**Firestore:**

- Enable automatic backups in Firebase Console
- Export important collections periodically
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
