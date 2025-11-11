/**
 * Authentication Utilities
 *
 * Helper functions for Firebase authentication in client components
 */

import { auth } from '../firebase'

/**
 * Get Firebase ID token for authenticated requests
 *
 * @returns Firebase ID token or null if not authenticated
 * @throws Error if token retrieval fails
 */
export async function getAuthToken(): Promise<string | null> {
    try {
        const user = auth.currentUser

        if (!user) {
            return null
        }

        // Get fresh ID token (auto-refreshes if needed)
        const idToken = await user.getIdToken()
        return idToken
    } catch (error) {
        console.error('Error getting auth token:', error)
        throw new Error('Failed to get authentication token')
    }
}

/**
 * Create authenticated fetch headers
 *
 * Includes Authorization header with Firebase ID token
 *
 * @param additionalHeaders - Optional additional headers to include
 * @returns Headers object with Authorization header
 * @throws Error if not authenticated or token retrieval fails
 */
export async function getAuthHeaders(
    additionalHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
    const token = await getAuthToken()

    if (!token) {
        throw new Error('Authentication required. Please sign in.')
    }

    return {
        Authorization: `Bearer ${token}`,
        ...additionalHeaders,
    }
}

/**
 * Check if user is authenticated
 *
 * @returns true if user is signed in with Firebase Auth
 */
export function isAuthenticated(): boolean {
    return auth.currentUser !== null
}
