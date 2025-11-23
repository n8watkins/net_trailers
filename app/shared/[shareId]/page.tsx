'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    LinkIcon,
    UserIcon,
    EyeIcon,
    ClockIcon,
    PlusCircleIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import { SharedCollectionData } from '../../../types/sharing'
import { Content } from '../../../typings'
import ContentCard from '../../../components/common/ContentCard'
import ContentGridSpacer from '../../../components/common/ContentGridSpacer'
import { useToast } from '../../../hooks/useToast'
import { useSessionStore } from '../../../stores/sessionStore'
import { getAuthHeaders } from '../../../utils/auth'

/**
 * SharedCollectionView Page
 *
 * Public page for viewing shared collections via share link.
 * No authentication required for viewing.
 */
export default function SharedCollectionViewPage() {
    const params = useParams()
    const router = useRouter()
    const shareId = params?.shareId as string

    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [shareData, setShareData] = useState<SharedCollectionData | null>(null)
    const [collectionItems, setCollectionItems] = useState<Content[]>([])
    const [isDuplicating, setIsDuplicating] = useState(false)

    const { showSuccess, showError } = useToast()
    const sessionType = useSessionStore((state) => state.sessionType)
    const getUserId = useSessionStore((state) => state.getUserId)

    const isAuthenticated = sessionType !== null && sessionType !== 'guest'
    const userId = getUserId()

    useEffect(() => {
        loadSharedCollection()
    }, [shareId])

    const loadSharedCollection = async () => {
        try {
            setIsLoading(true)
            setError(null)

            // Fetch shared collection data
            const response = await fetch(`/api/shares/${shareId}`)
            const data = await response.json()

            if (!data.success) {
                setError(data.error || 'Failed to load shared collection')
                return
            }

            setShareData(data.data)

            // Fetch content details for each item
            await loadCollectionItems(data.data.contentIds)
        } catch (err) {
            console.error('Error loading shared collection:', err)
            setError('Failed to load shared collection')
        } finally {
            setIsLoading(false)
        }
    }

    const loadCollectionItems = async (contentIds: number[]) => {
        try {
            // Fetch content details from TMDB
            const itemPromises = contentIds.slice(0, 50).map(async (id) => {
                // Try movie first, then TV if it fails
                try {
                    const movieRes = await fetch(`/api/movies/${id}`)
                    if (movieRes.ok) {
                        const movie = await movieRes.json()
                        return { ...movie, media_type: 'movie' } as Content
                    }
                } catch (e) {
                    // Try TV
                }

                try {
                    const tvRes = await fetch(`/api/movies/${id}`)
                    if (tvRes.ok) {
                        const show = await tvRes.json()
                        return { ...show, media_type: 'tv' } as Content
                    }
                } catch (e) {
                    // Item not found
                }

                return null
            })

            const items = await Promise.all(itemPromises)
            const validItems = items.filter((item): item is Content => item !== null)
            setCollectionItems(validItems)
        } catch (err) {
            console.error('Error loading collection items:', err)
        }
    }

    const handleDuplicateCollection = async () => {
        if (!isAuthenticated || !userId) {
            showError('Sign in required', 'Please sign in to save collections')
            return
        }

        if (!shareData || !shareData.canDuplicate) {
            showError('Not allowed', 'The owner has disabled duplication for this collection')
            return
        }

        setIsDuplicating(true)

        try {
            // Get authenticated headers with Firebase token
            const headers = await getAuthHeaders({
                'Content-Type': 'application/json',
            })

            // Create new collection from shared data
            const response = await fetch('/api/collections/duplicate', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: `${shareData.share.collectionName} (Copy)`,
                    items: collectionItems,
                }),
            })

            const data = await response.json()

            if (data.success) {
                showSuccess(
                    'Collection saved!',
                    `"${shareData.share.collectionName}" has been added to your collections`
                )
                // Optionally redirect to collections page
                setTimeout(() => {
                    router.push('/collections')
                }, 2000)
            } else {
                showError('Failed to save collection', data.error)
            }
        } catch (err) {
            console.error('Error duplicating collection:', err)
            showError('Failed to save collection', 'Please try again later')
        } finally {
            setIsDuplicating(false)
        }
    }

    const formatExpirationDate = (timestamp: number | null): string => {
        if (!timestamp) return 'Never expires'
        const date = new Date(timestamp)
        const now = new Date()
        const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysLeft < 0) return 'Expired'
        if (daysLeft === 0) return 'Expires today'
        if (daysLeft === 1) return 'Expires tomorrow'
        return `Expires in ${daysLeft} days`
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent mx-auto mb-4" />
                    <p className="text-white text-lg">Loading shared collection...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error || !shareData) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="rounded-full bg-red-600/20 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <LinkIcon className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Share Link Not Found</h1>
                    <p className="text-gray-400 mb-6">
                        {error ||
                            'This share link may have been deleted, deactivated, or has expired.'}
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition inline-flex items-center gap-2"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        Go to Home
                    </button>
                </div>
            </div>
        )
    }

    const { share, ownerName, canDuplicate } = shareData

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-black border-b border-[#313131]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Back button */}
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                        Back to Home
                    </button>

                    {/* Collection header */}
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="rounded-full bg-blue-600/20 p-2">
                                    <LinkIcon className="h-6 w-6 text-blue-600" />
                                </div>
                                <h1 className="text-3xl font-bold">{share.collectionName}</h1>
                            </div>

                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mt-4">
                                {ownerName && (
                                    <div className="flex items-center gap-2">
                                        <UserIcon className="h-4 w-4" />
                                        <span>Shared by {ownerName}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <EyeIcon className="h-4 w-4" />
                                    <span>{share.viewCount} views</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ClockIcon className="h-4 w-4" />
                                    <span>{formatExpirationDate(share.expiresAt)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>•</span>
                                    <span>{share.itemCount} items</span>
                                </div>
                            </div>
                        </div>

                        {/* Duplicate button */}
                        {canDuplicate && (
                            <button
                                onClick={handleDuplicateCollection}
                                disabled={!isAuthenticated || isDuplicating}
                                className="px-6 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                                title={
                                    !isAuthenticated
                                        ? 'Sign in to save this collection'
                                        : 'Save this collection to your account'
                                }
                            >
                                {isDuplicating ? (
                                    <>
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <PlusCircleIcon className="h-5 w-5" />
                                        {isAuthenticated
                                            ? 'Save to My Collections'
                                            : 'Sign In to Save'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Info banner if duplication disabled */}
                    {!canDuplicate && (
                        <div className="mt-4 rounded-md bg-yellow-600/10 border border-yellow-600/20 px-4 py-3">
                            <p className="text-sm text-yellow-400">
                                <strong>Note:</strong> The owner has disabled saving this
                                collection. You can only view the contents.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Collection grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {collectionItems.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-400">This collection is empty</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                        {collectionItems.map((item) => (
                            <ContentCard key={item.id} content={item} />
                        ))}
                        <ContentGridSpacer />
                    </div>
                )}
            </div>

            {/* Footer info */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-[#313131]">
                <div className="rounded-md bg-[#1a1a1a] border border-[#313131] px-6 py-4">
                    <p className="text-sm text-gray-400 text-center">
                        Shared via{' '}
                        <button
                            onClick={() => router.push('/')}
                            className="text-blue-400 hover:text-blue-300 transition"
                        >
                            NetTrailers
                        </button>{' '}
                        • Discover and share your favorite movies and TV shows
                    </p>
                </div>
            </div>
        </div>
    )
}
