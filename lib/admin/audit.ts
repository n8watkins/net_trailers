/**
 * The admin audit log (`admin_audit`): who did what, when, with counts. Keep
 * details to counts, ids of jobs and short labels: never an email body, a
 * subject or a recipient's address. The only address stored is the admin's.
 */

import { desc } from 'drizzle-orm'

import { db } from '@/db'
import { adminAudit } from '@/db/schema'

import type { AdminActor } from './guard'

export type AdminAction = 'email.send' | 'email.test' | 'job.run'

export type AuditDetails = Record<string, string | number | boolean | null>

export type AuditEntry = {
    id: string
    actorEmail: string | null
    action: string
    details: AuditDetails | null
    createdAt: number
}

/** Record one admin action. A failed write is thrown: an unrecorded action is a bug. */
export async function writeAdminAudit(
    actor: AdminActor,
    action: AdminAction,
    details: AuditDetails = {},
    now: number = Date.now()
): Promise<void> {
    await db.insert(adminAudit).values({
        actorId: actor.userId,
        actorEmail: actor.email,
        action,
        details,
        createdAt: now,
    })
}

/** The latest entries, newest first. */
export async function listAdminAudit(limit = 50): Promise<AuditEntry[]> {
    const rows = await db
        .select({
            id: adminAudit.id,
            actorEmail: adminAudit.actorEmail,
            action: adminAudit.action,
            details: adminAudit.details,
            createdAt: adminAudit.createdAt,
        })
        .from(adminAudit)
        .orderBy(desc(adminAudit.createdAt))
        .limit(limit)
    return rows.map((row) => ({ ...row, details: row.details ?? null }))
}
