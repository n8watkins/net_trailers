'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SettingsRedirect: React.FC = () => {
    const router = useRouter()

    useEffect(() => {
        router.replace('/settings/preferences')
    }, [router])

    return null
}

export default SettingsRedirect
