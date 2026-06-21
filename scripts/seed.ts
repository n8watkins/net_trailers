/**
 * Drizzle demo-seed script (replaces the removed Firebase seed system).
 *
 *   npm run db:seed
 *
 * Inserts a demo user + profile and a little public community content
 * (threads, a poll, and a ranking) so a fresh Turso database isn't empty.
 * Idempotent: it removes the demo user's previous rows first.
 */

import './load-env'

import { eq } from 'drizzle-orm'

import { db } from '../db'
import { polls, profiles, rankings, threads, userPreferences, users } from '../db/schema'
import { defaultAuthSession } from '../types/shared'
import type { RankedItem } from '../types/rankings'
import type { Content } from '../typings'

const DEMO_USER_ID = 'demo-seed-user'
const DEMO_EMAIL = 'demo@nettrailers.app'
const now = () => Date.now()

/** Minimal Content stub for seeded rankings (enough for cards to render). */
function movie(id: number, title: string, poster: string): Content {
    return {
        id,
        media_type: 'movie',
        title,
        name: title,
        poster_path: poster,
        backdrop_path: poster,
        overview: `${title} — seeded demo content.`,
        vote_average: 8,
        genre_ids: [28, 12],
        release_date: '2014-11-05',
    } as unknown as Content
}

async function seed() {
    console.log('🌱 Seeding demo data into Turso…')

    // Clean any prior demo rows (children first).
    await db.delete(rankings).where(eq(rankings.userId, DEMO_USER_ID))
    await db.delete(threads).where(eq(threads.userId, DEMO_USER_ID))
    await db.delete(polls).where(eq(polls.userId, DEMO_USER_ID))
    await db.delete(profiles).where(eq(profiles.userId, DEMO_USER_ID))
    await db.delete(userPreferences).where(eq(userPreferences.userId, DEMO_USER_ID))
    await db.delete(users).where(eq(users.id, DEMO_USER_ID))

    // Demo user + profile + empty preferences.
    await db.insert(users).values({
        id: DEMO_USER_ID,
        name: 'Demo User',
        email: DEMO_EMAIL,
        githubLogin: 'demo',
    })
    await db.insert(profiles).values({
        userId: DEMO_USER_ID,
        email: DEMO_EMAIL,
        displayName: 'Demo User',
        username: 'demo',
        description: 'Seeded demo profile.',
        isPublic: true,
        createdAt: now(),
        updatedAt: now(),
    })
    await db.insert(userPreferences).values({
        userId: DEMO_USER_ID,
        data: { ...defaultAuthSession.preferences, lastActive: now() },
        updatedAt: now(),
    })

    // A public ranking.
    const rankedItems: RankedItem[] = [
        { position: 1, content: movie(550, 'Fight Club', '/poster1.jpg'), addedAt: now() },
        { position: 2, content: movie(157336, 'Interstellar', '/poster2.jpg'), addedAt: now() },
        { position: 3, content: movie(27205, 'Inception', '/poster3.jpg'), addedAt: now() },
    ] as RankedItem[]
    await db.insert(rankings).values({
        userId: DEMO_USER_ID,
        userName: 'Demo User',
        title: 'Mind-Bending Movies',
        description: 'A seeded demo ranking.',
        rankedItems,
        isPublic: true,
        itemCount: rankedItems.length,
        createdAt: now(),
        updatedAt: now(),
        contentIds: [550, 157336, 27205],
        contentTitles: ['Fight Club', 'Interstellar', 'Inception'],
    })

    // A couple of forum threads.
    for (const t of [
        { title: 'Best sci-fi of the decade?', category: 'movies' },
        { title: 'Underrated TV gems', category: 'tv-shows' },
        { title: 'Welcome to the community 👋', category: 'general' },
    ]) {
        await db.insert(threads).values({
            title: t.title,
            content: 'Seeded demo thread — start the discussion!',
            category: t.category,
            userId: DEMO_USER_ID,
            userName: 'Demo User',
            createdAt: now(),
            updatedAt: now(),
        })
    }

    // A poll.
    await db.insert(polls).values({
        question: 'Which trailer hooks you fastest?',
        category: 'general',
        userId: DEMO_USER_ID,
        userName: 'Demo User',
        createdAt: now(),
        options: [
            { id: 'a', text: 'Action-packed', votes: 0, percentage: 0 },
            { id: 'b', text: 'Slow burn', votes: 0, percentage: 0 },
            { id: 'c', text: 'Mystery box', votes: 0, percentage: 0 },
        ],
        totalVotes: 0,
    })

    console.log('✅ Seed complete: demo user, profile, 1 ranking, 3 threads, 1 poll.')
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Seed failed:', err)
        process.exit(1)
    })
