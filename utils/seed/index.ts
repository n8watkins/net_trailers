/**
 * Seed Utilities - Main Orchestrator
 *
 * Re-exports all seed functions and provides the main seedUserData orchestrator
 */

// Re-export individual seed functions
export { seedLikedContent, type SeedLikedOptions } from './seedLiked'
export { seedHiddenContent, type SeedHiddenOptions } from './seedHidden'
export { seedWatchLaterContent, type SeedWatchLaterOptions } from './seedWatchLater'
export { seedWatchHistoryContent, type SeedWatchHistoryOptions } from './seedWatchHistory'
export { seedCollections, type SeedCollectionsOptions } from './seedCollections'
export {
    seedNotifications,
    seedHistoricalTrending,
    type SeedNotificationsOptions,
} from './seedNotifications'
export { seedRankings, type SeedRankingsOptions } from './seedRankings'
export { seedForumThreads, seedForumPolls, type SeedForumOptions } from './seedForum'
export {
    seedDemoProfiles,
    getDemoProfileIds,
    type SeedDemoProfilesOptions,
    DEMO_PROFILES,
} from './seedProfiles'

// Re-export sample content
export { sampleMovies, sampleTVShows, getShuffledContent, getContentSlice } from './sampleContent'

/**
 * Options for seeding user data
 */
export interface SeedDataOptions {
    likedCount?: number
    hiddenCount?: number
    watchLaterCount?: number
    watchHistoryCount?: number
    createCollections?: boolean
    notificationCount?: number
    threadCount?: number
    pollCount?: number
}

/**
 * Main orchestrator - seeds all data for a user
 */
export async function seedUserData(userId: string, options: SeedDataOptions = {}): Promise<void> {
    const {
        likedCount = 10,
        hiddenCount = 5,
        watchLaterCount = 12,
        watchHistoryCount = 75,
        createCollections = true,
        notificationCount = 8,
        threadCount = 3,
        pollCount = 2,
    } = options

    // Import stores to determine session type
    const { useSessionStore } = await import('../../stores/sessionStore')
    const { useAuthStore } = await import('../../stores/authStore')
    const { useGuestStore } = await import('../../stores/guestStore')
    const { useProfileStore } = await import('../../stores/profileStore')

    const sessionType = useSessionStore.getState().sessionType
    const isGuestId = typeof userId === 'string' && userId.startsWith('guest_')
    const isGuest = isGuestId || sessionType === 'guest'

    // Ensure stores know which user we're seeding for
    if (isGuest) {
        const guestState = useGuestStore.getState()
        if (!guestState.guestId || guestState.guestId !== userId) {
            useGuestStore.setState({ guestId: userId })
            console.log('  📝 Set guestId in guestStore:', userId)
        }
    } else {
        const authState = useAuthStore.getState()
        if (!authState.userId || authState.userId !== userId) {
            useAuthStore.setState({ userId })
            console.log('  📝 Set userId in authStore:', userId)
        } else {
            console.log('  ✓ userId already set in authStore:', userId)
        }
    }

    console.log('🌱 Seeding data...', { userId, sessionType, isGuest })

    // Shuffle content ONCE to avoid duplicates across all seed operations
    const { getShuffledContent } = await import('./sampleContent')
    const shuffledContent = getShuffledContent()
    console.log('  🎲 Shuffled content pool:', shuffledContent.length, 'items')

    // Validate we have enough content for all requested seeds
    const totalNeeded = likedCount + hiddenCount + watchLaterCount + watchHistoryCount
    if (totalNeeded > shuffledContent.length) {
        console.warn(
            `  ⚠️ Warning: Requested ${totalNeeded} items but only ${shuffledContent.length} available in content pool.`
        )
        console.warn('  ⚠️ Some categories may receive fewer items than requested.')
    }

    // Track content indices to avoid duplicates
    let contentIndex = 0

    // 1. Seed liked content
    await seedLikedContent({
        userId,
        count: likedCount,
        isGuest,
        startIndex: contentIndex,
        shuffledContent,
    })
    contentIndex += likedCount

    // 2. Seed hidden content
    await seedHiddenContent({
        userId,
        count: hiddenCount,
        isGuest,
        startIndex: contentIndex,
        shuffledContent,
    })
    contentIndex += hiddenCount

    // 3. Seed watch later
    await seedWatchLaterContent({
        userId,
        count: watchLaterCount,
        isGuest,
        startIndex: contentIndex,
        shuffledContent,
    })
    contentIndex += watchLaterCount

    // 4. Seed watch history (use separate index to allow some overlap)
    await seedWatchHistoryContent({
        userId,
        count: watchHistoryCount,
        isGuest,
        startIndex: contentIndex,
        shuffledContent,
    })

    // 5. Seed collections
    if (createCollections) {
        await seedCollections({ userId, isGuest })
    }

    // 6. Seed notifications (auth users only)
    if (!isGuest && notificationCount > 0) {
        await seedNotifications({ userId, count: notificationCount })
    }

    // 7. Seed rankings (auth users only)
    if (!isGuest) {
        const profile = useProfileStore.getState().profile
        await seedRankings({
            userId,
            userName: profile?.displayName || 'User',
            userAvatar: profile?.avatarUrl,
        })
    } else {
        console.log('  ⏭️  Skipping rankings (guest mode)')
    }

    // 8. Seed forum content
    const profile = useProfileStore.getState().profile
    const userName = profile?.displayName || 'User'
    const userAvatar = profile?.avatarUrl

    await seedForumThreads({
        userId,
        userName,
        userAvatar,
        threadCount,
        pollCount: 0,
        isGuest,
    })

    await seedForumPolls({
        userId,
        userName,
        userAvatar,
        threadCount: 0,
        pollCount,
        isGuest,
    })

    // 9. Verify data was seeded (no sync needed - individual methods already saved to Firebase)
    if (!isGuest) {
        const state = useAuthStore.getState()
        console.log('  📊 Final state after seeding:', {
            userId: state.userId,
            likedCount: state.likedMovies.length,
            watchlistCount: state.defaultWatchlist.length,
            hiddenCount: state.hiddenMovies.length,
            collectionsCount: state.userCreatedWatchlists.length,
        })
        console.log('  💾 Data saved to Firebase (via individual store methods during seeding)')
    } else {
        const state = useGuestStore.getState()
        console.log('  📊 Final state after seeding:', {
            guestId: state.guestId,
            likedCount: state.likedMovies.length,
            watchlistCount: state.defaultWatchlist.length,
            hiddenCount: state.hiddenMovies.length,
            collectionsCount: state.userCreatedWatchlists.length,
        })
        console.log('  💾 Data saved to localStorage (via individual store methods during seeding)')
    }

    // Wait for saves to complete
    console.log('⏳ Waiting for saves to complete...')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log('✨ Seed data complete!')
}

/**
 * Clears all user data
 */
export async function clearUserData(): Promise<void> {
    const { useAuthStore } = await import('../../stores/authStore')
    const { useGuestStore } = await import('../../stores/guestStore')
    const { useSessionStore } = await import('../../stores/sessionStore')
    const { useWatchHistoryStore } = await import('../../stores/watchHistoryStore')
    const { useNotificationStore } = await import('../../stores/notificationStore')
    const { useForumStore } = await import('../../stores/forumStore')

    const sessionType = useSessionStore.getState().sessionType
    const isGuest = sessionType === 'guest'

    console.log('🧹 Clearing all user data...')

    if (isGuest) {
        const guestId = localStorage.getItem('nettrailer_guest_id')
        if (guestId) {
            // Use GuestStorageService to clear data while preserving session
            const { GuestStorageService } = await import('../../services/guestStorageService')
            const defaultPrefs = GuestStorageService.clearCurrentGuestData(guestId)
            console.log('  ✅ Cleared guest data from localStorage (v2 key)')

            // Update store with empty state
            useGuestStore.setState({
                likedMovies: [],
                hiddenMovies: [],
                defaultWatchlist: [],
                userCreatedWatchlists: [],
                myRatings: [],
            })

            // Clear watch history
            useWatchHistoryStore.getState().clearGuestSession(guestId)
            useWatchHistoryStore.getState().clearHistory()
            console.log('  ✅ Cleared watch history')

            // Clear notifications
            useNotificationStore.getState().clearNotifications()
            console.log('  ✅ Cleared notifications')

            // Clear forum data
            useForumStore.setState((state) => ({
                threads: state.threads.filter((thread) => thread.userId !== guestId),
                polls: state.polls.filter((poll) => poll.userId !== guestId),
            }))
            console.log('  ✅ Cleared forum threads and polls')
        }
    } else {
        // For authenticated users, persist changes to Firestore FIRST
        const userId = useAuthStore.getState().userId
        if (!userId) {
            console.error('  ❌ No userId found for authenticated user')
            return
        }

        // Persist to Firestore FIRST (so if it fails, local state isn't corrupted)
        const { auth, db } = await import('../../firebase')
        const { doc, setDoc } = await import('firebase/firestore')

        if (!auth.currentUser || auth.currentUser.uid !== userId) {
            console.error('  ❌ No authenticated user or UID mismatch')
            return
        }

        try {
            // Clear Firestore user document
            const userDocRef = doc(db, 'users', userId)
            await setDoc(
                userDocRef,
                {
                    defaultWatchlist: [],
                    likedMovies: [],
                    hiddenMovies: [],
                    userCreatedWatchlists: [],
                    myRatings: [],
                    lastActive: Date.now(),
                },
                { merge: true }
            )
            console.log('  ✅ Cleared user data from Firestore')

            // Clear watch history from Firestore
            const watchHistoryDocRef = doc(db, 'users', userId, 'data', 'watchHistory')
            await setDoc(
                watchHistoryDocRef,
                {
                    history: [],
                    updatedAt: Date.now(),
                },
                { merge: true }
            )
            console.log('  ✅ Cleared watch history from Firestore')
        } catch (error) {
            console.error('  ❌ Failed to clear Firestore data:', error)
            throw new Error('Failed to clear server data. Please try again.')
        }

        // THEN clear local state (after successful Firestore write)
        useAuthStore.setState({
            likedMovies: [],
            hiddenMovies: [],
            defaultWatchlist: [],
            userCreatedWatchlists: [],
            myRatings: [],
        })
        console.log('  ✅ Cleared local state')

        // Clear local watch history store
        useWatchHistoryStore.getState().clearHistory()
        useWatchHistoryStore.setState({
            currentSessionId: userId,
            lastSyncedAt: Date.now(),
            syncError: null,
        })
        console.log('  ✅ Cleared local watch history store')
    }

    console.log('✨ Data cleared!')
}

// Import individual functions for internal use
import { seedLikedContent } from './seedLiked'
import { seedHiddenContent } from './seedHidden'
import { seedWatchLaterContent } from './seedWatchLater'
import { seedWatchHistoryContent } from './seedWatchHistory'
import { seedCollections } from './seedCollections'
import { seedNotifications } from './seedNotifications'
import { seedRankings } from './seedRankings'
import { seedForumThreads, seedForumPolls } from './seedForum'
