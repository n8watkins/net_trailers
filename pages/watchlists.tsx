import { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import Header from '../components/Header'
import Modal from '../components/Modal'
import ListSelectionModal from '../components/ListSelectionModal'
import useUserData from '../hooks/useUserData'
import {
    EyeIcon,
    EyeSlashIcon,
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    PlusIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/solid'
import { Content, isMovie, isTVShow } from '../typings'
import { getTitle, getYear } from '../typings'
import ContentCard from '../components/ContentCard'
import { useSetRecoilState } from 'recoil'
import { modalState, movieState } from '../atoms/modalAtom'
import { listModalState } from '../atoms/listModalAtom'
import { exportUserDataToCSV } from '../utils/csvExport'
import { UserList } from '../types/userLists'

const Watchlists: NextPage = () => {
    const userData = useUserData()
    const { ratings, watchlist, isGuest, userLists, getDefaultLists, getCustomLists } = userData
    const userSession = userData.sessionType === 'authenticated' ? userData.userSession : null

    // Debug logging
    useEffect(() => {
        console.log('🔍 Watchlists Page Debug:', {
            sessionType: userData.sessionType,
            isGuest: userData.isGuest,
            isAuthenticated: userData.isAuthenticated,
            user: user?.email,
            userId: user?.uid,
            activeSessionId: userData.activeSessionId,
        })
    }, [userData, user])

    const [selectedListId, setSelectedListId] = useState<string | 'all'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const setShowModal = useSetRecoilState(modalState)
    const setCurrentMovie = useSetRecoilState(movieState)
    const setListModal = useSetRecoilState(listModalState)

    // Get all available lists (exclude Liked and Not For Me as they're rating categories, not lists)
    const defaultLists = getDefaultLists()
    const customLists = getCustomLists()
    const filteredDefaultLists = Object.values(defaultLists).filter(
        (list) => list && list.name !== 'Liked' && list.name !== 'Not For Me'
    )
    const allLists = [...filteredDefaultLists, ...customLists] as UserList[]

    // Set default to Watchlist when lists are loaded
    useEffect(() => {
        if (selectedListId === 'all' && allLists.length > 0) {
            const watchlistDefault = allLists.find((list) => list.name === 'Watchlist')
            if (watchlistDefault) {
                setSelectedListId(watchlistDefault.id)
            } else {
                setSelectedListId(allLists[0].id)
            }
        }
    }, [allLists, selectedListId])

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
        ? baseFilteredContent.filter((item: any) => {
              if (!item.content) return false
              const title = getTitle(item.content).toLowerCase()
              const query = searchQuery.toLowerCase()
              return title.includes(query)
          })
        : baseFilteredContent

    const handleContentClick = (content: Content) => {
        setCurrentMovie(content)
        setShowModal(true)
    }

    const handleExportCSV = () => {
        if (userSession?.preferences) {
            exportUserDataToCSV(userSession.preferences)
        }
    }

    const handleManageAllLists = () => {
        setListModal({
            isOpen: true,
            content: null, // No specific content, just manage lists
        })
    }

    const getListIcon = (list: UserList, isSelected: boolean = false) => {
        const iconClass = `w-5 h-5 ${isSelected ? 'text-black' : 'text-white'}`
        const coloredIconClass = `w-5 h-5 ${isSelected ? 'text-black' : list.color ? `text-[${list.color}]` : 'text-white'}`

        // Return emoji if the list has one (custom lists)
        if (list.emoji) {
            return <span className="text-lg">{list.emoji}</span>
        }

        // Default icons for system lists
        if (list.name === 'Watchlist') {
            return <EyeIcon className={coloredIconClass} />
        }

        return <EyeIcon className={iconClass} />
    }

    const getListCount = (listId: string) => {
        const list = allLists.find((l) => l.id === listId)
        return list ? list.items.length : 0
    }

    return (
        <div className="relative min-h-screen bg-gradient-to-b">
            <Head>
                <title>Watchlists - NetTrailer</title>
                <meta
                    name="description"
                    content="View and manage your watchlists and custom lists of movies and TV shows"
                />
            </Head>

            <Header />

            <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16">
                <div className="flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
                    {/* Header Section */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3">
                            <EyeIcon className="w-8 h-8 text-blue-400" />
                            <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl pt-8 sm:pt-10 md:pt-12">
                                Watchlists
                            </h1>
                        </div>

                        <p className="text-gray-400 max-w-2xl">
                            Your watchlists and custom collections. Keep track of what you want to
                            watch and organize your content.
                        </p>

                        {isGuest && (
                            <div className="bg-gray-800/50 p-4 rounded-lg max-w-2xl">
                                <p className="text-sm text-gray-300">
                                    📱 You&apos;re browsing as a guest. Your preferences are saved
                                    locally. Sign up to sync across devices!
                                </p>
                            </div>
                        )}

                        {/* Action Buttons Row - Above List Filter Buttons */}
                        {(allLists.some((list) => list.items.length > 0) ||
                            allLists.length > 3) && (
                            <div className="flex justify-between items-center py-3 mb-4 border-b border-gray-700/30">
                                <div className="flex items-center space-x-4">
                                    {/* Export Button */}
                                    {allLists.some((list) => list.items.length > 0) && (
                                        <button
                                            onClick={handleExportCSV}
                                            className="flex items-center space-x-2 px-5 py-2.5 bg-gray-800/50 hover:bg-white/10 text-white border border-gray-600 hover:border-gray-400 rounded-full text-sm font-medium transition-all duration-200"
                                        >
                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                            <span>Export to CSV</span>
                                        </button>
                                    )}

                                    {/* Manage Lists Button */}
                                    <button
                                        onClick={handleManageAllLists}
                                        className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/50 hover:border-blue-400 rounded-full text-sm font-medium transition-all duration-200"
                                    >
                                        <Cog6ToothIcon className="w-4 h-4" />
                                        <span>Manage Lists</span>
                                    </button>
                                </div>

                                {/* Stats */}
                                <div className="text-sm text-gray-400">
                                    {allLists.reduce((total, list) => total + list.items.length, 0)}{' '}
                                    items total
                                </div>
                            </div>
                        )}

                        {/* List Filter Buttons */}
                        <div className="flex flex-wrap gap-3">
                            {/* List Buttons - Watchlist will be first */}
                            {allLists
                                .sort((a, b) => {
                                    // Put Watchlist first, then other lists
                                    if (a.name === 'Watchlist') return -1
                                    if (b.name === 'Watchlist') return 1
                                    return 0
                                })
                                .map((list) => (
                                    <button
                                        key={list.id}
                                        onClick={() => setSelectedListId(list.id)}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                            selectedListId === list.id
                                                ? 'bg-white text-black'
                                                : 'bg-gray-800/50 text-white hover:bg-gray-700/50'
                                        }`}
                                    >
                                        {getListIcon(list, selectedListId === list.id)}
                                        <span>{list.name}</span>
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full ml-2 ${
                                                selectedListId === list.id
                                                    ? 'bg-gray-800 text-white'
                                                    : 'bg-gray-600 text-white'
                                            }`}
                                        >
                                            {getListCount(list.id)}
                                        </span>
                                    </button>
                                ))}

                            {/* Create New List Button */}
                            <button
                                onClick={() =>
                                    setListModal({
                                        isOpen: true,
                                        content: null, // No specific content, open in create mode
                                    })
                                }
                                className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 bg-gray-800/50 text-white hover:bg-gray-700/50 border border-gray-600 hover:border-gray-400"
                            >
                                <PlusIcon className="w-5 h-5 text-white" />
                                <span>Create List</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="max-w-md">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search your favorites..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content Sections */}
                    {filteredContent.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🍿</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                No content in{' '}
                                {allLists.find((l) => l.id === selectedListId)?.name || 'this list'}{' '}
                                yet
                            </h2>
                            <p className="text-gray-400">
                                Start adding movies and TV shows to your watchlists and create
                                custom lists!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {(() => {
                                // Filter out "Liked" and "Not For Me" items - they have their own pages now
                                const watchlistContent = filteredContent.filter((item: any) => {
                                    return (
                                        item.content &&
                                        !['Liked', 'Not For Me'].includes(item.listName)
                                    )
                                })

                                const moviesContent = watchlistContent.filter((item: any) => {
                                    return item.content && isMovie(item.content)
                                })

                                const tvShowsContent = watchlistContent.filter((item: any) => {
                                    return item.content && isTVShow(item.content)
                                })

                                const renderContentGrid = (items: any[], title: string) => (
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-6">
                                            {title}
                                        </h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 md:gap-x-8 md:gap-y-12">
                                            {items.map((item: any) => (
                                                <div
                                                    key={`${item.contentId}-${item.listId}`}
                                                    className="relative mb-12 sm:mb-16 md:mb-20"
                                                >
                                                    <ContentCard
                                                        content={item.content}
                                                        className=""
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )

                                return (
                                    <>
                                        {moviesContent.length > 0 &&
                                            renderContentGrid(
                                                moviesContent,
                                                'Movies in Watchlists'
                                            )}
                                        {tvShowsContent.length > 0 &&
                                            renderContentGrid(
                                                tvShowsContent,
                                                'TV Shows in Watchlists'
                                            )}
                                    </>
                                )
                            })()}
                        </div>
                    )}
                </div>
            </main>

            <Modal />
            <ListSelectionModal />
        </div>
    )
}

export default Watchlists
