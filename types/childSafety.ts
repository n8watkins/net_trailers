/**
 * Child Safety PIN Protection Types
 *
 * Security model for PIN-protecting Child Safety Mode settings.
 * Prevents unauthorized disabling of content filters.
 */

/**
 * PIN data stored in Firestore or localStorage
 * - Authenticated users: /users/{userId}/settings/childSafety
 * - Guest users: localStorage key: nettrailer_guest_child_safety_pin_{guestId}
 */
export interface ChildSafetyPIN {
    /** bcrypt hash of the PIN (NEVER store plaintext) */
    hash: string

    /** When the PIN was created */
    createdAt: number

    /** Last time the PIN was changed */
    lastChangedAt: number

    /** Whether PIN protection is currently active */
    enabled: boolean

    /** Number of failed verification attempts (for rate limiting) */
    failedAttempts?: number

    /** Timestamp when rate limit will reset */
    rateLimitResetAt?: number
}

/**
 * PIN verification result
 */
export interface PINVerificationResult {
    /** Whether the PIN was correct */
    success: boolean

    /** Error message if verification failed */
    error?: string

    /** Whether rate limiting is active */
    rateLimited?: boolean

    /** Seconds until rate limit resets */
    retryAfterSeconds?: number
}

/**
 * PIN operation types for tracking
 */
export type PINOperation = 'create' | 'verify' | 'update' | 'remove'

/**
 * PIN settings for UI state
 */
export interface PINSettings {
    /** Whether a PIN exists for the current user */
    hasPIN: boolean

    /** Whether PIN is currently enabled */
    enabled: boolean

    /** Whether PIN has been verified in this session */
    verified: boolean

    /** When the PIN was last changed (for display) */
    lastChanged?: number
}

/**
 * Default PIN settings for new users
 */
export const DEFAULT_PIN_SETTINGS: PINSettings = {
    hasPIN: false,
    enabled: false,
    verified: false,
}

/**
 * PIN validation constraints
 */
export const PIN_CONSTRAINTS = {
    /** Minimum PIN length */
    MIN_LENGTH: 4,

    /** Maximum PIN length */
    MAX_LENGTH: 6,

    /** Maximum failed attempts before rate limiting */
    MAX_FAILED_ATTEMPTS: 5,

    /** Rate limit duration in seconds */
    RATE_LIMIT_DURATION: 300, // 5 minutes

    /** bcrypt hash rounds (10-12 recommended) */
    BCRYPT_ROUNDS: 10,
} as const
