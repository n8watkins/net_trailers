/**
 * Forum Store
 *
 * Manages forum state including threads, polls, and user interactions
 * Following the same pattern as other Zustand stores in the app
 */

import { create } from 'zustand'
import {
    Thread,
    ThreadReply,
    Poll,
    ForumCategory,
    ForumSortBy,
    ForumFilters,
    ReportReason,
    ReportContentType,
} from '@/types/forum'
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit as limitQuery,
    startAfter,
    Timestamp,
    increment,
    setDoc,
    QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase'

interface ForumState {
    // Threads
    threads: Thread[]
    currentThread: Thread | null
    threadReplies: ThreadReply[]
    isLoadingThreads: boolean
    threadsError: string | null
    lastThreadDoc: QueryDocumentSnapshot | null
    hasMoreThreads: boolean

    // Polls
    polls: Poll[]
    currentPoll: Poll | null
    isLoadingPolls: boolean
    pollsError: string | null
    lastPollDoc: QueryDocumentSnapshot | null
    hasMorePolls: boolean

    // Filters
    filters: ForumFilters

    // Actions - Threads
    loadThreads: (category?: ForumCategory, limit?: number) => Promise<void>
    loadMoreThreads: () => Promise<void>
    loadThreadById: (threadId: string) => Promise<void>
    loadThreadReplies: (threadId: string) => Promise<void>
    createThread: (
        userId: string,
        userName: string,
        userAvatar: string | undefined,
        title: string,
        content: string,
        category: ForumCategory,
        tags?: string[],
        images?: string[]
    ) => Promise<string>
    replyToThread: (
        userId: string,
        userName: string,
        userAvatar: string | undefined,
        threadId: string,
        content: string,
        parentReplyId?: string,
        images?: string[]
    ) => Promise<void>
    likeThread: (userId: string, threadId: string) => Promise<void>
    unlikeThread: (userId: string, threadId: string) => Promise<void>
    likeReply: (userId: string, replyId: string) => Promise<void>
    unlikeReply: (userId: string, replyId: string) => Promise<void>
    deleteThread: (userId: string, threadId: string) => Promise<void>
    deleteReply: (userId: string, replyId: string) => Promise<void>

    // Actions - Polls
    loadPolls: (category?: ForumCategory, limit?: number) => Promise<void>
    loadMorePolls: () => Promise<void>
    loadPollById: (pollId: string) => Promise<void>
    createPoll: (
        userId: string,
        userName: string,
        userAvatar: string | undefined,
        question: string,
        options: string[],
        category: ForumCategory
    ) => Promise<string>
    updatePoll: (
        userId: string,
        pollId: string,
        updates: { question?: string; options?: string[]; category?: ForumCategory }
    ) => Promise<void>
    hidePoll: (userId: string, pollId: string) => Promise<void>
    unhidePoll: (userId: string, pollId: string) => Promise<void>
    canEditPoll: (poll: Poll) => boolean
    voteOnPoll: (userId: string, pollId: string, optionIds: string[]) => Promise<void>
    deletePoll: (userId: string, pollId: string) => Promise<void>
    getUserVote: (userId: string, pollId: string) => Promise<string[] | null>

    // Actions - Reports
    reportContent: (
        userId: string,
        userName: string,
        contentId: string,
        contentType: ReportContentType,
        reason: ReportReason,
        details?: string
    ) => Promise<void>

    // Actions - Filters
    setFilters: (filters: Partial<ForumFilters>) => void
    setSortBy: (sortBy: ForumSortBy) => void
    setCategory: (category: ForumCategory | 'all') => void
    setSearchQuery: (query: string) => void

    // Reset
    reset: () => void
}

const initialFilters: ForumFilters = {
    category: 'all',
    sortBy: 'recent',
    searchQuery: '',
    tags: [],
}

export const useForumStore = create<ForumState>((set, get) => ({
    // Initial state
    threads: [],
    currentThread: null,
    threadReplies: [],
    isLoadingThreads: false,
    threadsError: null,
    lastThreadDoc: null,
    hasMoreThreads: true,

    polls: [],
    currentPoll: null,
    isLoadingPolls: false,
    pollsError: null,
    lastPollDoc: null,
    hasMorePolls: true,

    filters: initialFilters,

    // Thread actions
    loadThreads: async (category, limit = 20) => {
        set({ isLoadingThreads: true, threadsError: null, lastThreadDoc: null })
        try {
            const threadsRef = collection(db, 'threads')
            let q = query(threadsRef, orderBy('createdAt', 'desc'), limitQuery(limit))

            if (category) {
                q = query(
                    threadsRef,
                    where('category', '==', category),
                    orderBy('createdAt', 'desc'),
                    limitQuery(limit)
                )
            }

            const snapshot = await getDocs(q)
            const threads = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Thread[]

            const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
            const hasMore = snapshot.docs.length === limit

            set({
                threads,
                lastThreadDoc: lastDoc,
                hasMoreThreads: hasMore,
                isLoadingThreads: false,
            })
        } catch (error) {
            console.error('Failed to load threads:', error)
            set({
                threadsError: error instanceof Error ? error.message : 'Failed to load threads',
                isLoadingThreads: false,
            })
        }
    },

    loadMoreThreads: async () => {
        const { lastThreadDoc, hasMoreThreads, isLoadingThreads, filters } = get()

        if (!hasMoreThreads || isLoadingThreads || !lastThreadDoc) return

        set({ isLoadingThreads: true })
        try {
            const threadsRef = collection(db, 'threads')
            const category = filters.category !== 'all' ? filters.category : undefined
            const limit = 20

            let q = query(
                threadsRef,
                orderBy('createdAt', 'desc'),
                startAfter(lastThreadDoc),
                limitQuery(limit)
            )

            if (category) {
                q = query(
                    threadsRef,
                    where('category', '==', category),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastThreadDoc),
                    limitQuery(limit)
                )
            }

            const snapshot = await getDocs(q)
            const newThreads = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Thread[]

            const lastDoc = snapshot.docs[snapshot.docs.length - 1] || lastThreadDoc
            const hasMore = snapshot.docs.length === limit

            set((state) => ({
                threads: [...state.threads, ...newThreads],
                lastThreadDoc: lastDoc,
                hasMoreThreads: hasMore,
                isLoadingThreads: false,
            }))
        } catch (error) {
            console.error('Failed to load more threads:', error)
            set({ isLoadingThreads: false })
        }
    },

    loadThreadById: async (threadId) => {
        set({ isLoadingThreads: true, threadsError: null })
        try {
            const threadRef = doc(db, 'threads', threadId)
            const threadSnap = await getDoc(threadRef)

            if (threadSnap.exists()) {
                const thread = { ...threadSnap.data(), id: threadSnap.id } as Thread
                set({ currentThread: thread, isLoadingThreads: false })

                // Increment view count
                await updateDoc(threadRef, { views: increment(1) })
            } else {
                set({
                    currentThread: null,
                    isLoadingThreads: false,
                    threadsError: 'Thread not found',
                })
            }
        } catch (error) {
            set({
                threadsError: error instanceof Error ? error.message : 'Failed to load thread',
                isLoadingThreads: false,
            })
        }
    },

    loadThreadReplies: async (threadId) => {
        try {
            const repliesRef = collection(db, 'thread_replies')
            const q = query(
                repliesRef,
                where('threadId', '==', threadId),
                orderBy('createdAt', 'asc')
            )
            const snapshot = await getDocs(q)

            const replies = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as ThreadReply[]

            set({ threadReplies: replies })
        } catch (error) {
            console.error('Failed to load thread replies:', error)
        }
    },

    createThread: async (userId, userName, userAvatar, title, content, category, tags, images) => {
        try {
            const threadsRef = collection(db, 'threads')
            const now = Timestamp.now()

            const threadData = {
                id: '', // Will be set by Firestore
                title,
                content,
                category,
                userId,
                userName,
                createdAt: now,
                updatedAt: now,
                isPinned: false,
                isLocked: false,
                views: 0,
                replyCount: 0,
                likes: 0,
                tags: tags ?? [],
                images: images ?? [],
                ...(userAvatar ? { userAvatar } : {}),
            }

            const docRef = await addDoc(threadsRef, threadData)
            await updateDoc(docRef, { id: docRef.id })

            return docRef.id
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to create thread')
        }
    },

    replyToThread: async (
        userId,
        userName,
        userAvatar,
        threadId,
        content,
        parentReplyId,
        images
    ) => {
        try {
            const repliesRef = collection(db, 'thread_replies')
            const now = Timestamp.now()

            const replyData: Record<string, unknown> = {
                id: '', // Will be set by Firestore
                threadId,
                content,
                userId,
                userName,
                createdAt: now,
                isEdited: false,
                likes: 0,
                mentions: [],
                images: images || [],
            }

            // Only add optional fields if they have values
            if (userAvatar) {
                replyData.userAvatar = userAvatar
            }
            if (parentReplyId) {
                replyData.parentReplyId = parentReplyId
            }

            const docRef = await addDoc(repliesRef, replyData)
            await updateDoc(docRef, { id: docRef.id })

            // Increment reply count on thread
            const threadRef = doc(db, 'threads', threadId)
            const threadSnap = await getDoc(threadRef)

            if (!threadSnap.exists()) {
                throw new Error('Thread not found')
            }

            const threadData = threadSnap.data() as Thread

            await updateDoc(threadRef, {
                replyCount: increment(1),
                lastReplyAt: now,
                lastReplyBy: { userId, userName },
            })

            // Update local state optimistically
            set((state) => ({
                currentThread:
                    state.currentThread?.id === threadId
                        ? { ...state.currentThread, replyCount: state.currentThread.replyCount + 1 }
                        : state.currentThread,
                threads: state.threads.map((t) =>
                    t.id === threadId ? { ...t, replyCount: t.replyCount + 1 } : t
                ),
            }))

            // Send email notification
            // Determine recipient based on whether this is a reply to a reply or the thread
            let recipientUserId: string
            let isReplyToReply = false

            if (parentReplyId) {
                // Replying to a reply - notify the reply author
                const parentReplyRef = doc(db, 'thread_replies', parentReplyId)
                const parentReplySnap = await getDoc(parentReplyRef)

                if (parentReplySnap.exists()) {
                    recipientUserId = parentReplySnap.data().userId
                    isReplyToReply = true
                } else {
                    // Fallback to thread author if parent reply not found
                    recipientUserId = threadData.userId
                }
            } else {
                // Replying to thread - notify thread author
                recipientUserId = threadData.userId
            }

            // Send email notification (don't await - fire and forget)
            fetch('/api/forum/send-reply-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientUserId,
                    replierUserId: userId,
                    replierName: userName,
                    threadTitle: threadData.title,
                    threadId,
                    replyContent: content,
                    isReplyToReply,
                }),
            }).catch((error) => {
                // Log error but don't fail the reply operation
                console.error('Failed to send email notification:', error)
            })
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to reply')
        }
    },

    likeThread: async (userId, threadId) => {
        try {
            const likeRef = doc(db, 'thread_likes', `${userId}_${threadId}`)
            await setDoc(likeRef, {
                userId,
                threadId,
                createdAt: Timestamp.now(),
            })

            // Increment like count on thread
            const threadRef = doc(db, 'threads', threadId)
            await updateDoc(threadRef, { likes: increment(1) })

            // Update local state optimistically
            set((state) => ({
                currentThread:
                    state.currentThread?.id === threadId
                        ? { ...state.currentThread, likes: state.currentThread.likes + 1 }
                        : state.currentThread,
                threads: state.threads.map((t) =>
                    t.id === threadId ? { ...t, likes: t.likes + 1 } : t
                ),
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to like thread')
        }
    },

    unlikeThread: async (userId, threadId) => {
        try {
            const likeRef = doc(db, 'thread_likes', `${userId}_${threadId}`)
            await deleteDoc(likeRef)

            // Decrement like count on thread
            const threadRef = doc(db, 'threads', threadId)
            await updateDoc(threadRef, { likes: increment(-1) })

            // Update local state optimistically
            set((state) => ({
                currentThread:
                    state.currentThread?.id === threadId
                        ? {
                              ...state.currentThread,
                              likes: Math.max(0, state.currentThread.likes - 1),
                          }
                        : state.currentThread,
                threads: state.threads.map((t) =>
                    t.id === threadId ? { ...t, likes: Math.max(0, t.likes - 1) } : t
                ),
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to unlike thread')
        }
    },

    likeReply: async (userId, replyId) => {
        try {
            const likeRef = doc(db, 'reply_likes', `${userId}_${replyId}`)
            await setDoc(likeRef, {
                userId,
                replyId,
                createdAt: Timestamp.now(),
            })

            // Increment like count on reply
            const replyRef = doc(db, 'thread_replies', replyId)
            await updateDoc(replyRef, { likes: increment(1) })
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to like reply')
        }
    },

    unlikeReply: async (userId, replyId) => {
        try {
            const likeRef = doc(db, 'reply_likes', `${userId}_${replyId}`)
            await deleteDoc(likeRef)

            // Decrement like count on reply
            const replyRef = doc(db, 'thread_replies', replyId)
            await updateDoc(replyRef, { likes: increment(-1) })
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to unlike reply')
        }
    },

    deleteThread: async (userId, threadId) => {
        try {
            const threadRef = doc(db, 'threads', threadId)
            const threadSnap = await getDoc(threadRef)

            if (!threadSnap.exists() || threadSnap.data().userId !== userId) {
                throw new Error('Unauthorized or thread not found')
            }

            await deleteDoc(threadRef)

            // Also delete all replies to this thread
            const repliesRef = collection(db, 'thread_replies')
            const q = query(repliesRef, where('threadId', '==', threadId))
            const snapshot = await getDocs(q)
            const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))
            await Promise.all(deletePromises)
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to delete thread')
        }
    },

    deleteReply: async (userId, replyId) => {
        try {
            const replyRef = doc(db, 'thread_replies', replyId)
            const replySnap = await getDoc(replyRef)

            if (!replySnap.exists() || replySnap.data().userId !== userId) {
                throw new Error('Unauthorized or reply not found')
            }

            const threadId = replySnap.data().threadId
            await deleteDoc(replyRef)

            // Decrement reply count on thread
            const threadRef = doc(db, 'threads', threadId)
            await updateDoc(threadRef, { replyCount: increment(-1) })

            // Update local state optimistically
            const { currentThread, threads, threadReplies } = get()

            set({
                threads: threads.map((t) =>
                    t.id === threadId ? { ...t, replyCount: Math.max(0, t.replyCount - 1) } : t
                ),
                threadReplies: threadReplies.filter((r) => r.id !== replyId),
                ...(currentThread && currentThread.id === threadId
                    ? {
                          currentThread: {
                              ...currentThread,
                              replyCount: Math.max(0, currentThread.replyCount - 1),
                          },
                      }
                    : {}),
            })
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to delete reply')
        }
    },

    // Poll actions
    loadPolls: async (category, limit = 20) => {
        set({ isLoadingPolls: true, pollsError: null, lastPollDoc: null })
        try {
            const pollsRef = collection(db, 'polls')
            let q = query(pollsRef, orderBy('createdAt', 'desc'), limitQuery(limit))

            if (category) {
                q = query(
                    pollsRef,
                    where('category', '==', category),
                    orderBy('createdAt', 'desc'),
                    limitQuery(limit)
                )
            }

            const snapshot = await getDocs(q)
            const polls = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Poll[]

            const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
            const hasMore = snapshot.docs.length === limit

            set({
                polls,
                lastPollDoc: lastDoc,
                hasMorePolls: hasMore,
                isLoadingPolls: false,
            })
        } catch (error) {
            console.error('Failed to load polls:', error)
            set({
                pollsError: error instanceof Error ? error.message : 'Failed to load polls',
                isLoadingPolls: false,
            })
        }
    },

    loadMorePolls: async () => {
        const { lastPollDoc, hasMorePolls, isLoadingPolls, filters } = get()

        if (!hasMorePolls || isLoadingPolls || !lastPollDoc) return

        set({ isLoadingPolls: true })
        try {
            const pollsRef = collection(db, 'polls')
            const category = filters.category !== 'all' ? filters.category : undefined
            const limit = 20

            let q = query(
                pollsRef,
                orderBy('createdAt', 'desc'),
                startAfter(lastPollDoc),
                limitQuery(limit)
            )

            if (category) {
                q = query(
                    pollsRef,
                    where('category', '==', category),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastPollDoc),
                    limitQuery(limit)
                )
            }

            const snapshot = await getDocs(q)
            const newPolls = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Poll[]

            const lastDoc = snapshot.docs[snapshot.docs.length - 1] || lastPollDoc
            const hasMore = snapshot.docs.length === limit

            set((state) => ({
                polls: [...state.polls, ...newPolls],
                lastPollDoc: lastDoc,
                hasMorePolls: hasMore,
                isLoadingPolls: false,
            }))
        } catch (error) {
            console.error('Failed to load more polls:', error)
            set({ isLoadingPolls: false })
        }
    },

    loadPollById: async (pollId) => {
        set({ isLoadingPolls: true, pollsError: null })
        try {
            const pollRef = doc(db, 'polls', pollId)
            const pollSnap = await getDoc(pollRef)

            if (pollSnap.exists()) {
                const poll = { ...pollSnap.data(), id: pollSnap.id } as Poll
                set({ currentPoll: poll, isLoadingPolls: false })
            } else {
                set({ currentPoll: null, isLoadingPolls: false, pollsError: 'Poll not found' })
            }
        } catch (error) {
            set({
                pollsError: error instanceof Error ? error.message : 'Failed to load poll',
                isLoadingPolls: false,
            })
        }
    },

    createPoll: async (userId, userName, userAvatar, question, options, category) => {
        try {
            const pollsRef = collection(db, 'polls')
            const now = Timestamp.now()

            // Create poll options with initial vote counts
            const pollOptions = options.map((optionText, index) => ({
                id: `option-${index}`,
                text: optionText,
                votes: 0,
                percentage: 0,
            }))

            const pollData: Record<string, unknown> = {
                id: '', // Will be set by Firestore
                question,
                category,
                userId,
                userName,
                createdAt: now,
                options: pollOptions,
                totalVotes: 0,
                isMultipleChoice: false,
                allowAddOptions: false,
                isHidden: false,
                tags: [],
                ...(userAvatar ? { userAvatar } : {}),
            }

            const docRef = await addDoc(pollsRef, pollData)
            await updateDoc(docRef, { id: docRef.id })

            return docRef.id
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to create poll')
        }
    },

    voteOnPoll: async (userId, pollId, optionIds) => {
        try {
            // Record the vote
            const voteRef = doc(db, 'poll_votes', `${userId}_${pollId}`)
            await setDoc(voteRef, {
                pollId,
                userId,
                optionIds,
                votedAt: Timestamp.now(),
            })

            // Update poll vote counts
            const pollRef = doc(db, 'polls', pollId)
            const pollSnap = await getDoc(pollRef)

            if (!pollSnap.exists()) {
                throw new Error('Poll not found')
            }

            const pollData = pollSnap.data()
            const updatedOptions = pollData.options.map((option: any) => {
                if (optionIds.includes(option.id)) {
                    return {
                        ...option,
                        votes: option.votes + 1,
                    }
                }
                return option
            })

            // Recalculate percentages
            const totalVotes = pollData.totalVotes + 1
            const optionsWithPercentages = updatedOptions.map((option: any) => ({
                ...option,
                percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0,
            }))

            await updateDoc(pollRef, {
                options: optionsWithPercentages,
                totalVotes,
            })

            // Update local state optimistically
            const { currentPoll, polls } = get()

            if (currentPoll && currentPoll.id === pollId) {
                set({
                    currentPoll: {
                        ...currentPoll,
                        options: optionsWithPercentages,
                        totalVotes,
                    },
                })
            }

            set({
                polls: polls.map((p) =>
                    p.id === pollId ? { ...p, options: optionsWithPercentages, totalVotes } : p
                ),
            })
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to vote on poll')
        }
    },

    deletePoll: async (userId, pollId) => {
        try {
            const pollRef = doc(db, 'polls', pollId)
            const pollSnap = await getDoc(pollRef)

            if (!pollSnap.exists() || pollSnap.data().userId !== userId) {
                throw new Error('Unauthorized or poll not found')
            }

            await deleteDoc(pollRef)

            // Also delete all votes for this poll
            const votesRef = collection(db, 'poll_votes')
            const q = query(votesRef, where('pollId', '==', pollId))
            const snapshot = await getDocs(q)
            const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref))
            await Promise.all(deletePromises)
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to delete poll')
        }
    },

    getUserVote: async (userId, pollId) => {
        try {
            const voteRef = doc(db, 'poll_votes', `${userId}_${pollId}`)
            const voteSnap = await getDoc(voteRef)

            if (voteSnap.exists()) {
                return voteSnap.data().optionIds as string[]
            }
            return null
        } catch (error) {
            console.error('Failed to get user vote:', error)
            return null
        }
    },

    // Check if poll can be edited (within 5 minutes of creation)
    canEditPoll: (poll: Poll) => {
        const now = Date.now()
        const createdAt =
            poll.createdAt instanceof Timestamp
                ? poll.createdAt.toMillis()
                : typeof poll.createdAt === 'number'
                  ? poll.createdAt
                  : new Date(poll.createdAt).getTime()
        const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds
        return now - createdAt < fiveMinutes
    },

    // Update poll (only within 5 minutes of creation, resets all votes)
    updatePoll: async (userId, pollId, updates) => {
        try {
            const pollRef = doc(db, 'polls', pollId)
            const pollSnap = await getDoc(pollRef)

            if (!pollSnap.exists()) {
                throw new Error('Poll not found')
            }

            const pollData = pollSnap.data() as Poll
            if (pollData.userId !== userId) {
                throw new Error('Unauthorized')
            }

            // Check if within 5-minute edit window
            const now = Date.now()
            const createdAt =
                pollData.createdAt instanceof Timestamp
                    ? pollData.createdAt.toMillis()
                    : typeof pollData.createdAt === 'number'
                      ? pollData.createdAt
                      : new Date(pollData.createdAt).getTime()
            const fiveMinutes = 5 * 60 * 1000
            if (now - createdAt >= fiveMinutes) {
                throw new Error('Edit window has expired (5 minutes)')
            }

            // Prepare update data
            const updateData: Record<string, unknown> = {}

            if (updates.question) {
                updateData.question = updates.question
            }

            if (updates.category) {
                updateData.category = updates.category
            }

            if (updates.options) {
                // Reset options with zero votes
                updateData.options = updates.options.map((optionText, index) => ({
                    id: `option-${index}`,
                    text: optionText,
                    votes: 0,
                    percentage: 0,
                }))
                updateData.totalVotes = 0
            }

            await updateDoc(pollRef, updateData)

            // Delete all existing votes for this poll (reset votes)
            const votesRef = collection(db, 'poll_votes')
            const q = query(votesRef, where('pollId', '==', pollId))
            const snapshot = await getDocs(q)
            const deletePromises = snapshot.docs.map((voteDoc) => deleteDoc(voteDoc.ref))
            await Promise.all(deletePromises)

            // Update local state
            set((state) => ({
                currentPoll:
                    state.currentPoll?.id === pollId
                        ? ({ ...state.currentPoll, ...updateData } as Poll)
                        : state.currentPoll,
                polls: state.polls.map((p) =>
                    p.id === pollId ? ({ ...p, ...updateData } as Poll) : p
                ),
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to update poll')
        }
    },

    // Hide poll (owner only)
    hidePoll: async (userId, pollId) => {
        try {
            const pollRef = doc(db, 'polls', pollId)
            const pollSnap = await getDoc(pollRef)

            if (!pollSnap.exists() || pollSnap.data().userId !== userId) {
                throw new Error('Unauthorized or poll not found')
            }

            await updateDoc(pollRef, { isHidden: true })

            // Update local state
            set((state) => ({
                currentPoll:
                    state.currentPoll?.id === pollId
                        ? { ...state.currentPoll, isHidden: true }
                        : state.currentPoll,
                polls: state.polls.map((p) => (p.id === pollId ? { ...p, isHidden: true } : p)),
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to hide poll')
        }
    },

    // Unhide poll (owner only)
    unhidePoll: async (userId, pollId) => {
        try {
            const pollRef = doc(db, 'polls', pollId)
            const pollSnap = await getDoc(pollRef)

            if (!pollSnap.exists() || pollSnap.data().userId !== userId) {
                throw new Error('Unauthorized or poll not found')
            }

            await updateDoc(pollRef, { isHidden: false })

            // Update local state
            set((state) => ({
                currentPoll:
                    state.currentPoll?.id === pollId
                        ? { ...state.currentPoll, isHidden: false }
                        : state.currentPoll,
                polls: state.polls.map((p) => (p.id === pollId ? { ...p, isHidden: false } : p)),
            }))
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to unhide poll')
        }
    },

    // Report content
    reportContent: async (userId, userName, contentId, contentType, reason, details) => {
        try {
            const reportsRef = collection(db, 'content_reports')
            const now = Timestamp.now()

            const reportData = {
                id: '',
                contentId,
                contentType,
                reportedBy: userId,
                reporterName: userName,
                reason,
                details: details || '',
                createdAt: now,
                status: 'pending' as const,
            }

            const docRef = await addDoc(reportsRef, reportData)
            await updateDoc(docRef, { id: docRef.id })
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to report content')
        }
    },

    // Filter actions
    setFilters: (filters) => {
        set((state) => ({
            filters: { ...state.filters, ...filters },
        }))
    },

    setSortBy: (sortBy) => {
        set((state) => ({
            filters: { ...state.filters, sortBy },
        }))
    },

    setCategory: (category) => {
        set((state) => ({
            filters: { ...state.filters, category },
        }))
    },

    setSearchQuery: (searchQuery) => {
        set((state) => ({
            filters: { ...state.filters, searchQuery },
        }))
    },

    // Reset
    reset: () => {
        set({
            threads: [],
            currentThread: null,
            threadReplies: [],
            isLoadingThreads: false,
            threadsError: null,
            polls: [],
            currentPoll: null,
            isLoadingPolls: false,
            pollsError: null,
            filters: initialFilters,
        })
    },
}))
