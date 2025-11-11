/**
 * Firebase Admin SDK Configuration
 *
 * Server-side Firebase configuration for authenticated API routes.
 * Uses service account credentials to interact with Firebase securely.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let adminApp: App | undefined
let adminAuth: Auth | undefined
let adminDb: Firestore | undefined

/**
 * Initialize Firebase Admin SDK
 *
 * Safe for hot module reloading - only initializes once
 */
function initializeFirebaseAdmin() {
    if (getApps().length > 0) {
        adminApp = getApps()[0]
    } else {
        // Initialize with service account credentials
        // For production: Use service account key JSON file
        // For development: Firebase automatically uses Application Default Credentials
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

        if (!projectId) {
            throw new Error('Firebase project ID not configured')
        }

        // In production, you should use a service account key
        // For now, we'll use the project ID which works with local emulator
        // and can work with Application Default Credentials in production
        adminApp = initializeApp({
            credential: cert({
                projectId,
                // These would come from a service account key file in production:
                // privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                // clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            }),
            projectId,
        })
    }

    adminAuth = getAuth(adminApp)
    adminDb = getFirestore(adminApp)
}

/**
 * Get Firebase Admin Auth instance
 */
export function getAdminAuth(): Auth {
    if (!adminAuth) {
        initializeFirebaseAdmin()
    }
    return adminAuth!
}

/**
 * Get Firebase Admin Firestore instance
 */
export function getAdminDb(): Firestore {
    if (!adminDb) {
        initializeFirebaseAdmin()
    }
    return adminDb!
}

/**
 * Verify a Firebase ID token
 *
 * @param idToken - Firebase ID token from client
 * @returns Decoded token with user information
 * @throws Error if token is invalid or expired
 */
export async function verifyIdToken(idToken: string) {
    const auth = getAdminAuth()
    return await auth.verifyIdToken(idToken)
}
