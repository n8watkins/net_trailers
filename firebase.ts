// Initialize Firebase
import { initializeApp, getApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
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
const db = getFirestore(app)
const auth = getAuth(app)

// Enable offline persistence for Firestore ONLY when authenticated
// This prevents Firestore errors when user is not authenticated
if (typeof window !== 'undefined') {
    let persistenceEnabled = false

    // Only enable persistence after authentication is confirmed
    onAuthStateChanged(auth, (user) => {
        if (user && !persistenceEnabled) {
            // User is authenticated, enable persistence
            import('firebase/firestore').then(({ enableIndexedDbPersistence }) => {
                enableIndexedDbPersistence(db).catch((err) => {
                    if (err.code === 'failed-precondition') {
                        // Multiple tabs open, persistence can only be enabled in one tab at a time
                        console.warn('Firestore persistence failed: Multiple tabs open')
                    } else if (err.code === 'unimplemented') {
                        // The current browser doesn't support persistence
                        console.warn('Firestore persistence not supported in this browser')
                    } else {
                        console.warn('Firestore persistence error:', err)
                    }
                })
                persistenceEnabled = true
            })
        }
    })
}

export default app
export { auth, db }
