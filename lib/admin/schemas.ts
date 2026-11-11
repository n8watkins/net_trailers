/**
 * Request bodies and queries of the admin API, validated with zod so a bad
 * request gets a 400 instead of an internal error.
 */

import { z } from 'zod'

/** The templates the composer offers (the trending and social digests are jobs). */
export const adminEmailTemplate = z.enum(['announcement', 'custom'])

export const MAX_RECIPIENTS_PER_REQUEST = 100

const userId = z.string().trim().min(1).max(100)

const content = {
    template: adminEmailTemplate,
    subject: z.string().trim().min(1).max(200),
    customMessage: z.string().max(20_000).optional(),
    customHtmlContent: z.string().max(100_000).optional(),
}

/** POST /api/admin/email/send: a real send (to `userIds`) or a test to the admin. */
export const emailSendBody = z.discriminatedUnion('mode', [
    z
        .object({
            mode: z.literal('send'),
            userIds: z.array(userId).min(1).max(MAX_RECIPIENTS_PER_REQUEST),
            ...content,
        })
        .strict(),
    z.object({ mode: z.literal('test'), ...content }).strict(),
])

export type EmailSendBody = z.infer<typeof emailSendBody>

/** POST /api/admin/email/preview */
export const emailPreviewBody = z
    .object({
        userId,
        template: adminEmailTemplate,
        subject: z.string().max(200).optional(),
        customMessage: z.string().max(20_000).optional(),
        customHtmlContent: z.string().max(100_000).optional(),
    })
    .strict()

/** POST /api/admin/jobs/[name] */
export const jobRunBody = z.object({ scope: z.enum(['admin', 'all']) }).strict()

/** GET /api/admin/activity */
export const activityQuery = z.object({
    type: z.enum(['all', 'login', 'view']).default('all'),
    period: z.enum(['week', 'month']).default('month'),
    userId: userId.optional(),
})

/** GET /api/admin/users/filtered */
export const recipientFilter = z
    .enum(['all', 'trending', 'social', 'recent', 'inactive'])
    .default('all')
