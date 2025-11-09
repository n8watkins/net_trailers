/**
 * Child Safety PIN Store
 *
 * Manages PIN protection state for Child Safety Mode.
 * Handles PIN verification status (session-based) and PIN settings.
 */

import { create } from 'zustand'
import { PINSettings, DEFAULT_PIN_SETTINGS } from '../types/childSafety'
import {
    getPINSettings,
    verifyPIN as verifyPINUtil,
    createPIN as createPINUtil,
    updatePIN as updatePINUtil,
    removePIN as removePINUtil,
} from '../utils/firestore/childSafetyPIN'

interface ChildSafetyPINState {
    /** Current PIN settings */
    settings: PINSettings

    /** Whether PIN has been verified in this session */
    isPINVerified: boolean

    /** Whether PIN verification modal is open */
    isVerificationModalOpen: boolean

    /** Whether PIN setup modal is open */
    isSetupModalOpen: boolean

    /** Loading state for async operations */
    isLoading: boolean

    /** Error message from last operation */
    error: string | null
}

interface ChildSafetyPINActions {
    /** Load PIN settings for a user */
    loadPINSettings: (userId: string, isGuest: boolean) => Promise<void>

    /** Verify a PIN */
    verifyPIN: (userId: string, pin: string, isGuest: boolean) => Promise<boolean>

    /** Create a new PIN */
    createPIN: (userId: string, pin: string, isGuest: boolean) => Promise<void>

    /** Update (change) a PIN */
    updatePIN: (userId: string, oldPin: string, newPin: string, isGuest: boolean) => Promise<void>

    /** Remove a PIN */
    removePIN: (userId: string, pin: string, isGuest: boolean) => Promise<void>

    /** Open verification modal */
    openVerificationModal: () => void

    /** Close verification modal */
    closeVerificationModal: () => void

    /** Open setup modal */
    openSetupModal: () => void

    /** Close setup modal */
    closeSetupModal: () => void

    /** Clear verification status (call on logout) */
    clearVerification: () => void

    /** Reset store to initial state */
    reset: () => void
}

type ChildSafetyPINStore = ChildSafetyPINState & ChildSafetyPINActions

const initialState: ChildSafetyPINState = {
    settings: DEFAULT_PIN_SETTINGS,
    isPINVerified: false,
    isVerificationModalOpen: false,
    isSetupModalOpen: false,
    isLoading: false,
    error: null,
}

export const useChildSafetyPINStore = create<ChildSafetyPINStore>((set, get) => ({
    ...initialState,

    loadPINSettings: async (userId: string, isGuest: boolean) => {
        set({ isLoading: true, error: null })
        try {
            const settings = await getPINSettings(userId, isGuest)
            set({ settings, isLoading: false })
        } catch (error) {
            console.error('Error loading PIN settings:', error)
            set({
                error: 'Failed to load PIN settings',
                isLoading: false,
            })
        }
    },

    verifyPIN: async (userId: string, pin: string, isGuest: boolean) => {
        set({ isLoading: true, error: null })
        try {
            const result = await verifyPINUtil(userId, pin, isGuest)

            if (result.success) {
                set({
                    isPINVerified: true,
                    isVerificationModalOpen: false,
                    isLoading: false,
                    error: null,
                })
                return true
            } else {
                set({
                    isPINVerified: false,
                    isLoading: false,
                    error: result.error || 'Incorrect PIN',
                })
                return false
            }
        } catch (error) {
            console.error('PIN verification error:', error)
            set({
                isPINVerified: false,
                isLoading: false,
                error: 'Failed to verify PIN',
            })
            return false
        }
    },

    createPIN: async (userId: string, pin: string, isGuest: boolean) => {
        set({ isLoading: true, error: null })
        try {
            await createPINUtil(userId, pin, isGuest)

            // Reload settings to reflect the new PIN
            await get().loadPINSettings(userId, isGuest)

            set({
                isPINVerified: true, // Automatically verified after creation
                isSetupModalOpen: false,
                isLoading: false,
                error: null,
            })
        } catch (error) {
            console.error('PIN creation error:', error)
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to create PIN',
            })
            throw error
        }
    },

    updatePIN: async (userId: string, oldPin: string, newPin: string, isGuest: boolean) => {
        set({ isLoading: true, error: null })
        try {
            await updatePINUtil(userId, oldPin, newPin, isGuest)

            // Reload settings to reflect the updated PIN
            await get().loadPINSettings(userId, isGuest)

            set({
                isLoading: false,
                error: null,
            })
        } catch (error) {
            console.error('PIN update error:', error)
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to update PIN',
            })
            throw error
        }
    },

    removePIN: async (userId: string, pin: string, isGuest: boolean) => {
        set({ isLoading: true, error: null })
        try {
            await removePINUtil(userId, pin, isGuest)

            // Reload settings to reflect removal
            await get().loadPINSettings(userId, isGuest)

            set({
                isPINVerified: false,
                isLoading: false,
                error: null,
            })
        } catch (error) {
            console.error('PIN removal error:', error)
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to remove PIN',
            })
            throw error
        }
    },

    openVerificationModal: () => {
        set({ isVerificationModalOpen: true, error: null })
    },

    closeVerificationModal: () => {
        set({ isVerificationModalOpen: false, error: null })
    },

    openSetupModal: () => {
        set({ isSetupModalOpen: true, error: null })
    },

    closeSetupModal: () => {
        set({ isSetupModalOpen: false, error: null })
    },

    clearVerification: () => {
        set({ isPINVerified: false })
    },

    reset: () => {
        set(initialState)
    },
}))
