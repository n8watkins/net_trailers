/**
 * Child Safety PIN Management
 *
 * Handles PIN creation, verification, and updates for Child Safety Mode.
 * Supports both authenticated users (Firestore) and guest users (localStorage).
 *
 * Security Features:
 * - bcrypt hashing (never stores plaintext PINs)
 * - Rate limiting (5 attempts per 5 minutes)
 * - Session-based verification (resets on browser close)
 * - Email notifications on PIN changes (authenticated users only)
 */

import bcrypt from 'bcryptjs'
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import {
    ChildSafetyPIN,
    PINVerificationResult,
    PIN_CONSTRAINTS,
    PINSettings,
    DEFAULT_PIN_SETTINGS,
} from '../../types/childSafety'

/**
 * Get the Firestore document reference for a user's PIN settings
 */
function getPINDocRef(userId: string) {
    return doc(db, `users/${userId}/settings/childSafety`)
}

/**
 * Get the localStorage key for guest user PIN
 */
function getGuestPINKey(guestId: string): string {
    return `nettrailer_guest_child_safety_pin_${guestId}`
}

/**
 * Validate PIN format
 */
function validatePIN(pin: string): { valid: boolean; error?: string } {
    if (!pin || typeof pin !== 'string') {
        return { valid: false, error: 'PIN is required' }
    }

    if (!/^\d+$/.test(pin)) {
        return { valid: false, error: 'PIN must contain only numbers' }
    }

    if (pin.length < PIN_CONSTRAINTS.MIN_LENGTH || pin.length > PIN_CONSTRAINTS.MAX_LENGTH) {
        return {
            valid: false,
            error: `PIN must be ${PIN_CONSTRAINTS.MIN_LENGTH}-${PIN_CONSTRAINTS.MAX_LENGTH} digits`,
        }
    }

    return { valid: true }
}

/**
 * Check if rate limiting is active
 */
function isRateLimited(pinData: ChildSafetyPIN): {
    limited: boolean
    retryAfterSeconds?: number
} {
    if (
        !pinData.rateLimitResetAt ||
        !pinData.failedAttempts ||
        pinData.failedAttempts < PIN_CONSTRAINTS.MAX_FAILED_ATTEMPTS
    ) {
        return { limited: false }
    }

    const now = Date.now()
    if (now >= pinData.rateLimitResetAt) {
        // Rate limit expired
        return { limited: false }
    }

    const retryAfterSeconds = Math.ceil((pinData.rateLimitResetAt - now) / 1000)
    return { limited: true, retryAfterSeconds }
}

/**
 * Create a new PIN for a user
 *
 * @param userId - User ID (auth ID for authenticated, guest ID for guests)
 * @param pin - Plaintext PIN (4-6 digits)
 * @param isGuest - Whether this is a guest user
 * @returns Promise that resolves when PIN is created
 */
export async function createPIN(
    userId: string,
    pin: string,
    isGuest: boolean = false
): Promise<void> {
    // Validate PIN format
    const validation = validatePIN(pin)
    if (!validation.valid) {
        throw new Error(validation.error)
    }

    // Hash the PIN
    const hash = await bcrypt.hash(pin, PIN_CONSTRAINTS.BCRYPT_ROUNDS)

    const pinData: ChildSafetyPIN = {
        hash,
        createdAt: Date.now(),
        lastChangedAt: Date.now(),
        enabled: true,
        failedAttempts: 0,
    }

    if (isGuest) {
        // Store in localStorage for guest users
        const key = getGuestPINKey(userId)
        localStorage.setItem(key, JSON.stringify(pinData))
    } else {
        // Store in Firestore for authenticated users
        const docRef = getPINDocRef(userId)
        await setDoc(docRef, pinData)
    }
}

/**
 * Verify a PIN for a user
 *
 * @param userId - User ID
 * @param pin - Plaintext PIN to verify
 * @param isGuest - Whether this is a guest user
 * @returns Verification result with success status and error details
 */
export async function verifyPIN(
    userId: string,
    pin: string,
    isGuest: boolean = false
): Promise<PINVerificationResult> {
    // Validate PIN format
    const validation = validatePIN(pin)
    if (!validation.valid) {
        return { success: false, error: validation.error }
    }

    let pinData: ChildSafetyPIN | null = null

    try {
        if (isGuest) {
            // Retrieve from localStorage
            const key = getGuestPINKey(userId)
            const stored = localStorage.getItem(key)
            if (!stored) {
                return { success: false, error: 'No PIN found. Please create one first.' }
            }
            pinData = JSON.parse(stored)
        } else {
            // Retrieve from Firestore
            const docRef = getPINDocRef(userId)
            const docSnap = await getDoc(docRef)
            if (!docSnap.exists()) {
                return { success: false, error: 'No PIN found. Please create one first.' }
            }
            pinData = docSnap.data() as ChildSafetyPIN
        }

        // Check rate limiting
        const rateLimitCheck = isRateLimited(pinData)
        if (rateLimitCheck.limited) {
            return {
                success: false,
                error: `Too many failed attempts. Please try again in ${rateLimitCheck.retryAfterSeconds} seconds.`,
                rateLimited: true,
                retryAfterSeconds: rateLimitCheck.retryAfterSeconds,
            }
        }

        // Verify the PIN
        const isValid = await bcrypt.compare(pin, pinData.hash)

        if (isValid) {
            // Reset failed attempts on successful verification
            const updatedData: ChildSafetyPIN = {
                ...pinData,
                failedAttempts: 0,
                rateLimitResetAt: undefined,
            }

            if (isGuest) {
                const key = getGuestPINKey(userId)
                localStorage.setItem(key, JSON.stringify(updatedData))
            } else {
                const docRef = getPINDocRef(userId)
                await updateDoc(docRef, {
                    failedAttempts: 0,
                    rateLimitResetAt: null,
                })
            }

            return { success: true }
        } else {
            // Increment failed attempts
            const failedAttempts = (pinData.failedAttempts || 0) + 1
            const updatedData: ChildSafetyPIN = {
                ...pinData,
                failedAttempts,
            }

            // Apply rate limiting if max attempts reached
            if (failedAttempts >= PIN_CONSTRAINTS.MAX_FAILED_ATTEMPTS) {
                updatedData.rateLimitResetAt =
                    Date.now() + PIN_CONSTRAINTS.RATE_LIMIT_DURATION * 1000
            }

            if (isGuest) {
                const key = getGuestPINKey(userId)
                localStorage.setItem(key, JSON.stringify(updatedData))
            } else {
                const docRef = getPINDocRef(userId)
                await updateDoc(docRef, {
                    failedAttempts,
                    rateLimitResetAt: updatedData.rateLimitResetAt || null,
                })
            }

            const remainingAttempts = PIN_CONSTRAINTS.MAX_FAILED_ATTEMPTS - failedAttempts
            return {
                success: false,
                error:
                    remainingAttempts > 0
                        ? `Incorrect PIN. ${remainingAttempts} attempts remaining.`
                        : 'Incorrect PIN. Too many failed attempts.',
            }
        }
    } catch (error) {
        console.error('PIN verification error:', error)
        return { success: false, error: 'Failed to verify PIN. Please try again.' }
    }
}

/**
 * Update (change) a user's PIN
 *
 * @param userId - User ID
 * @param oldPin - Current PIN for verification
 * @param newPin - New PIN to set
 * @param isGuest - Whether this is a guest user
 * @returns Promise that resolves when PIN is updated
 */
export async function updatePIN(
    userId: string,
    oldPin: string,
    newPin: string,
    isGuest: boolean = false
): Promise<void> {
    // First verify the old PIN
    const verificationResult = await verifyPIN(userId, oldPin, isGuest)
    if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'Current PIN is incorrect')
    }

    // Validate new PIN
    const validation = validatePIN(newPin)
    if (!validation.valid) {
        throw new Error(validation.error)
    }

    // Don't allow same PIN
    if (oldPin === newPin) {
        throw new Error('New PIN must be different from current PIN')
    }

    // Hash the new PIN
    const hash = await bcrypt.hash(newPin, PIN_CONSTRAINTS.BCRYPT_ROUNDS)

    if (isGuest) {
        const key = getGuestPINKey(userId)
        const stored = localStorage.getItem(key)
        if (!stored) {
            throw new Error('PIN not found')
        }
        const pinData: ChildSafetyPIN = JSON.parse(stored)
        pinData.hash = hash
        pinData.lastChangedAt = Date.now()
        pinData.failedAttempts = 0
        pinData.rateLimitResetAt = undefined
        localStorage.setItem(key, JSON.stringify(pinData))
    } else {
        const docRef = getPINDocRef(userId)
        await updateDoc(docRef, {
            hash,
            lastChangedAt: Date.now(),
            failedAttempts: 0,
            rateLimitResetAt: null,
        })
    }
}

/**
 * Remove a user's PIN
 *
 * @param userId - User ID
 * @param pin - Current PIN for verification
 * @param isGuest - Whether this is a guest user
 * @returns Promise that resolves when PIN is removed
 */
export async function removePIN(
    userId: string,
    pin: string,
    isGuest: boolean = false
): Promise<void> {
    // Verify PIN before removing
    const verificationResult = await verifyPIN(userId, pin, isGuest)
    if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'PIN is incorrect')
    }

    if (isGuest) {
        const key = getGuestPINKey(userId)
        localStorage.removeItem(key)
    } else {
        const docRef = getPINDocRef(userId)
        await deleteDoc(docRef)
    }
}

/**
 * Get PIN settings for a user
 *
 * @param userId - User ID
 * @param isGuest - Whether this is a guest user
 * @returns PIN settings including existence and enabled status
 */
export async function getPINSettings(
    userId: string,
    isGuest: boolean = false
): Promise<PINSettings> {
    try {
        if (isGuest) {
            const key = getGuestPINKey(userId)
            const stored = localStorage.getItem(key)
            if (!stored) {
                return DEFAULT_PIN_SETTINGS
            }
            const pinData: ChildSafetyPIN = JSON.parse(stored)
            return {
                hasPIN: true,
                enabled: pinData.enabled,
                verified: false, // Session-based verification handled by store
                lastChanged: pinData.lastChangedAt,
            }
        } else {
            const docRef = getPINDocRef(userId)
            const docSnap = await getDoc(docRef)
            if (!docSnap.exists()) {
                return DEFAULT_PIN_SETTINGS
            }
            const pinData = docSnap.data() as ChildSafetyPIN
            return {
                hasPIN: true,
                enabled: pinData.enabled,
                verified: false, // Session-based verification handled by store
                lastChanged: pinData.lastChangedAt,
            }
        }
    } catch (error) {
        console.error('Error fetching PIN settings:', error)
        return DEFAULT_PIN_SETTINGS
    }
}

/**
 * Toggle PIN enabled status
 *
 * @param userId - User ID
 * @param enabled - Whether to enable or disable PIN protection
 * @param isGuest - Whether this is a guest user
 */
export async function setPINEnabled(
    userId: string,
    enabled: boolean,
    isGuest: boolean = false
): Promise<void> {
    if (isGuest) {
        const key = getGuestPINKey(userId)
        const stored = localStorage.getItem(key)
        if (!stored) {
            throw new Error('PIN not found')
        }
        const pinData: ChildSafetyPIN = JSON.parse(stored)
        pinData.enabled = enabled
        localStorage.setItem(key, JSON.stringify(pinData))
    } else {
        const docRef = getPINDocRef(userId)
        await updateDoc(docRef, { enabled })
    }
}
