/**
 * Check if user data exists in Firestore
 * This will attempt to read the user's data
 */

// IMPORTANT: Load environment variables FIRST
import './load-env'

import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { AuthStorageService } from '../services/authStorageService'

const TEST_USER = {
    email: 'test@nettrailer.dev',
    password: 'TestPassword123!',
}

async function checkUserData() {
    console.log('\n' + '='.repeat(70))
    console.log('🔍 CHECKING USER DATA IN FIRESTORE')
    console.log('='.repeat(70))

    try {
        // Sign in first
        console.log('\n📝 Step 1: Signing in as test user...')
        const userCredential = await signInWithEmailAndPassword(
            auth,
            TEST_USER.email,
            TEST_USER.password
        )

        console.log('✅ Signed in successfully!')
        console.log(`User ID: ${userCredential.user.uid}`)
        console.log(`Email: ${userCredential.user.email}`)

        // Try to load user data from Firestore
        console.log('\n📝 Step 2: Loading data from Firestore...')
        const userData = await AuthStorageService.loadUserData(userCredential.user.uid)

        console.log('\n✅ Data loaded from Firestore:')
        console.log(JSON.stringify(userData, null, 2))

        console.log('\n📊 Data Summary:')
        console.log(`- Watchlist items: ${userData.watchlist.length}`)
        console.log(`- Ratings: ${userData.ratings.length}`)
        console.log(`- Custom lists: ${userData.userLists.lists.length}`)
        console.log(`- Default lists: ${Object.keys(userData.userLists.defaultListIds).length}`)

        if (userData.userLists.lists.length > 3) {
            console.log('\n🎉 Found custom lists:')
            userData.userLists.lists.slice(3).forEach((list) => {
                console.log(`  - ${list.name} (${list.items.length} items)`)
            })
        } else {
            console.log('\n⚠️  No custom lists found (only defaults)')
        }

        console.log('\n🔗 To view in Firebase Console:')
        console.log('1. Go to: https://console.firebase.google.com')
        console.log('2. Select project: netflix-clone-15862')
        console.log('3. Navigate to: Firestore Database')
        console.log(`4. Look for document: users/${userCredential.user.uid}`)

        console.log('\n🔗 To view users in Authentication:')
        console.log('1. Go to: https://console.firebase.google.com')
        console.log('2. Select project: netflix-clone-15862')
        console.log('3. Click: Authentication')
        console.log('4. Click: Users tab')
        console.log('5. Look for: test@nettrailer.dev')
    } catch (error: any) {
        console.error('\n❌ Error:', error.message)

        if (error.code === 'permission-denied') {
            console.log('\n⚠️  This means:')
            console.log('- User exists in Firebase Auth')
            console.log('- But Firestore security rules prevent reading data')
            console.log('- This is EXPECTED if running from Node.js without proper auth context')
        }
    }
}

checkUserData()
    .then(() => {
        console.log('\n✅ Check complete')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Error:', error)
        process.exit(1)
    })
