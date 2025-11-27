'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useUserData from '../../hooks/useUserData'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { RectangleStackIcon } from '@heroicons/react/24/solid'
import NetflixLoader from '../../components/common/NetflixLoader'
import { getCollectionPath } from '../../utils/slugify'

const Collections = () => {
    const router = useRouter()
    const userData = useUserData()
    const { getAllLists } = userData

    // Get all available lists
    const allLists = useMemo(() => {
        return getAllLists()
    }, [getAllLists])

    // Redirect to specific collection when lists are loaded
    useEffect(() => {
        if (allLists.length > 0) {
            // Try to restore from localStorage first
            const savedId = localStorage.getItem('nettrailer_selected_collection')
            const savedList = savedId && allLists.find((list) => list.id === savedId)

            if (savedList) {
                router.push(getCollectionPath(savedList))
            } else {
                // Fall back to Watch Later or first list
                const watchlistDefault = allLists.find((list) => list.name === 'Watch Later')
                if (watchlistDefault) {
                    router.push(getCollectionPath(watchlistDefault))
                } else {
                    router.push(getCollectionPath(allLists[0]))
                }
            }
        }
    }, [allLists, router])

    // Show loading state while redirecting
    return (
        <SubPageLayout
            title="Collections"
            icon={<RectangleStackIcon />}
            iconColor="text-blue-400"
            description="Keep track of the content you love!"
        >
            <NetflixLoader message="Loading your collections..." inline />
        </SubPageLayout>
    )
}

export default Collections
