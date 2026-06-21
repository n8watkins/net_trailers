import { NextResponse } from 'next/server'

import { verifyAuthentication } from '@/lib/auth-middleware'

/**
 * GET /api/admin/check
 *
 * Returns { isAdmin: boolean } for the current session.
 */
export async function GET(): Promise<NextResponse> {
    const result = await verifyAuthentication()
    return NextResponse.json({ isAdmin: Boolean(result.authenticated && result.isAdmin) })
}
