/**
 * Migration Script: System Recommendations Migration
 *
 * This script migrates existing users from the old system where Trending/Top Rated
 * were stored as collections to the new system where they are System Recommendations.
 *
 * What this script does:
 * 1. Removes old 'system-trending' and 'system-top-rated' from userCreatedWatchlists
 * 2. Adds default systemRecommendations if they don't exist
 *
 * Usage:
 *   npx ts-node scripts/migrate-system-recommendations.ts
 *
 * Options:
 *   --dry-run    Preview changes without writing to Firestore
 *   --user=ID    Migrate a specific user only
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// Initialize Firebase Admin
if (getApps().length === 0) {
    const serviceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }

    initializeApp({
        credential: cert(serviceAccount),
    })
}

const db = getFirestore()

// Collection IDs to remove (now handled by System Recommendations)
const COLLECTIONS_TO_REMOVE = ['system-trending', 'system-top-rated']

// Default system recommendations for users who don't have them
const DEFAULT_SYSTEM_RECOMMENDATIONS = [
    {
        id: 'trending',
        name: 'Trending',
        enabled: true,
        order: 0,
        mediaType: 'both',
        genres: [],
        emoji: '🔥',
    },
    {
        id: 'top-rated',
        name: 'Top Rated',
        enabled: true,
        order: 1,
        mediaType: 'both',
        genres: [],
        emoji: '⭐',
    },
    {
        id: 'recommended-for-you',
        name: 'Recommended For You',
        enabled: true,
        order: 2,
        mediaType: 'both',
        genres: [],
        emoji: '✨',
    },
]

interface MigrationResult {
    userId: string
    collectionsRemoved: string[]
    recommendationsAdded: boolean
    reorderedCollections: boolean
    error?: string
}

async function migrateUser(userId: string, dryRun: boolean): Promise<MigrationResult> {
    const result: MigrationResult = {
        userId,
        collectionsRemoved: [],
        recommendationsAdded: false,
        reorderedCollections: false,
    }

    try {
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()

        if (!userDoc.exists) {
            result.error = 'User document does not exist'
            return result
        }

        const userData = userDoc.data() || {}
        const existingCollections = userData.userCreatedWatchlists || []
        const existingRecommendations = userData.systemRecommendations || []

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {}

        // Step 1: Remove old Trending/Top Rated collections
        const collectionsToKeep = existingCollections.filter(
            (c: { id: string }) => !COLLECTIONS_TO_REMOVE.includes(c.id)
        )

        const removedCount = existingCollections.length - collectionsToKeep.length
        if (removedCount > 0) {
            // Track what was removed
            for (const col of existingCollections) {
                if (COLLECTIONS_TO_REMOVE.includes(col.id)) {
                    result.collectionsRemoved.push(col.id)
                }
            }

            // Reorder remaining collections (starting from 0)
            const reorderedCollections = collectionsToKeep.map(
                (c: { order?: number }, index: number) => ({
                    ...c,
                    order: index,
                })
            )

            updates.userCreatedWatchlists = reorderedCollections
            result.reorderedCollections = true
        }

        // Step 2: Add system recommendations if missing
        if (!existingRecommendations || existingRecommendations.length === 0) {
            updates.systemRecommendations = DEFAULT_SYSTEM_RECOMMENDATIONS
            result.recommendationsAdded = true
        }

        // Only update if there are changes
        if (Object.keys(updates).length > 0) {
            if (!dryRun) {
                await userRef.update(updates)
            }
        }

        return result
    } catch (error) {
        result.error = (error as Error).message
        return result
    }
}

async function main() {
    const args = process.argv.slice(2)
    const dryRun = args.includes('--dry-run')
    const specificUser = args.find((a) => a.startsWith('--user='))?.split('=')[1]

    console.log('='.repeat(60))
    console.log('System Recommendations Migration Script')
    console.log('='.repeat(60))
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`)
    console.log(`Target: ${specificUser || 'All users'}`)
    console.log('')

    console.log('This migration will:')
    console.log('  1. Remove these collections (now System Recommendations):')
    for (const id of COLLECTIONS_TO_REMOVE) {
        console.log(`     - ${id}`)
    }
    console.log('  2. Add default systemRecommendations if missing')
    console.log('')

    let usersToMigrate: string[] = []

    if (specificUser) {
        usersToMigrate = [specificUser]
    } else {
        // Get all users
        const usersSnapshot = await db.collection('users').get()
        usersToMigrate = usersSnapshot.docs.map((doc) => doc.id)
    }

    console.log(`Found ${usersToMigrate.length} user(s) to process`)
    console.log('')

    const results: MigrationResult[] = []
    let processed = 0

    for (const userId of usersToMigrate) {
        const result = await migrateUser(userId, dryRun)
        results.push(result)
        processed++

        if (result.error) {
            console.log(
                `[${processed}/${usersToMigrate.length}] ${userId}: ERROR - ${result.error}`
            )
        } else {
            const changes: string[] = []
            if (result.collectionsRemoved.length > 0) {
                changes.push(`removed ${result.collectionsRemoved.join(', ')}`)
            }
            if (result.recommendationsAdded) {
                changes.push('added systemRecommendations')
            }
            if (changes.length > 0) {
                console.log(
                    `[${processed}/${usersToMigrate.length}] ${userId}: ${changes.join(', ')}`
                )
            } else {
                console.log(`[${processed}/${usersToMigrate.length}] ${userId}: No changes needed`)
            }
        }
    }

    // Summary
    console.log('')
    console.log('='.repeat(60))
    console.log('Migration Summary')
    console.log('='.repeat(60))

    const usersWithCollectionsRemoved = results.filter((r) => r.collectionsRemoved.length > 0)
    const usersWithRecommendationsAdded = results.filter((r) => r.recommendationsAdded)
    const usersWithErrors = results.filter((r) => r.error)
    const usersWithNoChanges = results.filter(
        (r) => r.collectionsRemoved.length === 0 && !r.recommendationsAdded && !r.error
    )

    console.log(`Total users processed: ${results.length}`)
    console.log(`Users with collections removed: ${usersWithCollectionsRemoved.length}`)
    console.log(`Users with recommendations added: ${usersWithRecommendationsAdded.length}`)
    console.log(`Users with no changes needed: ${usersWithNoChanges.length}`)
    console.log(`Users with errors: ${usersWithErrors.length}`)

    if (usersWithErrors.length > 0) {
        console.log('')
        console.log('Errors:')
        for (const result of usersWithErrors) {
            console.log(`  ${result.userId}: ${result.error}`)
        }
    }

    if (dryRun) {
        console.log('')
        console.log('This was a DRY RUN. No changes were made.')
        console.log('Run without --dry-run to apply changes.')
    }

    console.log('')
    console.log('Done!')
}

main().catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
})
