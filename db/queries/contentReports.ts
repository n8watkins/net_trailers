/**
 * Content reports queries (Drizzle / Turso).
 *
 * Replaces the Firestore `content_reports` collection write in forumStore.ts.
 * The contentReports table is defined in db/schema.ts.
 */

import { db } from '@/db'
import { contentReports } from '@/db/schema'
import type { ReportContentType, ReportReason } from '@/types/forum'

export interface CreateContentReportInput {
    contentId: string
    contentType: ReportContentType
    reportedBy: string
    reporterName: string
    reason: ReportReason
    details?: string
}

/**
 * Insert a new content report.
 *
 * The caller (API route) is responsible for deriving `reportedBy` from the
 * Auth.js session so the client cannot spoof the reporter identity.
 *
 * Returns the auto-generated report id.
 */
export async function createContentReport(input: CreateContentReportInput): Promise<string> {
    const [row] = await db
        .insert(contentReports)
        .values({
            contentId: input.contentId,
            contentType: input.contentType,
            reportedBy: input.reportedBy,
            reporterName: input.reporterName,
            reason: input.reason,
            details: input.details ?? '',
            createdAt: Date.now(),
            status: 'pending',
        })
        .returning({ id: contentReports.id })

    return row.id
}
