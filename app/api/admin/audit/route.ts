/** GET /api/admin/audit (admin only): the latest admin actions, newest first. */

import { NextResponse } from 'next/server'

import { listAdminAudit } from '@/lib/admin/audit'
import { requireAdmin, serverError } from '@/lib/admin/guard'

export async function GET() {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response
    try {
        return NextResponse.json({ entries: await listAdminAudit(50) })
    } catch (error) {
        console.error('[admin/audit] Error:', error)
        return serverError('Failed to load the audit log')
    }
}
