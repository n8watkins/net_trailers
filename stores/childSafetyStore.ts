/**
 * Child Safety PIN Store
 *
 * Manages PIN protection state for Child Safety Mode.
 * Handles PIN verification status (session-based) and PIN settings.
 *
 * All Firestore / Firebase imports have been replaced with calls to the
 * /api/child-safety/pin REST endpoints, which perform bcrypt hashing and
 * comparison server-side.
 *
 * Guest users cannot set PINs (no server session) — the store skips API calls
 * when isGuest === true and returns appropriate errors.
 */

import { create } from 'zustand'
import { PINSettings, DEFAULT_PIN_SETTINGS } from '../types/childSafety'
import { authenticatedFetch } from '../lib/authenticatedFetch'

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

/* -------------------------------------------------------------------------- */
/*  API helpers (server-side bcrypt, never exposed to client)                  */
/* -------------------------------------------------------------------------- */

async function apiGetStatus(): Promise<PINSettings> {
    const res = await authenticatedFetch('/api/child-safety/pin', { method: 'GET' })
    if (!res.ok) throw new Error(`Failed to load PIN status: ${res.status}`)
    const json = await res.json()
    return (json.status as PINSettings) ?? DEFAULT_PIN_SETTINGS
}

async function apiSetPIN(pin: string): Promise<PINSettings> {
    const res = await authenticatedFetch('/api/child-safety/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to set PIN')
    return (json.status as PINSettings) ?? DEFAULT_PIN_SETTINGS
}

async function apiVerifyPIN(pin: string): Promise<{ success: boolean; error?: string }> {
    const res = await authenticatedFetch('/api/child-safety/pin?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
    })
    const json = await res.json()
    return { success: json.success === true, error: json.error }
}

async function apiChangePIN(
    currentPin: string,
    newPin: string
): Promise<{ success: boolean; error?: string }> {
    const res = await authenticatedFetch('/api/child-safety/pin?action=change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
    })
    const json = await res.json()
    return { success: json.success === true, error: json.error }
}

async function apiDeletePIN(pin: string): Promise<{ success: boolean; error?: string }> {
    const res = await authenticatedFetch('/api/child-safety/pin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
    })
    const json = await res.json()
    return { success: json.success === true, error: json.error }
}

/* -------------------------------------------------------------------------- */
/*  Store                                                                      */
/* -------------------------------------------------------------------------- */

export const useChildSafetyPINStore = create<ChildSafetyPINStore>((set, get) => ({
    ...initialState,

    loadPINSettings: async (userId: string, isGuest: boolean) => {
        // Guest users cannot have server-side PINs.
        if (isGuest) {
            set({ settings: DEFAULT_PIN_SETTINGS, isLoading: false })
            return
        }

        set({ isLoading: true, error: null })
        try {
            const settings = await apiGetStatus()
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
        if (isGuest) {
            set({ error: 'Guest users cannot use PIN protection', isLoading: false })
            return false
        }

        set({ isLoading: true, error: null })
        try {
            const result = await apiVerifyPIN(pin)

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
                    error: result.error ?? 'Incorrect PIN',
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
        if (isGuest) {
            set({ error: 'Guest users cannot create a PIN', isLoading: false })
            throw new Error('Guest users cannot create a PIN')
        }

        set({ isLoading: true, error: null })
        try {
            const settings = await apiSetPIN(pin)

            set({
                settings,
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
        if (isGuest) {
            set({ error: 'Guest users cannot change a PIN', isLoading: false })
            throw new Error('Guest users cannot change a PIN')
        }

        set({ isLoading: true, error: null })
        try {
            const result = await apiChangePIN(oldPin, newPin)

            if (!result.success) {
                throw new Error(result.error ?? 'Failed to change PIN')
            }

            // Reload settings to reflect the updated PIN
            const settings = await apiGetStatus()

            set({
                settings,
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
        if (isGuest) {
            set({ error: 'Guest users cannot remove a PIN', isLoading: false })
            throw new Error('Guest users cannot remove a PIN')
        }

        set({ isLoading: true, error: null })
        try {
            const result = await apiDeletePIN(pin)

            if (!result.success) {
                throw new Error(result.error ?? 'Failed to remove PIN')
            }

            set({
                settings: DEFAULT_PIN_SETTINGS,
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
