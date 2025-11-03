import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { CustomRow, CustomRowFormData, CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'
import { v4 as uuidv4 } from 'uuid'

/**
 * Firestore utility functions for Custom Rows
 *
 * Custom rows are stored in the user document at /users/{userId}
 * as a map field called `customRows` where keys are row IDs.
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
 */
export class CustomRowsFirestore {
    /**
     * Create a new custom row
     *
     * @param userId - Firebase Auth UID or Guest ID
     * @param formData - Row configuration data
     * @returns Created CustomRow with generated ID
     * @throws Error if user already has MAX_ROWS_PER_USER rows
     */
    static async createCustomRow(userId: string, formData: CustomRowFormData): Promise<CustomRow> {
        // Validate userId
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.error('[CustomRowsFirestore] Invalid userId:', userId)
            throw new Error('Invalid userId provided to createCustomRow')
        }

        // Check if user has reached max rows
        const existingRows = await this.getUserCustomRows(userId)
        if (existingRows.length >= CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER) {
            throw new Error(
                `Cannot create more than ${CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER} custom rows`
            )
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
        updates: Partial<CustomRowFormData>
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
     * Toggle enabled status for a row
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
}
