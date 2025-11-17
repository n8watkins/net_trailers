import { SystemRowPreferences } from '../types/customRows'
import { CustomRowsFirestore } from './firestore/customRows'
import { getSystemRowsByMediaType } from '../constants/systemRows'

/**
 * Guest System Row Storage Service
 *
 * Provides localStorage persistence for guest users' system row preferences.
 * Authenticated users continue to use Firebase via CustomRowsFirestore.
 *
 * Storage structure in localStorage:
 * Key: `nettrailer_system_rows_${guestId}`
 * Value: {
 *   systemRowPreferences: SystemRowPreferences
 *   deletedSystemRows: string[]
 * }
 */

interface GuestSystemRowData {
    systemRowPreferences: SystemRowPreferences
    deletedSystemRows: string[]
}

class GuestSystemRowStorage {
    private static getStorageKey(guestId: string): string {
        return `nettrailer_system_rows_${guestId}`
    }

    /**
     * Load guest system row data from localStorage
     */
    private static loadGuestData(guestId: string): GuestSystemRowData {
        if (typeof window === 'undefined') {
            return {
                systemRowPreferences: {},
                deletedSystemRows: [],
            }
        }

        try {
            const key = this.getStorageKey(guestId)
            const data = localStorage.getItem(key)

            if (!data) {
                return {
                    systemRowPreferences: {},
                    deletedSystemRows: [],
                }
            }

            return JSON.parse(data) as GuestSystemRowData
        } catch (error) {
            console.error('[GuestSystemRowStorage] Failed to load data:', error)
            return {
                systemRowPreferences: {},
                deletedSystemRows: [],
            }
        }
    }

    /**
     * Save guest system row data to localStorage
     */
    private static saveGuestData(guestId: string, data: GuestSystemRowData): void {
        if (typeof window === 'undefined') return

        try {
            const key = this.getStorageKey(guestId)
            localStorage.setItem(key, JSON.stringify(data))
        } catch (error) {
            console.error('[GuestSystemRowStorage] Failed to save data:', error)
        }
    }

    /**
     * Get system row preferences for a guest user
     */
    static getSystemRowPreferences(guestId: string): SystemRowPreferences {
        const data = this.loadGuestData(guestId)
        return data.systemRowPreferences
    }

    /**
     * Update system row custom name for a guest user
     */
    static updateSystemRowName(guestId: string, systemRowId: string, customName: string): void {
        const data = this.loadGuestData(guestId)
        const currentPref = data.systemRowPreferences[systemRowId]

        data.systemRowPreferences[systemRowId] = {
            enabled: currentPref?.enabled ?? true,
            order: currentPref?.order ?? 0,
            customName: customName.trim() || undefined,
            customGenres: currentPref?.customGenres,
            customGenreLogic: currentPref?.customGenreLogic,
        }

        this.saveGuestData(guestId, data)
    }

    /**
     * Update system row order for a guest user
     */
    static updateSystemRowOrder(guestId: string, systemRowId: string, order: number): void {
        const data = this.loadGuestData(guestId)
        const currentPref = data.systemRowPreferences[systemRowId]

        data.systemRowPreferences[systemRowId] = {
            enabled: currentPref?.enabled ?? true,
            order,
            customName: currentPref?.customName,
            customGenres: currentPref?.customGenres,
            customGenreLogic: currentPref?.customGenreLogic,
        }

        this.saveGuestData(guestId, data)
    }

    /**
     * Update system row genres for a guest user
     */
    static updateSystemRowGenres(
        guestId: string,
        systemRowId: string,
        customGenres: string[],
        customGenreLogic: 'AND' | 'OR'
    ): void {
        const data = this.loadGuestData(guestId)
        const currentPref = data.systemRowPreferences[systemRowId]

        data.systemRowPreferences[systemRowId] = {
            enabled: currentPref?.enabled ?? true,
            order: currentPref?.order ?? 0,
            customName: currentPref?.customName,
            customGenres: customGenres.length > 0 ? customGenres : undefined,
            customGenreLogic: customGenres.length > 0 ? customGenreLogic : undefined,
        }

        this.saveGuestData(guestId, data)
    }

    /**
     * Delete a system row for a guest user (mark as deleted)
     */
    static deleteSystemRow(guestId: string, systemRowId: string): void {
        const data = this.loadGuestData(guestId)

        // Mark as deleted
        data.systemRowPreferences[systemRowId] = {
            enabled: false,
            order: data.systemRowPreferences[systemRowId]?.order ?? 0,
        }

        // Add to deleted list
        if (!data.deletedSystemRows.includes(systemRowId)) {
            data.deletedSystemRows.push(systemRowId)
        }

        this.saveGuestData(guestId, data)
    }

    /**
     * Get list of deleted system row IDs for a guest user
     */
    static getDeletedSystemRows(guestId: string): string[] {
        const data = this.loadGuestData(guestId)
        return data.deletedSystemRows
    }

    /**
     * Reset default rows for a specific media type for a guest user
     */
    static resetDefaultRows(guestId: string, mediaType: 'movie' | 'tv' | 'both'): void {
        const data = this.loadGuestData(guestId)

        // Get system rows for this media type
        const systemRows = getSystemRowsByMediaType(mediaType)
        const systemRowIds = systemRows.map((row) => row.id)

        // Remove media type's system rows from deleted list
        data.deletedSystemRows = data.deletedSystemRows.filter(
            (rowId) => !systemRowIds.includes(rowId)
        )

        // Reset preferences for restored rows (enable them with default order)
        systemRowIds.forEach((rowId) => {
            const systemRow = systemRows.find((r) => r.id === rowId)
            if (systemRow) {
                data.systemRowPreferences[rowId] = {
                    enabled: true,
                    order: systemRow.order,
                }
            }
        })

        this.saveGuestData(guestId, data)
    }

    /**
     * Clear all guest system row data
     */
    static clearGuestData(guestId: string): void {
        if (typeof window === 'undefined') return

        const key = this.getStorageKey(guestId)
        localStorage.removeItem(key)
    }
}

/**
 * System Row Storage Adapter
 *
 * Routes system row preference operations to the appropriate storage backend:
 * - Guest users: localStorage via GuestSystemRowStorage
 * - Authenticated users: Firebase via CustomRowsFirestore
 */
export class SystemRowStorage {
    /**
     * Get system row preferences
     */
    static async getSystemRowPreferences(
        userId: string,
        isGuest: boolean
    ): Promise<SystemRowPreferences> {
        if (isGuest) {
            return GuestSystemRowStorage.getSystemRowPreferences(userId)
        }
        return CustomRowsFirestore.getSystemRowPreferences(userId)
    }

    /**
     * Update system row custom name
     */
    static async updateSystemRowName(
        userId: string,
        systemRowId: string,
        customName: string,
        isGuest: boolean
    ): Promise<void> {
        if (isGuest) {
            GuestSystemRowStorage.updateSystemRowName(userId, systemRowId, customName)
            return
        }
        return CustomRowsFirestore.updateSystemRowName(userId, systemRowId, customName)
    }

    /**
     * Update system row order
     */
    static async updateSystemRowOrder(
        userId: string,
        systemRowId: string,
        order: number,
        isGuest: boolean
    ): Promise<void> {
        if (isGuest) {
            GuestSystemRowStorage.updateSystemRowOrder(userId, systemRowId, order)
            return
        }
        return CustomRowsFirestore.updateSystemRowOrder(userId, systemRowId, order)
    }

    /**
     * Update system row genres
     */
    static async updateSystemRowGenres(
        userId: string,
        systemRowId: string,
        customGenres: string[],
        customGenreLogic: 'AND' | 'OR',
        isGuest: boolean
    ): Promise<void> {
        if (isGuest) {
            GuestSystemRowStorage.updateSystemRowGenres(
                userId,
                systemRowId,
                customGenres,
                customGenreLogic
            )
            return
        }
        return CustomRowsFirestore.updateSystemRowGenres(
            userId,
            systemRowId,
            customGenres,
            customGenreLogic
        )
    }

    /**
     * Delete a system row
     */
    static async deleteSystemRow(
        userId: string,
        systemRowId: string,
        isGuest: boolean
    ): Promise<void> {
        if (isGuest) {
            GuestSystemRowStorage.deleteSystemRow(userId, systemRowId)
            return
        }
        return CustomRowsFirestore.deleteSystemRow(userId, systemRowId)
    }

    /**
     * Get list of deleted system row IDs
     */
    static async getDeletedSystemRows(userId: string, isGuest: boolean): Promise<string[]> {
        if (isGuest) {
            return GuestSystemRowStorage.getDeletedSystemRows(userId)
        }
        return CustomRowsFirestore.getDeletedSystemRows(userId)
    }

    /**
     * Reset default rows for a specific media type
     */
    static async resetDefaultRows(
        userId: string,
        mediaType: 'movie' | 'tv' | 'both',
        isGuest: boolean
    ): Promise<void> {
        if (isGuest) {
            GuestSystemRowStorage.resetDefaultRows(userId, mediaType)
            return
        }
        return CustomRowsFirestore.resetDefaultRows(userId, mediaType)
    }
}
