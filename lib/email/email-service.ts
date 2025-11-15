import { resend } from './resend'
import {
    PasswordResetEmail,
    EmailVerificationEmail,
    EmailChangeEmail,
    CollectionUpdateEmail,
    NewReleaseEmail,
    RankingCommentEmail,
    RankingLikeEmail,
    CollectionShareEmail,
    WeeklyDigestEmail,
    TrendingContentEmail,
} from './templates'
import { Content } from '../../typings'

const SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev'
const APP_NAME = 'Net Trailers'

/**
 * Unified email service for sending all types of emails
 * Uses Resend API and branded email templates
 *
 * Note: Resend supports React components directly via the 'react' parameter,
 * which provides better rendering and compatibility than static markup
 */
export class EmailService {
    /**
     * Check if email service is available
     */
    private static isAvailable(): boolean {
        if (!resend) {
            console.warn('Email service not configured - RESEND_API_KEY missing')
            return false
        }
        return true
    }

    /**
     * Send password reset email
     */
    static async sendPasswordReset(params: {
        to: string
        userName?: string
        resetUrl: string
        expiresIn?: number
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: 'Reset Your Password - Net Trailers',
            react: PasswordResetEmail({
                userName: params.userName,
                resetUrl: params.resetUrl,
                expiresIn: params.expiresIn,
            }),
        })
    }

    /**
     * Send email verification
     */
    static async sendEmailVerification(params: {
        to: string
        userName?: string
        verificationUrl: string
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: 'Verify Your Email Address - Net Trailers',
            react: EmailVerificationEmail({
                userName: params.userName,
                verificationUrl: params.verificationUrl,
                email: params.to,
            }),
        })
    }

    /**
     * Send email change confirmation
     */
    static async sendEmailChange(params: {
        to: string
        userName?: string
        oldEmail: string
        newEmail: string
        confirmUrl: string
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: 'Confirm Your Email Change - Net Trailers',
            react: EmailChangeEmail({
                userName: params.userName,
                oldEmail: params.oldEmail,
                newEmail: params.newEmail,
                confirmUrl: params.confirmUrl,
            }),
        })
    }

    /**
     * Send collection update notification
     */
    static async sendCollectionUpdate(params: {
        to: string
        userName?: string
        collectionName: string
        collectionId: string
        newItems: Content[]
        totalNewItems: number
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: `New Content in "${params.collectionName}" - Net Trailers`,
            react: CollectionUpdateEmail({
                userName: params.userName,
                collectionName: params.collectionName,
                collectionId: params.collectionId,
                newItems: params.newItems,
                totalNewItems: params.totalNewItems,
            }),
        })
    }

    /**
     * Send new release notification
     */
    static async sendNewRelease(params: { to: string; userName?: string; releases: Content[] }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: `${params.releases.length} New ${params.releases.length === 1 ? 'Release' : 'Releases'} from Your Watchlist - Net Trailers`,
            react: NewReleaseEmail({
                userName: params.userName,
                releases: params.releases,
            }),
        })
    }

    /**
     * Send ranking comment notification
     */
    static async sendRankingComment(params: {
        to: string
        userName?: string
        rankingTitle: string
        rankingId: string
        commenterName: string
        commentText: string
        commentId: string
        isReply?: boolean
        parentCommentText?: string
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: params.isReply
                ? `${params.commenterName} replied to your comment - Net Trailers`
                : `${params.commenterName} commented on your ranking - Net Trailers`,
            react: RankingCommentEmail({
                userName: params.userName,
                rankingTitle: params.rankingTitle,
                rankingId: params.rankingId,
                commenterName: params.commenterName,
                commentText: params.commentText,
                commentId: params.commentId,
                isReply: params.isReply,
                parentCommentText: params.parentCommentText,
            }),
        })
    }

    /**
     * Send ranking like notification (batched)
     */
    static async sendRankingLike(params: {
        to: string
        userName?: string
        rankingTitle: string
        rankingId: string
        likerNames: string[]
        totalLikes: number
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: `Your ranking "${params.rankingTitle}" got ${params.likerNames.length} new ${params.likerNames.length === 1 ? 'like' : 'likes'} - Net Trailers`,
            react: RankingLikeEmail({
                userName: params.userName,
                rankingTitle: params.rankingTitle,
                rankingId: params.rankingId,
                likerNames: params.likerNames,
                totalLikes: params.totalLikes,
            }),
        })
    }

    /**
     * Send collection share notification
     */
    static async sendCollectionShare(params: {
        to: string
        senderName: string
        collectionName: string
        collectionDescription?: string
        shareUrl: string
        previewItems: Content[]
        totalItems: number
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: `${params.senderName} shared a collection with you - Net Trailers`,
            react: CollectionShareEmail({
                recipientEmail: params.to,
                senderName: params.senderName,
                collectionName: params.collectionName,
                collectionDescription: params.collectionDescription,
                shareUrl: params.shareUrl,
                previewItems: params.previewItems,
                totalItems: params.totalItems,
            }),
        })
    }

    /**
     * Send weekly digest
     */
    static async sendWeeklyDigest(params: {
        to: string
        userName: string
        weekStart: string
        weekEnd: string
        stats: {
            watchlistCount: number
            collectionsCount: number
            newRankings: number
            totalInteractions: number
        }
        trendingContent: {
            movies: Content[]
            tvShows: Content[]
        }
        recommendations: Content[]
        collectionUpdates: Array<{
            name: string
            id: string
            newItemsCount: number
        }>
        communityHighlights: Array<{
            type: 'ranking' | 'thread'
            title: string
            author: string
            engagement: number
        }>
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: `Your Week in Review: ${params.weekStart} - ${params.weekEnd} - Net Trailers`,
            react: WeeklyDigestEmail({
                userName: params.userName,
                weekStart: params.weekStart,
                weekEnd: params.weekEnd,
                stats: params.stats,
                trendingContent: params.trendingContent,
                recommendations: params.recommendations,
                collectionUpdates: params.collectionUpdates,
                communityHighlights: params.communityHighlights,
            }),
        })
    }

    /**
     * Send trending content (test/demo email)
     */
    static async sendTrendingContent(params: {
        to: string
        userName: string
        movies: Content[]
        tvShows: Content[]
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: 'Trending This Week - Net Trailers [Demo]',
            react: TrendingContentEmail({
                userName: params.userName,
                movies: params.movies,
                tvShows: params.tvShows,
            }),
        })
    }

    /**
     * Batch send emails (for notifications)
     * Sends multiple emails with rate limiting
     * @param emails Array of email configurations with to, subject, and React component
     */
    static async batchSend(
        emails: Array<{
            to: string
            subject: string
            react: React.ReactElement
        }>
    ) {
        if (!this.isAvailable()) return []

        const results = []
        const BATCH_SIZE = 10 // Send 10 at a time
        const DELAY_MS = 1000 // 1 second delay between batches

        for (let i = 0; i < emails.length; i += BATCH_SIZE) {
            const batch = emails.slice(i, i + BATCH_SIZE)
            const promises = batch.map((email) =>
                resend!.emails.send({
                    from: `${APP_NAME} <${SENDER_EMAIL}>`,
                    to: email.to,
                    subject: email.subject,
                    react: email.react,
                })
            )

            const batchResults = await Promise.allSettled(promises)
            results.push(...batchResults)

            // Delay between batches to avoid rate limits
            if (i + BATCH_SIZE < emails.length) {
                await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
            }
        }

        return results
    }
}
