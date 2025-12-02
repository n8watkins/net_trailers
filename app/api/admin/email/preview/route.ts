import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../../../lib/auth-middleware'
import { getAdminDb } from '../../../../../lib/firebase-admin'
import {
    renderTrendingPreview,
    renderSocialPreview,
    renderAnnouncementPreview,
    renderCustomPreview,
} from '../../../../../lib/email/preview-renderer'

/**
 * POST /api/admin/email/preview
 *
 * Generate email preview HTML for selected template and user (ADMIN ONLY)
 * Requires authentication
 */
async function handlePreviewEmail(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // ADMIN ONLY: Check if user is admin
        const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID
        if (!ADMIN_UID || userId !== ADMIN_UID) {
            console.error('[AdminEmailPreview] User is not admin:', userId)
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            )
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

        console.log(
            `👁️ [AdminEmailPreview] Generating ${template} preview for user: ${targetUserId}`
        )

        const db = getAdminDb()

        // Fetch target user data
        const userDoc = await db.collection('users').doc(targetUserId).get()
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const userData = userDoc.data()
        const userName = userData?.displayName || 'there'

        let html = ''

        // Generate preview based on template
        switch (template) {
            case 'trending': {
                // For preview, use sample data or fetch actual trending content
                // For now, use empty arrays (same as send endpoint)
                const movies: any[] = []
                const tvShows: any[] = []

                html = await renderTrendingPreview({
                    userName,
                    movies,
                    tvShows,
                })
                break
            }

            case 'social': {
                // For preview, use sample data or fetch actual interactions
                const interactions: any[] = []

                html = await renderSocialPreview({
                    userName,
                    interactions,
                })
                break
            }

            case 'announcement': {
                if (!subject || !customMessage) {
                    return NextResponse.json(
                        { error: 'Subject and customMessage required for announcement preview' },
                        { status: 400 }
                    )
                }

                html = await renderAnnouncementPreview({
                    userName,
                    subject,
                    message: customMessage,
                })
                break
            }

            case 'custom': {
                if (!subject || !customHtmlContent) {
                    return NextResponse.json(
                        { error: 'Subject and customHtmlContent required for custom preview' },
                        { status: 400 }
                    )
                }

                html = await renderCustomPreview({
                    userName,
                    subject,
                    htmlContent: customHtmlContent,
                })
                break
            }

            default:
                return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
        }

        console.log(`👁️ [AdminEmailPreview] Preview generated successfully`)

        return NextResponse.json({
            success: true,
            html,
            previewUser: {
                userId: targetUserId,
                displayName: userName,
                email: userData?.email,
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

export const POST = withAuth(handlePreviewEmail)
