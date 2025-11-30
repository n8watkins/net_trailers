#!/usr/bin/env ts-node

/**
 * Test Script: Trending Notifications
 *
 * This script helps test the trending notification cron job by:
 * 1. Setting up test users with specific watchlist items
 * 2. Configuring notification preferences
 * 3. Running the cron job
 * 4. Verifying notifications were created
 *
 * Usage:
 *   npm run test:trending-notifications
 *   npm run test:trending-notifications -- --cleanup
 */

import { getAdminDb } from '../lib/firebase-admin'

// Test user configuration
interface TestUser {
    userId: string
    email: string
    watchlist: Array<{ id: number; media_type: 'movie' | 'tv'; title: string }>
    trendingNotificationsEnabled: boolean
    lastLoginAt: number
}

const TEST_USERS: TestUser[] = [
    {
        userId: 'test-user-1-trending',
        email: 'test1@trending.local',
        watchlist: [
            { id: 603, media_type: 'movie', title: 'The Matrix' }, // Popular movie likely to be trending
            { id: 238, media_type: 'movie', title: 'The Godfather' },
            { id: 550, media_type: 'movie', title: 'Fight Club' },
        ],
        trendingNotificationsEnabled: true,
        lastLoginAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago (will receive notifications)
    },
    {
        userId: 'test-user-2-trending',
        email: 'test2@trending.local',
        watchlist: [
            { id: 1396, media_type: 'tv', title: 'Breaking Bad' }, // Popular TV show
            { id: 1399, media_type: 'tv', title: 'Game of Thrones' },
            { id: 94605, media_type: 'tv', title: 'Arcane' },
        ],
        trendingNotificationsEnabled: true,
        lastLoginAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago (will receive notifications)
    },
    {
        userId: 'test-user-3-trending',
        email: 'test3@trending.local',
        watchlist: [
            { id: 155, media_type: 'movie', title: 'The Dark Knight' },
            { id: 680, media_type: 'movie', title: 'Pulp Fiction' },
        ],
        trendingNotificationsEnabled: false, // Opted out (will NOT receive notifications)
        lastLoginAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    },
    {
        userId: 'test-user-4-trending',
        email: 'test4@trending.local',
        watchlist: [
            { id: 278, media_type: 'movie', title: 'The Shawshank Redemption' },
            { id: 424, media_type: 'movie', title: "Schindler's List" },
        ],
        trendingNotificationsEnabled: true,
        lastLoginAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago (recently logged in, will NOT receive notifications)
    },
]

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
}

function log(message: string, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`)
}

function header(message: string) {
    log('\n========================================', colors.blue)
    log(`  ${message}`, colors.blue)
    log('========================================', colors.blue)
    console.log('')
}

async function setupTestUsers() {
    header('Setting Up Test Users')

    const db = getAdminDb()

    for (const user of TEST_USERS) {
        log(`Creating user: ${user.email}`, colors.cyan)
        log(`  - User ID: ${user.userId}`, colors.cyan)
        log(`  - Watchlist items: ${user.watchlist.length}`, colors.cyan)
        log(
            `  - Trending notifications: ${user.trendingNotificationsEnabled ? 'ENABLED' : 'DISABLED'}`,
            colors.cyan
        )
        log(`  - Last login: ${new Date(user.lastLoginAt).toLocaleString()}`, colors.cyan)

        await db.doc(`users/${user.userId}`).set({
            email: user.email,
            displayName: user.email.split('@')[0],
            watchlist: user.watchlist,
            notifications: {
                types: {
                    trending_update: user.trendingNotificationsEnabled,
                    collection_update: false,
                    system_announcement: true,
                },
            },
            lastLoginAt: user.lastLoginAt,
            createdAt: Date.now(),
        })

        log(`  ✓ User created successfully\n`, colors.green)
    }

    log(`Total test users created: ${TEST_USERS.length}`, colors.green)
}

async function runCronJob() {
    header('Running Trending Cron Job')

    const CRON_SECRET = process.env.CRON_SECRET

    if (!CRON_SECRET) {
        log('Error: CRON_SECRET not found in environment', colors.red)
        log('Make sure .env.local has CRON_SECRET set', colors.yellow)
        process.exit(1)
    }

    const BASE_URL = 'http://localhost:3000'

    log('Triggering cron job...', colors.cyan)
    log(`URL: ${BASE_URL}/api/cron/update-trending`, colors.cyan)
    console.log('')

    try {
        const response = await fetch(`${BASE_URL}/api/cron/update-trending`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${CRON_SECRET}`,
            },
        })

        const data = await response.json()

        if (response.ok) {
            log('✓ Cron job completed successfully!', colors.green)
            console.log('')
            log('Results:', colors.blue)
            log(`  - New trending items found: ${data.newItems}`, colors.cyan)
            log(`  - Notifications created: ${data.notifications}`, colors.cyan)
            log(`  - Demo mode: ${data.demoMode ? 'YES' : 'NO'}`, colors.cyan)
            console.log('')
        } else {
            log('✗ Cron job failed!', colors.red)
            log(`Status: ${response.status}`, colors.red)
            log(`Response: ${JSON.stringify(data, null, 2)}`, colors.yellow)
            process.exit(1)
        }

        return data
    } catch (error) {
        log('✗ Failed to connect to dev server!', colors.red)
        log('Make sure your dev server is running: npm run dev', colors.yellow)
        throw error
    }
}

async function verifyNotifications() {
    header('Verifying Notifications')

    const db = getAdminDb()

    for (const user of TEST_USERS) {
        log(`Checking user: ${user.email}`, colors.cyan)

        const notificationsSnapshot = await db
            .collection(`users/${user.userId}/notifications`)
            .where('type', '==', 'trending_update')
            .get()

        const notifications = notificationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))

        log(`  - Notifications found: ${notifications.length}`, colors.cyan)

        if (notifications.length > 0) {
            log('  - Notification details:', colors.cyan)
            notifications.forEach((notif: any) => {
                log(`    • ${notif.message}`, colors.green)
                log(`      Content ID: ${notif.contentId} (${notif.mediaType})`, colors.green)
                log(`      Created: ${new Date(notif.createdAt).toLocaleString()}`, colors.green)
                log(`      Expires: ${new Date(notif.expiresAt).toLocaleString()}`, colors.green)
            })
        } else {
            // Explain why no notifications
            if (!user.trendingNotificationsEnabled) {
                log('  ℹ No notifications (user opted out)', colors.yellow)
            } else if (user.lastLoginAt > Date.now() - 60 * 60 * 1000) {
                log('  ℹ No notifications (user logged in recently)', colors.yellow)
            } else {
                log('  ℹ No notifications (no watchlist items are trending)', colors.yellow)
            }
        }

        console.log('')
    }
}

async function cleanupTestUsers() {
    header('Cleaning Up Test Users')

    const db = getAdminDb()

    for (const user of TEST_USERS) {
        log(`Deleting user: ${user.email}`, colors.cyan)

        // Delete notifications subcollection
        const notificationsSnapshot = await db
            .collection(`users/${user.userId}/notifications`)
            .get()

        const deletePromises = notificationsSnapshot.docs.map((doc) => doc.ref.delete())
        await Promise.all(deletePromises)

        // Delete user document
        await db.doc(`users/${user.userId}`).delete()

        log(`  ✓ User deleted\n`, colors.green)
    }

    log(`Total test users deleted: ${TEST_USERS.length}`, colors.green)
}

async function displayExpectedBehavior() {
    header('Expected Behavior')

    log('Test User Scenarios:', colors.blue)
    console.log('')

    TEST_USERS.forEach((user, index) => {
        const userNumber = index + 1
        log(`User ${userNumber}: ${user.email}`, colors.cyan)
        log(`  Watchlist: ${user.watchlist.map((i) => i.title).join(', ')}`, colors.cyan)
        log(
            `  Trending notifications: ${user.trendingNotificationsEnabled ? 'ENABLED' : 'DISABLED'}`,
            colors.cyan
        )
        log(
            `  Last login: ${new Date(user.lastLoginAt).toLocaleString()} (${Math.floor((Date.now() - user.lastLoginAt) / (24 * 60 * 60 * 1000))} days ago)`,
            colors.cyan
        )

        // Predict outcome
        if (!user.trendingNotificationsEnabled) {
            log('  → WILL NOT receive notifications (opted out)', colors.yellow)
        } else if (user.lastLoginAt > Date.now() - 60 * 60 * 1000) {
            log('  → WILL NOT receive notifications (logged in recently)', colors.yellow)
        } else {
            log('  → WILL receive notifications (if watchlist items are trending)', colors.green)
        }

        console.log('')
    })

    log('Cron Job Logic:', colors.blue)
    log('1. Fetch current trending movies and TV shows from TMDB', colors.cyan)
    log('2. Compare with previous snapshot to find NEW trending items', colors.cyan)
    log('3. For each user:', colors.cyan)
    log('   a. Skip if trending notifications are disabled', colors.cyan)
    log('   b. Skip if user logged in after last cron run', colors.cyan)
    log('   c. Check if any watchlist items are in new trending list', colors.cyan)
    log('   d. Create notifications (max 3 per user)', colors.cyan)
    log('4. Update trending snapshot for next run', colors.cyan)
    console.log('')
}

async function main() {
    const args = process.argv.slice(2)
    const shouldCleanup = args.includes('--cleanup')

    // Load environment variables
    require('dotenv').config({ path: '.env.local' })

    try {
        if (shouldCleanup) {
            await cleanupTestUsers()
            log('\n✓ Cleanup complete!', colors.green)
            return
        }

        // Display expected behavior
        await displayExpectedBehavior()

        // Setup test users
        await setupTestUsers()

        // Run cron job
        const cronResult = await runCronJob()

        // Wait a moment for Firestore writes to propagate
        log('Waiting for Firestore writes to propagate...', colors.yellow)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Verify notifications
        await verifyNotifications()

        // Summary
        header('Test Complete')
        log('Test users are still in Firestore for inspection.', colors.yellow)
        log('Run with --cleanup flag to delete test users:', colors.yellow)
        log('  npm run test:trending-notifications -- --cleanup', colors.cyan)
        console.log('')

        log('✓ All tests completed successfully!', colors.green)
    } catch (error) {
        log('\n✗ Test failed!', colors.red)
        console.error(error)
        process.exit(1)
    }
}

main()
