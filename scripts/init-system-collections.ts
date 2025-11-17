/**
 * Initialize System Collections in Firestore
 *
 * Run this once to create the /system/stats and /system/trending documents
 *
 * Usage: npx tsx scripts/init-system-collections.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

// Firebase config from env
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function initializeSystemCollections() {
    console.log('🚀 Initializing system collections...')

    try {
        // Initialize /system/stats
        console.log('📊 Creating /system/stats document...')
        await setDoc(doc(db, 'system/stats'), {
            totalAccounts: 0,
            signupsToday: 0,
            lastSignup: null,
            createdAt: Date.now(),
        })
        console.log('✅ /system/stats created')

        // Initialize /system/trending
        console.log('📈 Creating /system/trending document...')
        await setDoc(doc(db, 'system/trending'), {
            lastRun: null,
            totalNotifications: 0,
            lastNewItems: 0,
            moviesSnapshot: [],
            tvSnapshot: [],
            createdAt: Date.now(),
        })
        console.log('✅ /system/trending created')

        console.log('\n🎉 System collections initialized successfully!')
        console.log('You can now access the admin panel at /admin')

        process.exit(0)
    } catch (error) {
        console.error('❌ Error initializing system collections:', error)
        process.exit(1)
    }
}

initializeSystemCollections()
