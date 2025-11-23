'use client'

import { useRouter } from 'next/navigation'
import { useSmartSearchStore } from '../../stores/smartSearchStore'
import { SmartInput } from '../common/SmartInput'

export default function SmartSearchInput() {
    const router = useRouter()
    const { query, isActive, setQuery, setActive, setLoading } = useSmartSearchStore()

    const handleChange = (value: string) => {
        setQuery(value)
    }

    const handleSubmit = () => {
        setActive(false)
        // Set loading state BEFORE navigation so the loader shows immediately
        setLoading(true)
        // Navigate to smart search page with query
        router.push(`/smartsearch?q=${encodeURIComponent(query.trim())}`)
    }

    const handleFocus = () => {
        setActive(true)
    }

    const handleBlur = () => {
        setActive(false)
    }

    return (
        <SmartInput
            value={query}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onFocus={handleFocus}
            onBlur={handleBlur}
            isActive={isActive}
            showTypewriter={true}
            size="default"
            variant="transparent"
            shimmer="wave"
            showSurpriseMe={true}
        />
    )
}
