/**
 * GET /api/admin/email/history
 *
 * Returns the last 100 email send records from the `admin_emails` table.
 * ADMIN ONLY. Session-based auth via validateAdminRequest.
 */

import { desc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/db'
import { adminEmails } from '@/db/schema'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

export async function GET(request: NextRequest) {
    try {
        const authResult = await validateAdminRequest(request)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        console.log('[AdminEmailHistory] Fetching email history')

        const rows = await db
            .select()
            .from(adminEmails)
            .orderBy(desc(adminEmails.sentAt))
            .limit(100)

        // Map new schema columns to the shape expected by EmailHistory.tsx.
        // adminEmails: type (≈template), sentCount (≈successCount), failedCount
        const history = rows.map((row) => ({
            id: row.id,
            template: row.type,
            subject: row.subject ?? '',
            recipientCount: row.sentCount + row.failedCount,
            successCount: row.sentCount,
            failureCount: row.failedCount,
            sentAt: row.sentAt,
            sentBy: row.sentBy ?? '',
        }))

        console.log(`[AdminEmailHistory] Returning ${history.length} records`)

        return NextResponse.json({ success: true, history })
    } catch (error) {
        console.error('[AdminEmailHistory] Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch email history',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
