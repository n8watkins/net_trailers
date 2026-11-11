import { Suspense } from 'react'

import { ActivityView } from '@/components/admin/ActivityView'
import { Loading } from '@/components/admin/shell/ui'

export default function ActivityViewsPage() {
    return (
        <Suspense fallback={<Loading />}>
            <ActivityView type="view" />
        </Suspense>
    )
}
