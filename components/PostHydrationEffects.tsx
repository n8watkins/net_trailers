import { useEffect } from 'react'
import { startTransition } from 'react'
import { useAppStoreHydrated } from '../hooks/useAppStoreHydrated'
import { useSearchStore } from '../stores/searchStore'
import { useSessionData } from '../hooks/useSessionData'
import { useRouter } from 'next/router'
import { useHydrationDebug } from '../utils/hydrationDebug'

/**
 * PostHydrationEffects component handles all client-side state synchronization
 * that needs to happen AFTER hydration is complete. This prevents the
 * "Suspense boundary received an update before it finished hydrating" error.
 *
 * Place this component at the bottom of your page components to ensure
 * it runs after all Suspense boundaries have finished hydrating.
 */
export default function PostHydrationEffects() {
    const debug = useHydrationDebug('PostHydrationEffects')
    const store = useAppStoreHydrated()
    const searchStore = useSearchStore()
    const session = useSessionData()
    const router = useRouter()

    useEffect(() => {
        debug.logEffect('Scheduling post-hydration effects')

        // Defer all state updates by one tick to ensure hydration completes
        const timeoutId = setTimeout(() => {
            debug.logEffect('Running post-hydration effects')

            startTransition(() => {
                // Sync localStorage data if available
                if (typeof window !== 'undefined' && window.localStorage) {
                    try {
                        // Sync search history
                        const savedSearchHistory = localStorage.getItem('searchHistory')
                        if (savedSearchHistory) {
                            const history = JSON.parse(savedSearchHistory)
                            if (Array.isArray(history) && history.length > 0) {
                                debug.logEffect({
                                    action: 'Restoring search history',
                                    count: history.length,
                                })
                                // Restore to searchStore
                                searchStore.setSearch((prev) => ({
                                    ...prev,
                                    history: history.slice(0, 10),
                                    recentSearches: history.slice(0, 5),
                                }))
                            }
                        }

                        // Sync user preferences
                        const savedPreferences = localStorage.getItem('userPreferences')
                        if (savedPreferences) {
                            const preferences = JSON.parse(savedPreferences)
                            debug.logEffect({ action: 'Restoring user preferences', preferences })
                            // Apply preferences if methods exist
                            if (
                                preferences.showDemoMessage !== undefined &&
                                store.setShowDemoMessage
                            ) {
                                store.setShowDemoMessage(preferences.showDemoMessage)
                            }
                        }
                    } catch (error) {
                        debug.logEffect({ action: 'Error syncing localStorage', error })
                    }
                }

                // Handle any route-based state updates
                if (router.isReady) {
                    const { query } = router

                    // Restore search query from URL
                    if (query.q && typeof query.q === 'string') {
                        debug.logEffect({
                            action: 'Restoring search query from URL',
                            query: query.q,
                        })
                        searchStore.setSearchQuery(query.q)
                    }

                    // Handle auth redirects if needed
                    if (query.redirect && typeof query.redirect === 'string') {
                        debug.logEffect({ action: 'Processing redirect', redirect: query.redirect })
                        // Only redirect if user is authenticated
                        if (session.sessionType === 'authenticated') {
                            router.replace(query.redirect as string)
                        }
                    }
                }

                // Mark content as successfully loaded
                if (store.setContentLoadedSuccessfully) {
                    store.setContentLoadedSuccessfully(true)
                }
            })
        }, 0) // Use 0ms timeout to defer to next tick

        return () => {
            clearTimeout(timeoutId)
        }
    }, []) // Empty dependency array - run only once on mount

    // This component doesn't render anything
    return null
}
