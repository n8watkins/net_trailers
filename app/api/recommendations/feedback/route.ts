/**
 * Recommendation Feedback API
 * Phase 2: Feedback Loop Integration
 *
 * Tracks user interactions with recommended content to improve future
 * recommendations. Previously wrote to the Firestore `recommendation_feedback`
 * collection; now persisted via recordInteraction() in the Drizzle interactions
 * table so that feedback is automatically incorporated into the
 * interaction_summary that the personalized route reads.
 *
 * FeedbackAction → InteractionType mapping:
 *   viewed        → view_modal         (light positive signal)
 *   liked         → like               (strong positive signal)
 *   watchlisted   → add_to_watchlist   (strong positive signal)
 *   hidden        → hide_content       (strong negative signal)
 *   dismissed     → hide_content       (strong negative signal — same intent)
 *   scrolled_past → view_modal         (neutral; light signal, lowest weight)
 *
 * GET returns interactions filtered to the recent window using the already-
 * migrated GET /api/interactions endpoint's data, fetched from Drizzle.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import {
    RecommendationFeedback,
    FeedbackAction,
    FeedbackType,
    FEEDBACK_CONSTRAINTS,
} from '@/types/recommendations'
import { recordInteraction, getRecentInteractions } from '@/db/queries/interactions'
import type { InteractionType } from '@/types/interactions'

/* -------------------------------------------------------------------------- */
/*  FeedbackAction → InteractionType mapping                                  */
/* -------------------------------------------------------------------------- */

/**
 * Maps a recommendation FeedbackAction to the closest InteractionType so that
 * feedback signals flow through the same weighted-score pipeline as all other
 * user interactions, avoiding a separate Firestore collection.
 */
function feedbackActionToInteractionType(action: FeedbackAction): InteractionType {
    switch (action) {
        case 'liked':
            return 'like'
        case 'watchlisted':
            return 'add_to_watchlist'
        case 'hidden':
            return 'hide_content'
        case 'dismissed':
            // Treated as a hide signal — user explicitly did not want this content.
            return 'hide_content'
        case 'viewed':
        case 'scrolled_past':
        default:
            // Both "viewed" and "scrolled_past" carry the lightest signal weight.
            return 'view_modal'
    }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/recommendations/feedback                                         */
/* -------------------------------------------------------------------------- */

/**
 * Log user feedback on recommended content.
 *
 * Body:
 *   contentId  — number (TMDB content ID)
 *   mediaType  — 'movie' | 'tv'
 *   action     — FeedbackAction
 *   page       — number (1-indexed recommendation page)
 *   genreIds?  — number[] (TMDB genre IDs; optional but improves summary quality)
 */
async function handlePostFeedback(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        const body = await request.json()
        const { contentId, mediaType, action, page, genreIds } = body

        // Validate required fields
        if (!contentId || !mediaType || !action || page === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (mediaType !== 'movie' && mediaType !== 'tv') {
            return NextResponse.json(
                { success: false, error: 'Invalid media type' },
                { status: 400 }
            )
        }

        const validActions: FeedbackAction[] = [
            'viewed',
            'dismissed',
            'hidden',
            'liked',
            'watchlisted',
            'scrolled_past',
        ]
        if (!validActions.includes(action)) {
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
        }

        if (!Number.isInteger(page) || page < 1 || page > 100) {
            return NextResponse.json(
                { success: false, error: 'Invalid page number (must be 1-100)' },
                { status: 400 }
            )
        }

        const explicitActions: FeedbackAction[] = ['dismissed', 'hidden', 'liked', 'watchlisted']
        const feedbackType: FeedbackType = explicitActions.includes(action)
            ? 'explicit'
            : 'implicit'

        // Persist as an interaction row in Drizzle.  The interaction_summary is
        // refreshed asynchronously by recordInteraction() via
        // refreshInteractionSummaryIfNeeded(), so no separate summary write is needed.
        const safeGenreIds = Array.isArray(genreIds)
            ? (genreIds as unknown[]).filter((g): g is number => typeof g === 'number')
            : []

        const interaction = await recordInteraction(userId, {
            contentId: typeof contentId === 'number' ? contentId : parseInt(String(contentId), 10),
            mediaType: mediaType as 'movie' | 'tv',
            interactionType: feedbackActionToInteractionType(action),
            genreIds: safeGenreIds,
            // Store the original feedback action in the `source` field so it
            // remains queryable without a separate collection.
            source: `feedback:${action}:page${page}`,
        })

        // Reconstruct a RecommendationFeedback shape for API response compatibility.
        const feedback: RecommendationFeedback = {
            id: interaction.id,
            userId,
            contentId: interaction.contentId,
            mediaType: interaction.mediaType,
            recommendationPage: page,
            feedbackType,
            action,
            timestamp: interaction.timestamp,
            source: 'recommended_row',
        }

        console.log(
            `[Feedback] ${userId} — ${action} content ${contentId} (${mediaType}) on page ${page}`
        )

        return NextResponse.json({ success: true, feedback })
    } catch (error) {
        console.error('Failed to log recommendation feedback:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to log feedback',
            },
            { status: 500 }
        )
    }
}

export const POST = withAuth(handlePostFeedback)

/* -------------------------------------------------------------------------- */
/*  GET /api/recommendations/feedback?limit={limit}                           */
/* -------------------------------------------------------------------------- */

/**
 * Get recent feedback for the authenticated user.
 *
 * Previously queried Firestore `recommendation_feedback`. Now reads from the
 * Drizzle interactions table (which stores feedback actions as interaction rows)
 * and filters to the recent 30-day window. Rows whose `source` field starts
 * with `"feedback:"` were recorded via this endpoint.
 *
 * Returns a RecommendationFeedback-compatible shape reconstructed from
 * interaction rows so callers (e.g. processFeedback()) need no changes.
 */
async function handleGetFeedback(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url)
        const limitParam = searchParams.get('limit')
        const MAX_LIMIT = 500
        const feedbackLimit = limitParam
            ? Math.max(1, Math.min(parseInt(limitParam, 10), MAX_LIMIT))
            : 100

        const thirtyDaysAgo =
            Date.now() - FEEDBACK_CONSTRAINTS.RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000

        // Fetch recent interactions and reconstruct feedback objects.
        // We fetch a larger window (up to 2× the limit) to account for
        // non-feedback interactions in the same table, then filter down.
        const allInteractions = await getRecentInteractions(
            userId,
            Math.min(feedbackLimit * 4, MAX_LIMIT)
        )

        const feedback: RecommendationFeedback[] = allInteractions
            .filter((ix) => {
                // Keep only rows recorded from the feedback endpoint
                // (identified by the "feedback:action:pageN" source prefix)
                // and within the recent window.
                return (
                    ix.timestamp >= thirtyDaysAgo &&
                    typeof ix.source === 'string' &&
                    ix.source.startsWith('feedback:')
                )
            })
            .slice(0, feedbackLimit)
            .map((ix) => {
                // Parse action and page from source: "feedback:{action}:page{N}"
                const parts = (ix.source ?? '').split(':')
                const action = (parts[1] ?? 'viewed') as FeedbackAction
                const pageRaw = parts[2] ?? 'page1'
                const recommendationPage = parseInt(pageRaw.replace('page', ''), 10) || 1

                const explicitActions: FeedbackAction[] = [
                    'dismissed',
                    'hidden',
                    'liked',
                    'watchlisted',
                ]
                const feedbackType: FeedbackType = explicitActions.includes(action)
                    ? 'explicit'
                    : 'implicit'

                return {
                    id: ix.id,
                    userId: ix.userId,
                    contentId: ix.contentId,
                    mediaType: ix.mediaType,
                    recommendationPage,
                    feedbackType,
                    action,
                    timestamp: ix.timestamp,
                    source: 'recommended_row' as const,
                }
            })

        console.log(`[Feedback] Retrieved ${feedback.length} feedback entries for user ${userId}`)

        return NextResponse.json({ success: true, feedback, count: feedback.length })
    } catch (error) {
        console.error('Failed to get recommendation feedback:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get feedback',
            },
            { status: 500 }
        )
    }
}

export const GET = withAuth(handleGetFeedback)
