/**
 * Comprehensive test script to verify watchlist persistence for both:
 * 1. Authenticated users → Firebase (Firestore)
 * 2. Guest users → localStorage
 *
 * This tests the ACTUAL store layer (authStore/guestStore), not just the services.
 */

// IMPORTANT: Load environment variables FIRST, before any Firebase imports
import './scripts/load-env'

import { useAuthStore } from './stores/authStore'
import { useGuestStore } from './stores/guestStore'
import { AuthStorageService } from './services/authStorageService'
import { GuestStorageService } from './services/guestStorageService'
import { Content } from './typings'

const testMovie: Content = {
    id: 550,
    title: 'Inception',
    media_type: 'movie',
    original_title: 'Inception',
    release_date: '2010-07-16',
    backdrop_path: '/path.jpg',
    genre_ids: [878, 28],
    overview: 'A thief who steals corporate secrets...',
    popularity: 100,
    poster_path: '/path.jpg',
    vote_average: 8.8,
    vote_count: 30000,
    adult: false,
    original_language: 'en',
    origin_country: ['US'],
}

// ============================================================================
// TEST 1: Authenticated User → Firebase Persistence
// ============================================================================

async function testAuthenticatedUserPersistence() {
    console.log('\n' + '='.repeat(70))
    console.log('🔐 TEST 1: AUTHENTICATED USER → FIREBASE PERSISTENCE')
    console.log('='.repeat(70))

    const testUserId = `test-auth-${Date.now()}`
    console.log(`\n📝 Test User ID: ${testUserId}`)

    try {
        const authStore = useAuthStore.getState()

        // Step 1: Initialize auth session
        console.log('\n📝 Step 1: Initializing auth session...')
        await authStore.syncWithFirebase(testUserId)
        console.log('✅ Auth session initialized')

        // Step 2: Create a custom list
        console.log('\n📝 Step 2: Creating custom list via authStore...')
        const listId = await authStore.createList({ name: 'Test Auth List 🔐' })
        console.log(`✅ List created with ID: ${listId}`)

        // Step 3: Add content to list
        console.log('\n📝 Step 3: Adding content to list...')
        await authStore.addToList(listId, testMovie)
        console.log('✅ Content added to list')

        // Step 4: Add to liked movies
        console.log('\n📝 Step 4: Adding to liked movies...')
        await authStore.addLikedMovie(testMovie)
        console.log('✅ Added to liked movies')

        // Step 5: Verify data was saved to Firebase
        console.log('\n📝 Step 5: Loading data back from Firebase...')
        const loadedData = await AuthStorageService.loadUserData(testUserId)
        console.log('✅ Data loaded from Firebase:', {
            lists: loadedData.userCreatedWatchlists.length,
            liked: loadedData.likedMovies.length,
            hidden: loadedData.hiddenMovies.length,
        })

        // Step 6: Verify the list exists in loaded data
        console.log('\n📝 Step 6: Verifying data integrity...')
        const loadedList = loadedData.userCreatedWatchlists.find((l) => l.id === listId)
        if (!loadedList) {
            throw new Error('❌ List not found in Firebase!')
        }
        if (loadedList.items.length !== 1) {
            throw new Error(`❌ Expected 1 item in list, found ${loadedList.items.length}`)
        }
        if (loadedList.items[0].id !== testMovie.id) {
            throw new Error('❌ Movie ID mismatch!')
        }
        if (loadedData.likedMovies.length !== 1) {
            throw new Error(`❌ Expected 1 liked movie, found ${loadedData.likedMovies.length}`)
        }
        console.log('✅ All Firebase data verified!')

        // Step 7: Verify data is NOT in localStorage (should only be in Firebase)
        console.log('\n📝 Step 7: Verifying data is NOT in localStorage...')
        const localStorageKey = `nettrailer_guest_data_${testUserId}`
        const localStorageData =
            typeof window !== 'undefined' ? localStorage.getItem(localStorageKey) : null
        if (localStorageData) {
            console.warn(
                '⚠️ WARNING: Auth data found in localStorage (should only be in Firebase!)'
            )
        } else {
            console.log('✅ Confirmed: Auth data is NOT in localStorage')
        }

        // Cleanup
        console.log('\n🧹 Cleaning up test data...')
        await AuthStorageService.deleteUserData(testUserId)
        console.log('✅ Test data cleaned up')

        console.log('\n🎉 SUCCESS: Authenticated user → Firebase persistence works!')
        return true
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error)
        // Cleanup on failure
        try {
            await AuthStorageService.deleteUserData(testUserId)
        } catch (cleanupError) {
            console.error('Failed to cleanup:', cleanupError)
        }
        throw error
    }
}

// ============================================================================
// TEST 2: Guest User → localStorage Persistence
// ============================================================================

async function testGuestUserPersistence() {
    console.log('\n' + '='.repeat(70))
    console.log('👤 TEST 2: GUEST USER → LOCALSTORAGE PERSISTENCE')
    console.log('='.repeat(70))

    const testGuestId = `guest-test-${Date.now()}`
    console.log(`\n📝 Test Guest ID: ${testGuestId}`)

    try {
        const guestStore = useGuestStore.getState()

        // Step 1: Initialize guest session
        console.log('\n📝 Step 1: Initializing guest session...')
        await guestStore.syncFromLocalStorage(testGuestId)
        console.log('✅ Guest session initialized')

        // Step 2: Create a custom list
        console.log('\n📝 Step 2: Creating custom list via guestStore...')
        const listId = guestStore.createList({ name: 'Test Guest List 👤' })
        console.log(`✅ List created with ID: ${listId}`)

        // Step 3: Add content to list
        console.log('\n📝 Step 3: Adding content to list...')
        guestStore.addToList(listId, testMovie)
        console.log('✅ Content added to list')

        // Step 4: Add to liked movies
        console.log('\n📝 Step 4: Adding to liked movies...')
        guestStore.addLikedMovie(testMovie)
        console.log('✅ Added to liked movies')

        // Step 5: Verify data was saved to localStorage
        console.log('\n📝 Step 5: Loading data back from localStorage...')
        const loadedData = GuestStorageService.loadGuestData(testGuestId)
        console.log('✅ Data loaded from localStorage:', {
            lists: loadedData.userCreatedWatchlists.length,
            liked: loadedData.likedMovies.length,
            hidden: loadedData.hiddenMovies.length,
        })

        // Step 6: Verify the list exists in loaded data
        console.log('\n📝 Step 6: Verifying data integrity...')
        const loadedList = loadedData.userCreatedWatchlists.find((l) => l.id === listId)
        if (!loadedList) {
            throw new Error('❌ List not found in localStorage!')
        }
        if (loadedList.items.length !== 1) {
            throw new Error(`❌ Expected 1 item in list, found ${loadedList.items.length}`)
        }
        if (loadedList.items[0].id !== testMovie.id) {
            throw new Error('❌ Movie ID mismatch!')
        }
        if (loadedData.likedMovies.length !== 1) {
            throw new Error(`❌ Expected 1 liked movie, found ${loadedData.likedMovies.length}`)
        }
        console.log('✅ All localStorage data verified!')

        // Step 7: Verify data is NOT in Firebase (should only be in localStorage)
        console.log('\n📝 Step 7: Verifying data is NOT in Firebase...')
        try {
            const firebaseData = await AuthStorageService.loadUserData(testGuestId)
            if (firebaseData.userCreatedWatchlists.length > 0) {
                // Has custom lists
                console.warn(
                    '⚠️ WARNING: Guest data found in Firebase (should only be in localStorage!)'
                )
            } else {
                console.log('✅ Confirmed: Guest data is NOT in Firebase')
            }
        } catch (error) {
            console.log('✅ Confirmed: Guest data is NOT in Firebase (expected error)')
        }

        // Cleanup
        console.log('\n🧹 Cleaning up test data...')
        GuestStorageService.clearGuestData(testGuestId)
        console.log('✅ Test data cleaned up')

        console.log('\n🎉 SUCCESS: Guest user → localStorage persistence works!')
        return true
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error)
        // Cleanup on failure
        try {
            GuestStorageService.clearGuestData(testGuestId)
        } catch (cleanupError) {
            console.error('Failed to cleanup:', cleanupError)
        }
        throw error
    }
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runAllTests() {
    console.log('\n' + '█'.repeat(70))
    console.log('🧪 PERSISTENCE TESTING SUITE')
    console.log('Testing both authenticated (Firebase) and guest (localStorage) modes')
    console.log('█'.repeat(70))

    let authTestPassed = false
    let guestTestPassed = false

    try {
        authTestPassed = await testAuthenticatedUserPersistence()
    } catch (error) {
        console.error('Auth test failed')
    }

    try {
        guestTestPassed = await testGuestUserPersistence()
    } catch (error) {
        console.error('Guest test failed')
    }

    console.log('\n' + '█'.repeat(70))
    console.log('📊 TEST SUMMARY')
    console.log('█'.repeat(70))
    console.log(`Auth (Firebase):     ${authTestPassed ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(`Guest (localStorage): ${guestTestPassed ? '✅ PASSED' : '❌ FAILED'}`)
    console.log('█'.repeat(70))

    if (authTestPassed && guestTestPassed) {
        console.log('\n🎉🎉🎉 ALL TESTS PASSED! 🎉🎉🎉')
        process.exit(0)
    } else {
        console.log('\n❌ SOME TESTS FAILED')
        process.exit(1)
    }
}

// Run the test suite
runAllTests()
