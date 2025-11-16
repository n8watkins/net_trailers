import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import type { UserRecord } from 'firebase-admin/auth'
import type { Ranking } from '@/types/rankings'
import type { Movie, TVShow } from '@/typings'
import type { UserList } from '@/types/userLists'
import type { ThreadSummary, PollSummary, PollOptionSummary } from '@/types/forum'
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

    if (profileSnap.exists) {
        const profileData = profileSnap.data()
        if (profileData?.isPublic === false) {
            return null
        }
    }

    const userRef = db.collection('users').doc(userId)
    const userSnap = await userRef.get()

    if (!profileSnap.exists && !userSnap.exists) {
        return null
    }

    let authRecord: UserRecord | null = null
    try {
        authRecord = await getAdminAuth().getUser(userId)
    } catch (error) {
        console.warn('[PublicProfile] Failed to load auth record for user:', userId, error)
    }

    const legacyData = userSnap.exists ? userSnap.data() || {} : {}
    const legacyProfile = legacyData.profile || {}
    const profileData = profileSnap.exists ? profileSnap.data() || {} : null

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

    const likedContent = Array.isArray(legacyData.likedMovies)
        ? (legacyData.likedMovies as (Movie | TVShow)[])
        : []
    const collections = Array.isArray(legacyData.userCreatedWatchlists)
        ? (legacyData.userCreatedWatchlists as UserList[]).filter((list) => list?.isPublic)
        : []
    const watchLaterPreview = Array.isArray(legacyData.defaultWatchlist)
        ? (legacyData.defaultWatchlist as (Movie | TVShow)[]).slice(0, 12)
        : []

    const rankingsSnap = await db
        .collection('rankings')
        .where('userId', '==', userId)
        .limit(50)
        .get()
    const allRankings = rankingsSnap.docs.map((doc) => doc.data() as Ranking)
    const publicRankings = allRankings
        .filter((ranking) => ranking.isPublic)
        .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
        .slice(0, 20)

    const [threadsSnap, pollsSnap] = await Promise.all([
        db.collection('threads').where('userId', '==', userId).limit(25).get(),
        db.collection('polls').where('userId', '==', userId).limit(25).get(),
    ])

    const threadSummaries: ThreadSummary[] = threadsSnap.docs
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

    const pollSummaries: PollSummary[] = pollsSnap.docs
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

    const votesSnap = await db
        .collection('poll_votes')
        .where('userId', '==', userId)
        .limit(25)
        .get()

    const votedPollSummaries = (
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
    }
}
