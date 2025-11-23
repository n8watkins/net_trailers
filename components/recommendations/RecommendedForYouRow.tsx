/**
 * Recommended For You Row
 *
 * Displays personalized recommendations based on user's preferences.
 * Uses the standard Row component to match the styling of other collections.
 */

'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Content } from '../../typings'
import { Recommendation } from '../../types/recommendations'
import Row from '../content/Row'
import { useSessionData } from '../../hooks/useSessionData'
import { useSessionStore } from '../../stores/sessionStore'
import { auth } from '../../firebase'
import RecommendationInsightsModal from './RecommendationInsightsModal'
import PreferenceCustomizerModal, {
    GenrePreference,
    ContentPreference,
    ShownPreferenceContent,
} from './PreferenceCustomizerModal'

export default function RecommendedForYouRow() {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showInsightsModal, setShowInsightsModal] = useState(false)
    const [showCustomizerModal, setShowCustomizerModal] = useState(false)

    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const userId = getUserId()
    const sessionData = useSessionData()

    // Check if recommendations are enabled in user preferences
    const showRecommendations = sessionData.showRecommendations ?? true

    // Get existing preferences from session
    const genrePreferences = sessionData.genrePreferences || []
    const contentPreferences = sessionData.contentPreferences || []
    const shownPreferenceContent = sessionData.shownPreferenceContent || []

    // Track preferences signature for re-fetching recommendations
    const prefsSignature = useMemo(
        () =>
            [
                ...genrePreferences.map((p) => `g:${p.genreId}:${p.preference}`),
                ...contentPreferences.map((p) => `c:${p.contentId}:${p.preference}`),
            ]
                .sort()
                .join(','),
        [genrePreferences, contentPreferences]
    )

    // Extract all items from user collections (for recommendation engine)
    const collectionItems = useMemo(() => {
        const items: Content[] = []
        const seenIds = new Set<number>()

        // Add items from all user-created collections
        for (const collection of sessionData.userCreatedWatchlists || []) {
            for (const item of collection.items || []) {
                if (!seenIds.has(item.id)) {
                    items.push(item)
                    seenIds.add(item.id)
                }
            }
        }

        return items
    }, [sessionData.userCreatedWatchlists])

    // Get all content IDs user has already (for excluding from preference customizer)
    const excludeContentIds = useMemo(() => {
        const ids = new Set<number>()
        sessionData.likedMovies.forEach((c) => ids.add(c.id))
        sessionData.defaultWatchlist.forEach((c) => ids.add(c.id))
        sessionData.hiddenMovies.forEach((c) => ids.add(c.id))
        collectionItems.forEach((c) => ids.add(c.id))
        return Array.from(ids)
    }, [
        sessionData.likedMovies,
        sessionData.defaultWatchlist,
        sessionData.hiddenMovies,
        collectionItems,
    ])

    const likedIdsSignature = useMemo(
        () => sessionData.likedMovies.map((item) => item.id).join(','),
        [sessionData.likedMovies]
    )
    const watchlistIdsSignature = useMemo(
        () => sessionData.defaultWatchlist.map((item) => item.id).join(','),
        [sessionData.defaultWatchlist]
    )
    const hiddenIdsSignature = useMemo(
        () => sessionData.hiddenMovies.map((item) => item.id).join(','),
        [sessionData.hiddenMovies]
    )
    const collectionIdsSignature = useMemo(
        () => collectionItems.map((item) => item.id).join(','),
        [collectionItems]
    )

    // Fetch personalized recommendations
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!showRecommendations) {
                setIsLoading(false)
                setRecommendations([])
                return
            }

            // Only show recommendations for authenticated users (requires Firestore)
            if (!userId || sessionType !== 'authenticated') {
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                // Get Firebase ID token for authentication
                const currentUser = auth.currentUser
                if (!currentUser) {
                    setIsLoading(false)
                    return
                }

                const idToken = await currentUser.getIdToken()

                // Use POST with body instead of GET with URL params to avoid 431 header size error
                const response = await fetch(`/api/recommendations/personalized`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        likedMovies: sessionData.likedMovies.slice(0, 10),
                        watchlist: sessionData.defaultWatchlist.slice(0, 10),
                        collectionItems: collectionItems.slice(0, 20), // Items from all user collections
                        hiddenMovies: sessionData.hiddenMovies.slice(0, 10),
                        genrePreferences: genrePreferences, // User genre preferences
                        contentPreferences: contentPreferences, // User content preferences
                        limit: 20,
                    }),
                })

                if (!response.ok) {
                    // Get error details from response
                    const errorData = await response.json().catch(() => ({}))
                    const errorMsg =
                        errorData.error || `HTTP ${response.status}: ${response.statusText}`
                    console.error('Recommendations API error:', errorMsg, errorData)
                    throw new Error(errorMsg)
                }

                const data = await response.json()

                if (data.success) {
                    setRecommendations(data.recommendations || [])
                } else if (data.requiresData) {
                    // Not enough user data for recommendations
                    setRecommendations([])
                } else {
                    setError(data.error || 'Failed to load recommendations')
                }
            } catch (err) {
                console.error('Error fetching personalized recommendations:', err)
                // Don't show error to user - just silently fail and hide the row
                // Recommendations are optional and shouldn't break the experience
                setRecommendations([])
                setError(null) // Clear error so row is hidden
            } finally {
                setIsLoading(false)
            }
        }

        fetchRecommendations()
    }, [
        userId,
        sessionType,
        likedIdsSignature,
        watchlistIdsSignature,
        hiddenIdsSignature,
        collectionIdsSignature,
        prefsSignature,
        showRecommendations,
        sessionData.likedMovies,
        sessionData.defaultWatchlist,
        sessionData.hiddenMovies,
        collectionItems,
        genrePreferences,
        contentPreferences,
    ])

    // Handle preference customizer save
    const handlePreferenceSave = useCallback(
        async (data: {
            genrePreferences: GenrePreference[]
            contentPreferences: ContentPreference[]
            shownPreferenceContent: ShownPreferenceContent[]
        }) => {
            // Update session data with new preferences
            await sessionData.updatePreferences({
                genrePreferences: data.genrePreferences,
                contentPreferences: data.contentPreferences,
                shownPreferenceContent: data.shownPreferenceContent,
            })
        },
        [sessionData]
    )

    // Open customizer from insights modal
    const handleOpenCustomizer = useCallback(() => {
        setShowInsightsModal(false)
        setShowCustomizerModal(true)
    }, [])

    // Don't render if feature is disabled
    if (!showRecommendations) {
        return null
    }

    // Don't render for guest users (recommendations require Firestore for interaction tracking)
    if (!userId || sessionType !== 'authenticated') {
        return null
    }

    // Don't render while loading
    if (isLoading) {
        return null
    }

    // Don't render if error or no recommendations
    if (error || recommendations.length === 0) {
        return null
    }

    // Convert recommendations to Content array
    const content: Content[] = recommendations.map((rec) => rec.content)

    return (
        <>
            <Row
                title="✨ Recommended For You"
                content={content}
                onInfoClick={() => setShowInsightsModal(true)}
            />
            <RecommendationInsightsModal
                isOpen={showInsightsModal}
                onClose={() => setShowInsightsModal(false)}
                onOpenQuiz={handleOpenCustomizer}
            />
            <PreferenceCustomizerModal
                isOpen={showCustomizerModal}
                onClose={() => setShowCustomizerModal(false)}
                onSave={handlePreferenceSave}
                existingGenrePreferences={genrePreferences}
                existingContentPreferences={contentPreferences}
                existingShownContent={shownPreferenceContent}
                excludeContentIds={excludeContentIds}
            />
        </>
    )
}
