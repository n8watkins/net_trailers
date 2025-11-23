'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SubPageLayout from '../../components/layout/SubPageLayout'
import useUserData from '../../hooks/useUserData'
import useAuth from '../../hooks/useAuth'
import {
    EyeIcon,
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    PlusIcon,
    RectangleStackIcon,
    Cog6ToothIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/solid'
import { PencilIcon } from '@heroicons/react/24/outline'
import { isMovie, isTVShow, Content } from '../../typings'
import { getTitle } from '../../typings'
import ContentCard from '../../components/common/ContentCard'
import ContentGridSpacer from '../../components/common/ContentGridSpacer'
import EmptyState from '../../components/common/EmptyState'
import NetflixLoader from '../../components/common/NetflixLoader'
import SearchBar from '../../components/common/SearchBar'
import { useAppStore } from '../../stores/appStore'
import { useModalStore } from '../../stores/modalStore'
import { exportUserDataToCSV } from '../../utils/csvExport'
import { UserList } from '../../types/collections'
import { useDebugSettings } from '../../components/debug/DebugControls'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import CollectionEditorModal from '../../components/modals/CollectionEditorModal'
import { useChildSafety } from '../../hooks/useChildSafety'

const Collections = () => {
    const router = useRouter()
    const userData = useUserData()
    const { user } = useAuth()
    const { isGuest, isInitialized, isLoading } = useAuthStatus()
    const { getAllLists } = userData
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null
    const debugSettings = useDebugSettings()
    const { isEnabled: childSafetyMode } = useChildSafety()

    // Infinite scroll state for AI-generated collections
    const [additionalContent, setAdditionalContent] = useState<Content[]>([])
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [maxPages, setMaxPages] = useState(10) // Limit pages like genre search
    const sentinelRef = useRef<HTMLDivElement>(null)
    const isLoadingMoreRef = useRef(false)
    const hasMoreRef = useRef(true)
    const retryCountRef = useRef(0)
    const consecutiveDuplicatesRef = useRef(0)

    // Debug logging and verification - Only when debug mode is enabled
    useEffect(() => {
        // Only log when debug mode is enabled AND user actually changes
        if (process.env.NODE_ENV === 'development' && debugSettings.showFirebaseDebug) {
            console.log('🔍 Collections Page Debug:', {
                sessionType: userData.sessionType,
                isGuest: userData.isGuest,
                isAuthenticated: userData.isAuthenticated,
                user: user?.email,
                userId: user?.uid,
                activeSessionId: userData.activeSessionId,
                firebaseUser: !!user,
                firebaseUserId: user?.uid || 'no-user',
            })

            // Verify user data isolation
            if (user?.uid && userData.sessionType === 'authenticated') {
                console.log('✅ [Collections Page] User data loaded for:', user.uid)
            }
        }
    }, [user?.uid, userData.sessionType, debugSettings.showFirebaseDebug]) // Only depend on stable values

    // Add debug button to check authentication state
    const debugAuthState = () => {
        console.log('=== AUTHENTICATION DEBUG ===')
        console.log('1. Firebase User:', user)
        console.log('2. Session Type:', userData.sessionType)
        console.log('3. Is Guest:', userData.isGuest)
        console.log('4. Is Authenticated:', userData.isAuthenticated)
        console.log('5. Active Session ID:', userData.activeSessionId)
        console.log('6. User Session:', userSession)
        console.log('7. Local Storage:', {
            guestId: localStorage.getItem('nettrailer_guest_id'),
            sessionType: localStorage.getItem('nettrailer_session_type'),
        })
    }

    // Load persisted selection from localStorage, fallback to 'all'
    const [selectedListId, setSelectedListId] = useState<string | 'all'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('nettrailer_selected_collection')
            return saved || 'all'
        }
        return 'all'
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [showManageDropdown, setShowManageDropdown] = useState(false)
    const manageDropdownRef = useRef<HTMLDivElement>(null)
    const [editorCollection, setEditorCollection] = useState<UserList | null>(null)
    const [showEditor, setShowEditor] = useState(false)
    const { modal } = useAppStore()
    const { openCollectionBuilderModal, openListModal } = useModalStore()
    const showModal = modal.isOpen

    // Persist selected collection to localStorage whenever it changes
    useEffect(() => {
        if (selectedListId !== 'all') {
            localStorage.setItem('nettrailer_selected_collection', selectedListId)
        }
    }, [selectedListId])

    // Force refresh when navigating to this page
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        // Refresh data when component mounts or becomes visible
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('Collections page visible - refreshing data')
                setRefreshKey((prev) => prev + 1)
            }
        }

        // Trigger initial refresh
        setRefreshKey((prev) => prev + 1)

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    // Get all available lists
    // FIXED: Use useMemo to prevent recreating allLists on every render
    // Added refreshKey to force re-evaluation when data changes
    const allLists = useMemo(() => {
        return getAllLists()
    }, [getAllLists, refreshKey]) // Recreate when refreshKey changes

    // Validate and set default selection when lists are loaded
    useEffect(() => {
        if (allLists.length > 0) {
            // Check if the current selection is valid
            const isValidSelection = allLists.some((list) => list.id === selectedListId)

            if (!isValidSelection || selectedListId === 'all') {
                // Try to restore from localStorage first
                const savedId = localStorage.getItem('nettrailer_selected_collection')
                const savedListExists = savedId && allLists.some((list) => list.id === savedId)

                if (savedListExists) {
                    setSelectedListId(savedId)
                } else {
                    // Fall back to Watch Later or first list
                    const watchlistDefault = allLists.find((list) => list.name === 'Watch Later')
                    if (watchlistDefault) {
                        setSelectedListId(watchlistDefault.id)
                    } else {
                        setSelectedListId(allLists[0].id)
                    }
                }
            }
        }
    }, [allLists]) // Only depend on allLists to avoid infinite loop

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

    // Filter content based on selected list
    const getFilteredContent = () => {
        // Show content from selected list
        const selectedList = allLists.find((list) => list.id === selectedListId)
        if (!selectedList) return []

        return selectedList.items.map((item) => ({
            contentId: item.id,
            rating: selectedList.name.toLowerCase(),
            timestamp: Date.now(),
            content: item,
            listId: selectedList.id,
            listName: selectedList.name,
        }))
    }

    const baseFilteredContent = getFilteredContent()

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

    // Check if selected collection supports infinite scroll
    const selectedList = useMemo(
        () => allLists.find((list) => list.id === selectedListId),
        [allLists, selectedListId]
    )

    // Any collection with genres and canGenerateMore supports infinite scroll
    const supportsInfiniteScroll = useMemo(() => {
        if (!selectedList) return false
        const hasGenres = selectedList.genres && selectedList.genres.length > 0
        const canGenerateMore = selectedList.canGenerateMore === true
        return hasGenres && canGenerateMore
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
        setMaxPages(10) // Reset max pages limit
        retryCountRef.current = 0
        consecutiveDuplicatesRef.current = 0
    }, [selectedListId])

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

    // Intersection Observer for infinite scroll - large rootMargin for early loading
    useEffect(() => {
        if (!supportsInfiniteScroll || !infiniteScrollEndpoint) return

        const sentinel = sentinelRef.current
        if (!sentinel) return

        // Use 1.5x viewport height like genre page for seamless loading
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

    const handleExportCSV = () => {
        if (userSession?.preferences) {
            exportUserDataToCSV(userSession.preferences)
        }
    }

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

    const getListCount = (listId: string) => {
        const list = allLists.find((l) => l.id === listId)
        return list ? list.items.length : 0
    }

    const handleNewCollectionClick = () => {
        console.log('New Collection button clicked')
        openCollectionBuilderModal()
    }

    const handleManageClick = () => {
        console.log('Manage button clicked')
        setShowManageDropdown(!showManageDropdown)
    }

    const handleManageCollectionsClick = () => {
        console.log('Manage Collections menu item clicked')
        openListModal(undefined)
        setShowManageDropdown(false)
    }

    const handleExportClick = () => {
        console.log('Export CSV clicked')
        handleExportCSV()
        setShowManageDropdown(false)
    }

    const handleEditCollection = (list: UserList) => {
        console.log('Edit collection clicked:', list.name)
        setEditorCollection(list)
        setShowEditor(true)
    }

    const handleCloseEditor = () => {
        setShowEditor(false)
        setEditorCollection(null)
    }

    const titleActions = (
        <div className="relative flex items-center gap-3 z-40" ref={manageDropdownRef}>
            {/* New Collection Button */}
            <button
                type="button"
                onClick={handleNewCollectionClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
                <PlusIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">New Collection</span>
            </button>

            {/* Manage Button */}
            <button
                type="button"
                onClick={handleManageClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors cursor-pointer"
            >
                <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Manage</span>
                <ChevronDownIcon
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        showManageDropdown ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Dropdown Menu */}
            {showManageDropdown && (
                <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px] overflow-hidden">
                    <button
                        type="button"
                        onClick={handleManageCollectionsClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors"
                    >
                        <RectangleStackIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span>Manage Collections</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleExportClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors"
                    >
                        <ArrowDownTrayIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span>Export to CSV</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            router.push('/settings/collections')
                            setShowManageDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors"
                    >
                        <Cog6ToothIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span>Collection Settings</span>
                    </button>
                </div>
            )}
        </div>
    )

    const headerActions = !isLoading ? (
        <div className="space-y-6">
            {/* Debug Button - controlled by Auth Flow Logs toggle */}
            {process.env.NODE_ENV === 'development' && debugSettings.showFirebaseDebug && (
                <button
                    onClick={debugAuthState}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                    🐛 Debug Auth State
                </button>
            )}

            {isInitialized && isGuest && <GuestModeNotification align="left" />}

            {/* Collection Filter Buttons */}
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
                            const isSelected = selectedListId === list.id
                            const listColor = list.color || '#6b7280' // Default gray

                            return (
                                <button
                                    key={list.id}
                                    onClick={() => setSelectedListId(list.id)}
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
                                </button>
                            )
                        })}
                </div>
            </div>

            {/* Selected Collection Details - Separate Container */}
            {selectedListId &&
                (() => {
                    const selectedList = allLists.find((l) => l.id === selectedListId)
                    return (
                        <div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 sm:gap-4 mb-6">
                                {/* Collection Icon + Title Row */}
                                <div className="flex items-center gap-3 sm:gap-4">
                                    {/* Collection Icon */}
                                    <div className="flex items-center justify-center">
                                        {selectedList?.emoji ? (
                                            <span className="text-4xl sm:text-5xl">
                                                {selectedList.emoji}
                                            </span>
                                        ) : (
                                            <EyeIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                                        )}
                                    </div>
                                    {/* Collection Title */}
                                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                                        {selectedList?.name || 'Collection'}
                                    </h2>
                                </div>
                                {/* Item Count - only show when there are items */}
                                {getListCount(selectedListId) > 0 && (
                                    <span className="text-lg sm:text-xl text-gray-400 font-medium sm:pb-0.5">
                                        {getListCount(selectedListId)} items
                                    </span>
                                )}
                                {/* Edit Button - Only show for editable collections (exclude Watch Later) */}
                                {selectedList &&
                                    selectedList.id !== 'default-watchlist' &&
                                    selectedList.canEdit !== false && (
                                        <button
                                            onClick={() => handleEditCollection(selectedList)}
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
                                    placeholder="Search your favorites..."
                                    focusColor="blue"
                                    voiceInput
                                />
                            </div>
                        </div>
                    )
                })()}
        </div>
    ) : undefined

    return (
        <>
            <SubPageLayout
                title="Collections"
                icon={<RectangleStackIcon />}
                iconColor="text-blue-400"
                description="Keep track of the content you love!"
                titleActions={titleActions}
                headerActions={headerActions}
            >
                {/* Content Sections */}
                {isLoading ? (
                    <NetflixLoader message="Loading your collections..." inline />
                ) : allDisplayContent.length === 0 ? (
                    <EmptyState
                        emoji="🍿"
                        title="No items in this collection"
                        description="Start adding movies and TV shows to your collections!"
                    />
                ) : (
                    <div className="space-y-12">
                        {(() => {
                            // Filter out "Liked" and "Not For Me" items - they have their own pages now
                            const watchlistContent = allDisplayContent.filter(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (item: any) => {
                                    return (
                                        item.content &&
                                        !['Liked', 'Not For Me'].includes(item.listName)
                                    )
                                }
                            )

                            // No need to separate by media type - ContentCard shows the type
                            return (
                                <>
                                    <div className="flex flex-wrap justify-between gap-x-6 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3 sm:gap-y-4 md:gap-y-5 [&>*]:flex-none">
                                        {watchlistContent.map(
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            (item: any, index: number) => (
                                                <div
                                                    key={`${item.contentId}-${item.listId}-${index}`}
                                                >
                                                    <ContentCard content={item.content} />
                                                </div>
                                            )
                                        )}
                                        <ContentGridSpacer />
                                    </div>

                                    {/* Infinite scroll elements - matching genre page style */}
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
                                                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 text-lg"
                                                    >
                                                        Load More Results
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )
                        })()}
                    </div>
                )}
            </SubPageLayout>

            {/* Collection Editor Modal */}
            <CollectionEditorModal
                collection={editorCollection}
                isOpen={showEditor}
                onClose={handleCloseEditor}
            />
        </>
    )
}

export default Collections
