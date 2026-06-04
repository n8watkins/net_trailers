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
    AnnouncementEmail,
    CustomEmail,
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
 * React component template for system announcements
 */
export async function renderAnnouncementPreview(params: {
    userName: string
    subject: string
    message: string
}): Promise<string> {
    const html = await render(
        AnnouncementEmail({
            userName: params.userName,
            subject: params.subject,
            message: params.message,
            unsubscribeToken: 'preview-token',
        })
    )
    return html
}

/**
 * Render custom email to HTML
 * React component with rich HTML content support
 */
export async function renderCustomPreview(params: {
    userName: string
    subject: string
    htmlContent: string
}): Promise<string> {
    const html = await render(
        CustomEmail({
            userName: params.userName,
            subject: params.subject,
            htmlContent: params.htmlContent,
            unsubscribeToken: 'preview-token',
        })
    )
    return html
}
