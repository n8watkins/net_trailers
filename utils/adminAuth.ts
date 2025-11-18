/**
 * Admin Authentication Utilities
 *
 * Server-side utilities for validating admin access without exposing tokens
 */

const ADMIN_UIDS = [process.env.NEXT_PUBLIC_ADMIN_UID || 'YOUR_FIREBASE_UID_HERE']
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'your-secret-admin-token'

/**
 * Check if a user ID is an admin
 */
export function isAdmin(userId: string | null | undefined): boolean {
    if (!userId) return false
    return ADMIN_UIDS.includes(userId)
}

/**
 * Get admin UIDs array (for client-side checking)
 */
export function getAdminUIDs(): string[] {
    return ADMIN_UIDS
}

/**
 * Get admin token for server-side API calls
 * WARNING: Only use this server-side!
 */
export function getAdminToken(): string {
    return ADMIN_TOKEN
}

/**
 * Validate admin token from request header
 */
export function validateAdminToken(authHeader: string | null): boolean {
    if (!authHeader) return false

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

    return token === ADMIN_TOKEN
}
