/**
 * Node.js script to test Firestore functionality directly
 * Run with: node scripts/test-firestore.js
 */

require('dotenv').config({ path: '.env.local' })

// Use client SDK
const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore')

// Firebase config from environment
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

console.log('🔧 Firebase Config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey,
})

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Test user credentials (you'll need to provide these)
const TEST_EMAIL = 'nathancwatkins23@gmail.com' // Replace with your test user
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || '' // Set in env or provide here

async function runFirestoreTest() {
    console.log('\n🧪 === STARTING FIRESTORE TEST ===\n')

    try {
        // Step 1: Authenticate
        if (!TEST_PASSWORD) {
            console.log('⚠️  No password provided. Using anonymous test...')
            // For now, we'll test without auth
        } else {
            console.log('🔐 Attempting to sign in...')
            const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
            console.log('✅ Signed in as:', userCredential.user.email)
        }

        const testUserId = 'BHhkBGx80DRfGaAzn7RVM4dqRgP2' // Your user ID from the screenshot

        // Step 2: Create test data
        console.log('\n📝 Creating test data...')
        const testData = {
            watchlist: [
                {
                    id: 550,
                    title: 'Fight Club',
                    media_type: 'movie',
                    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
                    overview: 'A ticking-time-bomb insomniac and a slippery soap salesman...',
                    release_date: '1999-10-15',
                    vote_average: 8.4,
                },
                {
                    id: 155,
                    title: 'The Dark Knight',
                    media_type: 'movie',
                    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
                    overview: 'Batman raises the stakes in his war on crime...',
                    release_date: '2008-07-18',
                    vote_average: 8.5,
                },
                {
                    id: 27205,
                    title: 'Inception',
                    media_type: 'movie',
                    poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
                    overview:
                        'A skilled thief is offered a chance to have his criminal history erased...',
                    release_date: '2010-07-16',
                    vote_average: 8.4,
                },
            ],
            ratings: [
                {
                    contentId: 550,
                    rating: 'liked',
                    timestamp: Date.now(),
                },
            ],
            userLists: {
                lists: [
                    {
                        id: 'favorites-2024',
                        name: 'My 2024 Favorites',
                        emoji: '⭐',
                        items: [
                            {
                                id: 550,
                                title: 'Fight Club',
                                media_type: 'movie',
                            },
                        ],
                    },
                    {
                        id: 'action-movies',
                        name: 'Best Action Movies',
                        emoji: '💥',
                        items: [
                            {
                                id: 155,
                                title: 'The Dark Knight',
                                media_type: 'movie',
                            },
                        ],
                    },
                ],
                defaultListIds: {
                    watchlist: 'default-watchlist',
                    liked: 'default-liked',
                    disliked: 'default-disliked',
                },
            },
            lastActive: Date.now(),
            testField: 'Test from Node.js script',
            testTimestamp: new Date().toISOString(),
        }

        // Step 3: Save to Firestore
        console.log('💾 Saving to Firestore...')
        const userDocRef = doc(db, 'users', testUserId)

        await setDoc(userDocRef, testData, { merge: true })
        console.log('✅ Data saved successfully!')

        // Step 4: Read back from Firestore
        console.log('\n📖 Reading back from Firestore...')
        const docSnap = await getDoc(userDocRef)

        if (docSnap.exists()) {
            const data = docSnap.data()
            console.log('✅ Document retrieved successfully!')

            console.log('\n📊 Data Summary:')
            console.log('- Watchlist items:', data.watchlist?.length || 0)
            console.log('- Ratings:', data.ratings?.length || 0)
            console.log('- Custom lists:', data.userLists?.lists?.length || 0)
            console.log('- Test field:', data.testField)

            if (data.watchlist && data.watchlist.length > 0) {
                console.log('\n🎬 Watchlist Contents:')
                data.watchlist.forEach((item, index) => {
                    console.log(`  ${index + 1}. ${item.title} (ID: ${item.id})`)
                })
            }

            if (data.userLists?.lists && data.userLists.lists.length > 0) {
                console.log('\n📋 Custom Lists:')
                data.userLists.lists.forEach((list) => {
                    console.log(`  - ${list.emoji} ${list.name} (${list.items?.length || 0} items)`)
                })
            }

            // Step 5: Verify specific items
            console.log('\n✅ Verification:')
            const hasFightClub = data.watchlist?.some((item) => item.id === 550)
            const hasCustomLists = data.userLists?.lists?.length > 0

            console.log(`- Fight Club in watchlist: ${hasFightClub ? '✅' : '❌'}`)
            console.log(`- Has custom lists: ${hasCustomLists ? '✅' : '❌'}`)
            console.log(`- Test field present: ${data.testField ? '✅' : '❌'}`)

            if (hasFightClub && hasCustomLists && data.testField) {
                console.log('\n🎉 ALL TESTS PASSED! Data is saving correctly to Firestore.')
            } else {
                console.log('\n⚠️ Some data might be missing. Check the details above.')
            }
        } else {
            console.error('❌ No document found!')
        }

        // Step 6: Test direct collection access
        console.log('\n🔍 Direct collection path test...')
        console.log(`Path: users/${testUserId}`)
        console.log(`Project ID: ${firebaseConfig.projectId}`)
    } catch (error) {
        console.error('\n❌ Test failed:', error.message)
        console.error('Error details:', error)
    }

    console.log('\n=== TEST COMPLETE ===\n')
    process.exit(0)
}

// Run the test
runFirestoreTest().catch(console.error)
