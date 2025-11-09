/**
 * useInteractionTracking Hook
 * Phase 7.1 - Simplified API for logging user interactions
 */

import { useCallback } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { logInteraction, createInteractionFromContent } from '@/utils/firestore/interactions'
import type { Content } from '@/types/content'
import type { InteractionType, InteractionSource } from '@/types/interactions'

/**
 * Hook for tracking user interactions
 *
 * Usage:
 * const { trackInteraction } = useInteractionTracking()
 * trackInteraction.viewModal(content)
 * trackInteraction.playTrailer(content, 45)
 */
export function useInteractionTracking() {
    const getUserId = useSessionStore((state) => state.getUserId)
    const getImproveRecommendations = useSessionStore((state) => {
        const sessionType = state.sessionType
        if (sessionType === 'authenticated') {
            return state.authStore?.improveRecommendations ?? true
        } else if (sessionType === 'guest') {
            return state.guestStore?.improveRecommendations ?? true
        }
        return true
    })

    /**
     * Generic track function
     */
    const track = useCallback(
        async (
            content: Content,
            interactionType: InteractionType,
            options?: {
                trailerDuration?: number
                searchQuery?: string
                collectionId?: string
                source?: InteractionSource
            }
        ): Promise<void> => {
            const userId = getUserId()

            // Skip tracking for guests (optional - could be enabled for analytics)
            if (!userId) {
                console.log('[Tracking] Skipping interaction (no user ID)')
                return
            }

            // Skip tracking if user has disabled recommendation improvements
            const improveRecommendations = getImproveRecommendations()
            if (!improveRecommendations) {
                console.log(
                    '[Tracking] Skipping interaction (user disabled recommendation improvements)'
                )
                return
            }

            try {
                const interaction = createInteractionFromContent(content, interactionType, options)

                await logInteraction(userId, interaction)

                console.log(`[Tracking] Logged ${interactionType} for content ${content.id}`)
            } catch (error) {
                // Fail silently - don't disrupt user experience
                console.error('[Tracking] Failed to log interaction:', error)
            }
        },
        [getUserId, getImproveRecommendations]
    )

    /**
     * Track modal view
     */
    const viewModal = useCallback(
        (content: Content, source?: InteractionSource) => {
            return track(content, 'view_modal', { source })
        },
        [track]
    )

    /**
     * Track adding to watchlist
     */
    const addToWatchlist = useCallback(
        (content: Content, source?: InteractionSource) => {
            return track(content, 'add_to_watchlist', { source })
        },
        [track]
    )

    /**
     * Track removing from watchlist
     */
    const removeFromWatchlist = useCallback(
        (content: Content, source?: InteractionSource) => {
            return track(content, 'remove_from_watchlist', { source })
        },
        [track]
    )

    /**
     * Track liking content
     */
    const like = useCallback(
        (content: Content, source?: InteractionSource) => {
            return track(content, 'like', { source })
        },
        [track]
    )

    /**
     * Track unliking content
     */
    const unlike = useCallback(
        (content: Content, source?: InteractionSource) => {
            return track(content, 'unlike', { source })
        },
        [track]
    )

    /**
     * Track playing trailer
     */
    const playTrailer = useCallback(
        (content: Content, duration?: number, source?: InteractionSource) => {
            return track(content, 'play_trailer', {
                trailerDuration: duration,
                source,
            })
        },
        [track]
    )

    /**
     * Track hiding content
     */
    const hideContent = useCallback(
        (content: Content, source?: InteractionSource) => {
            return track(content, 'hide_content', { source })
        },
        [track]
    )

    /**
     * Track unhiding content
     */
    const unhideContent = useCallback(
        (content: Content, source?: InteractionSource) => {
            return track(content, 'unhide_content', { source })
        },
        [track]
    )

    /**
     * Track search interaction
     */
    const search = useCallback(
        (content: Content, searchQuery: string, source?: InteractionSource) => {
            return track(content, 'search', { searchQuery, source })
        },
        [track]
    )

    /**
     * Track voice search interaction
     */
    const voiceSearch = useCallback(
        (content: Content, searchQuery: string, source?: InteractionSource) => {
            return track(content, 'voice_search', { searchQuery, source })
        },
        [track]
    )

    return {
        // Individual tracking functions
        viewModal,
        addToWatchlist,
        removeFromWatchlist,
        like,
        unlike,
        playTrailer,
        hideContent,
        unhideContent,
        search,
        voiceSearch,

        // Generic track function for custom use
        track,
    }
}

/**
 * Helper hook to determine interaction source based on current route
 *
 * Usage:
 * const source = useInteractionSource()
 * trackInteraction.viewModal(content, source)
 */
export function useInteractionSource(): InteractionSource {
    // TODO: Implement with usePathname() from next/navigation
    // For now, return 'modal' as default
    return 'modal'

    // Future implementation:
    /*
    const pathname = usePathname()

    if (pathname === '/') return 'home'
    if (pathname.startsWith('/search')) return 'search'
    if (pathname.startsWith('/rows')) return 'collection'
    if (pathname.startsWith('/watchlist')) return 'watchlist'

    return 'modal'
    */
}
