'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
import { isMovie, isTVShow } from '../../typings'
import { getTitle } from '../../typings'
import ContentCard from '../../components/common/ContentCard'
import EmptyState from '../../components/common/EmptyState'
import NetflixLoader from '../../components/common/NetflixLoader'
import SearchBar from '../../components/common/SearchBar'
import { useAppStore } from '../../stores/appStore'
import { useModalStore } from '../../stores/modalStore'
import { exportUserDataToCSV } from '../../utils/csvExport'
import { UserList } from '../../types/userLists'
import { useDebugSettings } from '../../components/debug/DebugControls'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'

const Collections = () => {
    const router = useRouter()
    const userData = useUserData()
    const { user } = useAuth()
    const { isGuest, isInitialized, isLoading } = useAuthStatus()
    const { getAllLists } = userData
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null
    const debugSettings = useDebugSettings()

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

    const titleActions = (
        <div className="flex items-center space-x-3">
            {/* New Collection Button */}
            <button
                onClick={() => openCollectionBuilderModal()}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white transition-all duration-200"
            >
                <PlusIcon className="w-5 h-5 text-white" />
                <span className="font-medium">New Collection</span>
            </button>

            {/* Manage Dropdown */}
            <div className="relative" ref={manageDropdownRef}>
                <button
                    type="button"
                    onClick={() => setShowManageDropdown(!showManageDropdown)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
                >
                    <Cog6ToothIcon className="w-5 h-5 pointer-events-none" />
                    <span className="font-medium pointer-events-none">Manage</span>
                    <ChevronDownIcon
                        className={`w-4 h-4 transition-transform pointer-events-none ${
                            showManageDropdown ? 'rotate-180' : ''
                        }`}
                    />
                </button>

                {/* Dropdown Menu */}
                {showManageDropdown && (
                    <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px] overflow-hidden animate-fade-down">
                        <button
                            type="button"
                            onClick={() => {
                                openListModal(undefined)
                                setShowManageDropdown(false)
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors text-left cursor-pointer"
                        >
                            <RectangleStackIcon className="w-5 h-5 text-gray-400 pointer-events-none" />
                            <span className="pointer-events-none">Manage Collections</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                handleExportCSV()
                                setShowManageDropdown(false)
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-white hover:bg-gray-800 transition-colors text-left cursor-pointer"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5 text-gray-400 pointer-events-none" />
                            <span className="pointer-events-none">Export to CSV</span>
                        </button>
                    </div>
                )}
            </div>
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
                            <div className="flex items-end space-x-4 mb-6">
                                {/* Collection Icon */}
                                <div className="flex items-center justify-center">
                                    {selectedList?.emoji ? (
                                        <span className="text-5xl">{selectedList.emoji}</span>
                                    ) : (
                                        <EyeIcon className="w-12 h-12 text-white" />
                                    )}
                                </div>
                                {/* Collection Title */}
                                <h2 className="text-4xl font-bold text-white">
                                    {selectedList?.name || 'Collection'}
                                </h2>
                                {/* Item Count */}
                                <span className="text-xl text-gray-400 font-medium pb-0.5">
                                    {getListCount(selectedListId)} items
                                </span>
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
            ) : filteredContent.length === 0 ? (
                <EmptyState
                    emoji="🍿"
                    title={`No content in ${
                        allLists.find((l) => l.id === selectedListId)?.name || 'this list'
                    } yet`}
                    description="Start adding movies and TV shows to your collections!"
                />
            ) : (
                <div className="space-y-12">
                    {(() => {
                        // Filter out "Liked" and "Not For Me" items - they have their own pages now
                        const watchlistContent = filteredContent.filter(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (item: any) => {
                                return (
                                    item.content && !['Liked', 'Not For Me'].includes(item.listName)
                                )
                            }
                        )

                        // No need to separate by media type - ContentCard shows the type
                        return (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
                                {watchlistContent.map(
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    (item: any) => (
                                        <div key={`${item.contentId}-${item.listId}`}>
                                            <ContentCard content={item.content} />
                                        </div>
                                    )
                                )}
                            </div>
                        )
                    })()}
                </div>
            )}
        </SubPageLayout>
    )
}

export default Collections
