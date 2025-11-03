import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    updateDoc,
    Timestamp,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { CustomRow, CustomRowFormData, CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'
import { v4 as uuidv4 } from 'uuid'

/**
 * Firestore utility functions for Custom Rows
 *
 * Data structure in Firestore:
 * /customRows/{rowId}
 *   - id: string (UUID v4)
 *   - userId: string (Firebase Auth UID or Guest ID)
 *   - name: string
 *   - genres: number[]
 *   - genreLogic: 'AND' | 'OR'
 *   - mediaType: 'movie' | 'tv' | 'both'
 *   - order: number
 *   - enabled: boolean
 *   - createdAt: number (Unix timestamp)
 *   - updatedAt: number (Unix timestamp)
 */
export class CustomRowsFirestore {
    private static COLLECTION = 'customRows'

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

        // Save to Firestore
        const docRef = doc(db, this.COLLECTION, rowId)
        await setDoc(docRef, customRow)

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
            const q = query(
                collection(db, this.COLLECTION),
                where('userId', '==', userId),
                orderBy('order', 'asc')
            )

            const snapshot = await getDocs(q)
            const rows: CustomRow[] = []

            snapshot.forEach((doc) => {
                rows.push(doc.data() as CustomRow)
            })

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
            const docRef = doc(db, this.COLLECTION, rowId)
            const docSnap = await getDoc(docRef)

            if (!docSnap.exists()) {
                return null
            }

            const row = docSnap.data() as CustomRow

            // Verify ownership
            if (row.userId !== userId) {
                throw new Error('Unauthorized: Row belongs to different user')
            }

            return row
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

        // Prepare update data
        const updateData = {
            ...updates,
            updatedAt: Date.now(),
        }

        // Update in Firestore
        const docRef = doc(db, this.COLLECTION, rowId)
        await updateDoc(docRef, updateData)

        // Return updated row
        return {
            ...existingRow,
            ...updates,
            updatedAt: updateData.updatedAt,
        }
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

        // Delete from Firestore
        const docRef = doc(db, this.COLLECTION, rowId)
        await deleteDoc(docRef)
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

        // Verify all rows exist and belong to user
        const verificationPromises = rowIds.map((rowId) => this.getCustomRow(userId, rowId))
        const rows = await Promise.all(verificationPromises)

        if (rows.some((row) => row === null)) {
            throw new Error('One or more rows not found')
        }

        // Update order for each row
        const updatePromises = rowIds.map((rowId, index) => {
            const docRef = doc(db, this.COLLECTION, rowId)
            return updateDoc(docRef, {
                order: index,
                updatedAt: Date.now(),
            })
        })

        await Promise.all(updatePromises)
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

        const docRef = doc(db, this.COLLECTION, rowId)
        await updateDoc(docRef, {
            enabled: newEnabledStatus,
            updatedAt: Date.now(),
        })

        return newEnabledStatus
    }
}
