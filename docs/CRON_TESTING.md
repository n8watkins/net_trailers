# Cron Job Testing on Localhost

This document explains how to test cron jobs locally since Vercel cron scheduling only works in production.

## Overview

The app has a cron job that runs daily at 2 AM UTC:

- `/api/cron/update-trending` - Checks for trending content and creates notifications for users

On **Vercel production**, this runs automatically via the `vercel.json` cron schedule.

On **localhost**, you must manually trigger the endpoint using the test script.

## Prerequisites

1. Make sure your dev server is running:

    ```bash
    npm run dev
    ```

2. Ensure `CRON_SECRET` is set in your `.env.local` file:
    ```env
    CRON_SECRET=your-secret-here
    ```

## Testing the Cron Job

### Method 1: NPM Script (Recommended)

```bash
npm run test:cron
```

This runs the Node.js test script at `scripts/test-cron.js`.

**Example output:**

```
========================================
  Local Cron Job Testing Script
========================================

Base URL: http://localhost:3000
CRON_SECRET: b6d0d82747... (hidden)

Testing /api/cron/update-trending...

✓ Success! (HTTP 200)

Response:
{
  "success": true,
  "newItems": 21,
  "notifications": 0,
  "demoMode": false
}

========================================
  Test Complete
========================================
```

### Method 2: Bash Script

```bash
./scripts/test-cron-local.sh
```

Requires `curl` and `jq` (for JSON formatting).

### Method 3: Manual cURL

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/update-trending
```

Replace `YOUR_CRON_SECRET` with your actual secret from `.env.local`.

## Understanding the Response

### Success Response

```json
{
    "success": true,
    "newItems": 21, // Number of new trending items found
    "notifications": 0, // Number of notifications created for users
    "demoMode": false // Whether demo mode was used
}
```

### Demo Mode

Demo mode forces the cron job to always find at least one new item for testing purposes.

To use demo mode (admin only):

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/cron/update-trending?demo=true
```

Admin token must be a valid Firebase Auth ID token from an admin user.

## How the Trending Cron Job Works

1. **Fetches current trending content** from TMDB (movies and TV shows)
2. **Compares with previous snapshot** stored in Firestore (`/system/trending`)
3. **Identifies new trending items** that weren't in the previous snapshot
4. **Creates notifications** for users who have:
    - Enabled trending notifications in settings
    - The trending item in their watchlist
    - Not logged in since the last trending update
5. **Updates the snapshot** in Firestore for the next run

## Troubleshooting

### Error: "CRON_SECRET not found"

- Make sure `.env.local` exists and contains `CRON_SECRET=...`
- Restart your dev server after adding the variable

### Error: "Request failed: connect ECONNREFUSED"

- Make sure your dev server is running (`npm run dev`)
- Verify the server is running on port 3000

### HTTP 401 Unauthorized

- Check that your `CRON_SECRET` matches between `.env.local` and the request
- The secret is validated using timing-safe comparison

### HTTP 500 Server Error

- Check the server console for error details
- Verify Firebase Admin SDK is configured correctly
- Ensure TMDB API key is set in `.env.local`

## Production Behavior

On Vercel:

- Cron runs automatically daily at 2 AM UTC
- No manual triggering needed
- Uses the production `CRON_SECRET` from environment variables

## Security Notes

- The `CRON_SECRET` protects the endpoint from unauthorized access
- Only cron requests with valid `CRON_SECRET` or admin Firebase Auth tokens can access the endpoint
- The secret uses constant-time comparison to prevent timing attacks
- Demo mode requires admin authentication (Firebase Auth ID token)

## Related Files

- `/app/api/cron/update-trending/route.ts` - Cron job implementation
- `/scripts/test-cron.js` - Node.js test script
- `/scripts/test-cron-local.sh` - Bash test script
- `/vercel.json` - Cron schedule configuration (production only)
- `/lib/csrfProtection.ts` - CSRF bypass logic for cron routes
