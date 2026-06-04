import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../../lib/auth-middleware'

/**
 * GET /api/admin/check
 *
 * Check if current user is admin
 * Returns { isAdmin: boolean }
 */
async function handleCheckAdmin(request: NextRequest, userId: string): Promise<NextResponse> {
    const ADMIN_UID = process.env.ADMIN_UID
    const isAdmin = ADMIN_UID && userId === ADMIN_UID

    return NextResponse.json({ isAdmin })
}

export const GET = withAuth(handleCheckAdmin)
