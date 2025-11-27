import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import type { UserRecord } from 'firebase-admin/auth'
import type { Ranking } from '@/types/rankings'
import type { Movie, TVShow } from '@/typings'
import type { UserList } from '@/types/collections'
import type { ThreadSummary, PollSummary, PollOptionSummary } from '@/types/forum'
import type { ProfileVisibility } from '@/types/profile'
import { DEFAULT_PROFILE_VISIBILITY } from '@/types/profile'
import type { Timestamp, Firestore } from 'firebase-admin/firestore'

export interface PublicProfilePayload {
    profile: {
        username: string
        displayName?: string | null
        avatarUrl?: string | null
        bio?: string | null
        favoriteGenres?: string[]
    }
    stats: {
        totalRankings: number
        totalLikes: number
        totalViews: number
        totalLiked: number
        totalCollections: number
        totalThreads: number
        totalPollsCreated: number
        totalPollsVoted: number
    }
    rankings: Ranking[]
    likedContent: (Movie | TVShow)[]
    collections: UserList[]
    forum: {
        threads: ThreadSummary[]
        pollsCreated: PollSummary[]
        pollsVoted: PollSummary[]
    }
    watchLaterPreview: (Movie | TVShow)[]
    visibility: ProfileVisibility
}

const DEFAULT_HEADERS = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
} as const

const toMillis = (value?: Timestamp | number | null): number | null => {
    if (value === null || value === undefined) {
        return null
    }
    if (typeof value === 'number') {
        return value
    }
    return value.toMillis()
}

export function getPublicProfileCacheHeaders() {
    return DEFAULT_HEADERS
}

export async function fetchUserIdForUsername(username: string): Promise<string | null> {
    if (!username) return null
    const db = getAdminDb()
    const usernameRef = db.collection('usernames').doc(username)

    const usernameDoc = await usernameRef.get()
    if (!usernameDoc.exists) {
        return null
    }
    const data = usernameDoc.data()
    return data?.userId ?? null
}

export async function buildPublicProfilePayload(
    userId: string,
    existingDb?: Firestore
): Promise<PublicProfilePayload | null> {
    if (!userId) {
        return null
    }

    const db = existingDb ?? getAdminDb()

    const profileRef = db.collection('profiles').doc(userId)
    const profileSnap = await profileRef.get()

    const userRef = db.collection('users').doc(userId)
    const userSnap = await userRef.get()

    if (!profileSnap.exists && !userSnap.exists) {
        return null
    }

    // Get visibility settings (default to all visible for backward compatibility)
    const profileDataRaw = profileSnap.exists ? profileSnap.data() || {} : {}
    const visibility: ProfileVisibility = profileDataRaw.visibility ?? {
        ...DEFAULT_PROFILE_VISIBILITY,
    }

    let authRecord: UserRecord | null = null
    try {
        authRecord = await getAdminAuth().getUser(userId)
    } catch (error) {
        console.warn('[PublicProfile] Failed to load auth record for user:', userId, error)
    }

    const legacyData = userSnap.exists ? userSnap.data() || {} : {}
    const legacyProfile = legacyData.profile || {}
    const profileData = profileSnap.exists ? profileDataRaw : null

    const fallbackEmailLocal = authRecord?.email?.split('@')[0]
    const derivedUsername =
        profileData?.username ||
        legacyProfile.username ||
        legacyData.username ||
        legacyData.displayName ||
        authRecord?.displayName ||
        fallbackEmailLocal ||
        authRecord?.uid ||
        'User'
    const derivedDisplayName =
        profileData?.displayName ??
        legacyProfile.displayName ??
        legacyData.displayName ??
        authRecord?.displayName ??
        derivedUsername
    const derivedAvatar =
        profileData?.avatarUrl ??
        legacyProfile.avatarUrl ??
        legacyData.avatarUrl ??
        legacyData.photoURL ??
        authRecord?.photoURL ??
        null

    const profilePayload: PublicProfilePayload['profile'] = {
        username: derivedUsername,
        displayName: derivedDisplayName,
        avatarUrl: derivedAvatar,
        bio: profileData?.description ?? legacyProfile.bio ?? legacyData.bio ?? null,
        favoriteGenres: Array.isArray(profileData?.favoriteGenres)
            ? profileData.favoriteGenres
            : Array.isArray(legacyProfile.favoriteGenres)
              ? legacyProfile.favoriteGenres
              : undefined,
    }

    // Check if public profile is enabled (master toggle)
    // If enablePublicProfile is false (or undefined for backward compat), all sections are hidden
    const isPublicEnabled = visibility.enablePublicProfile !== false

    // Apply visibility settings to content sections
    // Each section requires both the master toggle AND its individual toggle to be on
    const likedContent =
        isPublicEnabled && visibility.showLikedContent && Array.isArray(legacyData.likedMovies)
            ? (legacyData.likedMovies as (Movie | TVShow)[])
            : []

    // Fetch collections from userCreatedWatchlists if visibility allows
    let collections: UserList[] = []
    if (isPublicEnabled && visibility.showCollections) {
        // Collections are stored in userCreatedWatchlists array (not customRows)
        const allCollections = (legacyData.userCreatedWatchlists as UserList[]) || []
        // Filter to only show non-system collections
        // For manual/ai-generated: require items array to have content
        // For tmdb-genre: show even without items (content is fetched dynamically)
        collections = allCollections
            .filter((c) => {
                if (c.isSystemCollection) return false
                // TMDB genre-based collections don't store items, they fetch dynamically
                if (c.collectionType === 'tmdb-genre') return true
                // Manual and AI-generated collections must have items
                return c.items && c.items.length > 0
            })
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .slice(0, 10) // Limit to 10 collections for the profile
    }

    const watchLaterPreview =
        isPublicEnabled && visibility.showWatchLater && Array.isArray(legacyData.defaultWatchlist)
            ? (legacyData.defaultWatchlist as (Movie | TVShow)[]).slice(0, 12)
            : []

    // Only fetch rankings if visibility allows
    let publicRankings: Ranking[] = []
    if (isPublicEnabled && visibility.showRankings) {
        const rankingsSnap = await db
            .collection('rankings')
            .where('userId', '==', userId)
            .limit(50)
            .get()
        const allRankings = rankingsSnap.docs.map((doc) => doc.data() as Ranking)
        publicRankings = allRankings
            .filter((ranking) => ranking.isPublic)
            .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
            .slice(0, 20)
    }

    // Only fetch forum data if respective visibility toggles allow
    const shouldFetchThreads = isPublicEnabled && visibility.showThreads
    const shouldFetchPolls =
        isPublicEnabled && (visibility.showPollsCreated || visibility.showPollsVoted)

    const [threadsSnap, pollsSnap] = await Promise.all([
        shouldFetchThreads
            ? db.collection('threads').where('userId', '==', userId).limit(25).get()
            : Promise.resolve({ docs: [] }),
        shouldFetchPolls
            ? db.collection('polls').where('userId', '==', userId).limit(25).get()
            : Promise.resolve({ docs: [] }),
    ])

    const threadSummaries: ThreadSummary[] =
        isPublicEnabled && visibility.showThreads
            ? threadsSnap.docs
                  .map((doc) => {
                      const data = doc.data() || {}
                      return {
                          id: doc.id,
                          title: data.title ?? 'Untitled thread',
                          content: data.content ?? '',
                          category: data.category ?? 'general',
                          likes: data.likes ?? 0,
                          views: data.views ?? 0,
                          replyCount: data.replyCount ?? 0,
                          createdAt: toMillis(data.createdAt as Timestamp | number | undefined),
                          updatedAt: toMillis(data.updatedAt as Timestamp | number | undefined),
                      }
                  })
                  .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
                  .slice(0, 10)
            : []

    const pollSummaries: PollSummary[] =
        isPublicEnabled && visibility.showPollsCreated
            ? pollsSnap.docs
                  .map((doc): PollSummary => {
                      const data = doc.data() || {}
                      return {
                          id: doc.id,
                          question: data.question ?? 'Untitled poll',
                          category: data.category ?? 'general',
                          totalVotes: data.totalVotes ?? 0,
                          isMultipleChoice: Boolean(data.isMultipleChoice),
                          allowAddOptions: Boolean(data.allowAddOptions),
                          options: Array.isArray(data.options)
                              ? data.options.map((option: unknown): PollOptionSummary => {
                                    const opt = option as Record<string, unknown>
                                    return {
                                        id: (opt.id as string) ?? '',
                                        text: (opt.text as string) ?? '',
                                        votes: (opt.votes as number) ?? 0,
                                        percentage: (opt.percentage as number) ?? 0,
                                    }
                                })
                              : [],
                          createdAt: toMillis(data.createdAt as Timestamp | number | undefined),
                          expiresAt: toMillis(data.expiresAt as Timestamp | number | undefined),
                          votedAt: null,
                      }
                  })
                  .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
                  .slice(0, 10)
            : []

    // Fetch voted polls only if visibility allows
    let votedPollSummaries: PollSummary[] = []
    if (isPublicEnabled && visibility.showPollsVoted) {
        const votesSnap = await db
            .collection('poll_votes')
            .where('userId', '==', userId)
            .limit(25)
            .get()

        votedPollSummaries = (
            await Promise.all(
                votesSnap.docs.map(async (voteDoc) => {
                    const voteData = voteDoc.data() || {}
                    const pollId = voteData.pollId as string | undefined
                    if (!pollId) {
                        return null
                    }

                    const pollDoc = await db.collection('polls').doc(pollId).get()
                    if (!pollDoc.exists) {
                        return null
                    }

                    const pollData = pollDoc.data() || {}
                    if (pollData.userId === userId) {
                        return null
                    }

                    const summary: PollSummary = {
                        id: pollDoc.id,
                        question: pollData.question ?? 'Untitled poll',
                        category: pollData.category ?? 'general',
                        totalVotes: pollData.totalVotes ?? 0,
                        isMultipleChoice: Boolean(pollData.isMultipleChoice),
                        allowAddOptions: Boolean(pollData.allowAddOptions),
                        options: Array.isArray(pollData.options)
                            ? pollData.options.map((option: unknown): PollOptionSummary => {
                                  const opt = option as Record<string, unknown>
                                  return {
                                      id: (opt.id as string) ?? '',
                                      text: (opt.text as string) ?? '',
                                      votes: (opt.votes as number) ?? 0,
                                      percentage: (opt.percentage as number) ?? 0,
                                  }
                              })
                            : [],
                        createdAt: toMillis(pollData.createdAt as Timestamp | number | undefined),
                        expiresAt: toMillis(pollData.expiresAt as Timestamp | number | undefined),
                        votedAt: toMillis(voteData.votedAt as Timestamp | number | undefined),
                    }
                    return summary
                })
            )
        ).filter((poll): poll is PollSummary => poll !== null)
    }

    const uniqueVoted = votedPollSummaries.reduce<Record<string, PollSummary>>((acc, poll) => {
        const existing = acc[poll.id]
        if (!existing || (poll.votedAt ?? 0) > (existing.votedAt ?? 0)) {
            acc[poll.id] = poll
        }
        return acc
    }, {})

    const orderedVotedPolls = Object.values(uniqueVoted)
        .sort((a, b) => (b.votedAt ?? 0) - (a.votedAt ?? 0))
        .slice(0, 10)

    const stats: PublicProfilePayload['stats'] = {
        totalRankings: profileData?.rankingsCount ?? publicRankings.length,
        totalLikes:
            profileData?.totalLikes ??
            publicRankings.reduce((sum, ranking) => sum + (ranking.likes || 0), 0),
        totalViews:
            profileData?.totalViews ??
            publicRankings.reduce((sum, ranking) => sum + (ranking.views || 0), 0),
        totalLiked: likedContent.length,
        totalCollections: collections.length,
        totalThreads: threadSummaries.length,
        totalPollsCreated: pollSummaries.length,
        totalPollsVoted: orderedVotedPolls.length,
    }

    return {
        profile: profilePayload,
        stats,
        rankings: publicRankings,
        likedContent,
        collections,
        forum: {
            threads: threadSummaries,
            pollsCreated: pollSummaries,
            pollsVoted: orderedVotedPolls,
        },
        watchLaterPreview,
        visibility,
    }
}
