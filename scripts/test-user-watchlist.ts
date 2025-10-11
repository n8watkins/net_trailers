/**
 * Test creating and editing watchlists for the test user
 * This will verify that data is being saved to Firebase for the specific user ID
 */

// IMPORTANT: Load environment variables FIRST
import './load-env'

import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useAuthStore } from '../stores/authStore'
import { AuthStorageService } from '../services/authStorageService'
import { Content } from '../typings'

const TEST_USER = {
    email: 'test@nettrailer.dev',
    password: 'TestPassword123!',
}

const testMovie: Content = {
    id: 550,
    title: 'Fight Club',
    media_type: 'movie',
    original_title: 'Fight Club',
    release_date: '1999-10-15',
    backdrop_path: '/path.jpg',
    genre_ids: [18],
    overview:
        'An insomniac office worker and a devil-may-care soapmaker form an underground fight club.',
    popularity: 100,
    poster_path: '/path.jpg',
    vote_average: 8.4,
    vote_count: 30000,
    adult: false,
    original_language: 'en',
    origin_country: ['US'],
}

const testMovie2: Content = {
    id: 27205,
    title: 'Inception',
    media_type: 'movie',
    original_title: 'Inception',
    release_date: '2010-07-16',
    backdrop_path: '/path2.jpg',
    genre_ids: [28, 878, 53],
    overview: 'A thief who steals corporate secrets through dream-sharing technology.',
    popularity: 150,
    poster_path: '/path2.jpg',
    vote_average: 8.8,
    vote_count: 35000,
    adult: false,
    original_language: 'en',
    origin_country: ['US'],
}

async function testUserWatchlist() {
    console.log('\n' + '█'.repeat(70))
    console.log('🧪 TESTING WATCHLIST OPERATIONS FOR TEST USER')
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
        console.log(`   Email: ${userCredential.user.email}`)

        // Step 2: Initialize auth store
        console.log('\n📝 Step 2: Initializing auth store...')
        const authStore = useAuthStore.getState()
        await authStore.syncWithFirebase(userId)
        console.log('✅ Auth store initialized')

        // Step 3: Check current data
        console.log('\n📝 Step 3: Checking current user data...')
        const currentData = await AuthStorageService.loadUserData(userId)
        console.log(`   Watchlist items: ${currentData.watchlist.length}`)
        console.log(`   Ratings: ${currentData.ratings.length}`)
        console.log(`   Custom lists: ${currentData.userLists.lists.length}`)

        // Step 4: Create a custom list
        console.log('\n📝 Step 4: Creating custom list...')
        const listId = await authStore.createList('My Test Watchlist 📺')
        console.log(`✅ List created with ID: ${listId}`)

        // Wait a moment for save to complete
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Step 5: Add movies to the list
        console.log('\n📝 Step 5: Adding movies to the list...')
        await authStore.addToList(listId, testMovie)
        console.log(`✅ Added: ${testMovie.title}`)

        await new Promise((resolve) => setTimeout(resolve, 1000))

        await authStore.addToList(listId, testMovie2)
        console.log(`✅ Added: ${testMovie2.title}`)

        // Wait for save to complete
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Step 6: Add to main watchlist
        console.log('\n📝 Step 6: Adding movie to main watchlist...')
        await authStore.addToWatchlist(testMovie)
        console.log(`✅ Added to watchlist: ${testMovie.title}`)

        // Wait for save
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Step 7: Add ratings
        console.log('\n📝 Step 7: Adding ratings...')
        await authStore.addRating(testMovie.id, 'liked', testMovie)
        console.log(`✅ Rated ${testMovie.title} as: liked`)

        await new Promise((resolve) => setTimeout(resolve, 1000))

        await authStore.addRating(testMovie2.id, 'liked', testMovie2)
        console.log(`✅ Rated ${testMovie2.title} as: liked`)

        // Wait for save
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Step 8: Verify data was saved to Firebase
        console.log('\n📝 Step 8: Verifying data in Firebase...')
        const verifyData = await AuthStorageService.loadUserData(userId)

        console.log('\n' + '='.repeat(70))
        console.log('📊 FIREBASE DATA VERIFICATION')
        console.log('='.repeat(70))

        console.log(`\n🔑 User ID: ${userId}`)
        console.log(`📧 Email: ${TEST_USER.email}`)

        console.log(`\n📋 Watchlist:`)
        console.log(`   Total items: ${verifyData.watchlist.length}`)
        verifyData.watchlist.forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.title || item.name} (ID: ${item.id})`)
        })

        console.log(`\n⭐ Ratings:`)
        console.log(`   Total ratings: ${verifyData.ratings.length}`)
        verifyData.ratings.forEach((rating, i) => {
            const title = rating.content?.title || rating.content?.name || 'Unknown'
            console.log(`   ${i + 1}. ${title}: ${rating.rating}`)
        })

        console.log(`\n📚 Lists:`)
        console.log(`   Total lists: ${verifyData.userLists.lists.length}`)
        verifyData.userLists.lists.forEach((list, i) => {
            const isDefault = Object.values(verifyData.userLists.defaultListIds).includes(list.id)
            const type = isDefault ? '(default)' : '(custom)'
            console.log(`   ${i + 1}. ${list.name} ${type}: ${list.items.length} items`)
            if (list.items.length > 0) {
                list.items.forEach((item, j) => {
                    console.log(`      - ${item.title || item.name}`)
                })
            }
        })

        // Step 9: Verify custom list
        console.log('\n📝 Step 9: Verifying custom list...')
        const customList = verifyData.userLists.lists.find((l) => l.id === listId)

        if (!customList) {
            throw new Error('❌ Custom list not found in Firebase!')
        }

        console.log('✅ Custom list found!')
        console.log(`   Name: ${customList.name}`)
        console.log(`   Items: ${customList.items.length}`)

        if (customList.items.length !== 2) {
            throw new Error(`❌ Expected 2 items, found ${customList.items.length}`)
        }

        console.log('✅ Custom list has correct number of items!')

        const hasMovie1 = customList.items.some((i) => i.id === testMovie.id)
        const hasMovie2 = customList.items.some((i) => i.id === testMovie2.id)

        if (!hasMovie1 || !hasMovie2) {
            throw new Error('❌ Movies not found in custom list!')
        }

        console.log('✅ Both movies found in custom list!')

        // Step 10: Verify watchlist
        console.log('\n📝 Step 10: Verifying main watchlist...')
        if (verifyData.watchlist.length === 0) {
            throw new Error('❌ Watchlist is empty!')
        }

        const inWatchlist = verifyData.watchlist.some((i) => i.id === testMovie.id)
        if (!inWatchlist) {
            throw new Error('❌ Movie not found in watchlist!')
        }

        console.log('✅ Movie found in watchlist!')

        // Step 11: Verify ratings
        console.log('\n📝 Step 11: Verifying ratings...')
        if (verifyData.ratings.length !== 2) {
            throw new Error(`❌ Expected 2 ratings, found ${verifyData.ratings.length}`)
        }

        console.log('✅ Both ratings saved!')

        // Final Summary
        console.log('\n' + '█'.repeat(70))
        console.log('🎉 ALL TESTS PASSED!')
        console.log('█'.repeat(70))

        console.log('\n✅ Verified:')
        console.log('   • User can sign in')
        console.log('   • Custom lists are created in Firebase')
        console.log('   • Movies are added to custom lists')
        console.log('   • Movies are added to main watchlist')
        console.log('   • Ratings are saved')
        console.log('   • All data persists to Firebase')
        console.log(`   • All data is associated with user: ${userId}`)

        console.log('\n🔗 View in Firebase Console:')
        console.log(
            '   Authentication: https://console.firebase.google.com/u/0/project/netflix-clone-15862/authentication/users'
        )
        console.log(
            `   Firestore: https://console.firebase.google.com/u/0/project/netflix-clone-15862/firestore/databases/-default-/data/~2Fusers~2F${userId}`
        )

        console.log('\n💾 Test user credentials (KEEP FOR TESTING):')
        console.log('   Email:    test@nettrailer.dev')
        console.log('   Password: TestPassword123!')
        console.log(`   User ID:  ${userId}`)

        return true
    } catch (error: any) {
        console.error('\n' + '█'.repeat(70))
        console.error('❌ TEST FAILED')
        console.error('█'.repeat(70))
        console.error(`\nError: ${error.message}`)
        console.error('\nStack:', error.stack)
        throw error
    }
}

// Run the test
testUserWatchlist()
    .then(() => {
        console.log('\n✅ Test completed successfully!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error.message)
        process.exit(1)
    })
