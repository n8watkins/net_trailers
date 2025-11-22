import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import {
    CustomRow,
    CustomRowFormData,
    SystemRowPreferences,
    getMaxRowsForUser,
} from '../../types/collections'
import { v4 as uuidv4 } from 'uuid'
import { getSystemRowsByMediaType } from '../../constants/systemRows'

/**
 * Firestore utility functions for Custom Rows
 *
 * Custom rows are stored in the user document at /users/{userId}
 * as a map field called `customRows` where keys are row IDs.
 *
 * System row preferences are stored as a map field called `systemRowPreferences`
 * where keys are system row IDs and values are boolean (enabled/disabled).
 *
 * Data structure in Firestore:
 * /users/{userId}
 *   - customRows: {
 *       [rowId]: {
 *         id: string (UUID v4)
 *         userId: string (Firebase Auth UID or Guest ID)
 *         name: string
 *         genres: number[]
 *         genreLogic: 'AND' | 'OR'
 *         mediaType: 'movie' | 'tv' | 'both'
 *         order: number
 *         enabled: boolean
 *         createdAt: number (Unix timestamp)
 *         updatedAt: number (Unix timestamp)
 *       }
 *     }
 *   - systemRowPreferences: {
 *       [systemRowId]: boolean (enabled/disabled)
 *     }
 */
export class CustomRowsFirestore {
    /**
     * Create a new custom row
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param formData - Row configuration data
     * @param isGuest - Whether user is a guest (for max row limits)
     * @returns Created CustomRow with generated ID
     * @throws Error if user already has reached max rows
     */
    static async createCustomRow(
        userId: string,
        formData: CustomRowFormData,
        isGuest: boolean = false
    ): Promise<CustomRow> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.error('[CustomRowsFirestore] Invalid userId:', userId)
            throw new Error('Invalid userId provided to createCustomRow')
        }

        // Check if user has reached max rows
        const existingRows = await this.getUserCustomRows(userId)
        const maxRows = getMaxRowsForUser(isGuest)
        if (existingRows.length >= maxRows) {
            throw new Error(`Cannot create more than ${maxRows} custom rows`)
        }

        // Generate unique row ID
        const rowId = uuidv4()
        const now = Date.now()

        // Calculate order (place at end)
        const maxOrder = existingRows.reduce((max, row) => Math.max(max, row.order), -1)
        const order = maxOrder + 1

        const customRow: CustomRow = {
            id: rowId,
            userId,
            ...formData,
            order,
            createdAt: now,
            updatedAt: now,
        }

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
            // Create new user document with the custom row
            await setDoc(userDocRef, {
                watchlist: [],
                ratings: [],
                userLists: {},
                customRows: {
                    [rowId]: customRow,
                },
                lastActive: now,
            })
        } else {
            // Get existing customRows map
            const userData = userDoc.data()
            const customRows = userData.customRows || {}

            // Add new row to the map
            customRows[rowId] = customRow

            // Update user document
            await updateDoc(userDocRef, {
                customRows,
                lastActive: now,
            })
        }

        return customRow
    }

    /**
     * Get all custom rows for a user
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @returns Array of CustomRow objects sorted by order (ascending)
     */
    static async getUserCustomRows(userId: string): Promise<CustomRow[]> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn(
                '[CustomRowsFirestore] Invalid userId provided to getUserCustomRows:',
                userId
            )
            return []
        }

        try {
            const userDocRef = doc(db, 'users', userId)
            const userDoc = await getDoc(userDocRef)

            if (!userDoc.exists()) {
                return []
            }

            const userData = userDoc.data()
            const customRows = userData.customRows || {}

            // Convert map to array and sort by order
            const rows: CustomRow[] = Object.values(customRows)
            rows.sort((a, b) => a.order - b.order)

            return rows
        } catch (error) {
            console.error('[CustomRowsFirestore] Failed to get user custom rows:', error)
            throw error
        }
    }

    /**
     * Get a specific custom row by ID
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param rowId - Row UUID
     * @returns CustomRow or null if not found
     * @throws Error if row belongs to different user
     */
    static async getCustomRow(userId: string, rowId: string): Promise<CustomRow | null> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to getCustomRow')
        }

        try {
            const userDocRef = doc(db, 'users', userId)
            const userDoc = await getDoc(userDocRef)

            if (!userDoc.exists()) {
                return null
            }

            const userData = userDoc.data()
            const customRows = userData.customRows || {}
            const row = customRows[rowId]

            if (!row) {
                return null
            }

            // Verify ownership
            if (row.userId !== userId) {
                throw new Error('Unauthorized: Row belongs to different user')
            }

            return row as CustomRow
        } catch (error) {
            console.error('[CustomRowsFirestore] Failed to get custom row:', error)
            throw error
        }
    }

    /**
     * Update an existing custom row
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param rowId - Row UUID
     * @param updates - Partial CustomRow data to update
     * @returns Updated CustomRow
     * @throws Error if row doesn't exist or belongs to different user
     */
    static async updateCustomRow(
        userId: string,
        rowId: string,
        updates: Partial<Omit<CustomRow, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
    ): Promise<CustomRow> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to updateCustomRow')
        }

        // Get existing row to verify ownership
        const existingRow = await this.getCustomRow(userId, rowId)
        if (!existingRow) {
            throw new Error('Custom row not found')
        }

        const now = Date.now()

        // Create updated row
        const updatedRow: CustomRow = {
            ...existingRow,
            ...updates,
            updatedAt: now,
        }

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
            throw new Error('User document not found')
        }

        // Get existing customRows map
        const userData = userDoc.data()
        const customRows = userData.customRows || {}

        // Update the row in the map
        customRows[rowId] = updatedRow

        // Update user document
        await updateDoc(userDocRef, {
            customRows,
            lastActive: now,
        })

        return updatedRow
    }

    /**
     * Delete a custom row
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param rowId - Row UUID
     * @throws Error if row doesn't exist or belongs to different user
     */
    static async deleteCustomRow(userId: string, rowId: string): Promise<void> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to deleteCustomRow')
        }

        // Verify ownership before deletion
        const existingRow = await this.getCustomRow(userId, rowId)
        if (!existingRow) {
            throw new Error('Custom row not found')
        }

        const now = Date.now()

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
            throw new Error('User document not found')
        }

        // Get existing customRows map
        const userData = userDoc.data()
        const customRows = userData.customRows ? { ...userData.customRows } : {}

        // Delete the row from the map
        delete customRows[rowId]

        // Update user document
        await updateDoc(userDocRef, {
            customRows,
            lastActive: now,
        })
    }

    /**
     * Reorder custom rows
     *
     * Updates the order property for multiple rows in a batch operation.
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param rowIds - Array of row IDs in desired order
     * @throws Error if any rows don't exist or belong to different user
     */
    static async reorderCustomRows(userId: string, rowIds: string[]): Promise<void> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to reorderCustomRows')
        }

        const now = Date.now()

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
            throw new Error('User document not found')
        }

        // Get existing customRows map
        const userData = userDoc.data()
        const customRows = userData.customRows ? { ...userData.customRows } : {}

        // Verify all rows exist and belong to user
        for (const rowId of rowIds) {
            const row = customRows[rowId]
            if (!row) {
                throw new Error(`Row ${rowId} not found`)
            }
            if (row.userId !== userId) {
                throw new Error(`Row ${rowId} belongs to different user`)
            }
        }

        // Update order for each row
        rowIds.forEach((rowId, index) => {
            customRows[rowId] = {
                ...customRows[rowId],
                order: index,
                updatedAt: now,
            }
        })

        // Update user document
        await updateDoc(userDocRef, {
            customRows,
            lastActive: now,
        })
    }

    /**
     * Count total rows for a user
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @returns Number of rows user has created
     */
    static async getRowCount(userId: string): Promise<number> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            return 0
        }

        const rows = await this.getUserCustomRows(userId)
        return rows.length
    }

    /**
     * Toggle enabled status for a custom row
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param rowId - Row UUID
     * @returns Updated enabled status
     */
    static async toggleRowEnabled(userId: string, rowId: string): Promise<boolean> {
        const row = await this.getCustomRow(userId, rowId)
        if (!row) {
            throw new Error('Custom row not found')
        }

        const newEnabledStatus = !row.enabled

        await this.updateCustomRow(userId, rowId, {
            enabled: newEnabledStatus,
        })

        return newEnabledStatus
    }

    /**
     * Get system row preferences for a user
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @returns SystemRowPreferences object (empty if none set)
     */
    static async getSystemRowPreferences(userId: string): Promise<SystemRowPreferences> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn(
                '[CustomRowsFirestore] Invalid userId provided to getSystemRowPreferences:',
                userId
            )
            return {}
        }

        try {
            const userDocRef = doc(db, 'users', userId)
            const userDoc = await getDoc(userDocRef)

            if (!userDoc.exists()) {
                return {}
            }

            const userData = userDoc.data()
            return userData.systemRowPreferences || {}
        } catch (error) {
            console.error('[CustomRowsFirestore] Failed to get system row preferences:', error)
            throw error
        }
    }

    /**
     * Update system row custom name
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param systemRowId - System row ID
     * @param customName - New custom name
     */
    static async updateSystemRowName(
        userId: string,
        systemRowId: string,
        customName: string
    ): Promise<void> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to updateSystemRowName')
        }

        const now = Date.now()

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        let currentPreferences: SystemRowPreferences = {}

        if (userDoc.exists()) {
            const userData = userDoc.data()
            currentPreferences = userData.systemRowPreferences || {}
        }

        // Get current preference or create default
        const currentPref = currentPreferences[systemRowId]
        const currentEnabled = currentPref?.enabled ?? true
        const currentOrder = currentPref?.order ?? 0

        currentPreferences[systemRowId] = {
            enabled: currentEnabled,
            order: currentOrder,
            customName: customName.trim() || undefined, // Remove if empty
            customGenres: currentPref?.customGenres,
            customGenreLogic: currentPref?.customGenreLogic,
        }

        // Update or create user document
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                watchlist: [],
                ratings: [],
                userLists: {},
                customRows: {},
                systemRowPreferences: currentPreferences,
                lastActive: now,
            })
        } else {
            await updateDoc(userDocRef, {
                systemRowPreferences: currentPreferences,
                lastActive: now,
            })
        }
    }

    /**
     * Update system row genres
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param systemRowId - System row ID
     * @param customGenres - New custom genres array
     * @param customGenreLogic - Genre logic ('AND' | 'OR')
     */
    static async updateSystemRowGenres(
        userId: string,
        systemRowId: string,
        customGenres: string[],
        customGenreLogic: 'AND' | 'OR'
    ): Promise<void> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to updateSystemRowGenres')
        }

        const now = Date.now()

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        let currentPreferences: SystemRowPreferences = {}

        if (userDoc.exists()) {
            const userData = userDoc.data()
            currentPreferences = userData.systemRowPreferences || {}
        }

        // Get current preference or create default
        const currentPref = currentPreferences[systemRowId]
        const currentEnabled = currentPref?.enabled ?? true
        const currentOrder = currentPref?.order ?? 0

        currentPreferences[systemRowId] = {
            enabled: currentEnabled,
            order: currentOrder,
            customName: currentPref?.customName,
            customGenres: customGenres.length > 0 ? customGenres : undefined,
            customGenreLogic: customGenres.length > 0 ? customGenreLogic : undefined,
        }

        // Update or create user document
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                watchlist: [],
                ratings: [],
                userLists: {},
                customRows: {},
                systemRowPreferences: currentPreferences,
                lastActive: now,
            })
        } else {
            await updateDoc(userDocRef, {
                systemRowPreferences: currentPreferences,
                lastActive: now,
            })
        }
    }

    /**
     * Toggle a system row's enabled state
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param systemRowId - System row ID (e.g., 'system-movie-action')
     * @returns Updated enabled status
     */
    static async toggleSystemRow(userId: string, systemRowId: string): Promise<boolean> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to toggleSystemRow')
        }

        const now = Date.now()

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        let currentPreferences: SystemRowPreferences = {}

        if (userDoc.exists()) {
            const userData = userDoc.data()
            currentPreferences = userData.systemRowPreferences || {}
        }

        // Get current preference or create default
        const currentPref = currentPreferences[systemRowId]
        const currentEnabled = currentPref?.enabled ?? true
        const currentOrder = currentPref?.order ?? 0
        const newEnabled = !currentEnabled

        currentPreferences[systemRowId] = {
            enabled: newEnabled,
            order: currentOrder,
        }

        // Update or create user document
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                watchlist: [],
                ratings: [],
                userLists: {},
                customRows: {},
                systemRowPreferences: currentPreferences,
                lastActive: now,
            })
        } else {
            await updateDoc(userDocRef, {
                systemRowPreferences: currentPreferences,
                lastActive: now,
            })
        }

        return newEnabled
    }

    /**
     * Update system row order
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param systemRowId - System row ID
     * @param order - New order position
     */
    static async updateSystemRowOrder(
        userId: string,
        systemRowId: string,
        order: number
    ): Promise<void> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to updateSystemRowOrder')
        }

        const now = Date.now()

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        let currentPreferences: SystemRowPreferences = {}

        if (userDoc.exists()) {
            const userData = userDoc.data()
            currentPreferences = userData.systemRowPreferences || {}
        }

        // Get current preference or create default
        const currentPref = currentPreferences[systemRowId]
        const currentEnabled = currentPref?.enabled ?? true

        currentPreferences[systemRowId] = {
            enabled: currentEnabled,
            order,
        }

        // Update or create user document
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                watchlist: [],
                ratings: [],
                userLists: {},
                customRows: {},
                systemRowPreferences: currentPreferences,
                lastActive: now,
            })
        } else {
            await updateDoc(userDocRef, {
                systemRowPreferences: currentPreferences,
                lastActive: now,
            })
        }
    }

    /**
     * Set system row preferences (batch update)
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param preferences - SystemRowPreferences object
     */
    static async setSystemRowPreferences(
        userId: string,
        preferences: SystemRowPreferences
    ): Promise<void> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to setSystemRowPreferences')
        }

        const now = Date.now()

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) {
            // Create new user document with preferences
            await setDoc(userDocRef, {
                watchlist: [],
                ratings: [],
                userLists: {},
                customRows: {},
                systemRowPreferences: preferences,
                lastActive: now,
            })
        } else {
            // Update existing document
            await updateDoc(userDocRef, {
                systemRowPreferences: preferences,
                lastActive: now,
            })
        }
    }

    /**
     * Delete a system row (marks it as deleted in preferences)
     * Only deletable system rows (canDelete !== false) can be deleted
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param systemRowId - System row ID
     * @throws Error if row is non-deletable (core row)
     */
    static async deleteSystemRow(userId: string, systemRowId: string): Promise<void> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to deleteSystemRow')
        }

        const now = Date.now()

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        let currentPreferences: SystemRowPreferences = {}

        if (userDoc.exists()) {
            const userData = userDoc.data()
            currentPreferences = userData.systemRowPreferences || {}
        }

        // Mark as deleted by setting enabled to false and adding a deleted flag
        currentPreferences[systemRowId] = {
            enabled: false,
            order: currentPreferences[systemRowId]?.order ?? 0,
        }

        // Store deleted row IDs in a separate field
        const deletedSystemRows = userDoc.exists()
            ? (userDoc.data().deletedSystemRows as string[]) || []
            : []

        if (!deletedSystemRows.includes(systemRowId)) {
            deletedSystemRows.push(systemRowId)
        }

        // Update or create user document
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                watchlist: [],
                ratings: [],
                userLists: {},
                customRows: {},
                systemRowPreferences: currentPreferences,
                deletedSystemRows,
                lastActive: now,
            })
        } else {
            await updateDoc(userDocRef, {
                systemRowPreferences: currentPreferences,
                deletedSystemRows,
                lastActive: now,
            })
        }
    }

    /**
     * Get list of deleted system row IDs for a user
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @returns Array of deleted system row IDs
     */
    static async getDeletedSystemRows(userId: string): Promise<string[]> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            return []
        }

        try {
            const userDocRef = doc(db, 'users', userId)
            const userDoc = await getDoc(userDocRef)

            if (!userDoc.exists()) {
                return []
            }

            const userData = userDoc.data()
            return (userData.deletedSystemRows as string[]) || []
        } catch (error) {
            console.error('[CustomRowsFirestore] Failed to get deleted system rows:', error)
            return []
        }
    }

    /**
     * Reset default rows for a specific media type
     * Restores any missing system rows by removing them from the deleted list
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param mediaType - Media type to reset ('movie', 'tv', or 'both')
     */
    static async resetDefaultRows(
        userId: string,
        mediaType: 'movie' | 'tv' | 'both'
    ): Promise<void> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new Error('Invalid userId provided to resetDefaultRows')
        }

        const now = Date.now()

        // Get system rows for this media type
        const systemRows = getSystemRowsByMediaType(mediaType)
        const systemRowIds = systemRows.map((row) => row.id)

        // Get user document
        const userDocRef = doc(db, 'users', userId)
        const userDoc = await getDoc(userDocRef)

        let deletedSystemRows: string[] = []
        let currentPreferences: SystemRowPreferences = {}

        if (userDoc.exists()) {
            const userData = userDoc.data()
            deletedSystemRows = (userData.deletedSystemRows as string[]) || []
            currentPreferences = userData.systemRowPreferences || {}
        }

        // Remove media type's system rows from deleted list
        deletedSystemRows = deletedSystemRows.filter((rowId) => !systemRowIds.includes(rowId))

        // Reset preferences for restored rows (enable them with default order)
        systemRowIds.forEach((rowId) => {
            const systemRow = systemRows.find((r) => r.id === rowId)
            if (systemRow) {
                currentPreferences[rowId] = {
                    enabled: true,
                    order: systemRow.order,
                }
            }
        })

        // Update or create user document
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                watchlist: [],
                ratings: [],
                userLists: {},
                customRows: {},
                systemRowPreferences: currentPreferences,
                deletedSystemRows,
                lastActive: now,
            })
        } else {
            await updateDoc(userDocRef, {
                systemRowPreferences: currentPreferences,
                deletedSystemRows,
                lastActive: now,
            })
        }
    }
}
