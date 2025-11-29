/**
 * Recommendation Feedback API
 * Phase 2: Feedback Loop Integration
 *
 * Tracks user interactions with recommended content to improve future recommendations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase'
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { withAuth } from '@/lib/auth-middleware'
import {
    RecommendationFeedback,
    FeedbackAction,
    FeedbackType,
    FEEDBACK_CONSTRAINTS,
} from '@/types/recommendations'

/**
 * POST /api/recommendations/feedback
 *
 * Log user feedback on recommended content
 *
 * Body:
 * - contentId: number
 * - mediaType: 'movie' | 'tv'
 * - action: FeedbackAction
 * - page: number (1-indexed)
 *
 * Authentication: Requires valid Firebase ID token in Authorization header
 */
async function handlePostFeedback(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        const body = await request.json()
        const { contentId, mediaType, action, page } = body

        // Validate required fields
        if (!contentId || !mediaType || !action || page === undefined) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate media type
        if (mediaType !== 'movie' && mediaType !== 'tv') {
            return NextResponse.json(
                { success: false, error: 'Invalid media type' },
                { status: 400 }
            )
        }

        // Validate action
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

        // Validate page number
        if (!Number.isInteger(page) || page < 1 || page > 100) {
            return NextResponse.json(
                { success: false, error: 'Invalid page number (must be 1-100)' },
                { status: 400 }
            )
        }

        // Determine feedback type (fixed: liked/watchlisted are explicit actions)
        const explicitActions: FeedbackAction[] = ['dismissed', 'hidden', 'liked', 'watchlisted']
        const feedbackType: FeedbackType = explicitActions.includes(action)
            ? 'explicit'
            : 'implicit'

        // Create feedback entry
        const feedback: RecommendationFeedback = {
            id: nanoid(12),
            userId,
            contentId,
            mediaType,
            recommendationPage: page,
            feedbackType,
            action,
            timestamp: Date.now(),
            source: 'recommended_row',
        }

        // Save to Firestore
        const feedbackCollection = collection(db, 'recommendation_feedback')
        await addDoc(feedbackCollection, feedback)

        console.log(
            `[Feedback] ${userId} - ${action} content ${contentId} (${mediaType}) on page ${page}`
        )

        return NextResponse.json({
            success: true,
            feedback,
        })
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

/**
 * GET /api/recommendations/feedback?limit={limit}
 *
 * Get recent feedback for authenticated user
 *
 * Authentication: Requires valid Firebase ID token in Authorization header
 */
async function handleGetFeedback(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url)
        const limitParam = searchParams.get('limit')

        // Validate and cap limit
        const MAX_LIMIT = 500
        const feedbackLimit = limitParam
            ? Math.max(1, Math.min(parseInt(limitParam, 10), MAX_LIMIT))
            : 100

        // Get recent feedback (last 30 days)
        const thirtyDaysAgo =
            Date.now() - FEEDBACK_CONSTRAINTS.RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000

        const feedbackCollection = collection(db, 'recommendation_feedback')
        const q = query(
            feedbackCollection,
            where('userId', '==', userId),
            where('timestamp', '>=', thirtyDaysAgo),
            orderBy('timestamp', 'desc'),
            limit(feedbackLimit)
        )

        const querySnapshot = await getDocs(q)
        const feedback: RecommendationFeedback[] = []

        querySnapshot.forEach((doc) => {
            feedback.push(doc.data() as RecommendationFeedback)
        })

        console.log(`[Feedback] Retrieved ${feedback.length} feedback entries for user ${userId}`)

        return NextResponse.json({
            success: true,
            feedback,
            count: feedback.length,
        })
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
