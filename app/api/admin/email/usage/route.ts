/**
 * GET /api/admin/email/usage (admin only)
 *
 * Today's and this month's email counts against the site-wide caps, and
 * today's sent and refused counts per kind (lib/email/gate.ts). No addresses.
 */

import { NextResponse } from 'next/server'

import { getEmailUsage } from '@/lib/email/gate'
import {
    createForbiddenResponse,
    createUnauthorizedResponse,
    validateAdminRequest,
} from '@/utils/adminMiddleware'

export async function GET() {
    const authResult = await validateAdminRequest()
    if (!authResult.authorized) {
        return authResult.error?.includes('not an administrator')
            ? createForbiddenResponse(authResult.error)
            : createUnauthorizedResponse(authResult.error)
    }
    return NextResponse.json({ success: true, usage: await getEmailUsage() })
}
