# NetTrailers: Integration Opportunities & Future Features

> **Analysis Date:** 2025-11-30
> **Based on:** Comprehensive codebase exploration of flows, data connections, and feature gaps

## Executive Summary

NetTrailers has exceptional feature depth with 18 Zustand stores, 49+ API routes, and comprehensive interaction tracking. However, several high-value features exist in isolation without connecting to the broader ecosystem. This document identifies **critical integration gaps** and proposes **10 high-impact feature enhancements** to unlock the full potential of existing infrastructure.

### Key Findings

1. **Watch History is a Gold Mine Being Ignored** - Tracks viewing behavior but not used for recommendations
2. **Person Pages Are Dead Ends** - Great discovery, zero conversion to collections
3. **Community Disconnected from Content** - Forum discussions don't link to actual titles
4. **Notification System at 20% Capacity** - Infrastructure exists for 10+ triggers, only uses 2-3
5. **Profile Analytics Missing** - Rich data tracked, no user-facing insights

---

## Priority Matrix

### 🔥 Quick Wins (High Impact, Low Effort)

| Feature                         | Impact | Effort   | Files to Touch |
| ------------------------------- | ------ | -------- | -------------- |
| Ranking → Collection Conversion | High   | Low      | 2-3 files      |
| Continue Watching Row           | High   | Low      | 1-2 files      |
| Collection Share Notifications  | Medium | Very Low | 1 file         |
| Profile Statistics Dashboard    | High   | Medium   | 3-4 files      |

### 🎯 Strategic Investments (High Impact, Higher Effort)

| Feature                         | Impact    | Effort | Complexity          |
| ------------------------------- | --------- | ------ | ------------------- |
| Watch History → Recommendations | Very High | High   | Engine refactor     |
| Person-Based Collections        | High      | Medium | New collection type |
| Forum Content Tagging           | High      | Medium | Parser + UI         |
| Social Following System         | High      | High   | New data model      |

---

## Critical Gap #1: Watch History Isolation

### Current State

**What's tracked:**

```typescript
interface WatchHistoryEntry {
    contentId: number
    mediaType: 'movie' | 'tv'
    watchedAt: number
    progress: number // 0-100
    duration: number // Total runtime in seconds
    watchedDuration: number // Actual watch time
}
```

**Storage:** `/users/{userId}/watchHistory` sub-collection
**Retention:** 90 days
**Integration:** ❌ **NONE** - Completely isolated from recommendations

### The Problem

Users watch content → System tracks detailed viewing data → **Recommendation engine ignores it**

This is like Netflix tracking what you watch but recommending based only on what you add to your list.

### Proposed Solution

#### A. Add Watch Completion Interaction Types

```typescript
// In types/interactions.ts
type InteractionType =
    | 'view_modal' // +1 (existing)
    | 'add_to_watchlist' // +3 (existing)
    | 'like' // +5 (existing)
    | 'watch_complete' // +4 (NEW - watched 90%+)
    | 'watch_partial' // +2 (NEW - watched 30-90%)
    | 'watch_abandon' // -2 (NEW - watched <30%)
// ... other types
```

**Weighting rationale:**

- `watch_complete` (+4): Stronger signal than watchlist add because user invested time
- `watch_partial` (+2): Moderate interest, similar to play_trailer
- `watch_abandon` (-2): Negative signal, user actively disengaged

#### B. Create Continue Watching Row

```typescript
// New component: components/recommendations/ContinueWatchingRow.tsx
export function ContinueWatchingRow() {
    const watchHistory = useWatchHistoryStore((s) => s.entries)

    const inProgressContent = useMemo(() => {
        return watchHistory
            .filter((entry) => entry.progress > 10 && entry.progress < 90)
            .sort((a, b) => b.watchedAt - a.watchedAt)
            .slice(0, 20)
    }, [watchHistory])

    // Render as standard row with progress bars
}
```

#### C. Integrate with Recommendation Engine

```typescript
// In utils/recommendations/genreEngine.ts
export function buildRecommendationProfile(
    userData: UserData,
    genrePreferences: UserGenrePreference[],
    contentPreferences: UserContentPreference[],
    votedContent: UserVotedContent[],
    watchHistory: WatchHistoryEntry[] // NEW PARAMETER
): RecommendationProfile {
    // Calculate completion-based genre preferences
    const watchGenreScores = watchHistory
        .filter((entry) => entry.progress >= 90) // Completed only
        .reduce(
            (scores, entry) => {
                const genres = getGenresForContent(entry.contentId, entry.mediaType)
                genres.forEach((genre) => {
                    scores[genre] = (scores[genre] || 0) + 4 // watch_complete weight
                })
                return scores
            },
            {} as Record<string, number>
        )

    // Merge with existing genre preferences
    const mergedPreferences = mergeGenreScores(genrePreferences, watchGenreScores)

    return {
        // ... existing profile fields
        genrePreferences: mergedPreferences,
        watchPatterns: {
            avgCompletionRate: calculateAvgCompletion(watchHistory),
            bingeGenres: detectBingeGenres(watchHistory),
            abandonedGenres: detectAbandonedGenres(watchHistory),
        },
    }
}
```

#### D. Add Completion-Based Recommendations

```typescript
// New recommendation source
async function getCompletionBasedRecommendations(
    userId: string,
    watchHistory: WatchHistoryEntry[]
): Promise<Content[]> {
    // Get content user completed in last 30 days
    const recentCompleted = watchHistory
        .filter((entry) => {
            const daysAgo = (Date.now() - entry.watchedAt) / (1000 * 60 * 60 * 24)
            return entry.progress >= 90 && daysAgo <= 30
        })
        .slice(0, 5) // Top 5 recent

    // Get TMDB similar content for each
    const recommendations = await Promise.all(
        recentCompleted.map((entry) => fetchSimilarContent(entry.contentId, entry.mediaType))
    )

    // Deduplicate and score
    return deduplicateAndScore(recommendations.flat())
}
```

### Implementation Files

**Files to modify:**

1. `types/interactions.ts` - Add watch completion types
2. `hooks/useInteractionTracking.ts` - Track watch completions
3. `stores/watchHistoryStore.ts` - Add completion helpers
4. `utils/recommendations/genreEngine.ts` - Integrate watch history
5. `app/api/recommendations/personalized/route.ts` - Include watch data
6. `components/recommendations/ContinueWatchingRow.tsx` - New component

**Estimated effort:** 2-3 days
**Impact:** Very High - Unlocks richest behavioral signal

---

## Critical Gap #2: Person Pages → Collection Dead End

### Current State

**What exists:**

- Person pages at `/person/[id]` with rich filtering:
    - Role filter (acting, directing, writing, production, other_crew)
    - Media type filter (all, movie, tv)
    - Genre filter (unified genre system)
- URL deep links: `?role=directing&genre=scifi`
- Clean, filtered `contentToRender` array ready to use

**What's missing:**

- No way to save filtered results
- No notifications for person's new releases
- Can't follow favorite actors/directors
- Person discovery doesn't convert to organization

### The Problem

User flow:

1. Discovers Christopher Nolan on person page ✅
2. Filters to "Directing + Sci-Fi" ✅
3. Wants to save this as collection ❌ **DEAD END**
4. Has to manually recreate in collection builder

### Proposed Solution

#### A. Add "Create Collection" Button to Person Pages

```tsx
// In app/person/[id]/page.tsx
import { useModalStore } from '../../../stores/modalStore'

export default function PersonPage() {
    // ... existing code
    const openCollectionCreatorModal = useModalStore((state) => state.openCollectionCreatorModal)

    const handleCreateCollection = () => {
        // Smart collection naming
        let collectionName = personDetails?.name || 'Filmography'

        if (roleFilter !== 'all') {
            collectionName += ` - ${getRoleFilterLabel(roleFilter)}`
        }

        if (genreFilter !== 'all') {
            const genreName = UNIFIED_GENRES.find((g) => g.id === genreFilter)?.name
            collectionName += ` (${genreName})`
        }

        if (mediaTypeFilter !== 'all') {
            collectionName += ` [${mediaTypeFilter === 'movie' ? 'Movies' : 'TV'}]`
        }

        // Infer emoji from role
        const emoji = inferEmojiFromRole(roleFilter) // 🎬🎭✍️🎥🎞️

        openCollectionCreatorModal(
            collectionName,
            contentToRender, // Already filtered!
            mediaTypeFilter === 'all' ? 'all' : mediaTypeFilter,
            emoji
        )
    }

    return (
        // ... existing JSX
        <div className="flex gap-2 items-center mb-6">
            <button
                onClick={handleCreateCollection}
                disabled={contentToRender.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-lg
                   bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                   transition-all"
            >
                <PlusIcon className="w-5 h-5" />
                Save as Collection
            </button>

            {contentToRender.length > 0 && (
                <span className="text-sm text-gray-400">{contentToRender.length} items</span>
            )}
        </div>
    )
}
```

#### B. Create Person-Based Collection Type (Advanced)

For auto-updating person collections:

```typescript
// In types/collections.ts
export type CollectionType = 'manual' | 'tmdb-genre' | 'ai-generated' | 'person-based' // NEW

export interface PersonBasedCollectionData {
    personId: number
    personName: string
    roleFilter: 'acting' | 'directing' | 'writing' | 'production' | 'all'
    genreFilter: string[] // Unified genre IDs
    mediaType: 'movie' | 'tv' | 'both'
    autoUpdate: boolean
    lastUpdated: number
}

export interface UserList {
    // ... existing fields
    personData?: PersonBasedCollectionData // For person-based collections
}
```

#### C. Auto-Update Person Collections

```typescript
// In app/api/cron/update-collections/route.ts
async function updatePersonCollection(collection: UserList) {
    if (collection.collectionType !== 'person-based') return
    if (!collection.personData) return

    const { personId, roleFilter, genreFilter, mediaType } = collection.personData

    // Fetch current person credits from TMDB
    const credits = await fetch(`/api/people/${personId}/credits?childSafetyMode=false`).then((r) =>
        r.json()
    )

    // Filter by role
    let filtered = roleFilter === 'all' ? credits.combined : credits.cast // Or crew filtering logic

    // Filter by genre
    if (genreFilter.length > 0) {
        filtered = filterByUnifiedGenres(filtered, genreFilter)
    }

    // Filter by media type
    if (mediaType !== 'both') {
        filtered = filtered.filter((c) => c.media_type === mediaType)
    }

    // Check for new content
    const existingIds = new Set(collection.items.map((i) => i.id))
    const newContent = filtered.filter((c) => !existingIds.has(c.id))

    if (newContent.length > 0) {
        // Update collection
        await updateCollection(collection.id, {
            items: [...collection.items, ...newContent],
            lastUpdated: Date.now(),
        })

        // Create notification
        await createNotification(collection.userId, {
            type: 'person_collection_updated',
            message: `${collection.personData.personName} has ${newContent.length} new ${roleFilter} credit${newContent.length > 1 ? 's' : ''}`,
            collectionId: collection.id,
            personId,
        })
    }
}
```

### Implementation Files

**Phase 1 (Quick Win):**

1. `app/person/[id]/page.tsx` - Add "Save as Collection" button

**Phase 2 (Advanced):**

1. `types/collections.ts` - Add person-based collection type
2. `app/api/custom-rows/[id]/content/route.ts` - Support person fetching
3. `app/api/cron/update-collections/route.ts` - Auto-update logic
4. `types/notifications.ts` - Add person collection notification type

**Estimated effort:**

- Phase 1: 2-3 hours
- Phase 2: 1-2 days

**Impact:** High - Unlocks new discovery → organization flow

---

## Critical Gap #3: Forum Content Disconnection

### Current State

**What exists:**

- Rich forum system with threads, replies, likes
- Categories: General, Movies, TV Shows, Recommendations, Rankings
- Real-time updates, email notifications

**What's missing:**

- Forum posts can't mention/tag specific content
- No "Watch now" buttons in discussions
- Poll options can't link to actual titles
- Forum activity doesn't influence recommendations
- No "Discuss this" button on content modals

### The Problem

Users discuss movies/shows in forums, but:

- Mentions are plain text ("I loved Inception")
- No way to click through to content
- Forum discussions are isolated from discovery flow

### Proposed Solution

#### A. Content Mention Syntax

```typescript
// Support @movie:550 or @tv:1399 syntax
type ContentMention = {
    contentId: number
    mediaType: 'movie' | 'tv'
    title: string
    posterPath: string
    position: number // Character position in text
}

// Enhanced thread type
interface ThreadWithMentions extends Thread {
    mentionedContent: ContentMention[]
}

// Parser
function parseContentMentions(text: string): ContentMention[] {
    const mentionRegex = /@(movie|tv):(\d+)/g
    const matches = [...text.matchAll(mentionRegex)]

    return matches.map((match) => ({
        mediaType: match[1] as 'movie' | 'tv',
        contentId: parseInt(match[2]),
        position: match.index,
        // title and posterPath fetched async
    }))
}
```

#### B. Content Mention Autocomplete

```tsx
// Component: components/forum/ContentMentionPicker.tsx
export function ContentMentionPicker({ onSelect }: Props) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Content[]>([])

    const handleSearch = useDebouncedCallback(async (q: string) => {
        if (q.length < 2) return

        const response = await fetch(`/api/search?query=${q}&limit=5`)
        const data = await response.json()
        setResults(data.results)
    }, 300)

    return (
        <Combobox value={null} onChange={onSelect}>
            <ComboboxInput
                placeholder="Type to search content..."
                onChange={(e) => {
                    setQuery(e.target.value)
                    handleSearch(e.target.value)
                }}
            />
            <ComboboxOptions>
                {results.map((content) => (
                    <ComboboxOption key={content.id} value={content}>
                        <img src={getPosterUrl(content)} />
                        <div>
                            <div>{getTitle(content)}</div>
                            <div className="text-sm">{getYear(content)}</div>
                        </div>
                    </ComboboxOption>
                ))}
            </ComboboxOptions>
        </Combobox>
    )
}
```

#### C. Render Content Cards in Forum Posts

```tsx
// Component: components/forum/ThreadBody.tsx
export function ThreadBody({ thread }: { thread: ThreadWithMentions }) {
    const renderWithMentions = (text: string) => {
        if (!thread.mentionedContent || thread.mentionedContent.length === 0) {
            return <p>{text}</p>
        }

        // Replace @movie:123 with interactive content cards
        let lastIndex = 0
        const elements = []

        thread.mentionedContent.forEach((mention, i) => {
            // Text before mention
            elements.push(<span key={`text-${i}`}>{text.slice(lastIndex, mention.position)}</span>)

            // Content card
            elements.push(
                <ContentMentionCard
                    key={`mention-${i}`}
                    content={mention}
                    onClick={() => openModal(mention)}
                />
            )

            lastIndex = mention.position + `@${mention.mediaType}:${mention.contentId}`.length
        })

        // Remaining text
        elements.push(<span key="text-end">{text.slice(lastIndex)}</span>)

        return <div className="thread-body">{elements}</div>
    }

    return renderWithMentions(thread.body)
}
```

#### D. "Discuss This" Button on Content Modal

```tsx
// In components/modals/Modal.tsx
export default function Modal() {
    const { modal } = useModalStore()
    const router = useRouter()

    const handleDiscuss = () => {
        if (!modal.content) return

        // Navigate to forum with pre-filled thread
        router.push(
            `/forum/create?` +
                `title=Discussion: ${getTitle(modal.content.content)}` +
                `&mention=@${modal.content.content.media_type}:${modal.content.content.id}` +
                `&category=${modal.content.content.media_type === 'movie' ? 'Movies' : 'TV Shows'}`
        )
    }

    return (
        // ... existing modal JSX
        <button
            onClick={handleDiscuss}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                 bg-purple-600 hover:bg-purple-700"
        >
            <ChatBubbleLeftIcon className="w-5 h-5" />
            Discuss in Forums
        </button>
    )
}
```

### Implementation Files

1. `types/forum.ts` - Add mentionedContent to Thread
2. `utils/forum/contentMentions.ts` - Parser and resolver
3. `components/forum/ContentMentionPicker.tsx` - Autocomplete
4. `components/forum/ContentMentionCard.tsx` - Inline content display
5. `components/forum/ThreadBody.tsx` - Render with mentions
6. `components/modals/Modal.tsx` - Add "Discuss" button
7. `app/forum/create/page.tsx` - Pre-fill from query params
8. `utils/firestore/forum.ts` - Parse/store mentions on create

**Estimated effort:** 2-3 days
**Impact:** High - Connects community to content discovery

---

## High-Impact Feature #4: Comprehensive Notification System

### Current State

**Infrastructure exists:**

- Notification store with Firestore sync
- Bell icon with unread count
- Click actions and auto-dismiss (30 days)
- Preference toggles in settings

**Current triggers (only 3):**

- Trending watchlist items
- Collection auto-update
- Ranking comments/likes (partial)

**Missing triggers (10+):**

- Person you follow has new content
- Content you liked is leaving services
- Watchlist item got rating spike
- Poll you voted on closed
- Thread you commented on updated
- Collection shared with you
- Similar content available
- Recommendation engine improved

### The Problem

Notification infrastructure is at 20% utilization. Users miss important updates because triggers don't exist.

### Proposed Solution

#### Comprehensive Trigger System

```typescript
// In types/notifications.ts
export type NotificationTrigger =
    | 'watchlist_trending' // Existing
    | 'collection_updated' // Existing
    | 'ranking_comment' // Existing
    | 'ranking_like' // Existing
    | 'person_new_release' // NEW
    | 'watchlist_rating_spike' // NEW
    | 'poll_closed' // NEW
    | 'thread_reply' // NEW (in-app, not just email)
    | 'collection_shared' // NEW
    | 'similar_content_available' // NEW
    | 'genre_trending' // NEW
    | 'followed_user_ranking' // NEW (if social following added)

export interface NotificationPreferences {
    enabled: boolean
    types: Record<NotificationTrigger, boolean>
    digest: 'realtime' | 'daily' | 'weekly'
    quietHours: {
        enabled: boolean
        start: string // "22:00"
        end: string // "08:00"
    }
}
```

#### Cron Job for Periodic Checks

```typescript
// In app/api/cron/check-notifications/route.ts
export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await Promise.all([
        checkPersonNewReleases(),
        checkWatchlistRatingSpikes(),
        checkSimilarContentAvailable(),
        checkGenreTrending(),
    ])

    return NextResponse.json({
        success: true,
        notifications_created: results.reduce((sum, r) => sum + r, 0),
    })
}

async function checkPersonNewReleases(): Promise<number> {
    // Get all users with followed persons (future feature)
    // For now, check collections of type 'person-based' with autoUpdate enabled

    const personCollections = await getPersonBasedCollections()
    let count = 0

    for (const collection of personCollections) {
        const newCredits = await checkPersonForNewContent(
            collection.personData.personId,
            collection.lastUpdated
        )

        if (newCredits.length > 0) {
            await createNotification(collection.userId, {
                type: 'person_new_release',
                title: `New from ${collection.personData.personName}`,
                message: `${newCredits.length} new ${collection.personData.roleFilter} credit${newCredits.length > 1 ? 's' : ''}`,
                actionUrl: `/person/${collection.personData.personId}`,
                metadata: { personId: collection.personData.personId, newCount: newCredits.length },
            })
            count++
        }
    }

    return count
}

async function checkWatchlistRatingSpikes(): Promise<number> {
    // Get all users' watchlists
    const users = await getAllActiveUsers() // Users active in last 30 days
    let count = 0

    for (const user of users) {
        const watchlist = await getUserWatchlist(user.id)

        for (const item of watchlist) {
            // Check if rating increased significantly
            const currentRating = await getCurrentRating(item.id, item.media_type)
            const previousRating = item.vote_average || 0

            if (currentRating >= 8.0 && currentRating - previousRating >= 1.0) {
                await createNotification(user.id, {
                    type: 'watchlist_rating_spike',
                    title: `${getTitle(item)} is now highly rated`,
                    message: `Rating jumped from ${previousRating.toFixed(1)} to ${currentRating.toFixed(1)}`,
                    actionUrl: `/content/${item.media_type}/${item.id}`,
                    metadata: {
                        contentId: item.id,
                        oldRating: previousRating,
                        newRating: currentRating,
                    },
                })
                count++
            }
        }
    }

    return count
}
```

#### User Notification Preferences UI

```tsx
// In components/settings/NotificationsSection.tsx
export function NotificationsSection() {
    const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPrefs)

    const triggers: Array<{
        key: NotificationTrigger
        label: string
        description: string
        category: 'content' | 'community' | 'collections'
    }> = [
        {
            key: 'person_new_release',
            label: 'New releases from followed people',
            description: 'When actors/directors you follow have new content',
            category: 'content',
        },
        {
            key: 'watchlist_rating_spike',
            label: 'Watchlist item trending',
            description: 'When something in your watchlist gets highly rated',
            category: 'content',
        },
        // ... more triggers
    ]

    return (
        <div className="space-y-6">
            <h2>Notification Preferences</h2>

            {/* Master toggle */}
            <Toggle
                checked={prefs.enabled}
                onChange={(enabled) => setPrefs({ ...prefs, enabled })}
                label="Enable notifications"
            />

            {/* Digest mode */}
            <Select
                label="Notification frequency"
                value={prefs.digest}
                onChange={(digest) => setPrefs({ ...prefs, digest })}
                options={[
                    { value: 'realtime', label: 'Real-time' },
                    { value: 'daily', label: 'Daily digest' },
                    { value: 'weekly', label: 'Weekly digest' },
                ]}
            />

            {/* Per-trigger toggles */}
            <div className="space-y-4">
                {['content', 'community', 'collections'].map((category) => (
                    <div key={category}>
                        <h3 className="font-semibold capitalize">{category}</h3>
                        {triggers
                            .filter((t) => t.category === category)
                            .map((trigger) => (
                                <div
                                    key={trigger.key}
                                    className="flex items-center justify-between py-2"
                                >
                                    <div>
                                        <div className="font-medium">{trigger.label}</div>
                                        <div className="text-sm text-gray-400">
                                            {trigger.description}
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={prefs.types[trigger.key]}
                                        onChange={(checked) =>
                                            setPrefs({
                                                ...prefs,
                                                types: { ...prefs.types, [trigger.key]: checked },
                                            })
                                        }
                                    />
                                </div>
                            ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
```

### Implementation Files

1. `types/notifications.ts` - Add new trigger types and preferences
2. `app/api/cron/check-notifications/route.ts` - New cron job
3. `utils/notificationTriggers.ts` - Trigger logic helpers
4. `components/settings/NotificationsSection.tsx` - Preferences UI
5. `vercel.json` - Add cron job (daily at 6 AM)

**Estimated effort:** 3-4 days
**Impact:** High - Keeps users engaged with timely updates

---

## Medium-Impact Feature #5: Profile Analytics Dashboard

### Current State

**What's tracked:**

- 10 interaction types with timestamps
- Watch history with completion rates
- Collection creation/updates
- Rankings created
- Forum posts and comments
- Likes given

**What's shown:**

- None of this data is visualized for users
- No statistics, no insights, no trends

### Proposed Solution

#### A. Analytics Dashboard at `/profile/analytics`

```tsx
// New page: app/profile/analytics/page.tsx
export default function AnalyticsPage() {
    const interactions = useInteractionStore((s) => s.interactions)
    const watchHistory = useWatchHistoryStore((s) => s.entries)
    const collections = useCustomRowsStore((s) => s.customRows)

    // Calculate stats
    const stats = useMemo(() => {
        const genreBreakdown = calculateGenreBreakdown(interactions, watchHistory)
        const topActors = calculateTopActors(watchHistory)
        const viewingTrends = calculateViewingTrends(watchHistory)
        const completionRate = calculateCompletionRate(watchHistory)

        return { genreBreakdown, topActors, viewingTrends, completionRate }
    }, [interactions, watchHistory])

    return (
        <div className="space-y-8">
            <h1>Your Viewing Stats</h1>

            {/* Overview Cards */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard
                    title="Total Watch Time"
                    value={formatDuration(stats.totalWatchTime)}
                    icon={ClockIcon}
                />
                <StatCard title="Content Watched" value={watchHistory.length} icon={FilmIcon} />
                <StatCard
                    title="Collections Created"
                    value={collections.length}
                    icon={RectangleStackIcon}
                />
                <StatCard
                    title="Completion Rate"
                    value={`${stats.completionRate}%`}
                    icon={ChartBarIcon}
                />
            </div>

            {/* Genre Breakdown Pie Chart */}
            <div className="bg-zinc-900 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Viewing by Genre</h2>
                <PieChart data={stats.genreBreakdown} />
            </div>

            {/* Top Actors */}
            <div className="bg-zinc-900 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Most Watched Actors</h2>
                <div className="space-y-2">
                    {stats.topActors.slice(0, 10).map((actor, i) => (
                        <div key={actor.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-400">#{i + 1}</span>
                                <img
                                    src={getPersonImageUrl(actor.profile_path)}
                                    className="w-10 h-10 rounded-full"
                                />
                                <span>{actor.name}</span>
                            </div>
                            <span className="text-gray-400">{actor.count} titles</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Viewing Trends Line Chart */}
            <div className="bg-zinc-900 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Viewing Trends</h2>
                <LineChart data={stats.viewingTrends} />
            </div>
        </div>
    )
}
```

#### B. Calculation Utilities

```typescript
// In utils/analytics.ts
export function calculateGenreBreakdown(
    interactions: UserInteraction[],
    watchHistory: WatchHistoryEntry[]
): GenreBreakdown[] {
    const genreCounts: Record<string, number> = {}

    // Weight by watch completion
    watchHistory.forEach((entry) => {
        const weight = entry.progress / 100
        const genres = getGenresForContent(entry.contentId, entry.mediaType)

        genres.forEach((genre) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + weight
        })
    })

    // Convert to array and sort
    return Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
}

export function calculateTopActors(watchHistory: WatchHistoryEntry[]): PersonWithCount[] {
    const actorCounts = new Map<number, { person: Person; count: number }>()

    watchHistory.forEach((entry) => {
        if (entry.progress < 50) return // Only count if watched at least half

        const credits = getCachedCredits(entry.contentId, entry.mediaType)
        const cast = credits?.cast || []

        // Count top 5 billed actors
        cast.slice(0, 5).forEach((person) => {
            const existing = actorCounts.get(person.id)
            if (existing) {
                existing.count++
            } else {
                actorCounts.set(person.id, { person, count: 1 })
            }
        })
    })

    return Array.from(actorCounts.values()).sort((a, b) => b.count - a.count)
}

export function calculateViewingTrends(watchHistory: WatchHistoryEntry[]): TrendData[] {
    // Group by week
    const weeklyData = watchHistory.reduce(
        (acc, entry) => {
            const week = getWeekNumber(entry.watchedAt)
            if (!acc[week]) {
                acc[week] = { week, count: 0, totalMinutes: 0 }
            }
            acc[week].count++
            acc[week].totalMinutes += entry.watchedDuration / 60
            return acc
        },
        {} as Record<string, TrendDataPoint>
    )

    return Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week))
}
```

#### C. Shareable "Year in Review"

```tsx
// Component: components/profile/YearInReview.tsx
export function YearInReview({ year = new Date().getFullYear() }) {
    const stats = useYearStats(year)
    const [isGenerating, setIsGenerating] = useState(false)

    const handleShare = async () => {
        setIsGenerating(true)

        // Generate shareable image
        const canvas = await generateYearReviewImage({
            year,
            totalWatchTime: stats.totalMinutes,
            topGenre: stats.topGenre,
            topActor: stats.topActor,
            totalContent: stats.totalContent,
        })

        // Download or share
        const blob = await canvasToBlob(canvas)
        if (navigator.share) {
            await navigator.share({
                files: [new File([blob], `nettrailers-${year}.png`, { type: 'image/png' })],
                title: `My ${year} on NetTrailers`,
            })
        } else {
            downloadBlob(blob, `nettrailers-${year}.png`)
        }

        setIsGenerating(false)
    }

    return (
        <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-6">Your {year} in Review</h2>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <div className="text-5xl font-bold">{stats.totalContent}</div>
                    <div className="text-gray-300">titles watched</div>
                </div>

                <div>
                    <div className="text-5xl font-bold">{formatHours(stats.totalMinutes)}</div>
                    <div className="text-gray-300">hours of content</div>
                </div>

                <div>
                    <div className="text-3xl">{stats.topGenre.emoji}</div>
                    <div className="text-xl font-semibold">{stats.topGenre.name}</div>
                    <div className="text-gray-300">was your favorite genre</div>
                </div>

                <div>
                    <img src={stats.topActor.image} className="w-20 h-20 rounded-full" />
                    <div className="text-xl font-semibold">{stats.topActor.name}</div>
                    <div className="text-gray-300">was your most-watched actor</div>
                </div>
            </div>

            <button
                onClick={handleShare}
                disabled={isGenerating}
                className="mt-6 w-full py-3 bg-white text-purple-900 rounded-lg font-bold"
            >
                {isGenerating ? 'Generating...' : 'Share Your Year'}
            </button>
        </div>
    )
}
```

### Implementation Files

1. `app/profile/analytics/page.tsx` - Main analytics dashboard
2. `utils/analytics.ts` - Calculation utilities
3. `components/profile/YearInReview.tsx` - Shareable year summary
4. `components/charts/PieChart.tsx` - Genre breakdown chart
5. `components/charts/LineChart.tsx` - Viewing trends chart
6. `hooks/useYearStats.ts` - Custom hook for year data

**Estimated effort:** 3-4 days
**Impact:** High - Gamification, shareability, user engagement

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Watch History → Recommendations integration
- [ ] Continue Watching row
- [ ] Person page "Create Collection" button

### Phase 2: Community Integration (Week 3-4)

- [ ] Forum content tagging/mentions
- [ ] "Discuss This" button on modals
- [ ] Ranking → Collection conversion

### Phase 3: Engagement (Week 5-6)

- [ ] Comprehensive notification triggers
- [ ] Notification preferences UI
- [ ] Cron job for periodic checks

### Phase 4: Insights (Week 7-8)

- [ ] Profile analytics dashboard
- [ ] Year in Review feature
- [ ] Shareable graphics generation

### Phase 5: Polish (Week 9-10)

- [ ] Person-based auto-updating collections
- [ ] Search history and saved searches
- [ ] Collection collaboration (if time permits)

---

## Success Metrics

### Engagement Metrics

- **Watch history usage**: % of users with >10 watch history entries
- **Collection creation rate**: Collections created per active user per week
- **Notification click-through**: % of notifications clicked
- **Analytics page views**: % of users viewing analytics monthly

### Conversion Metrics

- **Person page → Collection**: Conversion rate from person page visits
- **Forum → Content**: Click-through from forum mentions to content
- **Notification → Action**: Actions taken from notifications

### Retention Metrics

- **Weekly active users**: Users returning weekly
- **Feature stickiness**: DAU/MAU ratio for new features
- **Share rate**: Users sharing year in review or collections

---

## Technical Considerations

### Performance

- Analytics calculations should be cached (Redis or Firestore)
- Watch history queries need indexing on userId + watchedAt
- Notification checks should be batched (max 1000 users per cron run)

### Privacy

- Users can export their interaction data (GDPR compliance)
- Opt-out for recommendation tracking
- Analytics are private by default (opt-in to share)

### Scalability

- Notification system needs queue (Firestore batch writes)
- Watch history limited to 90 days (auto-cleanup)
- Analytics pre-computed daily, not real-time

---

## Conclusion

NetTrailers has excellent infrastructure but several high-value features operate in isolation. The five critical gaps identified:

1. **Watch History → Recommendations** (Very High Impact)
2. **Person Pages → Collections** (High Impact)
3. **Forum Content Tagging** (High Impact)
4. **Comprehensive Notifications** (High Impact)
5. **Profile Analytics** (High Impact)

All proposed features leverage **existing infrastructure** and follow **established patterns** in the codebase. Most are additive (no refactoring) and can be implemented incrementally.

**Recommended first step:** Integrate watch history with recommendations - highest impact, leverages richest data source.
