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
import GenrePreferenceModal from './GenrePreferenceModal'
import TitlePreferenceModal from './TitlePreferenceModal'
import { GenrePreference, VotedContent } from '../../types/shared'

export default function RecommendedForYouRow() {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showInsightsModal, setShowInsightsModal] = useState(false)
    const [showGenreModal, setShowGenreModal] = useState(false)
    const [showTitleModal, setShowTitleModal] = useState(false)

    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const userId = getUserId()
    const sessionData = useSessionData()

    // Check if recommendations are enabled in user preferences
    const showRecommendations = sessionData.showRecommendations ?? true

    // Get existing preferences from session
    const genrePreferences = sessionData.genrePreferences || []
    const contentPreferences = sessionData.contentPreferences || []
    const votedContent = sessionData.votedContent || []

    // Track preferences signature for re-fetching recommendations
    const prefsSignature = useMemo(
        () =>
            [
                ...genrePreferences.map((p) => `g:${p.genreId}:${p.preference}`),
                ...contentPreferences.map((p) => `c:${p.contentId}:${p.preference}`),
                ...votedContent.map((v) => `v:${v.contentId}:${v.vote}`),
            ]
                .sort()
                .join(','),
        [genrePreferences, contentPreferences, votedContent]
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
                        votedContent: votedContent, // User voted content (title quiz)
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
        votedContent,
    ])

    // Handle genre preference save
    const handleGenreSave = useCallback(
        async (preferences: GenrePreference[]) => {
            await sessionData.updatePreferences({
                genrePreferences: preferences,
            })
        },
        [sessionData]
    )

    // Handle title votes save
    const handleTitleSave = useCallback(
        async (votes: VotedContent[]) => {
            // Merge new votes with existing, keeping latest vote for each content
            const existingVotesMap = new Map(
                votedContent.map((v) => [`${v.contentId}-${v.mediaType}`, v])
            )
            votes.forEach((v) => {
                existingVotesMap.set(`${v.contentId}-${v.mediaType}`, v)
            })

            // Also add "love" votes to likedMovies
            const lovedContent = votes.filter((v) => v.vote === 'love')
            for (const loved of lovedContent) {
                // Find the content object to add to liked
                const contentItem = sessionData.defaultWatchlist.find(
                    (c) => c.id === loved.contentId && c.media_type === loved.mediaType
                )
                if (contentItem && !sessionData.isLiked(contentItem.id)) {
                    await sessionData.addLikedMovie(contentItem)
                }
            }

            await sessionData.updatePreferences({
                votedContent: Array.from(existingVotesMap.values()),
            })
        },
        [sessionData, votedContent]
    )

    // Open genre quiz from insights modal
    const handleOpenGenreQuiz = useCallback(() => {
        setShowInsightsModal(false)
        setShowGenreModal(true)
    }, [])

    // Open title quiz from insights modal
    const handleOpenTitleQuiz = useCallback(() => {
        setShowInsightsModal(false)
        setShowTitleModal(true)
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
                onOpenGenreQuiz={handleOpenGenreQuiz}
                onOpenTitleQuiz={handleOpenTitleQuiz}
                genrePreferences={genrePreferences}
            />
            <GenrePreferenceModal
                isOpen={showGenreModal}
                onClose={() => setShowGenreModal(false)}
                onSave={handleGenreSave}
                existingPreferences={genrePreferences}
            />
            <TitlePreferenceModal
                isOpen={showTitleModal}
                onClose={() => setShowTitleModal(false)}
                onSave={handleTitleSave}
                existingVotes={votedContent}
                watchlistContent={sessionData.defaultWatchlist}
                likedContent={sessionData.likedMovies}
            />
        </>
    )
}
