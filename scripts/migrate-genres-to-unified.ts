#!/usr/bin/env ts-node
/**
 * Genre Migration Script
 *
 * Migrates existing user collections from TMDB genre IDs (number[])
 * to unified genre IDs (string[]).
 *
 * Usage:
 *   npm run migrate:genres [--dry-run]
 *
 * Options:
 *   --dry-run  Show what would be migrated without making changes
 */

import admin from 'firebase-admin'
import { getUnifiedGenreFromTMDBId } from '../constants/unifiedGenres'

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        })
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error)
        process.exit(1)
    }
}

const db = admin.firestore()

// Check for dry-run flag
const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
}

interface MigrationStats {
    totalUsers: number
    usersChecked: number
    collectionsChecked: number
    collectionsMigrated: number
    collectionsAlreadyMigrated: number
    collectionsWithoutGenres: number
    errors: number
}

const stats: MigrationStats = {
    totalUsers: 0,
    usersChecked: 0,
    collectionsChecked: 0,
    collectionsMigrated: 0,
    collectionsAlreadyMigrated: 0,
    collectionsWithoutGenres: 0,
    errors: 0,
}

/**
 * Convert TMDB genre IDs to unified genre IDs
 */
function convertGenres(tmdbIds: number[], mediaType: 'movie' | 'tv' | 'both'): string[] {
    const unifiedIds = new Set<string>()
    const typeToUse = mediaType === 'both' ? 'movie' : mediaType

    for (const tmdbId of tmdbIds) {
        const unifiedGenre = getUnifiedGenreFromTMDBId(tmdbId, typeToUse)
        if (unifiedGenre) {
            unifiedIds.add(unifiedGenre.id)
        } else {
            console.warn(`  ⚠️  No unified mapping for TMDB ID ${tmdbId} (${mediaType})`)
        }
    }

    return Array.from(unifiedIds)
}

/**
 * Migrate a single collection document
 */
async function migrateCollection(
    docRef: FirebaseFirestore.DocumentReference,
    collection: any
): Promise<boolean> {
    const collectionId = docRef.id
    const genres = collection.genres

    // Skip if no genres
    if (!genres || !Array.isArray(genres) || genres.length === 0) {
        console.log(`  ⏭️  ${collectionId} - No genres to migrate`)
        stats.collectionsWithoutGenres++
        return false
    }

    // Check if already migrated (genres are strings)
    if (typeof genres[0] === 'string') {
        console.log(`  ✅ ${collectionId} - Already migrated`)
        stats.collectionsAlreadyMigrated++
        return false
    }

    // Convert TMDB IDs to unified IDs
    const mediaType = collection.mediaType || 'both'
    const unifiedGenres = convertGenres(genres, mediaType)

    console.log(
        `  🔄 ${collectionId} (${mediaType}): [${genres.join(', ')}] → [${unifiedGenres.join(', ')}]`
    )

    // Update document
    if (!isDryRun) {
        try {
            await docRef.update({ genres: unifiedGenres })
            console.log(`  ✅ ${collectionId} - Migrated successfully`)
        } catch (error) {
            console.error(`  ❌ ${collectionId} - Error:`, error)
            stats.errors++
            return false
        }
    } else {
        console.log(`  [DRY RUN] Would migrate ${collectionId}`)
    }

    stats.collectionsMigrated++
    return true
}

/**
 * Migrate all collections in a user's customRows subcollection
 */
async function migrateUserCustomRows(userId: string) {
    console.log(`\n👤 Migrating custom rows for user: ${userId}`)

    const customRowsRef = db.collection('users').doc(userId).collection('customRows')
    const snapshot = await customRowsRef.get()

    if (snapshot.empty) {
        console.log(`  No custom rows found`)
        return
    }

    console.log(`  Found ${snapshot.size} custom rows`)

    for (const doc of snapshot.docs) {
        stats.collectionsChecked++
        const collection = doc.data()
        await migrateCollection(doc.ref, collection)
    }
}

/**
 * Migrate userCreatedWatchlists array in main user document
 */
async function migrateUserWatchlists(userId: string, userData: any) {
    const watchlists = userData.userCreatedWatchlists

    if (!watchlists || !Array.isArray(watchlists) || watchlists.length === 0) {
        return
    }

    console.log(`\n📚 Migrating ${watchlists.length} watchlists in user document`)

    let needsUpdate = false
    const updatedWatchlists = watchlists.map((list: any, index: number) => {
        stats.collectionsChecked++

        if (!list.genres || !Array.isArray(list.genres) || list.genres.length === 0) {
            console.log(`  ⏭️  Watchlist ${index} - No genres`)
            stats.collectionsWithoutGenres++
            return list
        }

        if (typeof list.genres[0] === 'string') {
            console.log(`  ✅ Watchlist ${index} - Already migrated`)
            stats.collectionsAlreadyMigrated++
            return list
        }

        const mediaType = list.mediaType || 'both'
        const unifiedGenres = convertGenres(list.genres, mediaType)

        console.log(
            `  🔄 Watchlist ${index} (${mediaType}): [${list.genres.join(', ')}] → [${unifiedGenres.join(', ')}]`
        )

        needsUpdate = true
        stats.collectionsMigrated++

        return {
            ...list,
            genres: unifiedGenres,
        }
    })

    if (needsUpdate && !isDryRun) {
        try {
            await db.collection('users').doc(userId).update({
                userCreatedWatchlists: updatedWatchlists,
            })
            console.log(`  ✅ User watchlists migrated successfully`)
        } catch (error) {
            console.error(`  ❌ Error migrating watchlists:`, error)
            stats.errors++
        }
    } else if (needsUpdate) {
        console.log(`  [DRY RUN] Would migrate ${watchlists.length} watchlists`)
    }
}

/**
 * Main migration function
 */
async function migrateAllUsers() {
    console.log('🚀 Starting genre migration...\n')
    console.log('📊 Fetching all users...')

    const usersSnapshot = await db.collection('users').get()
    stats.totalUsers = usersSnapshot.size

    console.log(`Found ${stats.totalUsers} users\n`)

    for (const userDoc of usersSnapshot.docs) {
        stats.usersChecked++
        const userId = userDoc.id
        const userData = userDoc.data()

        console.log(`\n${'='.repeat(60)}`)
        console.log(`User ${stats.usersChecked}/${stats.totalUsers}: ${userId}`)
        console.log('='.repeat(60))

        // Migrate customRows subcollection
        await migrateUserCustomRows(userId)

        // Migrate userCreatedWatchlists array
        await migrateUserWatchlists(userId, userData)
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary')
    console.log('='.repeat(60))
    console.log(`Total users:                     ${stats.totalUsers}`)
    console.log(`Users checked:                   ${stats.usersChecked}`)
    console.log(`Collections checked:             ${stats.collectionsChecked}`)
    console.log(`Collections migrated:            ${stats.collectionsMigrated}`)
    console.log(`Collections already migrated:    ${stats.collectionsAlreadyMigrated}`)
    console.log(`Collections without genres:      ${stats.collectionsWithoutGenres}`)
    console.log(`Errors:                          ${stats.errors}`)
    console.log('='.repeat(60))

    if (isDryRun) {
        console.log('\n✨ DRY RUN COMPLETE - No changes were made')
        console.log('   Run without --dry-run to apply changes')
    } else if (stats.errors > 0) {
        console.log(`\n⚠️  MIGRATION COMPLETE WITH ERRORS`)
        console.log(`   ${stats.errors} collection(s) failed to migrate`)
    } else {
        console.log('\n✅ MIGRATION COMPLETE - All collections migrated successfully!')
    }
}

// Run migration
migrateAllUsers()
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error)
        process.exit(1)
    })
