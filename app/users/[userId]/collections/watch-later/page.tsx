/**
 * Public User Watch Later Page
 *
 * Shows all watch later items for a specific user's public profile
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../../firebase'
import SubPageLayout from '../../../../components/layout/SubPageLayout'
import ContentCard from '../../../../components/common/ContentCard'
import ContentGridSpacer from '../../../../components/common/ContentGridSpacer'
import NetflixLoader from '../../../../components/common/NetflixLoader'
import { ClockIcon, UserIcon } from '@heroicons/react/24/outline'
import type { Movie, TVShow } from '../../../../typings'
import Link from 'next/link'

export default function UserWatchLaterPage() {
    const params = useParams()
    const userId = params?.userId as string

    const [watchLaterContent, setWatchLaterContent] = useState<(Movie | TVShow)[]>([])
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
                const displayName =
                    profileData?.displayName ||
                    legacyProfile.displayName ||
                    userData.displayName ||
                    'User'

                setUsername(displayName)

                const watchLater = Array.isArray(userData.defaultWatchlist)
                    ? (userData.defaultWatchlist as (Movie | TVShow)[])
                    : []

                setWatchLaterContent(watchLater)
            } catch (err) {
                console.error('Error loading watch later content:', err)
                if (isMounted) {
                    setError((err as Error).message || 'Failed to load watch later content')
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
                title="Loading Watch Later..."
                icon={<ClockIcon className="w-8 h-8" />}
                iconColor="text-indigo-400"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    if (error) {
        return (
            <SubPageLayout
                title="Error"
                icon={<ClockIcon className="w-8 h-8" />}
                iconColor="text-indigo-400"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <ClockIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Error Loading Content</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title={`${username}'s Watch Later`}
            icon={<ClockIcon className="w-8 h-8" />}
            iconColor="text-indigo-400"
            description={`${watchLaterContent.length} ${watchLaterContent.length === 1 ? 'item' : 'items'}`}
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

            {watchLaterContent.length > 0 ? (
                <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                    {watchLaterContent.map((content) => (
                        <ContentCard key={content.id} content={content} />
                    ))}
                    <ContentGridSpacer />
                </div>
            ) : (
                <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
                    <ClockIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Watch Later Items</h3>
                    <p className="text-gray-400">
                        {username} hasn't added anything to watch later yet
                    </p>
                </div>
            )}
        </SubPageLayout>
    )
}
