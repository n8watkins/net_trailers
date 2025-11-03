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

    // Try persistent cache first (client-side), fallback to basic (server-side)
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).firestore = initializeFirestore(app, {
            localCache: persistentLocalCache(),
        })
    } catch (_error) {
        // Fallback to basic getFirestore (server-side or already initialized)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).firestore = getFirestore(app)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).firestore
}

// Export getDb function for lazy initialization
export function getFirestoreDb() {
    return getDb()
}

// Lazy initialization - only call getDb() when db is first accessed
let _db: ReturnType<typeof getFirestore> | null = null
const db = new Proxy({} as ReturnType<typeof getFirestore>, {
    get(_target, prop) {
        if (!_db) {
            _db = getDb()
        }
        return (_db as any)[prop]
    },
})

const auth = getAuth(app)

export default app
export { auth, db }
