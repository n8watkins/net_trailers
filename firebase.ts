// Initialize Firebase
import { initializeApp, getApp, getApps } from 'firebase/app'
import { initializeFirestore, getFirestore, persistentLocalCache } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
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
// Use global variable to persist across hot reloads (works in both Node.js and browser)
const globalThis =
    typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {}

declare global {
    var firestore: ReturnType<typeof getFirestore> | undefined
}

// Initialize Firestore
// Check if we're in browser environment before using persistent cache
let db: ReturnType<typeof getFirestore>

if (typeof window !== 'undefined') {
    // Client-side: try to use persistent cache
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache(),
        })
    } catch (error) {
        // If already initialized, get the existing instance
        db = getFirestore(app)
    }
} else {
    // Server-side: use basic getFirestore without persistent cache
    db = getFirestore(app)
}

const auth = getAuth(app)

export default app
export { auth, db }
