/**
 * POST /api/admin/email/preview
 *
 * Generate email preview HTML for selected template and user. ADMIN ONLY.
 * User data is fetched from Drizzle `user` + `profiles` tables.
 * Auth via validateAdminRequest (session-based).
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { profiles, users } from '@/db/schema'
import { sanitizeEmailHtml, validateEmailTemplate } from '@/lib/email/email-validation'
import {
    renderAnnouncementPreview,
    renderCustomPreview,
    renderSocialPreview,
    renderTrendingPreview,
} from '@/lib/email/preview-renderer'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

export async function POST(request: NextRequest) {
    try {
        const authResult = await validateAdminRequest(request)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        const body = await request.json()
        const {
            template,
            userId: targetUserId,
            subject,
            customMessage,
            customHtmlContent,
        }: {
            template: 'trending' | 'social' | 'announcement' | 'custom'
            userId: string
            subject?: string
            customMessage?: string
            customHtmlContent?: string
        } = body

        if (!template || !targetUserId) {
            return NextResponse.json(
                { error: 'Missing required fields: template, userId' },
                { status: 400 }
            )
        }

        const validation = validateEmailTemplate({
            template,
            subject,
            customMessage,
            customHtmlContent,
        })
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        console.log(`[AdminEmailPreview] Generating ${template} preview for user: ${targetUserId}`)

        const sanitizedHtmlContent =
            template === 'custom' && customHtmlContent
                ? sanitizeEmailHtml(customHtmlContent)
                : customHtmlContent

        // Fetch target user data from Drizzle.
        const userRows = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.id, targetUserId))
            .limit(1)

        if (userRows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const profileRows = await db
            .select({ displayName: profiles.displayName })
            .from(profiles)
            .where(eq(profiles.userId, targetUserId))
            .limit(1)

        const userEmail = userRows[0].email
        const userName = profileRows[0]?.displayName ?? 'there'

        let html = ''

        switch (template) {
            case 'trending':
                html = await renderTrendingPreview({ userName, movies: [], tvShows: [] })
                break

            case 'social':
                html = await renderSocialPreview({ userName, interactions: [] })
                break

            case 'announcement':
                html = await renderAnnouncementPreview({
                    userName,
                    subject: subject!,
                    message: customMessage!,
                })
                break

            case 'custom':
                html = await renderCustomPreview({
                    userName,
                    subject: subject!,
                    htmlContent: sanitizedHtmlContent!,
                })
                break

            default:
                return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            html,
            previewUser: {
                userId: targetUserId,
                displayName: userName,
                email: userEmail,
            },
        })
    } catch (error) {
        console.error('[AdminEmailPreview] Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to generate preview',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
