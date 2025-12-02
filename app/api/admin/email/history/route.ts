import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../../../lib/auth-middleware'
import { getAdminDb } from '../../../../../lib/firebase-admin'

/**
 * GET /api/admin/email/history
 *
 * Get email history records (ADMIN ONLY)
 * Requires authentication
 */
async function handleGetEmailHistory(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // ADMIN ONLY: Check if user is admin
        const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID
        if (!ADMIN_UID || userId !== ADMIN_UID) {
            console.error('[AdminEmailHistory] User is not admin:', userId)
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            )
        }

        console.log(`📧 [AdminEmailHistory] Fetching email history`)

        const db = getAdminDb()

        // Fetch email history, ordered by sentAt descending (most recent first)
        const historySnapshot = await db
            .collection('admin_emails')
            .orderBy('sentAt', 'desc')
            .limit(100) // Limit to last 100 emails
            .get()

        const history = historySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))

        console.log(`📧 [AdminEmailHistory] Returning ${history.length} records`)

        return NextResponse.json({
            success: true,
            history,
        })
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

export const GET = withAuth(handleGetEmailHistory)
