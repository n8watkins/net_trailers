/**
 * POST /api/reports
 *
 * Creates a content report (thread, reply, or poll).
 * Auth.js session is required — the reporter identity is derived server-side.
 *
 * Request body:
 *   contentId   string             — id of the reported thread/reply/poll
 *   contentType ReportContentType  — 'thread' | 'reply' | 'poll'
 *   reason      ReportReason       — one of the enum values from types/forum.ts
 *   details?    string             — optional free-text elaboration
 *   userName?   string             — display name (used as reporterName)
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { createContentReport } from '@/db/queries/contentReports'
import type { ReportContentType, ReportReason } from '@/types/forum'

const VALID_CONTENT_TYPES: ReportContentType[] = ['thread', 'reply', 'poll']
const VALID_REASONS: ReportReason[] = [
    'spam',
    'harassment',
    'inappropriate',
    'misinformation',
    'off-topic',
    'other',
]

async function handleCreateReport(request: NextRequest, userId: string): Promise<NextResponse> {
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
    }

    const { contentId, contentType, reason, details, userName } = body as Record<string, unknown>

    if (typeof contentId !== 'string' || !contentId.trim()) {
        return NextResponse.json({ error: 'contentId is required' }, { status: 400 })
    }
    if (!VALID_CONTENT_TYPES.includes(contentType as ReportContentType)) {
        return NextResponse.json(
            { error: `contentType must be one of: ${VALID_CONTENT_TYPES.join(', ')}` },
            { status: 400 }
        )
    }
    if (!VALID_REASONS.includes(reason as ReportReason)) {
        return NextResponse.json(
            { error: `reason must be one of: ${VALID_REASONS.join(', ')}` },
            { status: 400 }
        )
    }

    const reportId = await createContentReport({
        contentId: contentId.trim(),
        contentType: contentType as ReportContentType,
        // userId comes from the session — never from the request body
        reportedBy: userId,
        reporterName: typeof userName === 'string' && userName.trim() ? userName.trim() : 'User',
        reason: reason as ReportReason,
        details: typeof details === 'string' ? details.trim().slice(0, 1000) : undefined,
    })

    return NextResponse.json({ success: true, reportId }, { status: 201 })
}

export const POST = withAuth(handleCreateReport)
