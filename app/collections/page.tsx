'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import useUserData from '../../hooks/useUserData'
import SubPageLayout from '../../components/layout/SubPageLayout'
import { RectangleStackIcon, EyeIcon } from '@heroicons/react/24/solid'
import NetflixLoader from '../../components/common/NetflixLoader'
import { getCollectionPath } from '../../utils/slugify'
import { UserList } from '../../types/collections'
import { useAuthStatus } from '../../hooks/useAuthStatus'

const Collections = () => {
    const userData = useUserData()
    const { isLoading } = useAuthStatus()
    const { getAllLists } = userData

    // Get all available lists
    const allLists = useMemo(() => {
        return getAllLists()
    }, [getAllLists])

    // Helper functions
    const getListIcon = (list: UserList) => {
        if (list.emoji) {
            return <span className="text-sm">{list.emoji}</span>
        }
        return <EyeIcon className="w-4 h-4 text-white" />
    }

    const hexToRgba = (hex: string, opacity: number): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        if (result) {
            const r = parseInt(result[1], 16)
            const g = parseInt(result[2], 16)
            const b = parseInt(result[3], 16)
            return `rgba(${r}, ${g}, ${b}, ${opacity})`
        }
        return `rgba(107, 114, 128, ${opacity})`
    }

    return (
        <SubPageLayout
            title="Collections"
            icon={<RectangleStackIcon />}
            iconColor="text-blue-400"
            description="Browse your collections"
        >
            {isLoading ? (
                <NetflixLoader message="Loading your collections..." inline />
            ) : allLists.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                    <p>No collections yet. Create your first collection!</p>
                </div>
            ) : (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
                    <div className="flex flex-wrap gap-3">
                        {allLists
                            .sort((a, b) => {
                                // Put Watch Later first
                                if (a.name === 'Watch Later') return -1
                                if (b.name === 'Watch Later') return 1
                                return 0
                            })
                            .map((list) => {
                                const listColor = list.color || '#6b7280'
                                const href = getCollectionPath(list)

                                return (
                                    <Link
                                        key={list.id}
                                        href={href}
                                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 text-white border-2"
                                        style={{
                                            borderColor: listColor,
                                            backgroundColor: hexToRgba(listColor, 0.15),
                                        }}
                                    >
                                        {getListIcon(list)}
                                        <span>{list.name}</span>
                                    </Link>
                                )
                            })}
                    </div>
                </div>
            )}
        </SubPageLayout>
    )
}

export default Collections
