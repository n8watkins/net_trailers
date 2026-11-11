/**
 * POST /api/admin/email/recipients (admin only)
 *
 * The recipient preview the composer's confirm step shows before a send: how
 * many of the selected users will get the email, the first few addresses, and
 * how many are skipped because email is off for them (including everyone who
 * unsubscribed). The same rule as the send route (lib/admin/recipients.ts).
 */

import { asc, eq, inArray } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { userPreferences, users } from '@/db/schema'
import { badRequest, readJson, requireAdmin, serverError } from '@/lib/admin/guard'
import { canReceiveAdminEmail } from '@/lib/admin/recipients'
import { MAX_RECIPIENTS_PER_REQUEST } from '@/lib/admin/schemas'

const body = z
    .object({
        userIds: z.array(z.string().trim().min(1).max(100)).min(1).max(MAX_RECIPIENTS_PER_REQUEST),
    })
    .strict()

const SAMPLE_SIZE = 5

export async function POST(request: NextRequest) {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const parsed = body.safeParse(await readJson(request))
    if (!parsed.success) return badRequest()
    const requested = [...new Set(parsed.data.userIds)]

    try {
        const rows = await db
            .select({ id: users.id, email: users.email, prefs: userPreferences.data })
            .from(users)
            .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
            .where(inArray(users.id, requested))
            .orderBy(asc(users.email))

        const eligible = rows.filter((row) => row.email && canReceiveAdminEmail(row.prefs))
        return NextResponse.json({
            count: eligible.length,
            sample: eligible.slice(0, SAMPLE_SIZE).map((row) => row.email),
            skippedOptedOut: rows.length - eligible.length,
            notFound: requested.length - rows.length,
        })
    } catch (error) {
        console.error('[AdminEmailRecipients] Error:', error)
        return serverError('Failed to load recipients')
    }
}
