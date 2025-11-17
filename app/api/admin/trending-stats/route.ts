import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
    try {
        // Verify admin
        const authHeader = req.headers.get('authorization')
        const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN

        if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== adminToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
