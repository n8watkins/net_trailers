/**
 * Public User Collections Page
 *
 * Shows all public collections for a specific user's profile
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../../firebase'
import SubPageLayout from '../../../../components/layout/SubPageLayout'
import ContentCard from '../../../../components/common/ContentCard'
import NetflixLoader from '../../../../components/common/NetflixLoader'
import { RectangleStackIcon, UserIcon } from '@heroicons/react/24/outline'
import type { UserList } from '../../../../types/userLists'
import Link from 'next/link'

export default function UserCollectionsPage() {
    const params = useParams()
    const userId = params?.userId as string

    const [collections, setCollections] = useState<UserList[]>([])
    const [username, setUsername] = useState<string>('User')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!userId) return

        let isMounted = true

        const loadData = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const userDoc = await getDoc(doc(db, 'users', userId))

                if (!userDoc.exists()) {
                    throw new Error('User not found')
                }

                const userData = userDoc.data()
                const legacyProfile = userData?.profile || {}

                if (!isMounted) return

                setUsername(
                    legacyProfile.username ||
                        userData.username ||
                        userData.displayName ||
                        userData.email?.split('@')[0] ||
                        'User'
                )

                const allCollections = Array.isArray(userData.userCreatedWatchlists)
                    ? (userData.userCreatedWatchlists as UserList[])
                    : []

                // Filter only public collections
                const publicCollections = allCollections.filter((list) => list?.isPublic)

                setCollections(publicCollections)
            } catch (err) {
                console.error('Error loading collections:', err)
                if (isMounted) {
                    setError((err as Error).message || 'Failed to load collections')
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadData()

        return () => {
            isMounted = false
        }
    }, [userId])

    if (isLoading) {
        return (
            <SubPageLayout
                title="Loading Collections..."
                icon={<RectangleStackIcon className="w-8 h-8" />}
                iconColor="text-purple-400"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    if (error) {
        return (
            <SubPageLayout
                title="Error"
                icon={<RectangleStackIcon className="w-8 h-8" />}
                iconColor="text-purple-400"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <RectangleStackIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Error Loading Collections
                    </h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title={`${username}'s Collections`}
            icon={<RectangleStackIcon className="w-8 h-8" />}
            iconColor="text-purple-400"
            description={`${collections.length} public ${collections.length === 1 ? 'collection' : 'collections'}`}
        >
            {/* Back to Profile Link */}
            <div className="mb-6">
                <Link
                    href={`/users/${userId}`}
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <UserIcon className="w-4 h-4" />
                    Back to {username}'s Profile
                </Link>
            </div>

            {collections.length > 0 ? (
                <div className="space-y-6">
                    {collections.map((collection) => (
                        <div
                            key={collection.id}
                            className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-purple-700/50 transition-colors"
                        >
                            <div className="flex items-start gap-3 mb-4">
                                {collection.emoji && (
                                    <span className="text-3xl flex-shrink-0">
                                        {collection.emoji}
                                    </span>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-white mb-1">
                                        {collection.name}
                                    </h3>
                                    <p className="text-gray-500 text-sm">
                                        {collection.items?.length || 0} items
                                    </p>
                                </div>
                            </div>

                            {collection.description && (
                                <p className="text-gray-400 mb-4">{collection.description}</p>
                            )}

                            {collection.items && collection.items.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                                    {collection.items.map((item) => (
                                        <ContentCard key={item.id} content={item} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
                    <RectangleStackIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Public Collections</h3>
                    <p className="text-gray-400">
                        {username} hasn't created any public collections yet
                    </p>
                </div>
            )}
        </SubPageLayout>
    )
}
