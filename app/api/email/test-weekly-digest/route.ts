import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../../lib/auth-middleware'
import { isCurrentUserAdmin } from '@/db/queries/_helpers'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/email/test-weekly-digest
 *
 * Test endpoint for weekly digest - calls the cron job internally (ADMIN ONLY)
 * Requires authentication (not CRON_SECRET)
 */
async function handleTestWeeklyDigest(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // ADMIN ONLY: identity comes from the Auth.js session (ADMIN_GITHUB_LOGIN),
        // not the removed ADMIN_UID env var.
        if (!(await isCurrentUserAdmin())) {
            console.error('[TestWeeklyDigest] User is not admin:', userId)
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { demoMode = false } = body

        if (!CRON_SECRET) {
            return NextResponse.json(
                { error: 'CRON_SECRET not configured on server' },
                { status: 500 }
            )
        }

        // Call the cron endpoint internally with CRON_SECRET and adminOnly=true
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const params = new URLSearchParams()
        params.set('adminOnly', 'true') // ADMIN ONLY: Only process admin user
        if (demoMode) params.set('demo', 'true')

        const cronUrl = `${baseUrl}/api/cron/update-trending?${params.toString()}`

        console.log(`[TestWeeklyDigest] Calling trending cron with adminOnly=true: ${cronUrl}`)

        const response = await fetch(cronUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${CRON_SECRET}`,
            },
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Failed to run weekly digest')
        }

        return NextResponse.json({
            success: true,
            message: demoMode ? 'Demo digest completed' : 'Weekly digest completed',
            newItems: data.newItems,
            notifications: data.notifications,
            emailsSent: data.emailsSent,
            demoMode: data.demoMode,
        })
    } catch (error) {
        console.error('Error in test-weekly-digest route:', error)
        return NextResponse.json(
            {
                error: 'Failed to test weekly digest',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export const POST = withAuth(handleTestWeeklyDigest)
