// Initialize Firebase
import { initializeApp, getApp, getApps } from 'firebase/app'
import { initializeFirestore, getFirestore, persistentLocalCache } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Validate Firebase configuration
if (!firebaseConfig.apiKey) {
    throw new Error('Firebase configuration is missing. Please check your environment variables.')
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// Initialize Firestore with persistence - safe for hot module replacement
// Use global variable to persist across hot reloads (works in both Node.js and browser)
const globalThis =
    typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {}

declare global {
    var firestore: ReturnType<typeof getFirestore> | undefined
}

function getDb() {
    // Return cached global instance if it exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((globalThis as any).firestore) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (globalThis as any).firestore
    }

    // Try to initialize with custom options
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).firestore = initializeFirestore(app, {
            localCache: persistentLocalCache({
                // Optional: Configure cache size (default is 40MB)
                // cacheSizeBytes: 40 * 1024 * 1024,
            }),
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (globalThis as any).firestore
    } catch (error: unknown) {
        // If initialization fails because it's already initialized,
        // just use getFirestore() to get the existing instance
        if (error instanceof Error && 'code' in error && error.code === 'failed-precondition') {
            // Silently use the existing instance - this can happen during hot reloads
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(globalThis as any).firestore = getFirestore(app)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (globalThis as any).firestore
        }
        // Re-throw if it's a different error
        throw error
    }
}

// Export getDb function for lazy initialization
export function getFirestoreDb() {
    return getDb()
}

// Initialize immediately for backward compatibility
const db = getDb()

const auth = getAuth(app)

export default app
export { auth, db }
