import { Suspense } from 'react'

import { ActivityView } from '@/components/admin/ActivityView'
import { Loading } from '@/components/admin/shell/ui'

export default function ActivityLoginsPage() {
    return (
        <Suspense fallback={<Loading />}>
            <ActivityView type="login" />
        </Suspense>
    )
}
