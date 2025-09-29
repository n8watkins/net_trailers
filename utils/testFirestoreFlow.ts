/**
 * Comprehensive test for Firestore data flow
 * This tests the entire save/load cycle to diagnose issues
 */

import { AuthStorageService } from '../services/authStorageService'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function testFirestoreFlow() {
    console.log('🧪 === STARTING COMPREHENSIVE FIRESTORE TEST ===')

    try {
        // Step 1: Check Firebase Auth
        console.log('\n📌 Step 1: Checking Firebase Auth...')
        const currentUser = auth.currentUser
        if (!currentUser) {
            console.error('❌ No authenticated user! Please log in first.')
            return false
        }
        console.log('✅ Authenticated as:', currentUser.email, 'UID:', currentUser.uid)

        // Step 2: Test direct Firestore write
        console.log('\n📌 Step 2: Testing direct Firestore write...')
        const testData = {
            testField: 'Direct write test',
            timestamp: Date.now(),
            testArray: ['item1', 'item2'],
            testObject: { nested: 'value' },
        }

        try {
            const { setDoc } = await import('firebase/firestore')
            await setDoc(doc(db, 'users', currentUser.uid), testData, { merge: true })
            console.log('✅ Direct Firestore write successful')
        } catch (error) {
            console.error('❌ Direct Firestore write failed:', error)
            return false
        }

        // Step 3: Test direct Firestore read
        console.log('\n📌 Step 3: Testing direct Firestore read...')
        try {
            const docRef = doc(db, 'users', currentUser.uid)
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
                const data = docSnap.data()
                console.log('✅ Direct Firestore read successful. Data:', data)

                if (data.testField === 'Direct write test') {
                    console.log('✅ Test data verified correctly')
                } else {
                    console.error('❌ Test data mismatch')
                }
            } else {
                console.error('❌ No document found for user')
            }
        } catch (error) {
            console.error('❌ Direct Firestore read failed:', error)
            return false
        }

        // Step 4: Test AuthStorageService save
        console.log('\n📌 Step 4: Testing AuthStorageService save...')
        const testPreferences = {
            watchlist: [
                { id: 1, title: 'Test Movie 1', media_type: 'movie' as const },
                { id: 2, title: 'Test Movie 2', media_type: 'movie' as const },
            ],
            ratings: [{ contentId: 1, rating: 'liked' as const, timestamp: Date.now() }],
            userLists: {
                lists: [{ id: 'test-list-1', name: 'Test List', items: [], emoji: '📋' }],
                defaultListIds: {
                    watchlist: 'default-watchlist',
                    liked: 'default-liked',
                    disliked: 'default-disliked',
                },
            },
            lastActive: Date.now(),
        }

        try {
            await AuthStorageService.saveUserData(currentUser.uid, testPreferences)
            console.log('✅ AuthStorageService save completed')
        } catch (error) {
            console.error('❌ AuthStorageService save failed:', error)
            return false
        }

        // Step 5: Test AuthStorageService load
        console.log('\n📌 Step 5: Testing AuthStorageService load...')
        try {
            const loadedData = await AuthStorageService.loadUserData(currentUser.uid)
            console.log('✅ AuthStorageService load successful. Data:', {
                watchlistCount: loadedData.watchlist?.length || 0,
                ratingsCount: loadedData.ratings?.length || 0,
                listsCount: loadedData.userLists?.lists?.length || 0,
                watchlistItems: loadedData.watchlist?.map((w) => ({ id: w.id, title: w.title })),
            })

            // Verify the data matches what we saved
            if (loadedData.watchlist?.length >= 2) {
                console.log('✅ Watchlist data persisted correctly')
            } else {
                console.error('❌ Watchlist data not found or incomplete')
            }
        } catch (error) {
            console.error('❌ AuthStorageService load failed:', error)
            return false
        }

        // Step 6: Test the auth store directly
        console.log('\n📌 Step 6: Testing auth store directly...')
        try {
            const { useAuthStore } = await import('../stores/authStore')
            const authStore = useAuthStore.getState()

            console.log('Current auth store state:', {
                userId: authStore.userId,
                watchlistCount: authStore.watchlist?.length || 0,
                syncStatus: authStore.syncStatus,
            })

            // Try to add to watchlist
            console.log('Attempting to add to watchlist...')
            await authStore.addToWatchlist({
                id: 999,
                title: 'Test Movie from Script',
                media_type: 'movie' as const,
                overview: 'Test movie added by test script',
                poster_path: '/test.jpg',
                backdrop_path: '/test-backdrop.jpg',
                vote_average: 8.5,
                vote_count: 100,
                popularity: 50,
                release_date: '2024-01-01',
                genre_ids: [28, 12],
                adult: false,
                original_language: 'en',
                original_title: 'Test Movie',
                video: false,
            })

            console.log('After adding, store state:', {
                watchlistCount: useAuthStore.getState().watchlist?.length || 0,
                syncStatus: useAuthStore.getState().syncStatus,
            })

            // Wait a bit for async save
            await new Promise((resolve) => setTimeout(resolve, 2000))

            // Check if it saved to Firestore
            const verifyDoc = await getDoc(doc(db, 'users', currentUser.uid))
            const verifyData = verifyDoc.data()
            const hasTestMovie = verifyData?.watchlist?.some((item: any) => item.id === 999)

            if (hasTestMovie) {
                console.log('✅ Test movie successfully saved to Firestore!')
            } else {
                console.error('❌ Test movie not found in Firestore')
                console.log('Firestore data:', verifyData)
            }
        } catch (error) {
            console.error('❌ Auth store test failed:', error)
            return false
        }

        console.log('\n✅ === ALL TESTS COMPLETED ===')
        return true
    } catch (error) {
        console.error('❌ Test failed with error:', error)
        return false
    }
}

// Function to run from console (only in browser)
if (typeof window !== 'undefined') {
    ;(window as any).testFirestore = testFirestoreFlow
}
