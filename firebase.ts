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
    // Client-side: Progressive persistence re-enablement with health checks
    if (!globalThis.firestore) {
        ;(async () => {
            try {
                // Dynamic import to avoid SSR issues
                const { FirestoreCacheHealth } = await import('@/utils/firestore/cacheHealth')

                // Health check before enabling persistence
                const isSafe = await FirestoreCacheHealth.isSafeToEnableCache()

                if (isSafe) {
                    console.log('✅ Firestore cache health: GOOD - enabling persistence')

                    globalThis.firestore = initializeFirestore(app, {
                        localCache: persistentLocalCache({
                            cacheSizeBytes: 40 * 1024 * 1024, // 40MB limit for safety
                        }),
                    })
                } else {
                    console.warn('⚠️  Firestore cache health: DEGRADED - using memory cache')
                    console.warn(
                        '   To re-enable: Open DevTools → Cache Health Panel → Clear Cache'
                    )
                    globalThis.firestore = getFirestore(app) // Fallback to memory cache
                }
            } catch (error) {
                console.error('❌ Firestore initialization error:', error)

                // Record error for health monitoring
                try {
                    const { FirestoreCacheHealth } = await import('@/utils/firestore/cacheHealth')
                    FirestoreCacheHealth.recordCacheError(error as Error)
                } catch (recordError) {
                    console.error('Failed to record cache error:', recordError)
                }

                // Safe fallback: memory cache only
                globalThis.firestore = getFirestore(app)
            }
        })()

        // Initialize with memory cache immediately for SSR/fast startup
        // Will be replaced with persistent cache if health check passes
        globalThis.firestore = getFirestore(app)
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
