import { resend } from './resend'
import {
    PasswordResetEmail,
    EmailVerificationEmail,
    EmailChangeEmail,
    TrendingContentEmail,
    SocialDigestEmail,
    AnnouncementEmail,
    CustomEmail,
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
     * Send daily social digest (batched comments and likes)
     */
    static async sendSocialDigest(params: {
        to: string
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
        unsubscribeToken?: string
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: 'Your Rankings Got Some Action! - Net Trailers',
            react: SocialDigestEmail({
                userName: params.userName,
                interactions: params.interactions,
                unsubscribeToken: params.unsubscribeToken,
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
        unsubscribeToken?: string
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
                unsubscribeToken: params.unsubscribeToken,
            }),
        })
    }

    /**
     * Send announcement email
     */
    static async sendAnnouncement(params: {
        to: string
        userName: string
        subject: string
        message: string
        unsubscribeToken?: string
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: params.subject,
            react: AnnouncementEmail({
                userName: params.userName,
                subject: params.subject,
                message: params.message,
                unsubscribeToken: params.unsubscribeToken,
            }),
        })
    }

    /**
     * Send custom email with rich HTML content
     */
    static async sendCustomEmail(params: {
        to: string
        userName: string
        subject: string
        htmlContent: string
        unsubscribeToken?: string
    }) {
        if (!this.isAvailable()) return null
        return await resend!.emails.send({
            from: `${APP_NAME} <${SENDER_EMAIL}>`,
            to: params.to,
            subject: params.subject,
            react: CustomEmail({
                userName: params.userName,
                subject: params.subject,
                htmlContent: params.htmlContent,
                unsubscribeToken: params.unsubscribeToken,
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
