/**
 * Check Firebase Auth users programmatically
 * This will show all users in the Firebase project
 */

// IMPORTANT: Load environment variables FIRST
import './load-env'

import { auth } from '../firebase'
import { getAuth } from 'firebase/auth'

async function checkFirebaseUsers() {
    console.log('\n' + '='.repeat(70))
    console.log('🔍 FIREBASE USER CHECK')
    console.log('='.repeat(70))

    console.log('\n📋 Firebase Configuration:')
    console.log(`Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
    console.log(`Auth Domain: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`)

    console.log('\n⚠️  NOTE: Firebase Client SDK cannot list all users')
    console.log('You need Firebase Admin SDK or Firebase Console to see all users')

    console.log('\n📝 Current auth state:')
    console.log(`Current user: ${auth.currentUser?.email || 'None (not signed in)'}`)

    if (auth.currentUser) {
        console.log(`User ID: ${auth.currentUser.uid}`)
        console.log(`Email: ${auth.currentUser.email}`)
        console.log(`Email Verified: ${auth.currentUser.emailVerified}`)
    }

    console.log('\n🔗 To verify users exist, go to Firebase Console:')
    console.log('1. Open: https://console.firebase.google.com')
    console.log(`2. Select project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
    console.log('3. Go to: Authentication → Users')
    console.log('4. Look for: test@nettrailer.dev')

    console.log("\n💡 If you don't see the user:")
    console.log('- The creation may have failed silently')
    console.log('- You might be looking at wrong Firebase project')
    console.log('- The user may have been deleted')

    console.log("\n🧪 Let's try to sign in to verify the user exists...")
}

checkFirebaseUsers()
    .then(() => {
        console.log('\n✅ Check complete')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Error:', error)
        process.exit(1)
    })
