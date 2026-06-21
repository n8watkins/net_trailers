/**
 * /api/interactions
 *
 * POST — Record a single interaction for the authenticated user.
 * GET  — Return the authenticated user's recent interactions (+ optional summary).
 *
 * The userId is always read from the Auth.js session; clients MUST NOT send
 * a userId in the request body or query string.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import {
    recordInteraction,
    getRecentInteractions,
    getInteractionSummary,
} from '@/db/queries/interactions'
import type { InteractionType, InteractionSource } from '@/types/interactions'

/* -------------------------------------------------------------------------- */
/*  POST /api/interactions                                                     */
/* -------------------------------------------------------------------------- */

export const POST = withAuth(async (request: NextRequest, userId: string) => {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
        return NextResponse.json({ success: false, error: 'Missing request body' }, { status: 400 })
    }

    const {
        contentId,
        mediaType,
        interactionType,
        genreIds,
        trailerDuration,
        searchQuery,
        collectionId,
        source,
    } = body as Record<string, unknown>

    // --- validate required fields ---
    if (typeof contentId !== 'number' || !Number.isInteger(contentId) || contentId <= 0) {
        return NextResponse.json(
            { success: false, error: 'contentId must be a positive integer' },
            { status: 400 }
        )
    }
    if (mediaType !== 'movie' && mediaType !== 'tv') {
        return NextResponse.json(
            { success: false, error: 'mediaType must be "movie" or "tv"' },
            { status: 400 }
        )
    }
    if (typeof interactionType !== 'string' || !interactionType) {
        return NextResponse.json(
            { success: false, error: 'interactionType is required' },
            { status: 400 }
        )
    }

    // --- validate optional fields ---
    const safeGenreIds = Array.isArray(genreIds)
        ? (genreIds as unknown[]).filter((g): g is number => typeof g === 'number')
        : []

    const safeTrailerDuration =
        typeof trailerDuration === 'number' && trailerDuration >= 0 ? trailerDuration : undefined

    const safeSearchQuery =
        typeof searchQuery === 'string' && searchQuery.trim()
            ? searchQuery.trim().slice(0, 500)
            : undefined

    const safeCollectionId =
        typeof collectionId === 'string' && collectionId.trim()
            ? collectionId.trim().slice(0, 200)
            : undefined

    const safeSource =
        typeof source === 'string' && source.trim()
            ? (source.trim() as InteractionSource)
            : undefined

    try {
        const interaction = await recordInteraction(userId, {
            contentId: contentId as number,
            mediaType: mediaType as 'movie' | 'tv',
            interactionType: interactionType as InteractionType,
            genreIds: safeGenreIds,
            trailerDuration: safeTrailerDuration,
            searchQuery: safeSearchQuery,
            collectionId: safeCollectionId,
            source: safeSource,
        })

        return NextResponse.json({ success: true, interaction }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/interactions] error:', err)
        return NextResponse.json(
            { success: false, error: 'Failed to record interaction' },
            { status: 500 }
        )
    }
})

/* -------------------------------------------------------------------------- */
/*  GET /api/interactions                                                      */
/* -------------------------------------------------------------------------- */

export const GET = withAuth(async (request: NextRequest, userId: string) => {
    const { searchParams } = new URL(request.url)

    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 500) : 50
    const includeSummary = searchParams.get('summary') === 'true'

    try {
        const [recentInteractions, summary] = await Promise.all([
            getRecentInteractions(userId, limit),
            includeSummary ? getInteractionSummary(userId) : Promise.resolve(null),
        ])

        return NextResponse.json({
            success: true,
            interactions: recentInteractions,
            ...(includeSummary ? { summary } : {}),
        })
    } catch (err) {
        console.error('[GET /api/interactions] error:', err)
        return NextResponse.json(
            { success: false, error: 'Failed to load interactions' },
            { status: 500 }
        )
    }
})
