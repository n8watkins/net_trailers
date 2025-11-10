import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../../firebase'
import { UserList } from '../../types/userLists'
import { CustomRow, SystemRowPreferences } from '../../types/customRows'

/**
 * Migration Utility: Custom Rows to Collections
 *
 * Migrates user's custom rows and system row preferences to the unified Collections system.
 * This migration runs transparently on first load for users with existing custom rows.
 *
 * Migration steps:
 * 1. Fetch user's custom rows from Firestore customRows field
 * 2. Fetch user's system row preferences
 * 3. Convert custom rows to Collection format
 * 4. Convert enabled system rows to Collection format
 * 5. Save all as collections in userCreatedWatchlists array
 * 6. Delete old customRows and systemRowPreferences fields
 */

export interface MigrationResult {
    success: boolean
    migratedCustomRowsCount: number
    migratedSystemRowsCount: number
    error?: string
}

/**
 * Check if a user needs migration
 * Returns true if user has custom rows or system row preferences but no collections with displayAsRow
 */
export async function needsMigration(userId: string): Promise<boolean> {
    if (!userId || userId === 'undefined' || userId === 'null') {
        return false
    }

    try {
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
            return false
        }

        const userData = userDoc.data()

        // Check if user has old custom rows data
        const hasCustomRows = userData.customRows && Object.keys(userData.customRows).length > 0

        // Check if user has system row preferences
        const hasSystemPrefs =
            userData.systemRowPreferences && Object.keys(userData.systemRowPreferences).length > 0

        // Check if user already has migrated collections
        const hasCollections =
            userData.userCreatedWatchlists &&
            Array.isArray(userData.userCreatedWatchlists) &&
            userData.userCreatedWatchlists.some(
                (list: UserList) =>
                    list.collectionType === 'tmdb-genre' || list.displayAsRow === true
            )

        // Need migration if has old data but no migrated collections
        return (hasCustomRows || hasSystemPrefs) && !hasCollections
    } catch (error) {
        console.error('[Migration] Error checking if user needs migration:', error)
        return false
    }
}

/**
 * Convert a CustomRow to a Collection (UserList)
 * Filters out undefined values to prevent Firestore errors
 */
function customRowToCollection(customRow: CustomRow): UserList {
    const collection: UserList = {
        id: customRow.id,
        name: customRow.name,
        description: `Migrated from custom row`,
        isPublic: false,
        createdAt: customRow.createdAt,
        updatedAt: customRow.updatedAt,
        items: [], // TMDB-based collections don't use static items
        collectionType: 'tmdb-genre',
        displayAsRow: true,
        order: customRow.order,
        enabled: customRow.enabled,
        genres: customRow.genres,
        genreLogic: customRow.genreLogic,
        mediaType: customRow.mediaType,
    }

    // Only add optional fields if they're defined (Firestore doesn't allow undefined values)
    if (customRow.advancedFilters !== undefined) {
        collection.advancedFilters = customRow.advancedFilters
    }
    if (customRow.isSpecialRow !== undefined) {
        collection.isSpecialCollection = customRow.isSpecialRow
    }
    if (customRow.autoUpdateEnabled !== undefined) {
        collection.autoUpdateEnabled = customRow.autoUpdateEnabled
    }
    if (customRow.updateFrequency !== undefined) {
        collection.updateFrequency = customRow.updateFrequency
    }
    if (customRow.lastCheckedAt !== undefined) {
        collection.lastCheckedAt = customRow.lastCheckedAt
    }
    if (customRow.lastUpdateCount !== undefined) {
        collection.lastUpdateCount = customRow.lastUpdateCount
    }

    return collection
}

/**
 * Migrate custom rows and system row preferences to collections
 */
export async function migrateCustomRowsToCollections(userId: string): Promise<MigrationResult> {
    if (!userId || userId === 'undefined' || userId === 'null') {
        return {
            success: false,
            migratedCustomRowsCount: 0,
            migratedSystemRowsCount: 0,
            error: 'Invalid userId',
        }
    }

    try {
        console.log(`[Migration] Starting migration for user ${userId}`)

        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
            console.log(`[Migration] User document does not exist for ${userId}`)
            return {
                success: true,
                migratedCustomRowsCount: 0,
                migratedSystemRowsCount: 0,
            }
        }

        const userData = userDoc.data()

        // Get existing collections (if any)
        const existingCollections: UserList[] = userData.userCreatedWatchlists || []

        // Get custom rows to migrate
        const customRowsMap = userData.customRows || {}
        const customRows: CustomRow[] = Object.values(customRowsMap)

        // Get system row preferences
        const systemRowPreferences: SystemRowPreferences = userData.systemRowPreferences || {}

        // Convert custom rows to collections
        const migratedCustomRows = customRows.map(customRowToCollection)

        console.log(`[Migration] Migrated ${migratedCustomRows.length} custom rows to collections`)

        // Note: System rows are now handled by systemCollections.ts constants
        // We don't need to migrate systemRowPreferences as collections
        // Instead, we'll just remove the old preferences field
        // The new system uses system collections with user preferences stored differently

        // Combine all collections
        const allCollections = [...existingCollections, ...migratedCustomRows]

        // Update user document
        const updates: any = {
            userCreatedWatchlists: allCollections,
            lastActive: Date.now(),
        }

        // Delete old custom rows field
        if (customRows.length > 0) {
            updates.customRows = deleteField()
        }

        // Delete old system row preferences field
        if (Object.keys(systemRowPreferences).length > 0) {
            updates.systemRowPreferences = deleteField()
        }

        // Delete deleted system rows field (no longer needed)
        if (userData.deletedSystemRows) {
            updates.deletedSystemRows = deleteField()
        }

        await updateDoc(userDocRef, updates)

        console.log(
            `[Migration] Successfully migrated ${migratedCustomRows.length} custom rows for user ${userId}`
        )

        return {
            success: true,
            migratedCustomRowsCount: migratedCustomRows.length,
            migratedSystemRowsCount: 0, // System rows are now built-in constants
        }
    } catch (error) {
        console.error('[Migration] Error migrating custom rows to collections:', error)
        return {
            success: false,
            migratedCustomRowsCount: 0,
            migratedSystemRowsCount: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

/**
 * Auto-migrate on user data load
 * This should be called when user data is first loaded
 */
export async function autoMigrateIfNeeded(userId: string): Promise<void> {
    if (!userId || userId === 'undefined' || userId === 'null') {
        return
    }

    const needsIt = await needsMigration(userId)

    if (needsIt) {
        console.log(`[Migration] Auto-migrating user ${userId}`)
        const result = await migrateCustomRowsToCollections(userId)

        if (result.success) {
            console.log(
                `[Migration] Auto-migration completed for user ${userId}:`,
                `${result.migratedCustomRowsCount} custom rows migrated`
            )
        } else {
            console.error(`[Migration] Auto-migration failed for user ${userId}:`, result.error)
        }
    }
}
