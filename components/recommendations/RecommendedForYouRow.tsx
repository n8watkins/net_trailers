/**
 * Recommended For You Row
 *
 * Displays personalized recommendations based on user's preferences.
 * Uses the standard Row component to match the styling of other collections.
 */

'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Content, getTitle as getContentTitle } from '../../typings'
import { Recommendation } from '../../types/recommendations'
import Row from '../content/Row'
import { useSessionData } from '../../hooks/useSessionData'
import { useSessionStore } from '../../stores/sessionStore'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { authenticatedFetch } from '../../lib/authenticatedFetch'
import { useToast } from '../../hooks/useToast'
import RecommendationInsightsModal from './RecommendationInsightsModal'
import GenrePreferenceModal, { PreviewContent } from './GenrePreferenceModal'
import TitlePreferenceModal, { ContentWithCredits } from './TitlePreferenceModal'
import { GenrePreference, VotedContent, SkippedContent } from '../../types/shared'
import {
    aggregateUserInteractions,
    shouldRefreshSummary,
} from '../../utils/recommendations/interactionAggregator'
import type { InteractionSummary } from '../../utils/recommendations/interactionAggregator'
import { useRecommendationFeedback } from '../../hooks/useRecommendationFeedback'
import { FEEDBACK_CONSTRAINTS } from '../../types/recommendations'

interface RecommendedForYouRowProps {
    onLoadComplete?: () => void
}

export default function RecommendedForYouRow({ onLoadComplete }: RecommendedForYouRowProps) {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showInsightsModal, setShowInsightsModal] = useState(false)
    const [showGenreModal, setShowGenreModal] = useState(false)
    const [showTitleModal, setShowTitleModal] = useState(false)
    const [initialHydrationComplete, setInitialHydrationComplete] = useState(false)

    // Prefetched content for title quiz
    const [prefetchedTitleContent, setPrefetchedTitleContent] = useState<
        ContentWithCredits[] | null
    >(null)
    const [isPrefetchingTitles, setIsPrefetchingTitles] = useState(false)

    // Prefetched content for genre quiz
    const [prefetchedGenrePreviews, setPrefetchedGenrePreviews] = useState<Record<
        string,
        PreviewContent[]
    > | null>(null)
    const [isPrefetchingGenres, setIsPrefetchingGenres] = useState(false)

    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const isInitialized = useSessionStore((state) => state.isInitialized)
    const userId = getUserId()
    const sessionData = useSessionData()

    // Check if data is still syncing from Firebase
    const syncStatus = useAuthStore((state) => state.syncStatus)
    const isDataSyncing = sessionType === 'authenticated' && syncStatus === 'syncing'

    // Phase 2: Recommendation Feedback Tracking
    const feedbackHook = useRecommendationFeedback()
    const { showContentHidden } = useToast()
    const contentPageMapRef = useRef<Map<string, number>>(new Map()) // Map content ID+type to page number
    const viewedContentRef = useRef<Set<string>>(new Set()) // Track which content has been viewed
    const previousDataRef = useRef<{
        likedIds: Set<number>
        hiddenIds: Set<number>
        watchlistIds: Set<number>
    }>({
        likedIds: new Set(),
        hiddenIds: new Set(),
        watchlistIds: new Set(),
    })

    // Check if recommendations are enabled in user preferences
    const showRecommendations = sessionData.showRecommendations ?? true

    // Get existing preferences from session
    const genrePreferences = sessionData.genrePreferences || []
    const contentPreferences = sessionData.contentPreferences || []
    const votedContent = sessionData.votedContent || []

    // Get skippedContent from appropriate store
    const authSkippedContent = useAuthStore((state) => state.skippedContent)
    const guestSkippedContent = useGuestStore((state) => state.skippedContent)
    const skippedContent =
        (sessionType === 'authenticated' ? authSkippedContent : guestSkippedContent) || []

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

    // Phase 2: Build content-to-page mapping when recommendations change
    // Page 1 = first 40 items, Page 2 = next batch, etc.
    useEffect(() => {
        if (recommendations.length === 0) {
            contentPageMapRef.current.clear()
            viewedContentRef.current.clear()
            return
        }

        // Map content IDs to page numbers (1-indexed)
        // Assuming 40 items per page from the API
        const itemsPerPage = 40
        recommendations.forEach((rec, index) => {
            const key = `${rec.content.id}-${rec.content.media_type}`
            const page = Math.floor(index / itemsPerPage) + 1
            contentPageMapRef.current.set(key, page)
        })

        console.log(
            `[Feedback] Mapped ${recommendations.length} recommendations across ${Math.ceil(recommendations.length / itemsPerPage)} pages`
        )
    }, [recommendations])

    // Phase 2: Track user actions on recommended content (liked, hidden, watchlisted)
    useEffect(() => {
        const currentLikedIds = new Set(sessionData.likedMovies.map((c) => c.id))
        const currentHiddenIds = new Set(sessionData.hiddenMovies.map((c) => c.id))
        const currentWatchlistIds = new Set(sessionData.defaultWatchlist.map((c) => c.id))

        const previous = previousDataRef.current

        // Detect new likes on recommended content
        for (const id of currentLikedIds) {
            if (!previous.likedIds.has(id)) {
                // User just liked this content - check if it's a recommendation
                const recommendation = recommendations.find((r) => r.content.id === id)
                if (recommendation) {
                    const key = `${recommendation.content.id}-${recommendation.content.media_type}`
                    const page = contentPageMapRef.current.get(key) || 1
                    feedbackHook.trackLiked({
                        contentId: recommendation.content.id,
                        mediaType: recommendation.content.media_type as 'movie' | 'tv',
                        page,
                    })
                }
            }
        }

        // Detect new hidden content
        for (const id of currentHiddenIds) {
            if (!previous.hiddenIds.has(id)) {
                const recommendation = recommendations.find((r) => r.content.id === id)
                if (recommendation) {
                    const key = `${recommendation.content.id}-${recommendation.content.media_type}`
                    const page = contentPageMapRef.current.get(key) || 1
                    feedbackHook.trackHidden({
                        contentId: recommendation.content.id,
                        mediaType: recommendation.content.media_type as 'movie' | 'tv',
                        page,
                    })

                    // Show confirmation toast
                    const contentTitle = getContentTitle(recommendation.content)
                    showContentHidden('Content dismissed', contentTitle)
                }
            }
        }

        // Detect new watchlist additions
        for (const id of currentWatchlistIds) {
            if (!previous.watchlistIds.has(id)) {
                const recommendation = recommendations.find((r) => r.content.id === id)
                if (recommendation) {
                    const key = `${recommendation.content.id}-${recommendation.content.media_type}`
                    const page = contentPageMapRef.current.get(key) || 1
                    feedbackHook.trackWatchlisted({
                        contentId: recommendation.content.id,
                        mediaType: recommendation.content.media_type as 'movie' | 'tv',
                        page,
                    })
                }
            }
        }

        // Update previous state for next comparison
        previousDataRef.current = {
            likedIds: currentLikedIds,
            hiddenIds: currentHiddenIds,
            watchlistIds: currentWatchlistIds,
        }
    }, [
        sessionData.likedMovies,
        sessionData.hiddenMovies,
        sessionData.defaultWatchlist,
        recommendations,
        feedbackHook,
    ])

    // Phase 2: Track viewed content (simplified - tracks when content becomes visible in the row)
    // Note: This is a basic implementation. A more sophisticated approach would use
    // IntersectionObserver to track actual viewport visibility >3 seconds
    useEffect(() => {
        if (recommendations.length === 0) return

        // Track the first 10 items as "viewed" when recommendations first load
        // This simulates the initial view of content in the row
        const viewableCount = Math.min(10, recommendations.length)

        recommendations.slice(0, viewableCount).forEach((rec) => {
            const key = `${rec.content.id}-${rec.content.media_type}`

            // Only track once per content
            if (!viewedContentRef.current.has(key)) {
                viewedContentRef.current.add(key)
                const page = contentPageMapRef.current.get(key) || 1

                // Track after a 3-second delay (minimum view time)
                setTimeout(() => {
                    feedbackHook.trackViewed({
                        contentId: rec.content.id,
                        mediaType: rec.content.media_type as 'movie' | 'tv',
                        page,
                    })
                }, FEEDBACK_CONSTRAINTS.MIN_VIEW_TIME_MS)
            }
        })
    }, [recommendations, feedbackHook])

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

    const _likedIdsSignature = useMemo(
        () => sessionData.likedMovies.map((item) => item.id).join(','),
        [sessionData.likedMovies]
    )
    const _watchlistIdsSignature = useMemo(
        () => sessionData.defaultWatchlist.map((item) => item.id).join(','),
        [sessionData.defaultWatchlist]
    )
    const _hiddenIdsSignature = useMemo(
        () => sessionData.hiddenMovies.map((item) => item.id).join(','),
        [sessionData.hiddenMovies]
    )
    const _collectionIdsSignature = useMemo(
        () => collectionItems.map((item) => item.id).join(','),
        [collectionItems]
    )

    // Build list of IDs to exclude for title quiz (already voted or liked)
    const titleQuizExcludeIds = useMemo(() => {
        const ids = new Set<number>()
        votedContent.forEach((v) => ids.add(v.contentId))
        sessionData.likedMovies.forEach((c) => ids.add(c.id))
        return Array.from(ids)
    }, [votedContent, sessionData.likedMovies])

    // Build priority content from watchlist for title quiz
    const titleQuizPriorityContent = useMemo(() => {
        const votedIds = new Set(votedContent.map((v) => v.contentId))
        const likedIds = new Set(sessionData.likedMovies.map((c) => c.id))
        return sessionData.defaultWatchlist
            .filter((c) => !votedIds.has(c.id) && !likedIds.has(c.id))
            .map((c) => ({
                id: c.id,
                mediaType: (c.media_type || 'movie') as 'movie' | 'tv',
            }))
    }, [sessionData.defaultWatchlist, votedContent, sessionData.likedMovies])

    // Prefetch title quiz content when insights modal opens
    useEffect(() => {
        if (!showInsightsModal || isPrefetchingTitles || prefetchedTitleContent) return

        const prefetchContent = async () => {
            setIsPrefetchingTitles(true)
            try {
                const response = await fetch('/api/recommendations/preference-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        excludeIds: titleQuizExcludeIds,
                        limit: 15,
                        includeCredits: true,
                        priorityContent: titleQuizPriorityContent,
                    }),
                })

                if (!response.ok) throw new Error('Failed to prefetch content')

                const data = await response.json()
                if (data.success && data.content) {
                    const contentItems = data.content as ContentWithCredits[]
                    setPrefetchedTitleContent(contentItems)

                    // Preload poster images for instant display
                    contentItems.forEach((item) => {
                        if (item.poster_path) {
                            const img = new window.Image()
                            img.src = `https://image.tmdb.org/t/p/w500${item.poster_path}`
                        }
                    })
                }
            } catch (error) {
                console.error('Error prefetching title quiz content:', error)
            } finally {
                setIsPrefetchingTitles(false)
            }
        }

        prefetchContent()
    }, [
        showInsightsModal,
        isPrefetchingTitles,
        prefetchedTitleContent,
        titleQuizExcludeIds,
        titleQuizPriorityContent,
    ])

    // Prefetch genre quiz content when insights modal opens
    useEffect(() => {
        if (!showInsightsModal || isPrefetchingGenres || prefetchedGenrePreviews) return

        const prefetchGenrePreviews = async () => {
            setIsPrefetchingGenres(true)
            try {
                // Fetch first 4 genres immediately for fast initial load
                const firstGenres = ['action', 'comedy', 'drama', 'horror']
                const response = await fetch(
                    `/api/recommendations/genre-previews?genres=${firstGenres.join(',')}&limit=3`
                )

                if (!response.ok) throw new Error('Failed to prefetch genre previews')

                const data = await response.json()
                if (data.success && data.previews) {
                    setPrefetchedGenrePreviews(data.previews)

                    // Preload poster images for instant display
                    Object.values(data.previews as Record<string, PreviewContent[]>).forEach(
                        (previews) => {
                            previews.forEach((item) => {
                                if (item.poster_path) {
                                    const img = new window.Image()
                                    img.src = `https://image.tmdb.org/t/p/w300${item.poster_path}`
                                }
                            })
                        }
                    )
                }
            } catch (error) {
                console.error('Error prefetching genre previews:', error)
            } finally {
                setIsPrefetchingGenres(false)
            }
        }

        prefetchGenrePreviews()
    }, [showInsightsModal, isPrefetchingGenres, prefetchedGenrePreviews])

    // Clear prefetched content when votes change (so it refetches next time)
    useEffect(() => {
        setPrefetchedTitleContent(null)
    }, [votedContent.length])

    // Build content title map for InsightsModal to display voted content titles
    const contentTitleMap = useMemo(() => {
        const map = new Map<string, string>()
        const allContent = [
            ...sessionData.likedMovies,
            ...sessionData.defaultWatchlist,
            ...collectionItems,
        ]
        allContent.forEach((item) => {
            const key = `${item.id}-${item.media_type}`
            if (!map.has(key)) {
                map.set(key, getContentTitle(item))
            }
        })
        return map
    }, [sessionData.likedMovies, sessionData.defaultWatchlist, collectionItems])

    // Track initial Firebase hydration (not routine mutations)
    useEffect(() => {
        // For guest users, mark as hydrated immediately
        if (sessionType !== 'authenticated') {
            setInitialHydrationComplete(true)
            return
        }

        // For authenticated users, only track initial hydration completion
        // Once complete, this flag stays true even during routine mutations
        if (
            !initialHydrationComplete &&
            isInitialized &&
            (syncStatus === 'synced' || syncStatus === 'offline')
        ) {
            // Mark hydrated when:
            // - 'synced': Initial sync completed successfully
            // - 'offline': Initial sync failed, but we should still try to show recommendations
            setInitialHydrationComplete(true)
        }
    }, [sessionType, isInitialized, syncStatus, initialHydrationComplete])

    // Fetch personalized recommendations
    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!showRecommendations) {
                setIsLoading(false)
                setRecommendations([])
                return
            }

            // Only show recommendations for authenticated users
            if (!userId || sessionType !== 'authenticated') {
                setIsLoading(false)
                return
            }

            // Guard: Don't fetch until initial hydration is complete
            // This prevents fetching with empty arrays before Firebase data loads
            // Only blocks the initial fetch - routine mutations don't trigger this guard
            if (sessionType === 'authenticated' && !initialHydrationComplete) {
                // Keep isLoading true until initial hydration completes
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                // V2: Generate or fetch cached interaction summary (Phase 1b - Caching)
                // Interactions are now fetched from the Drizzle-backed /api/interactions
                // endpoint instead of Firestore, using the session cookie for auth.
                let interactionSummary: InteractionSummary | undefined
                try {
                    // Load the server-side interaction summary (24h refresh cadence)
                    const summaryRes = await authenticatedFetch(
                        '/api/interactions?summary=true&limit=1'
                    )

                    if (summaryRes.ok) {
                        const summaryData = await summaryRes.json()
                        const serverSummary = summaryData.summary as
                            | {
                                  userId: string
                                  totalInteractions: number
                                  genrePreferences: unknown[]
                                  topContentIds: number[]
                                  lastUpdated: number
                              }
                            | null
                            | undefined

                        if (serverSummary && serverSummary.totalInteractions > 0) {
                            const now = Date.now()
                            const isCacheFresh =
                                now - serverSummary.lastUpdated < 24 * 60 * 60 * 1000

                            if (isCacheFresh) {
                                // Summary is fresh — fetch raw interactions to build the
                                // client-side InteractionSummary (aggregateUserInteractions).
                                const ixRes = await authenticatedFetch(
                                    '/api/interactions?limit=1000'
                                )
                                if (ixRes.ok) {
                                    const ixData = await ixRes.json()
                                    const interactions = ixData.interactions || []

                                    if (interactions.length > 0) {
                                        interactionSummary = aggregateUserInteractions(
                                            userId,
                                            interactions,
                                            sessionData.myRatings || []
                                        )
                                        const ageMinutes = Math.floor(
                                            (now - serverSummary.lastUpdated) / 60000
                                        )
                                        console.log(
                                            `[V2] Built summary from ${interactions.length} interactions (server summary ${ageMinutes}m old)`
                                        )
                                    }
                                }
                            } else {
                                console.log(
                                    '[V2] Server summary stale — skipping, will refresh server-side on next interaction'
                                )
                            }
                        }
                    }
                } catch (error) {
                    console.warn(
                        'Failed to generate interaction summary, falling back to V1:',
                        error
                    )
                    // Continue without summary — API will use V1 logic
                }

                // Use POST with body instead of GET with URL params to avoid 431 header size error.
                // Auth rides on the session cookie; no bearer token needed.
                const response = await authenticatedFetch(`/api/recommendations/personalized`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        // V2: Interaction summary (Phase 1 - Deep History)
                        ...(interactionSummary && { interactionSummary }),
                        // New unified ratings system (preferred)
                        myRatings: sessionData.myRatings?.slice(0, 20) || [],
                        // Legacy arrays (for backward compatibility)
                        likedMovies: sessionData.likedMovies.slice(0, 10),
                        watchlist: sessionData.defaultWatchlist.slice(0, 10),
                        collectionItems: collectionItems.slice(0, 20), // Items from all user collections
                        hiddenMovies: sessionData.hiddenMovies.slice(0, 10),
                        genrePreferences: genrePreferences, // User genre preferences
                        contentPreferences: contentPreferences, // User content preferences
                        votedContent: votedContent, // User voted content (title quiz) - legacy
                        limit: 40, // Increased from 20 to ensure enough content for infinite scroll trigger
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
        // Note: We use initialHydrationComplete flag to trigger fetch after initial
        // Firebase sync completes. Unlike routine mutations (addToWatchlist, rateContent)
        // that flip syncStatus 'syncing' -> 'synced', this flag only changes once:
        // from false (before first sync) to true (after initial sync or offline).
        // Once true, it stays true even during routine mutations, preventing jarring
        // re-renders from likes/watchlist changes.
        // Recommendations refresh on:
        // - Initial Firebase hydration completion (initialHydrationComplete false -> true)
        // - myRatings data becomes available (length changes from undefined/0 to N)
        // - Session changes (userId, sessionType)
        // - Explicit preference changes (genre quiz, title quiz via prefsSignature)
    }, [
        userId,
        sessionType,
        initialHydrationComplete,
        prefsSignature,
        showRecommendations,
        sessionData.myRatings?.length,
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

            // Also add "like" votes to likedMovies
            const likedContent = votes.filter((v) => v.vote === 'like')
            for (const liked of likedContent) {
                // Find the content object to add to liked
                const contentItem = sessionData.defaultWatchlist.find(
                    (c) => c.id === liked.contentId && c.media_type === liked.mediaType
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

    // Handle skip content
    const handleSkipContent = useCallback(
        async (skipped: SkippedContent) => {
            const updatedSkippedContent = [...skippedContent, skipped]
            await sessionData.updatePreferences({
                skippedContent: updatedSkippedContent,
            })
        },
        [sessionData, skippedContent]
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

    // Notify parent when loading completes
    useEffect(() => {
        if (!isLoading && onLoadComplete) {
            onLoadComplete()
        }
    }, [isLoading, onLoadComplete])

    // Don't render if session not initialized
    if (!isInitialized) {
        console.log('[Recommended For You] Hidden: Session not initialized')
        return null
    }

    // Don't render if data is still syncing from Firebase
    if (isDataSyncing) {
        console.log('[Recommended For You] Hidden: Data still syncing from Firebase')
        return null
    }

    // Don't render if feature is disabled
    if (!showRecommendations) {
        console.log('[Recommended For You] Hidden: Feature disabled in settings')
        return null
    }

    // Don't render for guest users (recommendations require Firestore for interaction tracking)
    if (!userId || sessionType !== 'authenticated') {
        console.log('[Recommended For You] Hidden: Guest user or not authenticated')
        return null
    }

    // Don't render while loading
    if (isLoading) {
        console.log('[Recommended For You] Hidden: Still loading recommendations')
        return null
    }

    // Don't render if error or no recommendations
    if (error) {
        console.error('[Recommended For You] Hidden: Error occurred:', error)
        return null
    }

    if (recommendations.length === 0) {
        console.log(
            '[Recommended For You] Hidden: No recommendations generated (need at least 1 item in watchlist/liked or set preferences)'
        )
        return null
    }

    console.log('[Recommended For You] Displaying', recommendations.length, 'recommendations')

    // Convert recommendations to Content array
    const content: Content[] = recommendations.map((rec) => rec.content)

    return (
        <>
            <Row
                title="✨ Recommended For You"
                content={content}
                apiEndpoint="/api/recommendations/personalized"
                onInfoClick={() => setShowInsightsModal(true)}
            />
            <RecommendationInsightsModal
                isOpen={showInsightsModal}
                onClose={() => setShowInsightsModal(false)}
                onOpenGenreQuiz={handleOpenGenreQuiz}
                onOpenTitleQuiz={handleOpenTitleQuiz}
                genrePreferences={genrePreferences}
                votedContent={votedContent}
                contentTitleMap={contentTitleMap}
            />
            <GenrePreferenceModal
                isOpen={showGenreModal}
                onClose={() => setShowGenreModal(false)}
                onSave={handleGenreSave}
                existingPreferences={genrePreferences}
                prefetchedPreviews={prefetchedGenrePreviews}
            />
            <TitlePreferenceModal
                isOpen={showTitleModal}
                onClose={() => setShowTitleModal(false)}
                onSave={handleTitleSave}
                existingVotes={votedContent}
                skippedContent={skippedContent}
                onSkip={handleSkipContent}
                watchlistContent={sessionData.defaultWatchlist}
                likedContent={sessionData.likedMovies}
                prefetchedContent={prefetchedTitleContent}
            />
        </>
    )
}
