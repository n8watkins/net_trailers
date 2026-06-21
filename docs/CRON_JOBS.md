# Cron Jobs Documentation

Complete technical documentation for all automated cron jobs in the Net Trailers application.

## Table of Contents

- [Overview](#overview)
- [Job Schedules](#job-schedules)
- [Trending Digest](#trending-digest)
- [Collection Cache Refresh](#collection-cache-refresh)
- [Social Digest](#social-digest)
- [Admin Control Panel](#admin-control-panel)
- [Testing & Development](#testing--development)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What are Cron Jobs?

Cron jobs are automated scheduled tasks that run at specific times without manual intervention. In Net Trailers, they are used to:

- Send weekly trending content emails
- Refresh collection caches with new content
- Batch and send social interaction notifications

### Infrastructure

- **Platform**: Vercel (managed cron via `vercel.json`)
- **Authentication**: `CRON_SECRET` environment variable
- **Free Tier Limit**: 1 job per day (we run 3 jobs on different days)
- **Manual Triggers**: Available through admin panel, do NOT count toward Vercel limit

### Configuration File

```json
// vercel.json
{
    "crons": [
        {
            "path": "/api/cron/update-trending",
            "schedule": "0 2 * * 1" // Monday 2 AM UTC
        },
        {
            "path": "/api/cron/refresh-collection-cache",
            "schedule": "0 2 * * 0" // Sunday 2 AM UTC
        },
        {
            "path": "/api/cron/social-digest",
            "schedule": "0 2 * * 3" // Wednesday 2 AM UTC
        }
    ]
}
```

---

## Job Schedules

| Job                  | Schedule    | Day       | Time (UTC) | Endpoint                             |
| -------------------- | ----------- | --------- | ---------- | ------------------------------------ |
| **Trending Digest**  | `0 2 * * 1` | Monday    | 2:00 AM    | `/api/cron/update-trending`          |
| **Collection Cache** | `0 2 * * 0` | Sunday    | 2:00 AM    | `/api/cron/refresh-collection-cache` |
| **Social Digest**    | `0 2 * * 3` | Wednesday | 2:00 AM    | `/api/cron/social-digest`            |

### Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (0=Sunday, 1=Monday...)
│ │ │ │ │
│ │ │ │ │
0 2 * * 1  = Every Monday at 2 AM UTC
```

---

## Trending Digest

**Endpoint**: `/api/cron/update-trending`
**Schedule**: Every Monday at 2:00 AM UTC
**Runtime**: ~2-5 seconds

### Purpose

Sends weekly trending content emails to users who have opted in for trending notifications.

### Process Flow

1. **Fetch Trending Content**
    - Calls TMDB API for weekly trending movies: `GET /trending/movie/week`
    - Calls TMDB API for weekly trending TV shows: `GET /trending/tv/week`
    - Extracts top 5 of each type

2. **Query Eligible Users**
    - Reads all users from Turso via Drizzle: `db.select().from(users)`
    - Filters for users with:
        - `notifications.types.trending_update === true`
        - `notifications.email === true`
        - Valid email address

3. **Send Emails**
    - Generates unsubscribe token for each user
    - Sends email via Resend API (EmailService)
    - Tracks: emails sent, users skipped, errors

4. **Return Statistics**
    ```json
    {
        "success": true,
        "emailsSent": 12,
        "totalUsers": 50,
        "skippedUsers": 38
    }
    ```

### User Requirements

For a user to receive trending emails:

```typescript
// Turso: user_preferences row (keyed by userId)
{
  email: "user@example.com",  // Valid email
  notifications: {
    email: true,               // Email notifications enabled
    types: {
      trending_update: true    // Trending notifications enabled
    }
  }
}
```

### Email Template

- **Subject**: "This Week's Trending on Net Trailers"
- **Content**:
    - Top 5 trending movies with posters
    - Top 5 trending TV shows with posters
    - Unsubscribe link
    - Powered by TMDB

### Admin-Only Mode

For testing purposes, add `?adminOnly=true` query parameter:

```bash
GET /api/cron/update-trending?adminOnly=true
```

This will:

- Process only the admin user (identified by `ADMIN_GITHUB_LOGIN`)
- Skip all non-admin users
- Safe for development testing

---

## Collection Cache Refresh

**Endpoint**: `/api/cron/refresh-collection-cache`
**Schedule**: Every Sunday at 2:00 AM UTC
**Runtime**: ~30-60 seconds (depends on # of collections)

### Purpose

Refreshes cached content for user collections that use advanced filters (actors/directors), ensuring users see new releases that match their criteria.

### Process Flow

1. **Query All Users**
    - Reads all users from Turso via Drizzle (`db.select().from(users)`)
    - For each user, gets their custom collections

2. **Filter Collections**
    - Only processes collections with:
        - `collectionType === 'tmdb-genre'` (TMDB-based)
        - `advancedFilters.withCastIds` OR `advancedFilters.withDirectorId` (has filters)
        - `cacheMetadata.lastFetched` > 7 days ago (needs refresh)

3. **Refresh Cache**
    - Builds fresh top 50 results from TMDB API
    - Compares with existing `cachedContentIds`
    - If different:
        - Updates `cachedContentIds` with new list
        - Updates `cacheMetadata.lastFetched` timestamp
        - Creates notification for user

4. **Create Notifications**
    - Only creates notification if new items found
    - Notification includes count of new items
    - Type: `collection_updated`

5. **Return Statistics**
    ```json
    {
        "success": true,
        "collectionsChecked": 45,
        "collectionsUpdated": 8,
        "notificationsCreated": 8
    }
    ```

### Collection Requirements

For a collection to be refreshed:

```typescript
// Turso: user_preferences.customRows[collectionId] (keyed by userId)
{
  collectionType: 'tmdb-genre',
  advancedFilters: {
    withCastIds: [123, 456],     // Actor IDs (optional)
    withDirectorId: 789           // Director ID (optional)
  },
  cacheMetadata: {
    lastFetched: 1234567890,      // Timestamp > 7 days ago
    needsRefresh: false
  }
}
```

### Optimization

- **Skips manual collections**: No API calls needed
- **Skips AI-generated collections**: Static content
- **7-day cooldown**: Prevents excessive API usage
- **Top 50 limit**: Only compares first 50 results for changes

### Admin-Only Mode

For testing purposes, add `?adminOnly=true` query parameter:

```bash
GET /api/cron/refresh-collection-cache?adminOnly=true
```

This will:

- Process only the admin user's collections
- Skip all non-admin users
- Safe for development testing

---

## Social Digest

**Endpoint**: `/api/cron/social-digest`
**Schedule**: Every Wednesday at 2:00 AM UTC
**Runtime**: ~5-15 seconds

### Purpose

Batches social interaction notifications (comments, likes) and sends weekly digest emails to users.

### Process Flow

1. **Query Pending Notifications**
    - Queries the Turso `notifications` table across users
    - Filters for:
        - `type IN ['ranking_comment', 'ranking_like']`
        - `emailSent === false` OR `emailSent` doesn't exist
        - `createdAt` within last 7 days

2. **Group by User**
    - Groups notifications by `userId`
    - Separates comments and likes
    - Batches likes from multiple users together

3. **Filter Eligible Users**
    - Checks user preferences:
        - `notifications.email === true`
        - `notifications.types.social_interactions === true`
        - Valid email address

4. **Send Digest Emails**
    - Generates unsubscribe token
    - Sends one email per user with ALL their interactions
    - Marks notifications as `emailSent: true`

5. **Return Statistics**
    ```json
    {
        "success": true,
        "emailsSent": 3,
        "totalUsers": 3,
        "skippedUsers": 0,
        "totalNotifications": 15
    }
    ```

### Notification Types

#### Ranking Comment

```typescript
{
  type: 'ranking_comment',
  rankingId: 'abc123',
  rankingTitle: 'My Top 10 Sci-Fi Movies',
  commenterName: 'Alice',
  commentText: 'Great list!',
  commentId: 'comment_xyz',
  isReply: false,
  emailSent: false,
  createdAt: 1234567890
}
```

#### Ranking Like (Batched)

```typescript
{
  type: 'ranking_like',
  rankingId: 'abc123',
  rankingTitle: 'My Top 10 Sci-Fi Movies',
  likerNames: ['Bob', 'Carol', 'Dave'],  // Batched
  emailSent: false,
  createdAt: 1234567890
}
```

### User Requirements

For a user to receive social digest emails:

```typescript
// Turso: user_preferences row (keyed by userId)
{
  email: "user@example.com",  // Valid email
  notifications: {
    email: true,               // Email notifications enabled
    types: {
      social_interactions: true  // Social notifications enabled
    }
  }
}
```

### Email Template

- **Subject**: "You have new interactions on Net Trailers"
- **Content**:
    - List of comments with commenter names and text
    - Batched likes ("Alice, Bob, and 3 others liked your ranking")
    - Links to view rankings
    - Unsubscribe link

### Admin-Only Mode

**Default Behavior**: By default, this job runs in admin-only mode when called without parameters (for safety).

```bash
# Admin only (default)
GET /api/cron/social-digest

# Explicitly admin only
GET /api/cron/social-digest?adminOnly=true

# All users (production)
GET /api/cron/social-digest?adminOnly=false
```

This prevents accidental mass emails during development.

---

## Admin Control Panel

The admin panel (`/admin`) provides a comprehensive interface for managing cron jobs.

### Features

1. **System Overview**
    - Status of each cron job (Active/Inactive)
    - Quick reference cards for each job
    - Explanation of how Vercel cron works

2. **Expandable Sections**
    - Each job has a collapsible section with:
        - Detailed description of what it does
        - User requirements for eligibility
        - Vercel schedule information
        - Manual trigger button
        - Last run statistics

3. **Manual Triggers**
    - "Run for All Users" button for each job
    - Shows real-time status (Running/Complete)
    - Displays detailed results:
        - Emails sent
        - Users processed
        - Collections updated
        - Notifications created

4. **Visual Feedback**
    - Loading spinners during execution
    - Success/error icons for last run
    - Toast notifications with detailed stats
    - Last run timestamp and results

### Access Control

- **URL**: `/admin`
- **Authentication**: Requires admin user (identified by `ADMIN_GITHUB_LOGIN`)
- **Server-side check**: `/api/admin/check` validates admin status
- **Client-side redirect**: Non-admin users redirected to home page

---

## Testing & Development

### Debug Console (Development Only)

The debug console in `components/debug/DebugControls.tsx` provides testing options:

**Email Testing Section**:

- Trending - Admin-only trending email
- Digest (Real) - Admin-only digest check
- Demo Digest - Admin-only demo mode

**Cron Jobs Section**:

- **Admin Only (You)**:
    - Trending - Test with admin user only
    - Cache - Refresh admin collections only
    - Social - Create fake interactions for admin

- **All Users (Production)**:
    - Trending (All) - Process all users
    - Cache (All) - Refresh all collections
    - Social (All) - Send real notifications

### Testing Best Practices

1. **Always use admin-only mode first**
    - Test with your own account
    - Verify email looks correct
    - Check logs for errors

2. **Verify user eligibility**
    - Ensure test users have proper notification settings
    - Check email addresses are valid
    - Confirm opt-in preferences

3. **Monitor logs**
    - Check Vercel function logs
    - Look for API rate limit warnings
    - Verify email delivery status

4. **Test incrementally**
    - Start with single user (admin)
    - Then test with 2-3 test accounts
    - Finally run for all users

### Environment Variables

Required for cron jobs:

```bash
# TMDB API
TMDB_API_KEY=your_tmdb_api_key

# Cron Security
CRON_SECRET=your_secure_random_string

# Admin User
ADMIN_GITHUB_LOGIN=your_github_username

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# App URL (for internal fetches)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Troubleshooting

### Common Issues

#### 1. Cron Job Not Running

**Symptoms**: Job doesn't execute at scheduled time

**Possible Causes**:

- Vercel project not deployed
- `vercel.json` not in project root
- Invalid cron expression
- Vercel free tier limit exceeded

**Solutions**:

- Check Vercel dashboard for cron job status
- Verify `vercel.json` is committed and deployed
- Test cron expression at [crontab.guru](https://crontab.guru/)
- Ensure not exceeding 1 job/day limit

#### 2. No Emails Sent

**Symptoms**: Job completes but no users receive emails

**Possible Causes**:

- Users haven't opted in
- Email API key invalid
- User email addresses invalid
- `adminOnly` mode enabled accidentally

**Solutions**:

```bash
# Check user settings (Drizzle / Turso)
#   db.select().from(users)  then filter notifications.email === true
#   or inspect rows via: npm run db:studio

# Verify Resend API key
curl -X GET https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check logs for skipped users
# Look for: "Skipping user: no email" or "Skipping user: opted out"
```

#### 3. Authentication Errors

**Symptoms**: "Unauthorized" or "Invalid token" errors

**Possible Causes**:

- `CRON_SECRET` mismatch
- Environment variable not set in Vercel
- Timing attack protection failing

**Solutions**:

```bash
# Verify CRON_SECRET is set
vercel env ls

# Test with curl
curl -X GET https://your-app.vercel.app/api/cron/update-trending \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### 4. Timeout Errors

**Symptoms**: Function times out before completing

**Possible Causes**:

- Too many users to process
- TMDB API slow/rate limited
- Turso queries taking too long

**Solutions**:

- Implement pagination for large user bases
- Add retry logic for API calls
- Optimize Turso queries with indexes
- Consider splitting into smaller jobs

#### 5. Duplicate Emails

**Symptoms**: Users receive multiple copies of same email

**Possible Causes**:

- Job triggered multiple times
- Race condition in notification marking
- `emailSent` flag not being set

**Solutions**:

```typescript
// Use a Drizzle/libSQL transaction for atomic updates
await db.transaction(async (tx) => {
    for (const notif of notifications) {
        await tx
            .update(notificationsTable)
            .set({ emailSent: true })
            .where(eq(notificationsTable.id, notif.id))
    }
})
```

### Monitoring

**Vercel Dashboard**:

- Navigate to: Project → Deployments → Functions
- View: Invocations, Duration, Errors
- Check: Logs for specific cron executions

**Email Delivery**:

- Resend Dashboard: [resend.com/emails](https://resend.com/emails)
- Check: Delivered, Bounced, Complained
- Monitor: Delivery rates and bounce rates

**Database Metrics**:

- Turso dashboard (or Vercel observability) → Usage
- Monitor: row reads, writes, deletes
- Alert: High read/write counts

### Debug Logging

Each cron job logs extensively:

```typescript
// Example log output
console.log(`📧 [Social Digest] Processing ${userNotifications.size} users`)
console.log(`📧 [Social Digest] Running in ADMIN-ONLY mode`)
console.log(`📧 [Social Digest] Skipping non-admin user: ${userId}`)
console.log(`📧 [Social Digest] Sent email to ${userData.email}`)
console.log(`📧 [Social Digest] Sent ${emailsSent} social digest emails`)
```

Look for these emoji prefixes:

- 📧 - Email operations
- 📊 - Trending operations
- 🔄 - Cache operations
- 👥 - User processing
- ✅ - Success
- ❌ - Error
- ⚠️ - Warning

---

## API Reference

### GET /api/cron/update-trending

**Parameters**:

- `adminOnly` (optional): `true` | `false` - Default: `false`
- `demo` (optional): `true` | `false` - Demo mode guarantees finding new items

**Headers**:

- `Authorization: Bearer {CRON_SECRET}`

**Response**:

```json
{
    "success": true,
    "emailsSent": 12,
    "totalUsers": 50,
    "skippedUsers": 38
}
```

### GET /api/cron/refresh-collection-cache

**Parameters**:

- `adminOnly` (optional): `true` | `false` - Default: `false`

**Headers**:

- `Authorization: Bearer {CRON_SECRET}`

**Response**:

```json
{
    "success": true,
    "collectionsChecked": 45,
    "collectionsUpdated": 8,
    "notificationsCreated": 8,
    "timestamp": "2025-01-15T02:00:00.000Z"
}
```

### GET /api/cron/social-digest

**Parameters**:

- `adminOnly` (optional): `true` | `false` | `null` - Default: `true` (safe default)

**Headers**:

- `Authorization: Bearer {CRON_SECRET}`

**Response**:

```json
{
    "success": true,
    "emailsSent": 3,
    "totalUsers": 3,
    "skippedUsers": 0,
    "totalNotifications": 15
}
```

---

## Security Considerations

### CRON_SECRET Protection

- Store in environment variables, never in code
- Use timing-safe comparison to prevent timing attacks
- Rotate periodically (every 90 days recommended)
- Never expose in client-side code or logs

### Admin-Only Mode

- Default to admin-only for sensitive operations
- Require explicit `adminOnly=false` for production runs
- Validate `ADMIN_GITHUB_LOGIN` server-side (via the Auth.js session)
- Log all admin vs production runs

### Email Security

- Validate email addresses before sending
- Include unsubscribe links in all emails
- Respect user opt-out preferences
- Rate limit email sending per user

### Data Privacy

- Don't log sensitive user data
- Redact email addresses in logs
- Comply with GDPR/privacy regulations
- Allow users to delete their data

---

## Performance Optimization

### TMDB API Usage

- Cache trending results for 6 hours
- Batch requests when possible
- Respect rate limits (40 req/second)
- Use conditional requests (If-Modified-Since)

### Turso (Drizzle) Optimization

- Use indexes for common queries
- Batch writes for efficiency
- Implement pagination for large datasets
- Clean up old data regularly

### Email Optimization

- Batch email sends
- Use templating for faster generation
- Compress images in emails
- Monitor delivery rates

---

## Future Enhancements

Potential improvements for cron jobs:

1. **User Timezone Support**
    - Send emails at user's preferred time
    - Adjust schedule based on geography
    - Respect "quiet hours" preferences

2. **Frequency Preferences**
    - Allow users to choose daily/weekly/monthly
    - Implement digest frequency controls
    - Add "instant" option for real-time emails

3. **Content Personalization**
    - Recommend based on watch history
    - Filter by user's preferred genres
    - Highlight similar content to watchlist

4. **Analytics**
    - Track email open rates
    - Monitor link click rates
    - A/B test subject lines

5. **Retry Logic**
    - Implement exponential backoff for failures
    - Queue failed emails for retry
    - Alert on persistent failures

---

## Support

For issues or questions about cron jobs:

1. Check Vercel function logs
2. Review this documentation
3. Test in admin panel first
4. Check environment variables
5. Verify user notification settings

**Helpful Resources**:

- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)
- [Crontab Guru](https://crontab.guru/) - Cron expression tester
- [TMDB API Docs](https://developers.themoviedb.org/3)
- [Resend API Docs](https://resend.com/docs)
