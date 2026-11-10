import type { LimitRule } from '@/lib/durableLimit'
import { Content } from '../../typings'
import { sendEmail } from './gate'
import {
    TrendingContentEmail,
    SocialDigestEmail,
    AnnouncementEmail,
    CustomEmail,
} from './templates'

/**
 * The app's branded emails. Every send goes through the email gate
 * (lib/email/gate.ts), which enforces the site-wide caps plus any per-caller
 * `limits` passed here, and throws EmailLimitError when one is used up.
 * Each method returns null when no email provider is configured.
 */
export class EmailService {
    /**
     * Send daily social digest (batched comments and likes)
     */
    static async sendSocialDigest(
        params: {
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
        },
        limits: LimitRule[] = []
    ) {
        return sendEmail(
            'social-digest',
            {
                to: params.to,
                subject: 'Your Rankings Got Some Action! - NetTrailers',
                react: SocialDigestEmail({
                    userName: params.userName,
                    interactions: params.interactions,
                    unsubscribeToken: params.unsubscribeToken,
                }),
            },
            limits
        )
    }

    /**
     * Send trending content (weekly digest, or the admin's pilot email)
     */
    static async sendTrendingContent(
        params: {
            to: string
            userName: string
            movies: Content[]
            tvShows: Content[]
            unsubscribeToken?: string
        },
        limits: LimitRule[] = []
    ) {
        return sendEmail(
            'trending',
            {
                to: params.to,
                subject: 'Trending This Week - NetTrailers [Demo]',
                react: TrendingContentEmail({
                    userName: params.userName,
                    movies: params.movies,
                    tvShows: params.tvShows,
                    unsubscribeToken: params.unsubscribeToken,
                }),
            },
            limits
        )
    }

    /**
     * Send announcement email
     */
    static async sendAnnouncement(
        params: {
            to: string
            userName: string
            subject: string
            message: string
            unsubscribeToken?: string
        },
        limits: LimitRule[] = []
    ) {
        return sendEmail(
            'announcement',
            {
                to: params.to,
                subject: params.subject,
                react: AnnouncementEmail({
                    userName: params.userName,
                    subject: params.subject,
                    message: params.message,
                    unsubscribeToken: params.unsubscribeToken,
                }),
            },
            limits
        )
    }

    /**
     * Send custom email with rich HTML content
     */
    static async sendCustomEmail(
        params: {
            to: string
            userName: string
            subject: string
            htmlContent: string
            unsubscribeToken?: string
        },
        limits: LimitRule[] = []
    ) {
        return sendEmail(
            'custom',
            {
                to: params.to,
                subject: params.subject,
                react: CustomEmail({
                    userName: params.userName,
                    subject: params.subject,
                    htmlContent: params.htmlContent,
                    unsubscribeToken: params.unsubscribeToken,
                }),
            },
            limits
        )
    }
}
