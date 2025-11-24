'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Header from '../../../components/layout/Header'
import Modal from '../../../components/modals/Modal'
import ContentCard from '../../../components/common/ContentCard'
import ContentGridSpacer from '../../../components/common/ContentGridSpacer'
import NetflixLoader from '../../../components/common/NetflixLoader'
import Image from 'next/image'
import { Content } from '../../../typings'
import { useSessionData } from '../../../hooks/useSessionData'
import { filterDislikedContent } from '../../../utils/contentFilter'
import { useChildSafety } from '../../../hooks/useChildSafety'

interface PersonCreditsResponse {
    id: number
    combined: Content[]
    total_results: number
}

function PersonPageContent() {
    const params = useParams<{ id: string }>()
    const personId = params?.id
    const sessionData = useSessionData()
    const [credits, setCredits] = useState<Content[]>([])
    const [personName, setPersonName] = useState<string>('')
    const [personImage, setPersonImage] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    // Filter states
    const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all')
    const [roleFilter, setRoleFilter] = useState<'all' | 'cast' | 'crew'>('all')

    const contentToRender = useMemo(() => {
        // Filter out disliked content
        let filtered = filterDislikedContent(credits, sessionData.hiddenMovies)

        // Apply media type filter
        if (mediaTypeFilter !== 'all') {
            filtered = filtered.filter((item) => item.media_type === mediaTypeFilter)
        }

        // Apply role filter
        if (roleFilter === 'cast') {
            filtered = filtered.filter((item) => 'character' in item && item.character)
        } else if (roleFilter === 'crew') {
            filtered = filtered.filter(
                (item) => !('character' in item && item.character) && 'job' in item
            )
        }

        return filtered
    }, [credits, sessionData.hiddenMovies, mediaTypeFilter, roleFilter])

    // Load person credits
    const loadPersonCredits = useCallback(async () => {
        if (!personId) return

        setLoading(true)
        setError(null)

        try {
            // Fetch person credits
            const creditsResponse = await fetch(
                `/api/people/${personId}/credits?childSafetyMode=${childSafetyEnabled}`
            )

            if (!creditsResponse.ok) {
                throw new Error(`Failed to fetch person credits: ${creditsResponse.status}`)
            }

            const creditsData: PersonCreditsResponse = await creditsResponse.json()
            setCredits(creditsData.combined || [])

            // Fetch person details for name and image
            const personResponse = await fetch(`/api/people/${personId}`)
            if (personResponse.ok) {
                const personData = await personResponse.json()
                setPersonName(personData.name || 'Unknown')
                setPersonImage(
                    personData.profile_path
                        ? `https://image.tmdb.org/t/p/w185${personData.profile_path}`
                        : null
                )
            }
        } catch (err) {
            console.error('Error loading person credits:', err)
            setError(err instanceof Error ? err.message : 'Failed to load person credits')
        } finally {
            setLoading(false)
        }
    }, [personId, childSafetyEnabled])

    useEffect(() => {
        if (personId) {
            loadPersonCredits()
        }
    }, [personId, loadPersonCredits])

    if (loading) {
        return <NetflixLoader message="Loading filmography..." />
    }

    if (error) {
        return (
            <div className="relative min-h-screen bg-gradient-to-b">
                <Header />
                <main className="relative pl-4 pb-16 lg:space-y-24 lg:pl-16">
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <div className="text-6xl mb-4">😵</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                Something went wrong
                            </h2>
                            <p className="text-gray-400 mb-4">{error}</p>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="relative min-h-screen bg-gradient-to-b">
            <Header />

            <main className="relative px-2 sm:px-4 md:px-8 lg:px-16 pb-8 sm:pb-12 md:pb-16">
                <div className="flex flex-col space-y-4 sm:space-y-6 md:space-y-10 lg:space-y-24 py-8 sm:py-12 md:py-16 lg:py-20">
                    {/* Header Section with Person Info */}
                    <div className="flex items-center gap-4 sm:gap-6">
                        {/* Person Image */}
                        {personImage && (
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full overflow-hidden ring-2 ring-red-500 flex-shrink-0">
                                <Image
                                    src={personImage}
                                    alt={personName}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 128px"
                                />
                            </div>
                        )}

                        {/* Person Info */}
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                                {personName}
                            </h1>
                            <p className="text-gray-300 text-base sm:text-lg">
                                {contentToRender.length}{' '}
                                {contentToRender.length === 1 ? 'title' : 'titles'}
                            </p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4">
                        {/* Media Type Filter */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMediaTypeFilter('all')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    mediaTypeFilter === 'all'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setMediaTypeFilter('movie')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    mediaTypeFilter === 'movie'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                Movies
                            </button>
                            <button
                                onClick={() => setMediaTypeFilter('tv')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    mediaTypeFilter === 'tv'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                TV Shows
                            </button>
                        </div>

                        {/* Role Filter */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRoleFilter('all')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    roleFilter === 'all'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                All Roles
                            </button>
                            <button
                                onClick={() => setRoleFilter('cast')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    roleFilter === 'cast'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                Acting
                            </button>
                            <button
                                onClick={() => setRoleFilter('crew')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    roleFilter === 'crew'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                Crew
                            </button>
                        </div>
                    </div>

                    {/* Content Section */}
                    {contentToRender.length > 0 ? (
                        <div className="space-y-8">
                            {/* Flex Layout */}
                            <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                                {contentToRender.map((item) => (
                                    <div
                                        key={`${item.media_type || 'unknown'}-${item.id}`}
                                        className="overflow-visible"
                                    >
                                        <ContentCard content={item} />
                                    </div>
                                ))}
                                <ContentGridSpacer />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🔍</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                No content found
                            </h2>
                            <p className="text-gray-400">Try adjusting your filters.</p>
                        </div>
                    )}
                </div>
            </main>

            <Modal />
        </div>
    )
}

export default function PersonPage() {
    return (
        <Suspense fallback={<NetflixLoader message="Loading person..." />}>
            <PersonPageContent />
        </Suspense>
    )
}
