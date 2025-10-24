/**
 * Test script to verify watchlist create and retrieve flow
 *
 * Flow:
 * 1. Create a new custom list using UserListsService
 * 2. Save the updated preferences to Firebase using AuthStorageService
 * 3. Load the data back from Firebase
 * 4. Verify the list was persisted correctly
 */

import { UserListsService } from './services/userListsService'
import { AuthStorageService } from './services/authStorageService'
import { AuthPreferences } from './atoms/authSessionAtom'
import { Content } from './typings'

const testUserId = 'test-user-watchlist-flow-' + Date.now()

async function testWatchlistFlow() {
    console.log('🧪 Testing Watchlist Create → Save → Retrieve Flow')
    console.log('═'.repeat(60))

    try {
        // Step 1: Initialize default preferences
        console.log('\n📝 Step 1: Creating default preferences...')
        let preferences: AuthPreferences = {
            defaultWatchlist: [],
            likedMovies: [],
            hiddenMovies: [],
            userCreatedWatchlists: [],
            lastActive: Date.now(),
        }
        console.log('✅ Default preferences created:', {
            watchlistCount: 0,
            likedCount: 0,
            hiddenCount: 0,
            customListsCount: 0,
        })

        // Step 2: Create a custom list
        console.log('\n📝 Step 2: Creating a custom list...')
        preferences = UserListsService.createList(preferences, {
            name: 'My Sci-Fi Favorites',
            isPublic: false,
            color: '#3b82f6', // blue-500
            emoji: '🚀',
        })
        console.log('✅ Custom list created:', {
            totalLists: preferences.userCreatedWatchlists.length,
            customLists: preferences.userCreatedWatchlists.map((l) => ({
                name: l.name,
                emoji: l.emoji,
                itemCount: l.items.length,
            })),
        })

        // Step 3: Add content to the custom list
        console.log('\n📝 Step 3: Adding content to the custom list...')
        const sciFiList = preferences.userCreatedWatchlists[0]
        const testMovie: Content = {
            id: 550, // Fight Club
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

        preferences = UserListsService.addToList(preferences, {
            listId: sciFiList.id,
            content: testMovie,
        })
        console.log('✅ Content added to list:', {
            listName: sciFiList.name,
            itemCount: UserListsService.getList(preferences, sciFiList.id)?.items.length,
        })

        // Step 4: Save to Firebase
        console.log('\n📝 Step 4: Saving preferences to Firebase...')
        await AuthStorageService.saveUserData(testUserId, preferences)
        console.log('✅ Data saved to Firestore at path:', `users/${testUserId}`)

        // Step 5: Clear local cache to force fresh load
        console.log('\n📝 Step 5: Clearing cache and loading from Firebase...')

        // Step 6: Load back from Firebase
        const loadedPreferences = await AuthStorageService.loadUserData(testUserId)
        console.log('✅ Data loaded from Firebase:', {
            totalLists: loadedPreferences.userCreatedWatchlists.length,
            customLists: loadedPreferences.userCreatedWatchlists.map((l) => ({
                name: l.name,
                emoji: l.emoji,
                itemCount: l.items.length,
            })),
        })

        // Step 7: Verify the data
        console.log('\n📝 Step 7: Verifying data integrity...')
        const loadedCustomLists = loadedPreferences.userCreatedWatchlists
        const loadedSciFiList = loadedCustomLists.find((l) => l.name === 'My Sci-Fi Favorites')

        if (!loadedSciFiList) {
            throw new Error('❌ Custom list not found after reload!')
        }

        if (loadedSciFiList.items.length !== 1) {
            throw new Error(`❌ Expected 1 item in list, found ${loadedSciFiList.items.length}`)
        }

        if (loadedSciFiList.items[0].id !== testMovie.id) {
            throw new Error('❌ Movie ID mismatch!')
        }

        console.log('✅ All verifications passed!')
        console.log('\n🎉 SUCCESS: Create → Save → Retrieve flow works correctly!')

        // Step 8: Get overview
        console.log('\n📊 Final data overview:')
        const overview = await AuthStorageService.getUserDataOverview(testUserId)
        console.log(overview)

        // Step 9: Cleanup
        console.log('\n🧹 Cleaning up test data...')
        await AuthStorageService.deleteUserData(testUserId)
        console.log('✅ Test data cleaned up')
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error)
        // Cleanup even on failure
        try {
            await AuthStorageService.deleteUserData(testUserId)
        } catch (cleanupError) {
            console.error('Failed to cleanup test data:', cleanupError)
        }
        throw error
    }
}

// Run the test
testWatchlistFlow()
    .then(() => {
        console.log('\n✅ Test completed successfully!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error)
        process.exit(1)
    })
