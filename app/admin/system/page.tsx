import { AuditTable } from '@/components/admin/AuditTable'
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'
import { CARD } from '@/components/admin/shell/ui'
import { listAdminAudit } from '@/lib/admin/audit'

// Read on the server: app/admin/layout.tsx has already checked the admin.
export const dynamic = 'force-dynamic'

export default async function SystemAuditPage() {
    const entries = await listAdminAudit(200)
    return (
        <>
            <AdminPageHeader
                title="System"
                lead="Every email sent and job run from the admin, newest first. Counts only, never a recipient."
            />
            <section className={`${CARD} p-4 sm:p-5`}>
                <AuditTable entries={entries} />
            </section>
        </>
    )
}
