'use client'

import { useState, useEffect, useMemo, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../../components/layout/SubPageLayout'
import useUserData from '../../../hooks/useUserData'
import useAuth from '../../../hooks/useAuth'
import {
    EyeIcon,
    MagnifyingGlassIcon,
    ArrowLeftIcon,
    PencilIcon,
    RectangleStackIcon,
} from '@heroicons/react/24/solid'
import { Content } from '../../../typings'
import { getTitle } from '../../../typings'
import ContentCard from '../../../components/common/ContentCard'
import ContentGridSpacer from '../../../components/common/ContentGridSpacer'
import EmptyState from '../../../components/common/EmptyState'
import NetflixLoader from '../../../components/common/NetflixLoader'
import SearchBar from '../../../components/common/SearchBar'
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
    const getListIcon = (list: UserList, isSelected: boolean = false) => {
        // Return emoji if the list has one (custom lists)
        if (list.emoji) {
            return <span className="text-sm">{list.emoji}</span>
        }

        // Default icons for system lists
        const iconClass = `w-4 h-4 text-white`
        return <EyeIcon className={iconClass} />
    }

    const getListStyle = (list: UserList, isSelected: boolean) => {
        // If selected, use a more solid/opaque version of the collection color
        if (isSelected) {
            return 'shadow-lg scale-105 border-2 text-white font-semibold'
        }

        // Default styling
        return 'hover:scale-105 text-white border-2'
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

    if (isLoading) {
        return (
            <SubPageLayout
                title="Loading..."
                icon={<RectangleStackIcon />}
                iconColor="text-blue-400"
            >
                <NetflixLoader message="Loading collection..." inline />
            </SubPageLayout>
        )
    }

    if (!selectedList) {
        return null // Will redirect
    }

    const headerActions = (
        <div className="space-y-6">
            {/* Collection Filter Pills */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
                <div className="flex flex-wrap gap-3">
                    {/* Collection Pills - Watch Later (default collection) will be first */}
                    {allLists
                        .sort((a, b) => {
                            // Put Watch Later (default collection) first, then other collections
                            if (a.name === 'Watch Later') return -1
                            if (b.name === 'Watch Later') return 1
                            return 0
                        })
                        .map((list) => {
                            const isSelected = collectionId === list.id
                            const listColor = list.color || '#6b7280' // Default gray
                            // Use clean route for default watchlist
                            const href =
                                list.id === 'default-watchlist'
                                    ? '/watchlist'
                                    : `/collections/${list.id}`

                            return (
                                <Link
                                    key={list.id}
                                    href={href}
                                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${getListStyle(
                                        list,
                                        isSelected
                                    )}`}
                                    style={
                                        isSelected
                                            ? {
                                                  borderColor: listColor,
                                                  backgroundColor: hexToRgba(listColor, 0.85),
                                              }
                                            : {
                                                  borderColor: listColor,
                                                  backgroundColor: hexToRgba(listColor, 0.15),
                                              }
                                    }
                                >
                                    {getListIcon(list, isSelected)}
                                    <span>{list.name}</span>
                                </Link>
                            )
                        })}
                </div>
            </div>

            {/* Collection Header */}
            <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 sm:gap-4 mb-6">
                    {/* Collection Icon + Title Row */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Collection Icon */}
                        <div className="flex items-center justify-center">
                            {selectedList.emoji ? (
                                <span className="text-4xl sm:text-5xl">{selectedList.emoji}</span>
                            ) : (
                                <EyeIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                            )}
                        </div>
                        {/* Collection Title */}
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                            {selectedList.name}
                        </h2>
                    </div>
                    {/* Item Count - only show when there are items */}
                    {selectedList.items.length > 0 && (
                        <span className="text-lg sm:text-xl text-gray-400 font-medium sm:pb-0.5">
                            {selectedList.items.length} items
                        </span>
                    )}
                    {/* Edit Button - Only show for editable collections */}
                    {selectedList.id !== 'default-watchlist' && selectedList.canEdit !== false && (
                        <button
                            onClick={handleEditCollection}
                            className="flex items-center justify-center w-9 h-9 mb-0.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                            title={`Edit ${selectedList.name}`}
                        >
                            <PencilIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search in this collection..."
                        focusColor="blue"
                        voiceInput
                    />
                </div>
            </div>
        </div>
    )

    return (
        <>
            <SubPageLayout
                title={selectedList.name}
                icon={<RectangleStackIcon />}
                iconColor="text-blue-400"
                description={selectedList.description || `${selectedList.items.length} items`}
                headerActions={headerActions}
            >
                {/* Content Grid */}
                {allDisplayContent.length === 0 ? (
                    <EmptyState
                        emoji="🍿"
                        title="No items in this collection"
                        description="Start adding movies and TV shows to your collection!"
                    />
                ) : (
                    <div className="space-y-12">
                        <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                            {allDisplayContent.map(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (item: any, index: number) => (
                                    <div key={`${item.contentId}-${item.listId}-${index}`}>
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
                                    <div ref={sentinelRef} className="h-32" aria-hidden="true" />
                                )}

                                {/* Load More Results button when maxPages reached */}
                                {!hasMore && additionalContent.length > 0 && (
                                    <div className="flex justify-center pt-8">
                                        <button
                                            onClick={() => {
                                                setMaxPages((prev) => prev + 10)
                                                setHasMore(true)
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 text-lg"
                                        >
                                            Load More Results
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </SubPageLayout>

            {/* Collection Editor Modal */}
            <CollectionEditorModal
                collection={selectedList}
                isOpen={showEditor}
                onClose={handleCloseEditor}
            />
        </>
    )
}

export default CollectionPage
