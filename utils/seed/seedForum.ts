/**
 * Seed Forum Threads and Polls
 */

import type { ForumCategory, Thread, Poll } from '../../types/forum'
import { Timestamp } from 'firebase/firestore'

export interface SeedForumOptions {
    userId: string
    userName: string
    userAvatar?: string
    threadCount: number
    pollCount: number
    isGuest: boolean
}

const LOCAL_SEED_THREAD_PREFIX = 'seed-local-thread-'
const LOCAL_SEED_POLL_PREFIX = 'seed-local-poll-'

const THREAD_TEMPLATES = [
    {
        title: 'What are your thoughts on the new Dune Part 2?',
        content:
            "Just watched Dune Part 2 and I'm blown away! The visuals were stunning. What did everyone else think?",
        category: 'movies' as ForumCategory,
        tags: ['dune', 'sci-fi', 'discussion'],
    },
    {
        title: 'Best TV shows of 2024 so far?',
        content:
            "We're halfway through 2024 and there have been some incredible shows. What are your top picks?",
        category: 'tv-shows' as ForumCategory,
        tags: ['2024', 'tv-shows', 'recommendations'],
    },
    {
        title: 'Looking for hidden gem horror movies',
        content:
            "I've watched all the popular horror films and I'm looking for some underrated gems. Any recommendations?",
        category: 'recommendations' as ForumCategory,
        tags: ['horror', 'recommendations', 'hidden-gems'],
    },
    {
        title: 'Ranking Nolan films - Let the debates begin!',
        content:
            "I just finished rewatching all of Christopher Nolan's films. My top 3: The Prestige, Interstellar, Inception. Fight me!",
        category: 'rankings' as ForumCategory,
        tags: ['christopher-nolan', 'rankings', 'debate'],
    },
    {
        title: 'Anyone else disappointed with Marvel Phase 5?',
        content:
            "I've been a huge MCU fan since the beginning, but Phase 5 hasn't been hitting the same for me. Am I alone in this?",
        category: 'movies' as ForumCategory,
        tags: ['marvel', 'mcu', 'discussion'],
    },
]

const POLL_TEMPLATES = [
    {
        question: 'What is the best Christopher Nolan film?',
        description: 'Cast your vote for the greatest Nolan masterpiece!',
        category: 'movies' as ForumCategory,
        options: ['The Dark Knight', 'Inception', 'Interstellar', 'The Prestige', 'Oppenheimer'],
        isMultipleChoice: false,
    },
    {
        question: 'Which streaming service has the best original content?',
        description: 'Time to settle this debate once and for all!',
        category: 'tv-shows' as ForumCategory,
        options: ['Netflix', 'HBO Max', 'Apple TV+', 'Disney+', 'Amazon Prime'],
        isMultipleChoice: false,
    },
    {
        question: 'What genres do you want to see more of? (Select all)',
        description: 'Help us understand what the community loves!',
        category: 'general' as ForumCategory,
        options: ['Sci-Fi', 'Horror', 'Thriller', 'Comedy', 'Documentary'],
        isMultipleChoice: true,
    },
    {
        question: 'Best animated movie of all time?',
        category: 'movies' as ForumCategory,
        options: ['Spirited Away', 'The Lion King', 'Toy Story', 'Spider-Verse'],
        isMultipleChoice: false,
    },
]

export async function seedForumThreads(options: SeedForumOptions): Promise<string[]> {
    const { userId, userName, userAvatar, threadCount, isGuest } = options

    if (threadCount <= 0) {
        console.log('  ⏭️  Skipping forum threads (count = 0)')
        return []
    }

    console.log(`  🧵 Seeding ${threadCount} forum thread(s)...`)

    const { useForumStore } = await import('../../stores/forumStore')
    const selectedThreads = THREAD_TEMPLATES.slice(
        0,
        Math.min(threadCount, THREAD_TEMPLATES.length)
    )
    const createdIds: string[] = []

    if (isGuest) {
        const baseTime = Date.now()
        const generatedThreads: Thread[] = selectedThreads.map((t, index) => ({
            id: `${LOCAL_SEED_THREAD_PREFIX}${userId}_${baseTime}_${index}`,
            title: t.title,
            content: t.content,
            category: t.category,
            userId,
            userName,
            createdAt: Timestamp.fromMillis(baseTime - index * 60 * 60 * 1000),
            updatedAt: Timestamp.fromMillis(baseTime - index * 60 * 60 * 1000),
            isPinned: false,
            isLocked: false,
            views: Math.floor(Math.random() * 500) + 50,
            replyCount: Math.floor(Math.random() * 40) + 5,
            lastReplyAt: Timestamp.fromMillis(baseTime - index * 30 * 60 * 1000),
            lastReplyBy: { userId, userName },
            tags: t.tags,
            likes: Math.floor(Math.random() * 80) + 10,
            images: [],
            ...(userAvatar ? { userAvatar } : {}),
        }))

        createdIds.push(...generatedThreads.map((t) => t.id))

        useForumStore.setState((state) => ({
            threads: [
                ...state.threads.filter((t) => !t.id.startsWith(LOCAL_SEED_THREAD_PREFIX)),
                ...generatedThreads,
            ],
        }))

        console.log('    ✅ Added guest threads to local forum store')
        return createdIds
    }

    // Auth user - create in Firestore
    for (const template of selectedThreads) {
        try {
            const threadId = await useForumStore
                .getState()
                .createThread(
                    userId,
                    userName,
                    userAvatar,
                    template.title,
                    template.content,
                    template.category,
                    template.tags
                )
            createdIds.push(threadId)
            console.log(`    ✅ Created thread: ${template.title}`)
            await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
            console.error(`    ❌ Failed to create thread "${template.title}":`, error)
        }
    }

    return createdIds
}

export async function seedForumPolls(options: SeedForumOptions): Promise<string[]> {
    const { userId, userName, userAvatar, pollCount, isGuest } = options

    if (pollCount <= 0) {
        console.log('  ⏭️  Skipping forum polls (count = 0)')
        return []
    }

    console.log(`  📊 Seeding ${pollCount} forum poll(s)...`)

    const { useForumStore } = await import('../../stores/forumStore')
    const selectedPolls = POLL_TEMPLATES.slice(0, Math.min(pollCount, POLL_TEMPLATES.length))
    const createdIds: string[] = []

    if (isGuest) {
        const baseTime = Date.now()
        const generatedPolls: Poll[] = selectedPolls.map((p, index) => {
            const voteCounts = p.options.map(() => Math.floor(Math.random() * 40) + 10)
            const totalVotes = voteCounts.reduce((sum, c) => sum + c, 0)

            return {
                id: `${LOCAL_SEED_POLL_PREFIX}${userId}_${baseTime}_${index}`,
                question: p.question,
                category: p.category,
                userId,
                userName,
                createdAt: Timestamp.fromMillis(baseTime - index * 90 * 60 * 1000),
                options: p.options.map((text, i) => ({
                    id: `seed-option-${i}`,
                    text,
                    votes: voteCounts[i],
                    percentage: totalVotes > 0 ? Math.round((voteCounts[i] / totalVotes) * 100) : 0,
                })),
                totalVotes,
                isMultipleChoice: p.isMultipleChoice,
                allowAddOptions: false,
                tags: [],
                ...(p.description ? { description: p.description } : {}),
                ...(userAvatar ? { userAvatar } : {}),
            }
        })

        createdIds.push(...generatedPolls.map((p) => p.id))

        useForumStore.setState((state) => ({
            polls: [
                ...state.polls.filter((p) => !p.id.startsWith(LOCAL_SEED_POLL_PREFIX)),
                ...generatedPolls,
            ],
        }))

        console.log('    ✅ Added guest polls to local forum store')
        return createdIds
    }

    // Auth user - create in Firestore
    for (const template of selectedPolls) {
        try {
            const pollId = await useForumStore
                .getState()
                .createPoll(
                    userId,
                    userName,
                    userAvatar,
                    template.question,
                    template.options,
                    template.category,
                    template.description,
                    template.isMultipleChoice,
                    undefined
                )
            createdIds.push(pollId)
            console.log(`    ✅ Created poll: ${template.question}`)
            await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
            console.error(`    ❌ Failed to create poll "${template.question}":`, error)
        }
    }

    return createdIds
}
