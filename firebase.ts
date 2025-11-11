// Initialize Firebase
import { initializeApp, getApp, getApps } from 'firebase/app'
import { initializeFirestore, getFirestore, persistentLocalCache } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { z } from 'zod'

// Zod schema for Firebase configuration validation
const firebaseConfigSchema = z.object({
    apiKey: z.string().min(1, 'Firebase API key is required'),
    authDomain: z.string().min(1, 'Firebase auth domain is required'),
    projectId: z.string().min(1, 'Firebase project ID is required'),
    storageBucket: z.string().min(1, 'Firebase storage bucket is required'),
    messagingSenderId: z.string().min(1, 'Firebase messaging sender ID is required'),
    appId: z.string().min(1, 'Firebase app ID is required'),
})

// Validate and parse Firebase configuration from environment variables
const firebaseConfig = firebaseConfigSchema.parse({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// Initialize Firestore with persistence - safe for hot module replacement
declare global {
    var firestore: ReturnType<typeof getFirestore> | undefined
}

// Initialize Firestore once and reuse across hot reloads
let db: ReturnType<typeof getFirestore>

if (typeof window !== 'undefined') {
    // Client-side: Check if already initialized in global scope
    if (!globalThis.firestore) {
        // TEMPORARY: Disable persistent cache to fix corrupted state
        // Re-enable after cache is cleared by uncommenting the try block
        try {
            // Try to initialize WITHOUT persistent cache (temporary fix)
            globalThis.firestore = getFirestore(app)

            // ORIGINAL CODE (re-enable after clearing cache):
            // globalThis.firestore = initializeFirestore(app, {
            //     localCache: persistentLocalCache(),
            // })
        } catch (error) {
            // If already initialized, get the existing instance
            globalThis.firestore = getFirestore(app)
        }
    }
    db = globalThis.firestore
} else {
    // Server-side: use basic getFirestore without persistent cache
    db = getFirestore(app)
}

const auth = getAuth(app)
const storage = getStorage(app)

export default app
export { auth, db, storage }
