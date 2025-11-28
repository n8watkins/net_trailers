'use client'

import { useState, useEffect, useMemo, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../../components/layout/SubPageLayout'
import useUserData from '../../../hooks/useUserData'
import useAuth from '../../../hooks/useAuth'
import {
    EyeIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    Cog6ToothIcon,
    ChevronDownIcon,
    TrashIcon,
} from '@heroicons/react/24/solid'
import { XMarkIcon, RectangleStackIcon } from '@heroicons/react/24/outline'
import { Content } from '../../../typings'
import { getTitle } from '../../../typings'
import ContentCard from '../../../components/common/ContentCard'
import ContentGridSpacer from '../../../components/common/ContentGridSpacer'
import NetflixLoader from '../../../components/common/NetflixLoader'
import { UserList } from '../../../types/collections'
import CollectionEditorModal from '../../../components/modals/CollectionEditorModal'
import { useChildSafety } from '../../../hooks/useChildSafety'
import Link from 'next/link'

interface CollectionPageProps {
    params: Promise<{
        id: string
    }>
}

const CollectionPage = ({ params }: CollectionPageProps) => {
    const resolvedParams = use(params)
    const { id: collectionId } = resolvedParams
    const router = useRouter()
    const userData = useUserData()
    const { user } = useAuth()
    const { getAllLists } = userData
    const { isEnabled: childSafetyMode } = useChildSafety()

    // Infinite scroll state for genre-based collections
    const [additionalContent, setAdditionalContent] = useState<Content[]>([])
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [maxPages, setMaxPages] = useState(10)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const isLoadingMoreRef = useRef(false)
    const hasMoreRef = useRef(true)
    const retryCountRef = useRef(0)
    const consecutiveDuplicatesRef = useRef(0)

    const [searchQuery, setSearchQuery] = useState('')
    const [showEditor, setShowEditor] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [showManageDropdown, setShowManageDropdown] = useState(false)
    const manageDropdownRef = useRef<HTMLDivElement>(null)

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                manageDropdownRef.current &&
                !manageDropdownRef.current.contains(event.target as Node)
            ) {
                setShowManageDropdown(false)
            }
        }

        if (showManageDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showManageDropdown])

    // Get all available lists
    const allLists = useMemo(() => {
        return getAllLists()
    }, [getAllLists])

    // Find the selected collection
    const selectedList = useMemo(
        () => allLists.find((list) => list.id === collectionId),
        [allLists, collectionId]
    )

    // Loading state
    useEffect(() => {
        if (allLists.length > 0) {
            setIsLoading(false)
        }
    }, [allLists])

    // Redirect if collection not found
    useEffect(() => {
        if (!isLoading && !selectedList) {
            router.push('/collections')
        }
    }, [isLoading, selectedList, router])

    // Save current collection to localStorage for persistence
    useEffect(() => {
        if (selectedList && typeof window !== 'undefined') {
            localStorage.setItem('nettrailer_selected_collection', collectionId)
        }
    }, [collectionId, selectedList])

    // Any collection with genres supports infinite scroll if it can generate more content
    // For tmdb-genre and ai-generated collections, we can always generate more from TMDB
    const supportsInfiniteScroll = useMemo(() => {
        if (!selectedList) return false
        const hasGenres = selectedList.genres && selectedList.genres.length > 0
        // Explicitly set canGenerateMore OR infer from collection type
        const canGenerate =
            selectedList.canGenerateMore === true ||
            selectedList.collectionType === 'tmdb-genre' ||
            selectedList.collectionType === 'ai-generated'
        return hasGenres && canGenerate
    }, [selectedList])

    // Build API endpoint for infinite scroll
    const infiniteScrollEndpoint = useMemo(() => {
        if (!supportsInfiniteScroll || !selectedList) return null

        const params = new URLSearchParams()
        params.append('genres', selectedList.genres!.join(','))
        params.append('genreLogic', selectedList.genreLogic || 'OR')
        if (selectedList.genreLogic === 'AND') {
            params.append('fallbackGenreLogic', 'OR')
        }
        if (selectedList.mediaType) {
            params.append('mediaType', selectedList.mediaType)
        }
        if (childSafetyMode) {
            params.append('childSafetyMode', 'true')
        }

        return `/api/custom-rows/${selectedList.id}/content?${params.toString()}`
    }, [supportsInfiniteScroll, selectedList, childSafetyMode])

    // Keep refs in sync with state
    useEffect(() => {
        isLoadingMoreRef.current = isLoadingMore
        hasMoreRef.current = hasMore
    }, [isLoadingMore, hasMore])

    // Reset infinite scroll state when collection changes
    useEffect(() => {
        setAdditionalContent([])
        setCurrentPage(1)
        setHasMore(true)
        setMaxPages(10)
        retryCountRef.current = 0
        consecutiveDuplicatesRef.current = 0
    }, [collectionId])

    // Load more content for infinite scroll
    const loadMoreContent = useCallback(async () => {
        if (!infiniteScrollEndpoint) return
        if (isLoadingMoreRef.current) return
        if (!hasMoreRef.current) return

        setIsLoadingMore(true)

        try {
            const url = `${infiniteScrollEndpoint}&page=${currentPage + 1}`
            const response = await fetch(url)

            if (!response.ok) {
                const isPermanentError = response.status === 404 || response.status === 410
                const isTransientError = response.status >= 500 || response.status === 429

                if (isPermanentError) {
                    setHasMore(false)
                    return
                }

                if (isTransientError && retryCountRef.current < 3) {
                    retryCountRef.current += 1
                    const backoffDelay = Math.min(
                        1000 * Math.pow(2, retryCountRef.current - 1),
                        5000
                    )
                    setTimeout(() => loadMoreContent(), backoffDelay)
                    return
                }

                setHasMore(false)
                return
            }

            retryCountRef.current = 0

            const data = await response.json()
            const newContent = data.results || []

            // Stop if: no content, reached TMDB's max, or reached our maxPages limit
            const nextPage = currentPage + 1
            if (
                newContent.length === 0 ||
                nextPage >= (data.total_pages || 1) ||
                nextPage >= maxPages
            ) {
                setHasMore(false)
            }

            // Get all existing content IDs (original items + additional)
            const existingIds = new Set([
                ...(selectedList?.items || []).map((item) => `${item.media_type}-${item.id}`),
                ...additionalContent.map((item) => `${item.media_type}-${item.id}`),
            ])

            // Filter out duplicates
            const uniqueNewContent = newContent.filter(
                (item: Content) => !existingIds.has(`${item.media_type}-${item.id}`)
            )

            // Handle duplicate-only pages
            if (uniqueNewContent.length === 0) {
                consecutiveDuplicatesRef.current += 1

                if (
                    consecutiveDuplicatesRef.current >= 3 ||
                    currentPage + 1 >= (data.total_pages || 1)
                ) {
                    setHasMore(false)
                    return
                }

                setCurrentPage((prev) => prev + 1)
                return
            }

            consecutiveDuplicatesRef.current = 0
            setAdditionalContent((prev) => [...prev, ...uniqueNewContent])
            setCurrentPage((prev) => prev + 1)
        } catch (error) {
            if (retryCountRef.current < 3) {
                retryCountRef.current += 1
                const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000)
                setTimeout(() => loadMoreContent(), backoffDelay)
                return
            }
            setHasMore(false)
        } finally {
            setIsLoadingMore(false)
        }
    }, [infiniteScrollEndpoint, currentPage, selectedList?.items, additionalContent, maxPages])

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (!supportsInfiniteScroll || !infiniteScrollEndpoint) return

        const sentinel = sentinelRef.current
        if (!sentinel) return

        const rootMargin = typeof window !== 'undefined' ? `${window.innerHeight * 1.5}px` : '500px'

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isLoadingMoreRef.current && hasMoreRef.current) {
                        loadMoreContent()
                    }
                })
            },
            {
                rootMargin,
                threshold: 0,
            }
        )

        observer.observe(sentinel)

        return () => {
            observer.disconnect()
        }
    }, [supportsInfiniteScroll, infiniteScrollEndpoint, loadMoreContent])

    // Trigger initial load for collections with no items but support infinite scroll
    useEffect(() => {
        const hasNoInitialItems = !selectedList || selectedList.items.length === 0
        const shouldLoadInitialContent =
            supportsInfiniteScroll &&
            hasNoInitialItems &&
            !isLoadingMore &&
            additionalContent.length === 0

        if (shouldLoadInitialContent) {
            loadMoreContent()
        }
    }, [
        supportsInfiniteScroll,
        selectedList,
        loadMoreContent,
        isLoadingMore,
        additionalContent.length,
    ])

    // Get filtered content
    const baseFilteredContent = useMemo(() => {
        if (!selectedList) return []

        return selectedList.items.map((item) => ({
            contentId: item.id,
            rating: selectedList.name.toLowerCase(),
            timestamp: Date.now(),
            content: item,
            listId: selectedList.id,
            listName: selectedList.name,
        }))
    }, [selectedList])

    // Apply search filter
    const filteredContent = searchQuery.trim()
        ? baseFilteredContent.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (item: any) => {
                  if (!item.content) return false
                  const title = getTitle(item.content).toLowerCase()
                  const query = searchQuery.toLowerCase()
                  return title.includes(query)
              }
          )
        : baseFilteredContent

    // Combine original items with additional loaded content
    const allDisplayContent = useMemo(() => {
        if (!supportsInfiniteScroll || additionalContent.length === 0) {
            return filteredContent
        }

        // If there's a search query, don't show additional content
        if (searchQuery.trim()) {
            return filteredContent
        }

        // Add additional content with the same format as filtered content
        const additionalFormatted = additionalContent.map((item) => ({
            contentId: item.id,
            rating: selectedList?.name.toLowerCase() || '',
            timestamp: Date.now(),
            content: item,
            listId: selectedList?.id || '',
            listName: selectedList?.name || '',
        }))

        return [...filteredContent, ...additionalFormatted]
    }, [filteredContent, additionalContent, supportsInfiniteScroll, searchQuery, selectedList])

    const handleEditCollection = () => {
        setShowEditor(true)
    }

    const handleCloseEditor = () => {
        setShowEditor(false)
    }

    // Helper functions for collection pills
    const getListIcon = (list: UserList) => {
        // Return emoji if the list has one (custom lists)
        if (list.emoji) {
            return <span className="text-sm">{list.emoji}</span>
        }

        // Default icons for system lists
        const iconClass = `w-4 h-4`
        return <EyeIcon className={iconClass} />
    }

    // Helper function to convert hex color to rgba with opacity
    const hexToRgba = (hex: string, opacity: number): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        if (result) {
            const r = parseInt(result[1], 16)
            const g = parseInt(result[2], 16)
            const b = parseInt(result[3], 16)
            return `rgba(${r}, ${g}, ${b}, ${opacity})`
        }
        return `rgba(107, 114, 128, ${opacity})` // Fallback to gray
    }

    if (!selectedList && !isLoading) {
        return null // Will redirect
    }

    return (
        <>
            <SubPageLayout hideHeader>
                <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12">
                    {/* Atmospheric Background */}
                    <div className="fixed inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-black" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-blue-900/20 via-transparent to-transparent opacity-50" />
                        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
                    </div>

                    {/* Content Container */}
                    <div className="relative z-10">
                        {/* Cinematic Hero Header */}
                        <div className="relative overflow-hidden pt-4">
                            {/* Animated Background Gradients */}
                            <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                            <div
                                className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-cyan-900/10 to-black/50 animate-pulse"
                                style={{ animationDuration: '4s' }}
                            />
                            <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-blue-900/5 to-transparent" />

                            {/* Soft edge vignetting for subtle blending */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                            {/* Hero Content */}
                            <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                                {/* Icon with glow */}
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 bg-blue-500/30 blur-2xl scale-150" />
                                    {selectedList?.emoji ? (
                                        <span className="relative text-6xl drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                            {selectedList.emoji}
                                        </span>
                                    ) : (
                                        <RectangleStackIcon className="relative w-16 h-16 text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                                    )}
                                </div>

                                {/* Title */}
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                                    <span className="bg-gradient-to-r from-blue-200 via-cyan-100 to-blue-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                        {selectedList?.name || 'Collection'}
                                    </span>
                                </h1>

                                {/* Subtitle with item count */}
                                <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                                    {selectedList?.description || 'Your curated collection'}
                                    {!isLoading &&
                                        selectedList &&
                                        selectedList.items.length > 0 && (
                                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                {selectedList.items.length} items
                                            </span>
                                        )}
                                </p>

                                {/* Collection Pills Row */}
                                <div className="flex flex-wrap gap-2 items-center justify-center mb-5 overflow-visible pb-2 px-4 max-w-4xl">
                                    {allLists
                                        .sort((a, b) => {
                                            if (a.name === 'Watch Later') return -1
                                            if (b.name === 'Watch Later') return 1
                                            return 0
                                        })
                                        .map((list) => {
                                            const isSelected = collectionId === list.id
                                            const listColor = list.color || '#3b82f6'
                                            const href =
                                                list.id === 'default-watchlist'
                                                    ? '/collections/watch-later'
                                                    : `/collections/${list.id}`

                                            return (
                                                <Link
                                                    key={list.id}
                                                    href={href}
                                                    className={`group relative rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 ${
                                                        isSelected
                                                            ? 'scale-105 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                                            : 'hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]'
                                                    }`}
                                                    style={
                                                        isSelected
                                                            ? {
                                                                  borderColor: listColor,
                                                                  backgroundColor: hexToRgba(
                                                                      listColor,
                                                                      0.85
                                                                  ),
                                                                  color: 'white',
                                                              }
                                                            : {
                                                                  borderColor: hexToRgba(
                                                                      listColor,
                                                                      0.5
                                                                  ),
                                                                  backgroundColor: hexToRgba(
                                                                      listColor,
                                                                      0.15
                                                                  ),
                                                                  color: 'rgb(209, 213, 219)',
                                                              }
                                                    }
                                                >
                                                    {getListIcon(list)}
                                                    <span>{list.name}</span>
                                                    {isSelected && (
                                                        <div
                                                            className="absolute inset-0 rounded-full blur-md opacity-15 animate-pulse"
                                                            style={{
                                                                backgroundColor: listColor,
                                                            }}
                                                        />
                                                    )}
                                                </Link>
                                            )
                                        })}
                                </div>

                                {/* Action Row - Edit & Manage */}
                                <div className="flex gap-2 items-center mb-5">
                                    {/* Edit Button - Only show for editable collections */}
                                    {selectedList &&
                                        selectedList.id !== 'default-watchlist' &&
                                        selectedList.canEdit !== false && (
                                            <button
                                                onClick={handleEditCollection}
                                                className="group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]"
                                            >
                                                <PencilIcon className="w-4 h-4 text-gray-400" />
                                                <span>Edit</span>
                                            </button>
                                        )}

                                    {/* Manage dropdown */}
                                    <div className="relative" ref={manageDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowManageDropdown(!showManageDropdown)
                                            }
                                            className="group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]"
                                        >
                                            <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                                            <span>Manage</span>
                                            <ChevronDownIcon
                                                className={`w-4 h-4 transition-transform ${
                                                    showManageDropdown ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {showManageDropdown && (
                                            <div className="absolute top-full mt-2 right-0 bg-zinc-900/95 backdrop-blur-lg border border-zinc-700/50 rounded-xl shadow-2xl z-50 min-w-[200px] overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        router.push('/settings/collections')
                                                        setShowManageDropdown(false)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800/80 transition-colors"
                                                >
                                                    <Cog6ToothIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                    <span>Settings</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        router.push('/settings/account')
                                                        setShowManageDropdown(false)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800/80 transition-colors"
                                                >
                                                    <TrashIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                                                    <span>Clear Data</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Enhanced Search Bar */}
                                <div className="w-full max-w-3xl relative">
                                    <div className="relative group">
                                        <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-blue-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search in this collection..."
                                            className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <XMarkIcon className="w-6 h-6" />
                                            </button>
                                        )}

                                        {/* Glowing border effect on focus */}
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-6">
                            {/* Loading state */}
                            {isLoading && (
                                <div className="py-16">
                                    <NetflixLoader inline={true} message="Loading collection..." />
                                </div>
                            )}

                            {/* Empty state */}
                            {!isLoading && allDisplayContent.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 bg-blue-500/20 blur-2xl scale-150" />
                                        <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                                            {selectedList?.emoji ? (
                                                <span className="text-5xl">
                                                    {selectedList.emoji}
                                                </span>
                                            ) : (
                                                <RectangleStackIcon className="w-12 h-12 text-blue-500" />
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">
                                        {searchQuery
                                            ? 'No items match your search'
                                            : 'No items in this collection'}
                                    </h3>
                                    <p className="text-gray-400 mb-8 max-w-md text-lg">
                                        {searchQuery
                                            ? 'Try a different search term'
                                            : 'Start adding movies and TV shows to your collection!'}
                                    </p>
                                </div>
                            )}

                            {/* Content Grid */}
                            {!isLoading && allDisplayContent.length > 0 && (
                                <div className="space-y-12">
                                    <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                                        {allDisplayContent.map(
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            (item: any, index: number) => (
                                                <div
                                                    key={`${item.contentId}-${item.listId}-${index}`}
                                                    className="animate-fadeInUp"
                                                    style={{
                                                        animationDelay: `${Math.min(index * 50, 500)}ms`,
                                                        animationFillMode: 'both',
                                                    }}
                                                >
                                                    <ContentCard content={item.content} />
                                                </div>
                                            )
                                        )}
                                        <ContentGridSpacer />
                                    </div>

                                    {/* Infinite scroll elements */}
                                    {supportsInfiniteScroll && !searchQuery.trim() && (
                                        <>
                                            {/* Hidden sentinel element for Intersection Observer */}
                                            {hasMore && (
                                                <div
                                                    ref={sentinelRef}
                                                    className="h-32"
                                                    aria-hidden="true"
                                                />
                                            )}

                                            {/* Load More Results button when maxPages reached */}
                                            {!hasMore && additionalContent.length > 0 && (
                                                <div className="flex justify-center pt-8">
                                                    <button
                                                        onClick={() => {
                                                            setMaxPages((prev) => prev + 10)
                                                            setHasMore(true)
                                                        }}
                                                        className="group relative px-8 py-4 font-bold rounded-xl transition-all duration-300 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] scale-100 hover:scale-105"
                                                    >
                                                        Load More Results
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add keyframe animation for fade-in */}
                    <style jsx>{`
                        @keyframes fadeInUp {
                            from {
                                opacity: 0;
                                transform: translateY(20px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }

                        :global(.animate-fadeInUp) {
                            animation: fadeInUp 0.5s ease-out;
                        }
                    `}</style>
                </div>
            </SubPageLayout>

            {/* Collection Editor Modal */}
            {selectedList && (
                <CollectionEditorModal
                    collection={selectedList}
                    isOpen={showEditor}
                    onClose={handleCloseEditor}
                />
            )}
        </>
    )
}

export default CollectionPage
