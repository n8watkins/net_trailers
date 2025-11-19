/**
 * Public User Collection Detail Page
 *
 * Shows a specific public collection from a user's profile
 */

'use client'

import { useEffect, useState, use } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../../../firebase'
import SubPageLayout from '../../../../../components/layout/SubPageLayout'
import ContentCard from '../../../../../components/common/ContentCard'
import NetflixLoader from '../../../../../components/common/NetflixLoader'
import { RectangleStackIcon, UserIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import type { UserList } from '../../../../../types/userLists'
import Link from 'next/link'

interface CollectionDetailPageProps {
    params: Promise<{
        userId: string
        collectionId: string
    }>
}

export default function CollectionDetailPage({ params }: CollectionDetailPageProps) {
    const resolvedParams = use(params)
    const { userId, collectionId } = resolvedParams

    const [collection, setCollection] = useState<UserList | null>(null)
    const [username, setUsername] = useState<string>('User')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!userId || !collectionId) return

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

                // Collections are private - not accessible via public profile
                const foundCollection = null

                if (!foundCollection) {
                    throw new Error('Collection not found or not public')
                }

                setCollection(foundCollection)
            } catch (err) {
                console.error('Error loading collection:', err)
                if (isMounted) {
                    setError((err as Error).message || 'Failed to load collection')
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
    }, [userId, collectionId])

    if (isLoading) {
        return (
            <SubPageLayout
                title="Loading Collection..."
                icon={<RectangleStackIcon className="w-8 h-8" />}
                iconColor="text-purple-400"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    if (error || !collection) {
        return (
            <SubPageLayout
                title="Collection Not Found"
                icon={<RectangleStackIcon className="w-8 h-8" />}
                iconColor="text-purple-400"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <RectangleStackIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Collection Not Found</h2>
                    <p className="text-gray-400">
                        {error || 'This collection does not exist or is not public.'}
                    </p>
                </div>
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title={collection.name}
            icon={<RectangleStackIcon className="w-8 h-8" />}
            iconColor="text-purple-400"
            description={`${collection.items?.length || 0} items`}
        >
            {/* Back to Profile Link */}
            <div className="mb-6">
                <Link
                    href={`/users/${userId}`}
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to {username}&apos;s Profile
                </Link>
            </div>

            {/* Collection Header */}
            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
                <div className="flex items-start gap-3">
                    {collection.emoji && (
                        <span className="text-4xl flex-shrink-0">{collection.emoji}</span>
                    )}
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-white mb-2">{collection.name}</h1>
                        <p className="text-gray-500 text-sm mb-2">
                            By {username} • {collection.items?.length || 0} items
                        </p>
                        {collection.description && (
                            <p className="text-gray-400 mt-4">{collection.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Collection Items */}
            {collection.items && collection.items.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {collection.items.map((item) => (
                        <ContentCard key={item.id} content={item} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
                    <RectangleStackIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Empty Collection</h3>
                    <p className="text-gray-400">This collection doesn&apos;t have any items yet</p>
                </div>
            )}
        </SubPageLayout>
    )
}
