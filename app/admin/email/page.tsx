'use client'

import EmailComposer from '@/components/admin/EmailComposer'
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader'

export default function EmailComposePage() {
    return (
        <>
            <AdminPageHeader
                title="Email"
                lead="Write an announcement or a custom email. Users with email off are never sent to."
            />
            <EmailComposer />
        </>
    )
}
