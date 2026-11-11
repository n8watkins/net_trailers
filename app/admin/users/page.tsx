'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'
import { DataTable, type FilterGroup } from '@/components/admin/shell/DataTable'
import { BUTTON, CARD, ErrorNote } from '@/components/admin/shell/ui'
import { formatAgo, formatDate } from '@/lib/admin/format'
import { toCsv } from '@/lib/csv'
import type { AdminUserRow } from '@/types/admin'

const FILTERS: FilterGroup<AdminUserRow>[] = [
    {
        id: 'provider',
        label: 'Sign-in method',
        options: [
            { id: 'all', label: 'Any sign-in', test: () => true },
            { id: 'email', label: 'Email link', test: (u) => u.providers.includes('email') },
            { id: 'github', label: 'GitHub', test: (u) => u.providers.includes('github') },
        ],
    },
    {
        id: 'verified',
        label: 'Email verified',
        options: [
            { id: 'all', label: 'Verified or not', test: () => true },
            { id: 'verified', label: 'Verified', test: (u) => u.emailVerified },
            { id: 'unverified', label: 'Unverified', test: (u) => !u.emailVerified },
        ],
    },
]

const csvDate = (iso: string | null) => (iso ? formatDate(iso) : 'Unknown')

function exportCsv(rows: AdminUserRow[]) {
    const header = ['Name', 'Email', 'Joined', 'Last Sign In', 'Verified', 'Provider']
    const body = rows.map((u) => [
        u.displayName,
        u.email,
        csvDate(u.createdAt),
        csvDate(u.lastSignInAt),
        u.emailVerified ? 'Yes' : 'No',
        u.providers.join(' '),
    ])
    const blob = new Blob([toCsv([header, ...body])], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

export default function UsersPage() {
    const [users, setUsers] = useState<AdminUserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch('/api/admin/users')
            .then(async (r) => {
                if (!r.ok) throw new Error()
                setUsers(((await r.json()) as { users: AdminUserRow[] }).users)
            })
            .catch(() => setError('The users could not be loaded. Reload to try again.'))
            .finally(() => setLoading(false))
    }, [])

    return (
        <>
            <AdminPageHeader
                title="Users"
                lead={
                    loading
                        ? 'Every account, newest first.'
                        : `${users.length} accounts, newest first.`
                }
            />
            {error && <ErrorNote>{error}</ErrorNote>}
            <section className={`${CARD} p-4 sm:p-5`}>
                <DataTable
                    label="Users"
                    rows={users}
                    loading={loading}
                    rowKey={(u) => u.uid}
                    empty="No accounts yet."
                    search={{
                        placeholder: 'Search by name or email',
                        text: (u) => `${u.displayName} ${u.email}`,
                    }}
                    filters={FILTERS}
                    toolbar={(visible) => (
                        <button
                            type="button"
                            className={BUTTON.secondary}
                            onClick={() => exportCsv(visible)}
                            disabled={visible.length === 0}
                        >
                            <Download aria-hidden className="size-4" />
                            Export CSV
                        </button>
                    )}
                    columns={[
                        {
                            key: 'user',
                            header: 'User',
                            cell: (u) => (
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-white">{u.email}</p>
                                    <p className="truncate text-[13px] text-gray-500">
                                        {u.displayName || 'No name'}
                                        <span className="sm:hidden">
                                            {' '}
                                            · joined{' '}
                                            {u.createdAt ? formatDate(u.createdAt) : 'unknown'}
                                        </span>
                                    </p>
                                </div>
                            ),
                        },
                        {
                            key: 'joined',
                            header: 'Joined',
                            hideOnPhone: true,
                            className: 'whitespace-nowrap',
                            cell: (u) => (u.createdAt ? formatDate(u.createdAt) : 'Unknown'),
                        },
                        {
                            key: 'last',
                            header: 'Last sign-in',
                            hideOnPhone: true,
                            className: 'whitespace-nowrap',
                            cell: (u) => (u.lastSignInAt ? formatAgo(u.lastSignInAt) : 'Never'),
                        },
                        {
                            key: 'method',
                            header: 'Sign-in',
                            hideOnPhone: true,
                            cell: (u) => (
                                <span className="flex flex-wrap gap-1">
                                    {u.providers.map((p) => (
                                        <span
                                            key={p}
                                            className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-300"
                                        >
                                            {p === 'email'
                                                ? 'Email link'
                                                : p === 'github'
                                                  ? 'GitHub'
                                                  : p}
                                        </span>
                                    ))}
                                    {!u.emailVerified && (
                                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                                            Unverified
                                        </span>
                                    )}
                                </span>
                            ),
                        },
                    ]}
                />
            </section>
        </>
    )
}
