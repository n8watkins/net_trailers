/**
 * Public User Liked Content Page
 *
 * Shows all liked movies/TV shows for a specific user's public profile
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../../firebase'
import SubPageLayout from '../../../../components/layout/SubPageLayout'
import ContentCard from '../../../../components/common/ContentCard'
import NetflixLoader from '../../../../components/common/NetflixLoader'
import { HeartIcon, UserIcon } from '@heroicons/react/24/outline'
import type { Movie, TVShow } from '../../../../typings'
import Link from 'next/link'

export default function UserLikedContentPage() {
    const params = useParams()
    const userId = params?.userId as string

    const [likedContent, setLikedContent] = useState<(Movie | TVShow)[]>([])
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

                const displayUsername =
                    legacyProfile.username ||
                    userData.username ||
                    userData.displayName ||
                    userData.email?.split('@')[0] ||
                    'User'

                console.log('[UserLiked] Username:', displayUsername, 'from:', {
                    profileUsername: legacyProfile.username,
                    username: userData.username,
                    displayName: userData.displayName,
                    email: userData.email,
                })

                setUsername(displayUsername)

                const liked = Array.isArray(userData.likedMovies)
                    ? (userData.likedMovies as (Movie | TVShow)[])
                    : []

                setLikedContent(liked)
            } catch (err) {
                console.error('Error loading liked content:', err)
                if (isMounted) {
                    setError((err as Error).message || 'Failed to load liked content')
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
                title="Loading Liked Content..."
                icon={<HeartIcon className="w-8 h-8" />}
                iconColor="text-red-400"
            >
                <NetflixLoader />
            </SubPageLayout>
        )
    }

    if (error) {
        return (
            <SubPageLayout
                title="Error"
                icon={<HeartIcon className="w-8 h-8" />}
                iconColor="text-red-400"
            >
                <div className="max-w-2xl mx-auto text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                        <HeartIcon className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Error Loading Content</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </SubPageLayout>
        )
    }

    return (
        <SubPageLayout
            title={`${username}'s Liked Content`}
            icon={<HeartIcon className="w-8 h-8" />}
            iconColor="text-red-400"
            description={`${likedContent.length} liked ${likedContent.length === 1 ? 'item' : 'items'}`}
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

            {likedContent.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                    {likedContent.map((content) => (
                        <ContentCard key={content.id} content={content} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-zinc-900 rounded-lg border border-zinc-800">
                    <HeartIcon className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Liked Content</h3>
                    <p className="text-gray-400">{username} hasn't liked any content yet</p>
                </div>
            )}
        </SubPageLayout>
    )
}
