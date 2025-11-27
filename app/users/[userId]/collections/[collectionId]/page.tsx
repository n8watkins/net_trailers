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
import ContentGridSpacer from '../../../../../components/common/ContentGridSpacer'
import NetflixLoader from '../../../../../components/common/NetflixLoader'
import { RectangleStackIcon, UserIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import type { UserList } from '../../../../../types/collections'
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
                // Fetch both user document and profile document
                const [userDoc, profileDoc] = await Promise.all([
                    getDoc(doc(db, 'users', userId)),
                    getDoc(doc(db, 'profiles', userId)),
                ])

                if (!userDoc.exists() && !profileDoc.exists()) {
                    throw new Error('User not found')
                }

                const userData = userDoc.exists() ? userDoc.data() : {}
                const profileData = profileDoc.exists() ? profileDoc.data() : {}
                const legacyProfile = userData?.profile || {}

                if (!isMounted) return

                // Get display name
                setUsername(
                    profileData?.displayName ||
                        legacyProfile.displayName ||
                        userData.displayName ||
                        'User'
                )

                // Public collections are stored in userCreatedWatchlists field (historical naming)
                // Note: For authenticated users, collections are in customRows (Zustand store)
                const publicCollections = (userData.userCreatedWatchlists as UserList[]) || []

                // Find the collection by ID
                const foundCollection = publicCollections.find((c) => c.id === collectionId)

                if (!foundCollection) {
                    throw new Error('Collection not found')
                }

                // Skip if it's a system collection
                if (foundCollection.isSystemCollection) {
                    throw new Error('System collections are not accessible')
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
            {/* Breadcrumb Navigation */}
            <div className="mb-6 flex items-center gap-3 text-sm">
                <Link
                    href={`/users/${userId}`}
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <UserIcon className="w-4 h-4" />
                    {username}&apos;s Profile
                </Link>
                <span className="text-gray-600">/</span>
                <Link
                    href={`/users/${userId}/collections`}
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                    <RectangleStackIcon className="w-4 h-4" />
                    Collections
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
                <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                    {collection.items.map((item) => (
                        <ContentCard key={item.id} content={item} />
                    ))}
                    <ContentGridSpacer />
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
