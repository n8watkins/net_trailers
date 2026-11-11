'use client'

import EmailHistory from '@/components/admin/EmailHistory'
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'
import { CARD } from '@/components/admin/shell/ui'

export default function EmailHistoryPage() {
    return (
        <>
            <AdminPageHeader title="Email" lead="The last 100 admin sends, with their counts." />
            <section className={`${CARD} p-4 sm:p-5`}>
                <EmailHistory />
            </section>
        </>
    )
}
