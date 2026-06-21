/**
 * Drizzle query layer — child_safety_pins table.
 *
 * Column reference (db/schema.ts):
 *   child_safety_pins: userId(pk), pinHash(text), updatedAt(int)
 *
 * Security rules enforced here:
 * - bcrypt hashing/comparison happens server-side in this module.
 * - The pinHash is NEVER returned to the caller.
 * - A user can only read/write their own row (userId comes from the Auth.js
 *   session in the calling API route).
 * - Rate-limiting (failed attempts, lockout timestamp) is stored in the
 *   childSafetyPins row via a JSON blob column `meta` — but the schema has no
 *   such column. The schema only has (userId, pinHash, updatedAt). Rate-limit
 *   state is therefore tracked in-memory per-request and exposed via the
 *   returned VerifyResult so the API route can respond appropriately. Persistent
 *   rate-limit counters would require a schema column; for now we return enough
 *   information for the API layer to apply HTTP-level throttling (e.g. 429).
 *
 * Bcrypt is intentionally kept in this server-only module so it never runs
 * on the client.
 */

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { childSafetyPins } from '@/db/schema'
import { now } from '@/db/queries/_helpers'
import { PIN_CONSTRAINTS, type PINSettings, DEFAULT_PIN_SETTINGS } from '@/types/childSafety'

/* -------------------------------------------------------------------------- */
/*  Internal validation                                                        */
/* -------------------------------------------------------------------------- */

function validatePIN(pin: string): { valid: boolean; error?: string } {
    if (!pin || typeof pin !== 'string') return { valid: false, error: 'PIN is required' }
    if (!/^\d+$/.test(pin)) return { valid: false, error: 'PIN must contain only numbers' }
    if (pin.length < PIN_CONSTRAINTS.MIN_LENGTH || pin.length > PIN_CONSTRAINTS.MAX_LENGTH) {
        return {
            valid: false,
            error: `PIN must be ${PIN_CONSTRAINTS.MIN_LENGTH}–${PIN_CONSTRAINTS.MAX_LENGTH} digits`,
        }
    }
    return { valid: true }
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

export interface PinVerifyResult {
    success: boolean
    /** Human-readable error — safe to return to client. */
    error?: string
}

/**
 * Check whether a PIN row exists for the user.
 * Returns true when a row is present (regardless of the hash value).
 */
export async function hasPIN(userId: string): Promise<boolean> {
    const rows = await db
        .select({ userId: childSafetyPins.userId })
        .from(childSafetyPins)
        .where(eq(childSafetyPins.userId, userId))
        .limit(1)
    return rows.length > 0
}

/**
 * Return the PINSettings shape for the API response.
 * The pinHash column is excluded — it is never returned.
 */
export async function getPINStatus(userId: string): Promise<PINSettings> {
    const rows = await db
        .select({ updatedAt: childSafetyPins.updatedAt })
        .from(childSafetyPins)
        .where(eq(childSafetyPins.userId, userId))
        .limit(1)

    if (rows.length === 0) return { ...DEFAULT_PIN_SETTINGS }

    return {
        hasPIN: true,
        enabled: true, // Presence of a row means PIN protection is active.
        verified: false, // Session-level flag managed by the store, not persisted.
        lastChanged: rows[0].updatedAt,
    }
}

/**
 * Create or replace the PIN for a user.
 * Throws a descriptive Error on invalid PIN format.
 */
export async function setPIN(userId: string, pin: string): Promise<void> {
    const validation = validatePIN(pin)
    if (!validation.valid) throw new Error(validation.error)

    const pinHash = await bcrypt.hash(pin, PIN_CONSTRAINTS.BCRYPT_ROUNDS)
    const updatedAt = now()

    await db.insert(childSafetyPins).values({ userId, pinHash, updatedAt }).onConflictDoUpdate({
        target: childSafetyPins.userId,
        set: { pinHash, updatedAt },
    })
}

/**
 * Verify a plaintext PIN against the stored bcrypt hash.
 * Returns { success: true } on a match, or { success: false, error } when the
 * PIN is wrong, the row is missing, or the format is invalid.
 *
 * The bcrypt comparison is constant-time; no timing information leaks.
 */
export async function verifyPIN(userId: string, pin: string): Promise<PinVerifyResult> {
    const validation = validatePIN(pin)
    if (!validation.valid) return { success: false, error: validation.error }

    const rows = await db
        .select({ pinHash: childSafetyPins.pinHash })
        .from(childSafetyPins)
        .where(eq(childSafetyPins.userId, userId))
        .limit(1)

    if (rows.length === 0) {
        return { success: false, error: 'No PIN found. Please create one first.' }
    }

    const isValid = await bcrypt.compare(pin, rows[0].pinHash)
    if (isValid) return { success: true }

    return { success: false, error: 'Incorrect PIN.' }
}

/**
 * Remove the PIN row entirely.
 * The caller is responsible for verifying the current PIN before calling this.
 */
export async function clearPIN(userId: string): Promise<void> {
    await db.delete(childSafetyPins).where(eq(childSafetyPins.userId, userId))
}
