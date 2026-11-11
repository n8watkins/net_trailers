import type { LimitRule } from '@/lib/durableLimit'
import { Content } from '../../typings'
import { sendEmail } from './gate'
import { announcementEmail, customEmail, socialDigestEmail, trendingEmail } from './templates'
import type { DigestInteraction } from './subjects'

/**
 * The app's branded emails. Every send goes through the email gate
 * (lib/email/gate.ts), which enforces the site-wide caps plus any per-caller
 * `limits` passed here, and throws EmailLimitError when one is used up.
 * Each method returns null when no email provider is configured.
 */
export class EmailService {
    /** Send the weekly social digest (batched comments and likes). */
    static async sendSocialDigest(
        params: {
            to: string
            userName: string
            interactions: DigestInteraction[]
            unsubscribeToken?: string
        },
        limits: LimitRule[] = []
    ) {
        const { to, ...rest } = params
        return sendEmail('social-digest', { to, ...(await socialDigestEmail(rest)) }, limits)
    }

    /** Send trending content (weekly digest, or the admin's pilot email). */
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
        const { to, ...rest } = params
        return sendEmail('trending', { to, ...(await trendingEmail(rest)) }, limits)
    }

    /** Send an announcement email. */
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
        const { to, ...rest } = params
        return sendEmail('announcement', { to, ...(await announcementEmail(rest)) }, limits)
    }

    /** Send a custom email with sanitised rich HTML content. */
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
        const { to, ...rest } = params
        return sendEmail('custom', { to, ...(await customEmail(rest)) }, limits)
    }
}
