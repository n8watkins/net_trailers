/**
 * Recommendation Feedback Tracking Hook
 * Phase 2: Feedback Loop Integration
 *
 * Provides utilities for tracking user interactions with recommended content.
 * Logs feedback to the API for learning and improvement of recommendations.
 */

'use client'

import { useCallback, useRef } from 'react'
import { auth } from '../firebase'
import { FeedbackAction } from '../types/recommendations'

interface FeedbackParams {
    contentId: number
    mediaType: 'movie' | 'tv'
    page: number
}

/**
 * Hook for tracking recommendation feedback
 * Provides fire-and-forget feedback logging with client-side debouncing
 */
export function useRecommendationFeedback() {
    // Track recent feedback to prevent duplicates (60-second window)
    const recentFeedback = useRef<Map<string, number>>(new Map())

    /**
     * Log feedback to API (fire-and-forget)
     * Includes client-side deduplication to prevent spamming
     */
    const logFeedback = useCallback(
        async (action: FeedbackAction, params: FeedbackParams): Promise<void> => {
            const { contentId, mediaType, page } = params

            // Generate deduplication key
            const dedupKey = `${contentId}-${mediaType}-${action}`
            const now = Date.now()

            // Check for recent duplicate (last 60 seconds)
            const lastSent = recentFeedback.current.get(dedupKey)
            if (lastSent && now - lastSent < 60000) {
                console.log(
                    `[Feedback] Skipping duplicate ${action} for ${contentId} (sent ${Math.floor((now - lastSent) / 1000)}s ago)`
                )
                return
            }

            // Update recent feedback map
            recentFeedback.current.set(dedupKey, now)

            // Clean up old entries (>60s) every 10 entries to prevent memory leak
            if (recentFeedback.current.size > 10) {
                for (const [key, timestamp] of recentFeedback.current.entries()) {
                    if (now - timestamp > 60000) {
                        recentFeedback.current.delete(key)
                    }
                }
            }

            try {
                // Get Firebase ID token for authentication
                const currentUser = auth.currentUser
                if (!currentUser) {
                    console.warn('[Feedback] No authenticated user, skipping feedback')
                    return
                }

                const idToken = await currentUser.getIdToken()

                // Fire-and-forget API call (don't await or handle errors)
                fetch('/api/recommendations/feedback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        contentId,
                        mediaType,
                        action,
                        page,
                    }),
                })
                    .then((response) => {
                        if (!response.ok) {
                            console.warn(
                                `[Feedback] API returned ${response.status} for ${action} on ${contentId}`
                            )
                        }
                    })
                    .catch((error) => {
                        console.warn('[Feedback] Failed to log feedback:', error)
                    })
            } catch (error) {
                console.warn('[Feedback] Error logging feedback:', error)
            }
        },
        []
    )

    /**
     * Track when content is viewed (visible for >3 seconds)
     * Use IntersectionObserver in component to detect visibility duration
     */
    const trackViewed = useCallback(
        (params: FeedbackParams) => {
            logFeedback('viewed', params)
        },
        [logFeedback]
    )

    /**
     * Track when content is dismissed (user explicitly dismissed)
     * Call when user clicks dismiss/close button
     */
    const trackDismissed = useCallback(
        (params: FeedbackParams) => {
            logFeedback('dismissed', params)
        },
        [logFeedback]
    )

    /**
     * Track when content is hidden (added to hidden list)
     * Call when user hides content via menu
     */
    const trackHidden = useCallback(
        (params: FeedbackParams) => {
            logFeedback('hidden', params)
        },
        [logFeedback]
    )

    /**
     * Track when content is liked
     * Call when user adds to liked movies/shows
     */
    const trackLiked = useCallback(
        (params: FeedbackParams) => {
            logFeedback('liked', params)
        },
        [logFeedback]
    )

    /**
     * Track when content is added to watchlist
     * Call when user adds to watchlist
     */
    const trackWatchlisted = useCallback(
        (params: FeedbackParams) => {
            logFeedback('watchlisted', params)
        },
        [logFeedback]
    )

    /**
     * Track when content is scrolled past without interaction
     * Call from IntersectionObserver when content exits viewport without action
     */
    const trackScrolledPast = useCallback(
        (params: FeedbackParams) => {
            logFeedback('scrolled_past', params)
        },
        [logFeedback]
    )

    return {
        trackViewed,
        trackDismissed,
        trackHidden,
        trackLiked,
        trackWatchlisted,
        trackScrolledPast,
    }
}
