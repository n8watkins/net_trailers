/** How an audit entry reads to people (the Overview and System's audit log). */

import type { AuditEntry } from './audit'

const ACTION_LABELS: Record<string, string> = {
    'email.send': 'Sent an email',
    'email.test': 'Sent a test email to self',
    'job.run': 'Ran a job',
}

export function actionLabel(entry: Pick<AuditEntry, 'action' | 'details'>): string {
    const base = ACTION_LABELS[entry.action] ?? entry.action
    const d = entry.details ?? {}
    if (entry.action === 'job.run' && d.job) return `Ran ${d.job}${d.scope ? ` (${d.scope})` : ''}`
    if (entry.action === 'email.send' && typeof d.sent === 'number') return `${base} to ${d.sent}`
    return base
}

export function auditDetails(details: AuditEntry['details']): string {
    if (!details) return ''
    return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
}
