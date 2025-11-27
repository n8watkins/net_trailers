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
import NetflixLoader from '../../../../components/common/NetflixLoader'
import { RectangleStackIcon, UserIcon } from '@heroicons/react/24/outline'
import type { UserList } from '../../../../types/collections'
import type { PublicProfilePayload } from '@/lib/publicProfile'
import Link from 'next/link'

export default function UserCollectionsPage() {
    const params = useParams()
    const userId = params?.userId as string

    const [collections, setCollections] = useState<UserList[]>([])
    const [displayName, setDisplayName] = useState<string>('User')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!userId) return

        let isMounted = true

        const loadData = async () => {
            setIsLoading(true)
            setError(null)

            try {
                // Try to get profile data from API first (includes auth displayName fallback)
                let profileDisplayName = 'User'
                try {
                    const response = await fetch(`/api/public-profile/${userId}`)
                    if (response.ok) {
                        const payload = (await response.json()) as PublicProfilePayload
                        profileDisplayName = payload.profile.displayName
                    }
                } catch (apiError) {
                    console.warn('[UserCollections] API failed, will use client-side data')
                }

                // Fetch user document for collections
                const userDoc = await getDoc(doc(db, 'users', userId))

                if (!userDoc.exists()) {
                    throw new Error('User not found')
                }

                const userData = userDoc.data()

                if (!isMounted) return

                // Use API-derived displayName, or fallback to client-side lookup
                if (profileDisplayName === 'User') {
                    const profileDoc = await getDoc(doc(db, 'profiles', userId))
                    const profileData = profileDoc.exists() ? profileDoc.data() : {}
                    const legacyProfile = userData?.profile || {}
                    profileDisplayName =
                        profileData?.displayName ||
                        legacyProfile.displayName ||
                        userData.displayName ||
                        'User'
                }

                setDisplayName(profileDisplayName)

                // Public collections are stored in userCreatedWatchlists field (historical naming)
                // Note: For authenticated users, collections are in customRows (Zustand store)
                const publicCollections = (userData.userCreatedWatchlists as UserList[]) || []

                // Filter to only show non-system collections
                const userCollections = publicCollections
                    .filter((c) => {
                        if (c.isSystemCollection) return false
                        // TMDB genre-based collections don't store items, they fetch dynamically
                        if (c.collectionType === 'tmdb-genre') return true
                        // Manual and AI-generated collections must have items
                        return c.items && c.items.length > 0
                    })
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

                setCollections(userCollections)
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
            description={`${collections.length} ${collections.length === 1 ? 'collection' : 'collections'}`}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map((collection) => (
                        <Link
                            key={collection.id}
                            href={`/users/${userId}/collections/${collection.id}`}
                            className="group bg-gradient-to-br from-purple-900/30 to-violet-900/20 border border-purple-800/40 hover:border-purple-700/60 rounded-xl p-6 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                {collection.emoji && (
                                    <span className="text-3xl flex-shrink-0">
                                        {collection.emoji}
                                    </span>
                                )}
                                <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2 flex-1 min-w-0">
                                    {collection.name}
                                </h3>
                            </div>

                            {/* Preview Images */}
                            {collection.items && collection.items.length > 0 ? (
                                <div className="flex gap-2 mb-4">
                                    {collection.items.slice(0, 3).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex-1 aspect-[2/3] relative overflow-hidden rounded"
                                        >
                                            {item.poster_path && (
                                                <img
                                                    src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex gap-2 mb-4">
                                    <div className="flex-1 aspect-[2/3] relative overflow-hidden rounded bg-purple-900/30 flex items-center justify-center">
                                        <RectangleStackIcon className="w-12 h-12 text-purple-700" />
                                    </div>
                                </div>
                            )}

                            {/* Collection Info */}
                            <div className="flex items-center justify-between text-sm text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <RectangleStackIcon className="w-4 h-4" />
                                    <span className="font-medium">
                                        {collection.collectionType === 'tmdb-genre'
                                            ? 'Dynamic collection'
                                            : `${collection.items?.length || 0} items`}
                                    </span>
                                </span>
                                <span className="px-2 py-1 rounded-full bg-purple-900/50 text-xs">
                                    {collection.collectionType === 'manual'
                                        ? 'Manual'
                                        : collection.collectionType === 'tmdb-genre'
                                          ? 'Auto-updating'
                                          : 'AI-generated'}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
                    <RectangleStackIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Collections</h3>
                    <p className="text-gray-400">{username} hasn't created any collections yet</p>
                </div>
            )}
        </SubPageLayout>
    )
}
