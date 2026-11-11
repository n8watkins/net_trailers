/**
 * POST /api/admin/email/preview
 *
 * Render the composed email for one selected user (admin only). Users with
 * email off are refused, as the send route would skip them.
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { profiles, userPreferences, users } from '@/db/schema'
import { badRequest, readJson, requireAdmin, serverError } from '@/lib/admin/guard'
import { canReceiveAdminEmail } from '@/lib/admin/recipients'
import { emailPreviewBody } from '@/lib/admin/schemas'
import { sanitizeEmailHtml, validateEmailTemplate } from '@/lib/email/email-validation'
import { renderAnnouncementPreview, renderCustomPreview } from '@/lib/email/preview-renderer'

export async function POST(request: NextRequest) {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const parsed = emailPreviewBody.safeParse(await readJson(request))
    if (!parsed.success) return badRequest()
    const { template, userId, subject, customMessage, customHtmlContent } = parsed.data

    const validation = validateEmailTemplate({
        template,
        subject,
        customMessage,
        customHtmlContent,
    })
    if (!validation.valid) return badRequest(validation.error)

    try {
        const [row] = await db
            .select({
                email: users.email,
                displayName: profiles.displayName,
                prefs: userPreferences.data,
            })
            .from(users)
            .leftJoin(profiles, eq(profiles.userId, users.id))
            .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
            .where(eq(users.id, userId))
            .limit(1)

        if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 })
        if (!canReceiveAdminEmail(row.prefs)) {
            return NextResponse.json(
                { error: 'This user has email turned off and would not get it' },
                { status: 409 }
            )
        }

        const userName = row.displayName ?? 'there'
        const html =
            template === 'announcement'
                ? await renderAnnouncementPreview({
                      userName,
                      subject: subject ?? '',
                      message: customMessage ?? '',
                  })
                : await renderCustomPreview({
                      userName,
                      subject: subject ?? '',
                      htmlContent: sanitizeEmailHtml(customHtmlContent ?? ''),
                  })

        return NextResponse.json({
            success: true,
            html,
            previewUser: { userId, displayName: userName, email: row.email },
        })
    } catch (error) {
        console.error('[AdminEmailPreview] Error:', error)
        return serverError('Failed to generate preview')
    }
}
