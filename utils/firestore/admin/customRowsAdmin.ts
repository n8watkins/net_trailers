import type { Firestore } from 'firebase-admin/firestore'
import { CustomRow } from '../../../types/customRows'

/**
 * Admin helpers for reading/updating custom rows inside scheduled jobs or API routes.
 * Mirrors the logic from CustomRowsFirestore but uses the Firebase Admin SDK.
 */

/**
 * Load all custom rows for a user using the admin Firestore instance.
 */
export async function getUserCustomRowsAdmin(db: Firestore, userId: string): Promise<CustomRow[]> {
    if (!userId) {
        return []
    }

    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
        return []
    }

    const data = userDoc.data() || {}
    const customRowsMap = (data.customRows as Record<string, CustomRow>) || {}
    const rows = Object.values(customRowsMap)
    rows.sort((a, b) => a.order - b.order)
    return rows
}

/**
 * Persist updates to a specific custom row via the admin Firestore instance.
 * Returns the updated row payload.
 */
export async function updateCustomRowAdmin(
    db: Firestore,
    userId: string,
    rowId: string,
    updates: Partial<CustomRow>
): Promise<CustomRow | null> {
    if (!userId || !rowId) {
        return null
    }

    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
        return null
    }

    const data = userDoc.data() || {}
    const customRowsMap = (data.customRows as Record<string, CustomRow>) || {}
    const existingRow = customRowsMap[rowId]

    if (!existingRow) {
        return null
    }

    const updatedRow: CustomRow = {
        ...existingRow,
        ...updates,
        updatedAt: Date.now(),
    }

    customRowsMap[rowId] = updatedRow

    await userRef.update({
        customRows: customRowsMap,
        lastActive: Date.now(),
    })

    return updatedRow
}
