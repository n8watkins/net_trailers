/**
 * Account Statistics API
 *
 * Public endpoint to show account usage statistics
 * Displays how many account slots are available (e.g., "35/50 spots available")
 */

import { NextResponse } from 'next/server'
import { getAccountStats } from '@/utils/accountLimits'

// Cache for 5 minutes to reduce Firestore reads
export const revalidate = 300

export async function GET() {
    try {
        const stats = await getAccountStats()

        return NextResponse.json(
            {
                success: true,
                stats,
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                },
            }
        )
    } catch (error) {
        console.error('Error fetching account stats:', error)

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch account statistics',
            },
            { status: 500 }
        )
    }
}
