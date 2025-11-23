/**
 * Migration Script: Add Default Collections to Existing Users
 *
 * This script adds the default collections (Trending, Top Rated, etc.) to any
 * existing users who don't have them. These collections are fully editable -
 * users can add content, rename, change genres, delete (except core ones), etc.
 *
 * Usage:
 *   npx ts-node scripts/migrate-default-collections.ts
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

// Default genre-based collections that every user should have
// These are the same as in constants/systemCollections.ts
// All collections are fully editable and deletable by users
// NOTE: Trending and Top Rated are now handled as System Recommendations, not collections
const DEFAULT_COLLECTIONS = [
    {
        id: 'system-action',
        name: 'Action-Packed',
        description: 'Explosive action movies and shows',
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 0,
        enabled: true,
        genres: ['action'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
        color: '#6366f1',
    },
    {
        id: 'system-scifi',
        name: 'Sci-Fi & Fantasy',
        description: 'Futuristic science fiction and fantasy',
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 1,
        enabled: true,
        genres: ['scifi', 'fantasy'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
        color: '#6366f1',
    },
    {
        id: 'system-comedy',
        name: 'Comedy',
        description: 'Hilarious comedy movies and shows',
        items: [],
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: 2,
        enabled: true,
        genres: ['comedy'],
        genreLogic: 'OR',
        mediaType: 'both',
        isSystemCollection: true,
        canDelete: true,
        canEdit: true,
        color: '#6366f1',
    },
]

interface MigrationResult {
    userId: string
    added: string[]
    skipped: string[]
    error?: string
}

async function migrateUser(userId: string, dryRun: boolean): Promise<MigrationResult> {
    const result: MigrationResult = {
        userId,
        added: [],
        skipped: [],
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

        // Get IDs of existing collections
        const existingIds = new Set(existingCollections.map((c: { id: string }) => c.id))

        // Determine which default collections to add
        const now = Date.now()
        const collectionsToAdd = DEFAULT_COLLECTIONS.filter((c) => !existingIds.has(c.id)).map(
            (c) => ({
                ...c,
                createdAt: now,
                updatedAt: now,
            })
        )

        // Track what we're adding vs skipping
        for (const col of DEFAULT_COLLECTIONS) {
            if (existingIds.has(col.id)) {
                result.skipped.push(col.id)
            } else {
                result.added.push(col.id)
            }
        }

        if (collectionsToAdd.length === 0) {
            return result
        }

        // Merge with existing collections, ensuring proper order
        const mergedCollections = [...collectionsToAdd, ...existingCollections]
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
            .map((c, index) => ({ ...c, order: index }))

        if (!dryRun) {
            await userRef.update({
                userCreatedWatchlists: mergedCollections,
            })
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
    console.log('Default Collections Migration Script')
    console.log('='.repeat(60))
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`)
    console.log(`Target: ${specificUser || 'All users'}`)
    console.log('')

    console.log('Default collections to migrate:')
    for (const col of DEFAULT_COLLECTIONS) {
        console.log(`  - ${col.name} (${col.id})`)
    }
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
        } else if (result.added.length > 0) {
            console.log(
                `[${processed}/${usersToMigrate.length}] ${userId}: Added ${result.added.length} collection(s)`
            )
        } else {
            console.log(
                `[${processed}/${usersToMigrate.length}] ${userId}: Already has all default collections`
            )
        }
    }

    // Summary
    console.log('')
    console.log('='.repeat(60))
    console.log('Migration Summary')
    console.log('='.repeat(60))

    const usersWithAdditions = results.filter((r) => r.added.length > 0)
    const usersWithErrors = results.filter((r) => r.error)
    const usersAlreadyComplete = results.filter((r) => r.added.length === 0 && !r.error)

    console.log(`Total users processed: ${results.length}`)
    console.log(`Users updated: ${usersWithAdditions.length}`)
    console.log(`Users already complete: ${usersAlreadyComplete.length}`)
    console.log(`Users with errors: ${usersWithErrors.length}`)

    if (usersWithAdditions.length > 0) {
        console.log('')
        console.log('Collections added per user:')
        for (const result of usersWithAdditions) {
            console.log(`  ${result.userId}: ${result.added.join(', ')}`)
        }
    }

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
