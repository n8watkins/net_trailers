/**
 * Forum Store
 *
 * Manages forum state including threads, polls, and user interactions
 * Following the same pattern as other Zustand stores in the app
 */

import { create } from 'zustand'
import { Thread, ThreadReply, Poll, ForumCategory, ForumSortBy, ForumFilters } from '@/types/forum'
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
    Timestamp,
    increment,
    setDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface ForumState {
    // Threads
    threads: Thread[]
    currentThread: Thread | null
    threadReplies: ThreadReply[]
    isLoadingThreads: boolean
    threadsError: string | null

    // Polls
    polls: Poll[]
    currentPoll: Poll | null
    isLoadingPolls: boolean
    pollsError: string | null

    // Filters
    filters: ForumFilters

    // Actions - Threads
    loadThreads: (category?: ForumCategory, limit?: number) => Promise<void>
    loadThreadById: (threadId: string) => Promise<void>
    loadThreadReplies: (threadId: string) => Promise<void>
    createThread: (
        userId: string,
        title: string,
        content: string,
        category: ForumCategory,
        tags?: string[]
    ) => Promise<string>
    replyToThread: (
        userId: string,
        threadId: string,
        content: string,
        parentReplyId?: string
    ) => Promise<void>
    likeThread: (userId: string, threadId: string) => Promise<void>
    unlikeThread: (userId: string, threadId: string) => Promise<void>
    likeReply: (userId: string, replyId: string) => Promise<void>
    unlikeReply: (userId: string, replyId: string) => Promise<void>
    deleteThread: (userId: string, threadId: string) => Promise<void>
    deleteReply: (userId: string, replyId: string) => Promise<void>

    // Actions - Polls
    loadPolls: (category?: ForumCategory, limit?: number) => Promise<void>
    loadPollById: (pollId: string) => Promise<void>
    createPoll: (
        userId: string,
        question: string,
        options: string[],
        category: ForumCategory,
        description?: string,
        isMultipleChoice?: boolean,
        expiresInDays?: number
    ) => Promise<string>
    voteOnPoll: (userId: string, pollId: string, optionIds: string[]) => Promise<void>
    deletePoll: (userId: string, pollId: string) => Promise<void>
    getUserVote: (userId: string, pollId: string) => Promise<string[] | null>

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

    polls: [],
    currentPoll: null,
    isLoadingPolls: false,
    pollsError: null,

    filters: initialFilters,

    // Thread actions
    loadThreads: async (category, limit = 50) => {
        set({ isLoadingThreads: true, threadsError: null })
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

            set({ threads, isLoadingThreads: false })
        } catch (error) {
            console.error('Failed to load threads:', error)
            set({
                threadsError: error instanceof Error ? error.message : 'Failed to load threads',
                isLoadingThreads: false,
            })
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

    createThread: async (userId, title, content, category, tags) => {
        try {
            const threadsRef = collection(db, 'threads')
            const now = Timestamp.now()

            // Get user info from auth (you may want to pass this in or get from auth state)
            const threadData = {
                id: '', // Will be set by Firestore
                title,
                content,
                category,
                userId,
                userName: 'User', // Should get from auth
                userAvatar: undefined,
                createdAt: now,
                updatedAt: now,
                isPinned: false,
                isLocked: false,
                views: 0,
                replyCount: 0,
                likes: 0,
                tags: tags || [],
            }

            const docRef = await addDoc(threadsRef, threadData)
            await updateDoc(docRef, { id: docRef.id })

            return docRef.id
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to create thread')
        }
    },

    replyToThread: async (userId, threadId, content, parentReplyId) => {
        try {
            const repliesRef = collection(db, 'thread_replies')
            const now = Timestamp.now()

            const replyData = {
                id: '', // Will be set by Firestore
                threadId,
                content,
                userId,
                userName: 'User', // Should get from auth
                userAvatar: undefined,
                createdAt: now,
                updatedAt: undefined,
                isEdited: false,
                likes: 0,
                parentReplyId: parentReplyId || undefined,
                mentions: [],
            }

            const docRef = await addDoc(repliesRef, replyData)
            await updateDoc(docRef, { id: docRef.id })

            // Increment reply count on thread
            const threadRef = doc(db, 'threads', threadId)
            await updateDoc(threadRef, {
                replyCount: increment(1),
                lastReplyAt: now,
                lastReplyBy: { userId, userName: 'User' },
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
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to delete reply')
        }
    },

    // Poll actions
    loadPolls: async (category, limit = 50) => {
        set({ isLoadingPolls: true, pollsError: null })
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

            set({ polls, isLoadingPolls: false })
        } catch (error) {
            console.error('Failed to load polls:', error)
            set({
                pollsError: error instanceof Error ? error.message : 'Failed to load polls',
                isLoadingPolls: false,
            })
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

    createPoll: async (
        userId,
        question,
        options,
        category,
        description,
        isMultipleChoice = false,
        expiresInDays
    ) => {
        try {
            const pollsRef = collection(db, 'polls')
            const now = Timestamp.now()

            // Calculate expiration date if provided
            let expiresAt: Timestamp | undefined
            if (expiresInDays) {
                const expireDate = new Date()
                expireDate.setDate(expireDate.getDate() + expiresInDays)
                expiresAt = Timestamp.fromDate(expireDate)
            }

            // Create poll options with initial vote counts
            const pollOptions = options.map((optionText, index) => ({
                id: `option-${index}`,
                text: optionText,
                votes: 0,
                percentage: 0,
            }))

            const pollData = {
                id: '', // Will be set by Firestore
                question,
                description: description || undefined,
                category,
                userId,
                userName: 'User', // Should get from auth
                userAvatar: undefined,
                createdAt: now,
                expiresAt: expiresAt || undefined,
                options: pollOptions,
                totalVotes: 0,
                isMultipleChoice,
                allowAddOptions: false,
                tags: [],
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
