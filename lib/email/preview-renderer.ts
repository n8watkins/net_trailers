/**
 * Email Preview Renderer
 *
 * Utilities for rendering React email templates to HTML for preview purposes
 * Uses the same templates as actual email sending for consistency
 */

import { render } from '@react-email/render'
import {
    TrendingContentEmail,
    SocialDigestEmail,
} from './templates'
import type { Content } from '../../typings'

/**
 * Render trending content email to HTML
 */
export async function renderTrendingPreview(params: {
    userName: string
    movies: Content[]
    tvShows: Content[]
}): Promise<string> {
    const html = await render(
        TrendingContentEmail({
            userName: params.userName,
            movies: params.movies,
            tvShows: params.tvShows,
            unsubscribeToken: 'preview-token',
        })
    )
    return html
}

/**
 * Render social digest email to HTML
 */
export async function renderSocialPreview(params: {
    userName: string
    interactions: Array<{
        type: 'comment' | 'like'
        rankingId: string
        rankingTitle: string
        commenterName?: string
        commentText?: string
        commentId?: string
        isReply?: boolean
        parentCommentText?: string
        likerNames?: string[]
    }>
}): Promise<string> {
    const html = await render(
        SocialDigestEmail({
            userName: params.userName,
            interactions: params.interactions,
            unsubscribeToken: 'preview-token',
        })
    )
    return html
}

/**
 * Render announcement email to HTML
 * Simple template for system announcements
 */
export async function renderAnnouncementPreview(params: {
    userName: string
    subject: string
    message: string
}): Promise<string> {
    // For now, return a simple HTML template
    // TODO: Create proper React component in Phase 3
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.subject}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #111; color: #fff; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #e50914; font-size: 32px; margin: 0;">📢 Net Trailers</h1>
        </div>

        <!-- Content -->
        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 30px;">
            <h2 style="color: #fff; font-size: 24px; margin-top: 0;">${params.subject}</h2>

            <p style="color: #ccc; line-height: 1.6; margin-bottom: 20px;">
                Hello ${params.userName},
            </p>

            <div style="background-color: #222; border-left: 4px solid #e50914; padding: 20px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #fff; line-height: 1.8; margin: 0; white-space: pre-wrap;">${params.message}</p>
            </div>

            <p style="color: #999; font-size: 14px; margin-top: 30px; margin-bottom: 0;">
                This is an official announcement from the Net Trailers admin team.
            </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #333;">
            <p style="color: #666; font-size: 12px; margin: 0;">
                Net Trailers - Your Ultimate Movie & TV Discovery Platform
            </p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return html
}

/**
 * Render custom email to HTML
 * Fully custom email with user-provided content
 */
export async function renderCustomPreview(params: {
    userName: string
    subject: string
    message: string
}): Promise<string> {
    // For now, return a simple HTML template
    // TODO: Create proper React component with rich text support in Phase 3
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.subject}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #111; color: #fff; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #e50914; font-size: 32px; margin: 0;">✉️ Net Trailers</h1>
        </div>

        <!-- Content -->
        <div style="background-color: #1a1a1a; border-radius: 8px; padding: 30px;">
            <h2 style="color: #fff; font-size: 24px; margin-top: 0;">${params.subject}</h2>

            <p style="color: #ccc; line-height: 1.6; margin-bottom: 20px;">
                Hello ${params.userName},
            </p>

            <div style="color: #fff; line-height: 1.8; margin: 20px 0; white-space: pre-wrap;">
                ${params.message}
            </div>

            <p style="color: #999; font-size: 14px; margin-top: 30px; margin-bottom: 0;">
                This email was sent from the Net Trailers admin panel.
            </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #333;">
            <p style="color: #666; font-size: 12px; margin: 0;">
                Net Trailers - Your Ultimate Movie & TV Discovery Platform
            </p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return html
}
