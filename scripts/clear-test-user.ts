/**
 * Clear all data for the test user
 * This resets the test user to a clean state
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

async function clearTestUser() {
    console.log('\n' + '█'.repeat(70))
    console.log('🗑️  CLEARING TEST USER DATA')
    console.log('█'.repeat(70))

    try {
        // Step 1: Sign in
        console.log('\n📝 Step 1: Signing in as test user...')
        const userCredential = await signInWithEmailAndPassword(
            auth,
            TEST_USER.email,
            TEST_USER.password
        )

        const userId = userCredential.user.uid
        console.log('✅ Signed in successfully!')
        console.log(`   User ID: ${userId}`)

        // Step 2: Get current data summary
        console.log('\n📝 Step 2: Checking current data...')
        const summary = await AuthStorageService.getDataSummary(userId)
        console.log(`   Watchlist: ${summary.watchlistCount} items`)
        console.log(`   Ratings: ${summary.ratingsCount} items`)
        console.log(`   Lists: ${summary.listsCount} lists`)
        console.log(`   Total items: ${summary.totalItems}`)

        if (summary.isEmpty) {
            console.log('\n✅ Test user data is already empty!')
            return
        }

        // Step 3: Clear the data
        console.log('\n📝 Step 3: Clearing all data...')
        await AuthStorageService.clearUserData(userId)

        // Step 4: Verify it's cleared
        console.log('\n📝 Step 4: Verifying data is cleared...')
        const verifyData = await AuthStorageService.loadUserData(userId)

        console.log('\n' + '='.repeat(70))
        console.log('📊 VERIFICATION RESULTS')
        console.log('='.repeat(70))

        console.log(`\n✅ Watchlist: ${verifyData.watchlist.length} items (should be 0)`)
        console.log(`✅ Ratings: ${verifyData.ratings.length} items (should be 0)`)
        console.log(
            `✅ Lists: ${verifyData.userLists.lists.length} lists (should be 3 default lists)`
        )

        // Check that only default lists remain
        const customLists = verifyData.userLists.lists.filter(
            (list) => !Object.values(verifyData.userLists.defaultListIds).includes(list.id)
        )
        console.log(`✅ Custom lists: ${customLists.length} (should be 0)`)

        if (
            verifyData.watchlist.length === 0 &&
            verifyData.ratings.length === 0 &&
            customLists.length === 0
        ) {
            console.log('\n' + '█'.repeat(70))
            console.log('🎉 TEST USER DATA SUCCESSFULLY CLEARED!')
            console.log('█'.repeat(70))
            console.log('\n✅ Test user is ready for fresh testing')
            console.log(`   User ID: ${userId}`)
            console.log(`   Email: ${TEST_USER.email}`)
        } else {
            throw new Error('❌ Data not fully cleared!')
        }
    } catch (error: any) {
        console.error('\n' + '█'.repeat(70))
        console.error('❌ FAILED TO CLEAR TEST USER DATA')
        console.error('█'.repeat(70))
        console.error(`\nError: ${error.message}`)
        console.error('\nStack:', error.stack)
        throw error
    }
}

// Run the script
clearTestUser()
    .then(() => {
        console.log('\n✅ Script completed successfully!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error.message)
        process.exit(1)
    })
