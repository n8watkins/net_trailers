'use client'

import { DataTable, type FilterGroup } from '@/components/admin/shell/DataTable'
import { formatDateTime } from '@/lib/admin/format'
import { actionLabel, auditDetails } from '@/lib/admin/auditLabels'
import type { AuditEntry } from '@/lib/admin/audit'

const FILTERS: FilterGroup<AuditEntry>[] = [
    {
        id: 'action',
        label: 'Action',
        options: [
            { id: 'all', label: 'All actions', test: () => true },
            { id: 'email', label: 'Email', test: (e) => e.action.startsWith('email.') },
            { id: 'job', label: 'Jobs', test: (e) => e.action.startsWith('job.') },
        ],
    },
]

/** The admin audit log (admin_audit): who did what, with counts only. */
export function AuditTable({ entries }: { entries: AuditEntry[] }) {
    return (
        <div data-testid="audit-log">
            <DataTable
                label="Admin audit log"
                rows={entries}
                rowKey={(e) => e.id}
                empty="No admin actions recorded yet."
                filters={FILTERS}
                search={{
                    placeholder: 'Search actions and details',
                    text: (e) =>
                        `${actionLabel(e)} ${auditDetails(e.details)} ${e.actorEmail ?? ''}`,
                }}
                columns={[
                    {
                        key: 'what',
                        header: 'Action',
                        cell: (e) => (
                            <div className="min-w-0">
                                <p className="text-white">{actionLabel(e)}</p>
                                <p className="text-[13px] break-words text-gray-500">
                                    {auditDetails(e.details)}
                                </p>
                            </div>
                        ),
                    },
                    {
                        key: 'who',
                        header: 'Admin',
                        hideOnPhone: true,
                        cell: (e) => e.actorEmail ?? 'admin',
                    },
                    {
                        key: 'when',
                        header: 'When',
                        className: 'whitespace-nowrap',
                        cell: (e) => formatDateTime(e.createdAt),
                    },
                ]}
            />
        </div>
    )
}
