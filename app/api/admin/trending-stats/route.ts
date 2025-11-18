import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import {
    validateAdminRequest,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from '@/utils/adminMiddleware'

export async function GET(req: NextRequest) {
    try {
        // Validate admin access via Firebase Auth
        const authResult = await validateAdminRequest(req)
        if (!authResult.authorized) {
            return authResult.error?.includes('not an administrator')
                ? createForbiddenResponse(authResult.error)
                : createUnauthorizedResponse(authResult.error)
        }

        const db = getAdminDb()

        // Get trending stats
        const trendingDoc = await db.doc('system/trending').get()
        const data = trendingDoc.data() || {}

        return NextResponse.json({
            lastRun: data.lastRun || null,
            totalNotifications: data.totalNotifications || 0,
            lastNewItems: data.lastNewItems || 0,
            moviesSnapshot: data.moviesSnapshot?.length || 0,
            tvSnapshot: data.tvSnapshot?.length || 0,
        })
    } catch (error) {
        console.error('Error getting trending stats:', error)
        return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
    }
}
