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
    // Client-side: Check if already initialized (hot reload)
    if (!globalThis.firestore) {
        // Synchronous health check using localStorage (no async)
        let isSafe = false
        try {
            const healthData = localStorage.getItem('nettrailer_firestore_health')
            if (healthData) {
                const health = JSON.parse(healthData)
                const errorCount = health.errorCount || 0
                isSafe = errorCount < 3 && 'indexedDB' in window
            } else {
                // First time - assume safe if IndexedDB available
                isSafe = 'indexedDB' in window
            }
        } catch {
            isSafe = false
        }

        // Initialize Firestore once with appropriate settings
        try {
            if (isSafe) {
                console.log('✅ Firestore cache health: GOOD - enabling persistence')
                globalThis.firestore = initializeFirestore(app, {
                    localCache: persistentLocalCache({
                        cacheSizeBytes: 40 * 1024 * 1024, // 40MB limit
                    }),
                })
            } else {
                console.warn('⚠️  Firestore cache health: DEGRADED - using memory cache')
                console.warn('   To re-enable: Clear cache via Cache Health Panel')
                globalThis.firestore = getFirestore(app)
            }
        } catch (error) {
            console.error('❌ Firestore initialization error:', error)
            // Fallback to getFirestore if initialization failed
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
