/**
 * Firebase Admin SDK Configuration
 *
 * Server-side Firebase configuration for authenticated API routes.
 * Uses service account credentials to interact with Firebase securely.
 */

import { initializeApp, getApps, cert, App, applicationDefault } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let adminApp: App | undefined
let adminAuth: Auth | undefined
let adminDb: Firestore | undefined

/**
 * Initialize Firebase Admin SDK
 *
 * Safe for hot module reloading - only initializes once
 *
 * Credentials Priority:
 * 1. Environment variables (FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL)
 * 2. Application Default Credentials (for local dev with gcloud or Vercel/GCP)
 *
 * @throws Error if credentials are not properly configured
 */
function initializeFirebaseAdmin() {
    if (getApps().length > 0) {
        adminApp = getApps()[0]
    } else {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL

        if (!projectId) {
            throw new Error(
                'Firebase project ID not configured. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID.'
            )
        }

        // Use explicit credentials if available (production)
        if (privateKey && clientEmail) {
            console.log('[Firebase Admin] Initializing with service account credentials')
            try {
                adminApp = initializeApp({
                    credential: cert({
                        projectId,
                        privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
                        clientEmail,
                    }),
                    projectId,
                })
            } catch (certError) {
                console.error(
                    '[Firebase Admin] Failed to initialize with service account credentials:',
                    certError
                )
                throw new Error(
                    `Firebase Admin credential initialization failed: ${
                        certError instanceof Error ? certError.message : 'Unknown error'
                    }. Check FIREBASE_ADMIN_PRIVATE_KEY format (should include -----BEGIN PRIVATE KEY----- header).`
                )
            }
        }
        // Fallback to Application Default Credentials (local dev with gcloud)
        else if (process.env.NODE_ENV === 'development') {
            console.log(
                '[Firebase Admin] Initializing with Application Default Credentials (local dev)'
            )
            try {
                adminApp = initializeApp({
                    credential: applicationDefault(),
                    projectId,
                })
            } catch (adcError) {
                console.error(
                    '[Firebase Admin] Failed to initialize with Application Default Credentials:',
                    adcError
                )
                throw new Error(
                    'Firebase Admin initialization failed. For local development, run `gcloud auth application-default login` or set FIREBASE_ADMIN_PRIVATE_KEY and FIREBASE_ADMIN_CLIENT_EMAIL environment variables.'
                )
            }
        }
        // Production without credentials
        else {
            const errorMsg =
                'Firebase Admin credentials not configured. Set FIREBASE_ADMIN_PRIVATE_KEY and FIREBASE_ADMIN_CLIENT_EMAIL environment variables in your deployment settings (e.g., Vercel Environment Variables).'
            console.error('[Firebase Admin]', errorMsg)
            throw new Error(errorMsg)
        }
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
