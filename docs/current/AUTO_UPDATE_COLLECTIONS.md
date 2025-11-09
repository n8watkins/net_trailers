# Auto-Updating Collections System

## Overview

The Auto-Updating Collections System automatically checks TMDB for new content matching collection criteria and notifies users when updates are found. Collections can be configured to check daily, weekly, or manually, with new content automatically added and notifications sent to collection owners.

**Status**: ✅ Implemented (Phase 5 - Feature Roadmap 2025)

**Implementation Date**: January 2025

## Features

### Core Capabilities

1. **Automated Content Discovery**
    - Periodic TMDB checks based on collection criteria
    - Filters by genre, year range, ratings, cast, director
    - Supports both movies and TV shows
    - Respects AND/OR genre logic

2. **Flexible Update Frequencies**
    - Daily: Check every 24 hours
    - Weekly: Check every 7 days
    - Never: Manual updates only
    - User-configurable per collection

3. **Smart Filtering**
    - Only checks content released after last check
    - Excludes already-added content
    - Supports advanced filter criteria
    - Skips curated collections (manually selected content)

4. **Notification Integration**
    - Automatic notifications when new content found
    - Shows count of new items
    - Links directly to collection
    - Uses Phase 3 notification system

5. **Visual Indicators**
    - "Auto" badge on auto-updating collections
    - "+N" badge showing new items count
    - "Updated X ago" timestamp
    - Frequency indicator on hover

## Architecture

### Data Model

**CustomRow Extensions** (`types/customRows.ts`):

```typescript
export interface CustomRow extends BaseRowConfig {
    // ... existing fields

    // Auto-update settings (Phase 5)
    autoUpdateEnabled?: boolean // Owner setting: allow auto-updates from TMDB
    updateFrequency?: 'daily' | 'weekly' | 'never' // How often to check for new content
    lastCheckedAt?: number // Last time we checked TMDB for new content
    lastUpdateCount?: number // Number of items added in last update
}

export interface CollectionUpdate {
    id: string // Update ID
    collectionId: string // CustomRow ID
    userId: string // Collection owner
    newContentIds: number[] // TMDB IDs of new matches found
    checkedAt: number // When the check was performed
    notificationSent: boolean // Whether notification was created
    addedCount: number // Number of items actually added
}
```

**DisplayRow Extensions**:

```typescript
export interface DisplayRow extends BaseRowConfig {
    // ... existing fields

    // Auto-update fields (Phase 5) - Only present for custom rows
    autoUpdateEnabled?: boolean
    updateFrequency?: 'daily' | 'weekly' | 'never'
    lastCheckedAt?: number
    lastUpdateCount?: number
}
```

### Components

#### AutoUpdateSettings (`components/customRows/AutoUpdateSettings.tsx`)

UI controls for configuring auto-updates on collections.

**Features**:

- Toggle to enable/disable auto-updates
- Frequency selector (daily/weekly/never)
- Visual indicators and help text
- Integrated into both traditional wizard and smart builder

**Props**:

```typescript
interface AutoUpdateSettingsProps {
    autoUpdateEnabled: boolean
    updateFrequency: 'daily' | 'weekly' | 'never'
    onChange: (settings: {
        autoUpdateEnabled?: boolean
        updateFrequency?: 'daily' | 'weekly' | 'never'
    }) => void
}
```

**Usage**: Rendered in WizardStep2Advanced (traditional mode) and SimplifiedSmartBuilder (smart mode)

#### CustomRowCard with Auto-Update Indicators

**Badges**:

- **Auto Badge** (blue): Shows "Auto" when autoUpdateEnabled is true
- **New Items Badge** (green): Shows "+N" when lastUpdateCount > 0
- **Timestamp**: Shows "Updated X ago" based on lastCheckedAt

**Helper Function**:

```typescript
function formatRelativeTime(timestamp: number): string {
    // Returns: "Just now", "5m ago", "2h ago", "3d ago"
}
```

### API Routes

#### POST /api/cron/update-collections

Vercel cron job endpoint that runs daily to check and update collections.

**Schedule**: Daily at 2 AM UTC (configured in `vercel.json`)

**Authentication**: Requires `CRON_SECRET` environment variable

**Request Headers**:

```
Authorization: Bearer <CRON_SECRET>
```

**Response**:

```typescript
{
    success: true,
    stats: {
        usersProcessed: number,
        collectionsChecked: number,
        collectionsUpdated: number,
        errors: number
    },
    errors?: string[] // Only if errors occurred
}
```

**Algorithm**:

```typescript
1. Verify authorization (CRON_SECRET)
2. Get all users with custom rows (TODO: implement getAllUserIds())
3. For each user:
   a. Load all custom rows
   b. Filter to collections due for update (getCollectionsDueForUpdate)
   c. For each due collection:
      i. Check TMDB for new content (checkForNewContent)
      ii. If new content found:
          - Add content IDs to collection
          - Update lastCheckedAt, lastUpdateCount
          - Create notification for user
      iii. If no new content:
          - Update lastCheckedAt only
4. Return stats
```

**Error Handling**:

- Continues processing other collections if one fails
- Logs errors with user/collection context
- Returns error summary in response

### Utilities

#### Content Discovery (`utils/tmdb/contentDiscovery.ts`)

TMDB integration for discovering new matching content.

**Functions**:

##### `checkForNewContent(collection: CustomRow): Promise<number[]>`

Main function to check for new content matching collection criteria.

```typescript
// Returns array of new TMDB content IDs
const newContentIds = await checkForNewContent(collection)

// Logic:
// 1. Skip if autoUpdateEnabled is false
// 2. Skip curated collections (contentIds-based)
// 3. Query TMDB discover for movies (if applicable)
// 4. Query TMDB discover for TV (if applicable)
// 5. Deduplicate results
// 6. Filter out existing content IDs
// 7. Return new IDs
```

##### `discoverNewContent(collection: CustomRow, mediaType: 'movie' | 'tv'): Promise<number[]>`

Queries TMDB discover API for specific media type.

```typescript
const params = buildDiscoverParams(collection, mediaType)
const response = await tmdb.fetch(`/discover/${mediaType}`, params)
return response.results.map((item) => item.id)
```

##### `buildDiscoverParams(collection: CustomRow, mediaType: 'movie' | 'tv'): Record<string, string | number>`

Builds TMDB API parameters from collection criteria.

**Parameters Built**:

```typescript
{
    // Base params
    sort_by: 'release_date.desc', // Newest first
    include_adult: false,
    page: 1,

    // Genre filtering
    with_genres: '28,12' // AND logic: comma-separated
    with_genres: '28|12' // OR logic: pipe-separated

    // Release date filtering (critical for new content)
    'primary_release_date.gte': '2025-01-01', // Movies
    'first_air_date.gte': '2025-01-01', // TV shows

    // Advanced filters
    'primary_release_date.gte': '1990-01-01', // yearMin
    'primary_release_date.lte': '2024-12-31', // yearMax
    'vote_average.gte': 7.0, // ratingMin
    'vote_average.lte': 9.0, // ratingMax
    'vote_count.gte': 1000, // voteCount
    'popularity.gte': 50, // popularity
    with_cast: '123,456', // Actor IDs
    with_crew: '789' // Director ID
}
```

##### `addContentToCollection(collection: CustomRow, newContentIds: number[]): CustomRow`

Adds new content IDs to collection and updates metadata.

```typescript
const updatedCollection = addContentToCollection(collection, newContentIds)

// Updates:
// - advancedFilters.contentIds (merged with existing)
// - lastCheckedAt (current timestamp)
// - lastUpdateCount (count of new items)
// - updatedAt (current timestamp)
```

##### `getCollectionsDueForUpdate(allCollections: CustomRow[]): CustomRow[]`

Filters collections that need to be checked based on frequency.

```typescript
const dueCollections = getCollectionsDueForUpdate(allCollections)

// Filters:
// 1. autoUpdateEnabled must be true
// 2. updateFrequency must not be 'never'
// 3. Never checked before (lastCheckedAt is undefined)
// 4. OR: Time since last check >= frequency interval
//    - daily: 24 hours
//    - weekly: 7 days
```

##### `canAutoUpdate(collection: CustomRow): boolean`

Validates if a collection can be auto-updated.

```typescript
// Returns false if:
// - autoUpdateEnabled is false
// - Collection is curated (contentIds only, no other filters)
// - No discovery criteria (no genres, no advanced filters)

// Returns true if:
// - autoUpdateEnabled is true
// - Has at least one discovery criterion:
//   - genres.length > 0
//   - yearMin/yearMax defined
//   - ratingMin/ratingMax defined
//   - withCast/withDirector defined
```

## Usage Examples

### Creating Collection with Auto-Update

**Traditional Wizard**:

```typescript
// User creates collection in traditional mode
// Step 1: Select genres (Action, Sci-Fi)
// Step 2: Advanced options
//   - Enable Auto-Updates: ON
//   - Update Frequency: Weekly
// Step 3: Name and create

// Resulting formData:
{
    name: "Action Sci-Fi",
    genres: [28, 878],
    genreLogic: 'AND',
    mediaType: 'movie',
    enabled: true,
    advancedFilters: {
        yearMin: 2020,
        ratingMin: 7
    },
    autoUpdateEnabled: true,
    updateFrequency: 'weekly'
}
```

**Smart Builder**:

```typescript
// User enters: "best sci-fi action movies from 2020"
// AI generates collection with curated list
// User toggles: Enable Auto-Updates
// Selects: Daily frequency

// Resulting formData:
{
    name: "Best Sci-Fi Action Movies from 2020",
    genres: [28, 878], // Fallback for pagination
    genreLogic: 'OR',
    mediaType: 'movie',
    enabled: true,
    advancedFilters: {
        contentIds: [123, 456, 789, ...], // AI-curated list
        yearMin: 2020,
        yearMax: 2020
    },
    autoUpdateEnabled: true,
    updateFrequency: 'daily'
}

// Note: This collection will NOT auto-update from TMDB
// because it's curated (has contentIds). Auto-update only
// works for discovery-based collections.
```

### Manual Testing Cron Job

**Using GET endpoint**:

```bash
# Set CRON_SECRET in .env.local
CRON_SECRET=your-secret-here

# Test endpoint
curl "http://localhost:1234/api/cron/update-collections?secret=your-secret-here"
```

**Using POST endpoint**:

```bash
curl -X POST "http://localhost:1234/api/cron/update-collections" \
  -H "Authorization: Bearer your-secret-here"
```

**Expected Response**:

```json
{
    "success": true,
    "stats": {
        "usersProcessed": 5,
        "collectionsChecked": 12,
        "collectionsUpdated": 3,
        "errors": 0
    }
}
```

### Checking Collection Status

**In UI**:

- **Auto Badge**: Collection has autoUpdateEnabled = true
- **+N Badge**: Collection found N new items in last update
- **Updated X ago**: Shows time since lastCheckedAt

**In Code**:

```typescript
import { getCollectionsDueForUpdate } from '@/utils/tmdb/contentDiscovery'

const allCollections = await CustomRowsFirestore.getUserCustomRows(userId)
const dueCollections = getCollectionsDueForUpdate(allCollections)

console.log(`${dueCollections.length} collections need updating`)

dueCollections.forEach((collection) => {
    console.log(
        `${collection.name}: last checked ${
            collection.lastCheckedAt ? new Date(collection.lastCheckedAt).toISOString() : 'never'
        }`
    )
})
```

## Configuration

### Environment Variables

```bash
# Required for cron job authentication
CRON_SECRET=your-secret-change-in-production
```

### Vercel Cron Configuration

`vercel.json`:

```json
{
    "crons": [
        {
            "path": "/api/cron/update-collections",
            "schedule": "0 2 * * *"
        }
    ]
}
```

**Schedule Format**: Standard cron syntax

- `0 2 * * *` = 2:00 AM UTC daily
- `0 */6 * * *` = Every 6 hours
- `0 0 * * 0` = Weekly on Sunday

### Update Frequency Logic

**Daily** (`updateFrequency: 'daily'`):

- Checks if `now - lastCheckedAt >= 24 hours`
- Runs approximately once per day
- Good for time-sensitive collections

**Weekly** (`updateFrequency: 'weekly'`):

- Checks if `now - lastCheckedAt >= 7 days`
- Runs approximately once per week
- Default and recommended setting

**Never** (`updateFrequency: 'never'`):

- Never auto-updates from cron job
- Collection still appears in UI
- User must manually trigger updates (future feature)

## Constraints and Limits

```typescript
export const AUTO_UPDATE_CONSTRAINTS = {
    MIN_CHECK_INTERVAL_HOURS: 24, // Daily minimum
    MAX_COLLECTIONS_PER_BATCH: 100, // Per-user limit in cron job
    NOTIFICATION_EXPIRATION_DAYS: 30, // Auto-expire update notifications
}
```

## Content Discovery Logic

### What Gets Auto-Updated

✅ **Will auto-update**:

- Genre-based collections (e.g., "Action Movies")
- Filter-based collections (e.g., "Sci-Fi from 2020-2024, rating 7+")
- Collections with cast/director filters
- Hybrid collections (genres + filters)

❌ **Will NOT auto-update**:

- Curated collections (AI-generated with specific content IDs only)
- Collections with autoUpdateEnabled = false
- Collections with updateFrequency = 'never'
- Collections with no discovery criteria

### Release Date Filtering

**First Check** (`lastCheckedAt` is undefined):

```typescript
// Get content from last 30 days
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

params['primary_release_date.gte'] = thirtyDaysAgo.toISOString().split('T')[0]
```

**Subsequent Checks**:

```typescript
// Get content released after last check
const lastCheckDate = new Date(collection.lastCheckedAt)

params['primary_release_date.gte'] = lastCheckDate.toISOString().split('T')[0]
```

**Why This Matters**:

- Ensures only NEW content is discovered
- Prevents duplicate additions
- Reduces unnecessary TMDB API calls

### Genre Logic Handling

**AND Logic** (`genreLogic: 'AND'`):

```typescript
// Must match ALL genres
params.with_genres = '28,12,878' // Action AND Adventure AND Sci-Fi
```

**OR Logic** (`genreLogic: 'OR'`):

```typescript
// Must match ANY genre
params.with_genres = '28|12|878' // Action OR Adventure OR Sci-Fi
```

## Notification Integration

### Notification Format

```typescript
await createNotification(userId, {
    type: 'collection_update',
    title: `${newContentIds.length} new ${newContentIds.length === 1 ? 'item' : 'items'} in "${collection.name}"`,
    message: `Your collection has been updated with new matching content`,
    collectionId: collection.id,
    actionUrl: `/rows`, // Link to collections page
})
```

### Notification Behavior

- **Created**: When new content is found (newContentIds.length > 0)
- **Not Created**: When no new content found
- **Expires**: After 30 days (default)
- **Action**: Clicking notification navigates to /rows page

## Performance Considerations

### Cron Job Optimization

```typescript
// Current implementation
for (const userId of allUserIds) {
    await processUserCollections(userId)
}

// TODO: Production optimization
// - Batch user processing (10-20 users per run)
// - Distribute across multiple cron invocations
// - Use Firebase Cloud Functions for better scalability
```

### TMDB API Efficiency

- **Rate Limit**: 40 requests/second
- **Optimization**: One discover call per collection per media type
- **Caching**: Results stored in Firestore (lastCheckedAt, contentIds)
- **Filtering**: Only query for new content (release date filter)

### Firestore Operations

**Per Collection Update**:

```typescript
// Reads: 1 (getUserCustomRows)
// Writes: 1 (updateCustomRow)
// Notification: 1 write (createNotification)
// Total: 1 read + 2 writes per updated collection
```

**Per User**:

```typescript
// Reads: 1 (all custom rows)
// Writes: N * 2 (N = number of updated collections)
```

## Error Handling

### Cron Job Errors

```typescript
try {
    const result = await processUserCollections(userId)
    totalChecked += result.checked
    totalUpdated += result.updated
} catch (error) {
    const errorMsg = `Error processing user ${userId}: ${error.message}`
    console.error(errorMsg)
    errors.push(errorMsg)
    // Continue with other users
}
```

### Individual Collection Errors

```typescript
for (const collection of dueCollections) {
    try {
        const hasUpdates = await processCollection(userId, collection)
        if (hasUpdates) updated++
    } catch (error) {
        console.error(`Error processing collection ${collection.id}:`, error)
        // Continue with other collections
    }
}
```

### TMDB API Errors

```typescript
try {
    const response = await tmdb.fetch(`/discover/${mediaType}`, params)
    return response.results.map((item) => item.id)
} catch (error) {
    console.error(`Error discovering ${mediaType} content:`, error)
    return [] // Return empty array, don't throw
}
```

## Testing

### Manual Testing Checklist

**Collection Creation**:

- [ ] Can create collection with auto-update enabled
- [ ] Can select update frequency (daily/weekly/never)
- [ ] Auto-update toggle works in traditional wizard
- [ ] Auto-update toggle works in smart builder
- [ ] Default settings: disabled, weekly frequency

**Collection Display**:

- [ ] "Auto" badge shows on auto-updating collections
- [ ] "+N" badge shows after cron job adds new items
- [ ] "Updated X ago" timestamp updates correctly
- [ ] Badges hidden for non-auto-updating collections
- [ ] Relative time format works (Just now, 5m ago, 2h ago, 3d ago)

**Cron Job**:

- [ ] Endpoint requires authorization
- [ ] Returns 401 without valid CRON_SECRET
- [ ] Processes all users with collections
- [ ] Skips collections not due for update
- [ ] Skips curated collections (contentIds only)
- [ ] Adds new content IDs to collections
- [ ] Updates lastCheckedAt even when no new content
- [ ] Creates notifications for updated collections
- [ ] Returns accurate stats

**Content Discovery**:

- [ ] Finds new movies matching genre criteria
- [ ] Finds new TV shows matching genre criteria
- [ ] Respects genre AND/OR logic
- [ ] Filters by release date (after lastCheckedAt)
- [ ] Applies advanced filters (year, rating, etc.)
- [ ] Deduplicates content IDs
- [ ] Excludes existing content

### Test Scenarios

**Scenario 1: New Collection, First Check**

```typescript
// Setup
const collection = {
    autoUpdateEnabled: true,
    updateFrequency: 'daily',
    genres: [28], // Action
    lastCheckedAt: undefined, // Never checked
}

// Expected
// - Checks content from last 30 days
// - Adds all matching content IDs
// - Sets lastCheckedAt to now
// - Sets lastUpdateCount to number of items found
// - Creates notification if items found
```

**Scenario 2: Existing Collection, Due for Update**

```typescript
// Setup
const collection = {
    autoUpdateEnabled: true,
    updateFrequency: 'weekly',
    genres: [878], // Sci-Fi
    lastCheckedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
    advancedFilters: {
        contentIds: [123, 456, 789],
    },
}

// Expected
// - Checks content released after lastCheckedAt
// - Only adds new IDs not in contentIds
// - Updates lastCheckedAt to now
// - Updates lastUpdateCount
// - Creates notification if new items found
```

**Scenario 3: Curated Collection**

```typescript
// Setup
const collection = {
    autoUpdateEnabled: true,
    updateFrequency: 'daily',
    genres: [], // No genres
    advancedFilters: {
        contentIds: [123, 456, 789], // AI-curated
    },
}

// Expected
// - Skips update (curated collection)
// - Does NOT query TMDB
// - Does NOT update lastCheckedAt
// - Returns empty array from checkForNewContent()
```

**Scenario 4: Frequency Not Due**

```typescript
// Setup
const collection = {
    autoUpdateEnabled: true,
    updateFrequency: 'weekly',
    lastCheckedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
}

// Expected
// - Not included in getCollectionsDueForUpdate()
// - Skipped by cron job
// - No TMDB queries
```

## Future Enhancements

### Planned Features (Roadmap Phase 7+)

1. **Manual Update Trigger**
    - "Check Now" button in collection UI
    - Bypasses frequency check
    - Immediate TMDB query and update

2. **Update History**
    - Track all updates with timestamps
    - Show diff of content added/removed
    - Collection changelog UI

3. **Smart Scheduling**
    - Peak time avoidance
    - User timezone-aware scheduling
    - Adaptive frequency based on collection activity

4. **Advanced Notification Options**
    - Email notifications for updates
    - Digest mode (weekly summary)
    - Notification preferences per collection

5. **Batch User Processing**
    - Implement getAllUserIds() with Firestore queries
    - Process users in batches (10-20 per cron run)
    - Distribute load across multiple time slots

6. **Content Removal Detection**
    - Detect when content is removed from TMDB
    - Notify users of removed content
    - Option to keep or remove from collection

7. **Smart Recommendations**
    - Use collection update data to improve recommendations
    - "Similar to recently added" section
    - Trending in your collections

## Files Created/Modified

### New Files (Phase 5)

1. `types/customRows.ts` (modified) - Added auto-update fields
2. `utils/tmdb/contentDiscovery.ts` (340 lines) - Content discovery logic
3. `app/api/cron/update-collections/route.ts` (235 lines) - Cron job endpoint
4. `vercel.json` (8 lines) - Cron configuration
5. `components/customRows/AutoUpdateSettings.tsx` (143 lines) - UI controls
6. `components/customRows/CustomRowCard.tsx` (modified) - Added indicators
7. `docs/current/AUTO_UPDATE_COLLECTIONS.md` (this file) - Documentation

### Modified Files

1. `types/customRows.ts` - Extended CustomRow and DisplayRow interfaces
2. `components/customRows/WizardStep2Advanced.tsx` - Integrated AutoUpdateSettings
3. `components/customRows/CustomRowWizard.tsx` - Added auto-update state
4. `components/customRows/smart/SimplifiedSmartBuilder.tsx` - Added auto-update UI
5. `components/customRows/CustomRowCard.tsx` - Added visual indicators

**Total**: 4 new files, 5 modified files, ~726 new lines of code

## Related Features

- **Notification System** (Phase 3): Powers collection update notifications
- **Collections/Custom Rows** (Phase 2): Core feature being enhanced
- **Smart Recommendations** (Phase 4): Can leverage auto-update data (future)

## Production Deployment

### Vercel Setup

1. **Add Environment Variable**:

    ```
    CRON_SECRET=<generate-secure-random-string>
    ```

2. **Deploy vercel.json**:
    - Commit and push to repository
    - Vercel automatically configures cron

3. **Verify Cron Job**:
    - Check Vercel dashboard > Cron Jobs
    - Should show: `/api/cron/update-collections` daily at 2 AM UTC

### Monitoring

**Vercel Logs**:

```bash
vercel logs --follow
```

**Key Metrics to Monitor**:

- Collections checked per run
- Collections updated per run
- Error count
- Execution time
- TMDB API call count

**Alerts**:

- Set up error monitoring (Sentry integration exists)
- Alert on high error rate (>10%)
- Alert on long execution time (>2 minutes)

## Support

For questions or issues with auto-updating collections:

1. Verify CRON_SECRET is set correctly
2. Check collection has autoUpdateEnabled = true
3. Check collection is not curated (contentIds only)
4. Verify collection has discovery criteria (genres or filters)
5. Check lastCheckedAt to see when last update occurred
6. Review Vercel cron job logs for errors

## Changelog

**January 2025 - v1.0.0 (Phase 5)**

- ✅ Initial implementation
- ✅ Auto-update UI in collection creation
- ✅ TMDB content discovery utilities
- ✅ Vercel cron job for daily checks
- ✅ Notification integration
- ✅ Visual indicators on collection cards
- ✅ Support for daily/weekly/never frequencies
- ✅ Genre-based and filter-based discovery
- ✅ Relative time formatting
- ✅ Error handling and logging

---

**Last Updated**: January 2025
**Phase**: 5 - Auto-Updating Collections
**Status**: Complete
