import React, {
    useEffect,
    useState,
    useRef,
    useCallback,
    MouseEventHandler,
    MouseEvent,
} from 'react'
import MuiModal from '@mui/material/Modal'
import { useRecoilState, useRecoilValue } from 'recoil'
import { modalState, movieState, autoPlayWithSoundState } from '../atoms/modalAtom'
import { loadingState } from '../atoms/errorAtom'
import { createErrorHandler } from '../utils/errorHandler'
import {
    getTitle,
    getYear,
    getContentType,
    getDirector,
    getMainCast,
    getGenreNames,
    getRating,
    getRuntime,
    getIMDbRating,
    getProductionCompanyNames,
    Content,
    isMovie,
} from '../typings'
import {
    HandThumbDownIcon as HandThumbDownIconFilled,
    HandThumbUpIcon,
    HandThumbDownIcon,
    PlayIcon,
    PauseIcon,
    PlusIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    XMarkIcon,
    HeartIcon as HeartIconFilled,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    CheckIcon,
    CodeBracketIcon,
    LinkIcon,
    ArrowTopRightOnSquareIcon,
    EyeIcon,
    MinusIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/solid'

import ReactPlayer from 'react-player'
import VideoPlayerControls from './VideoPlayerControls'
import ContentMetadata from './ContentMetadata'
import ContentMetadataSkeleton from './ContentMetadataSkeleton'
import KeyboardShortcuts from './KeyboardShortcuts'
import Image from 'next/image'
import { Element, Genre } from '../typings'
import ToolTipMod from '../components/ToolTipMod'
import SimpleLikeButton from './SimpleLikeButton'
import WatchLaterButton from './WatchLaterButton'
import useUserData from '../hooks/useUserData'
import { useToast } from '../hooks/useToast'
import { useSetRecoilState } from 'recoil'
import { listModalState } from '../atoms/listModalAtom'
import { UserList } from '../types/userLists'

function Modal() {
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentMovie, setCurrentMovie] = useRecoilState(movieState)
    const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)
    const [isLoading, setIsLoading] = useRecoilState(loadingState)
    const [trailer, setTrailer] = useState('')
    const [genres, setGenres] = useState<Genre[]>([])
    const [enhancedMovieData, setEnhancedMovieData] = useState<Content | null>(null)
    const [muted, setMuted] = useState(true)
    const [playing, setPlaying] = useState(true)
    const [trailerEnded, setTrailerEnded] = useState(true)
    const [fullScreen, setFullScreen] = useState(false)
    const [player, setPlayer] = useState<ReactPlayer | null>(null)
    const [secondsPlayed, setSecondsPlayed] = useState(0)
    const divRef = useRef<HTMLDivElement>(null)

    const handlePlayerRef = useCallback((ref: ReactPlayer | null) => {
        setPlayer(ref)
    }, [])

    const handlePlayerReady = useCallback(
        (player: ReactPlayer) => {
            setTimeout(() => {
                if (player && typeof player.seekTo === 'function' && secondsPlayed > 0) {
                    player.seekTo(secondsPlayed, 'seconds')
                }
            }, 50)
        },
        [secondsPlayed]
    )
    const [loadedMovieId, setLoadedMovieId] = useState<number | null>(null)
    const [showJsonDebug, setShowJsonDebug] = useState(false)

    // Inline watchlist dropdown state
    const [showInlineListDropdown, setShowInlineListDropdown] = useState(false)
    const [showCreateInput, setShowCreateInput] = useState(false)
    const [newListName, setNewListName] = useState('')

    const inlineDropdownRef = useRef<HTMLDivElement>(null)

    // User data hooks for inline dropdown
    const {
        getDefaultLists,
        getListsContaining,
        addToList,
        removeFromList,
        createList,
        getCustomLists,
        getRating,
        setRating,
        removeRating,
    } = useUserData()
    const {
        showSuccess,
        showWatchlistAdd,
        showWatchlistRemove,
        showContentHidden,
        showContentShown,
        showError,
    } = useToast()
    const errorHandler = createErrorHandler(showError)
    const setListModal = useSetRecoilState(listModalState)

    let timeout: ReturnType<typeof setTimeout> | null = null
    let timeout2: ReturnType<typeof setTimeout> | null = null

    let clickCount = 0

    function isFullScreen() {
        return !!document.fullscreenElement
    }

    function handleSingleOrDoubleClick(event: MouseEvent) {
        if (player && typeof player.getCurrentTime === 'function') {
            setSecondsPlayed(player.getCurrentTime())
        }
        togglePlaying()
    }

    const handleFullscreenChange = useCallback(() => {
        const isNowFullScreen = isFullScreen()
        setFullScreen(isNowFullScreen)

        // Automatically unmute when entering fullscreen
        if (isNowFullScreen && muted) {
            setMuted(false)
        }
    }, [muted])

    const toggleFullscreen = () => {
        if (isFullScreen()) {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen()
            }
        } else {
            // Enter fullscreen - try multiple approaches
            const modalContent = document.querySelector('.relative.w-full.max-w-sm.sm\\:max-w-2xl')
            const videoContainer = document.querySelector('.relative.w-full.aspect-video.bg-black')

            // Try video container first, then modal content, then divRef
            const targetElement = videoContainer || modalContent || divRef.current

            if (targetElement && typeof (targetElement as any).requestFullscreen === 'function') {
                ;(targetElement as any).requestFullscreen().catch((err: Error) => {
                    console.warn('Fullscreen request failed:', err)
                })
            }
        }
    }

    const handleFullscreenButtonClick = () => {
        if (!isFullScreen()) {
            // When entering fullscreen via button, start the video if not already playing
            if (!playing) {
                setPlaying(true)
                setTrailerEnded(false)
            }

            // Automatically unmute when entering fullscreen
            if (muted) {
                setMuted(false)
            }
        }
        toggleFullscreen()
    }

    const handleMuteToggle = () => {
        setMuted(!muted)
    }

    const togglePlaying = () => {
        setPlaying(!playing)
    }

    const handleClose = () => {
        setShowModal(false)
        // Reset loaded movie ID when closing modal to allow fresh data next time
        setLoadedMovieId(null)
        setTrailer('')
        setGenres([])
        setEnhancedMovieData(null)
        // Reset inline dropdown state
        setShowInlineListDropdown(false)
        setShowCreateInput(false)
        setNewListName('')
    }

    // Inline dropdown helper functions
    const handleWatchlistToggle = () => {
        console.log('🎬 Modal handleWatchlistToggle called')
        if (!currentMovie) {
            console.log('🎬 No currentMovie, returning')
            return
        }
        console.log('🎬 Current movie:', getTitle(currentMovie as Content))
        const defaultLists = getDefaultLists()
        const watchlist = defaultLists.watchlist
        const isInWatchlist = watchlist
            ? watchlist.items.some((item) => item.id === currentMovie.id)
            : false

        console.log('🎬 isInWatchlist:', isInWatchlist, 'watchlist exists:', !!watchlist)

        if (isInWatchlist && watchlist) {
            console.log('🎬 Removing from watchlist...')
            removeFromList(watchlist.id, currentMovie.id)
            console.log('🎬 Calling showWatchlistRemove')
            showWatchlistRemove(`Removed ${getTitle(currentMovie as Content)} from My List`)
        } else if (watchlist) {
            console.log('🎬 Adding to watchlist...')
            addToList(watchlist.id, currentMovie as Content)
            console.log('🎬 Calling showWatchlistAdd')
            showWatchlistAdd(`Added ${getTitle(currentMovie as Content)} to My List`)
        }
    }

    const handleCreateList = () => {
        if (newListName.trim()) {
            const listName = newListName.trim()
            createList({
                name: listName,
                isPublic: false,
                color: '#6b7280', // gray-500 default color
            })
            showSuccess(`Created "${listName}"`, 'Your new list is ready to use')
            setNewListName('')
            setShowCreateInput(false)
        }
    }

    const handleManageAllLists = () => {
        if (!currentMovie) return
        setListModal({
            isOpen: true,
            content: currentMovie as Content,
        })
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCreateList()
        } else if (e.key === 'Escape') {
            setShowCreateInput(false)
            setNewListName('')
        }
    }

    useEffect(() => {
        if (!currentMovie || !currentMovie.id) return

        // Only fetch if we haven't already loaded this movie's details
        if (loadedMovieId === currentMovie.id) return

        async function fetchMovie() {
            try {
                setIsLoading(true)
                const mediaType = currentMovie?.media_type === 'tv' ? 'tv' : 'movie'
                const response = await fetch(
                    `/api/movies/details/${currentMovie?.id}?media_type=${mediaType}`
                )

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }

                const data = await response.json()

                if (data?.videos) {
                    const index = data.videos.results.findIndex(
                        (element: Element) => element.type === 'Trailer'
                    )
                    setTrailer(data.videos?.results[index]?.key)
                }
                if (data?.genres) {
                    setGenres(data.genres)
                }

                // Store the complete enhanced data
                setEnhancedMovieData(data)

                // Mark this movie as loaded
                setLoadedMovieId(currentMovie?.id || 0)
            } catch (error: any) {
                console.error('Failed to fetch movie details:', error)
                errorHandler.handleApiError(error, 'load movie details')
                setTrailer('')
                setGenres([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchMovie()
    }, [currentMovie, loadedMovieId, errorHandler, setIsLoading])

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [])

    // Handle keyboard shortcuts for modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                if (showJsonDebug) {
                    // Close JSON debug modal first if it's open
                    setShowJsonDebug(false)
                } else if (showModal) {
                    // Close main modal if JSON debug is not open
                    handleClose()
                }
            } else if (e.key === 'm' || e.key === 'M') {
                // Toggle mute when 'm' is pressed (only if trailer exists)
                if (trailer && showModal && !showJsonDebug) {
                    e.preventDefault()
                    handleMuteToggle()
                }
            } else if (e.key === 'f' || e.key === 'F') {
                // Toggle fullscreen when 'f' is pressed (only if trailer exists)
                if (trailer && showModal && !showJsonDebug) {
                    e.preventDefault()

                    // If entering fullscreen, auto-unmute
                    if (!isFullScreen() && muted) {
                        setMuted(false)
                    }

                    toggleFullscreen()
                }
            } else if (e.key === ' ' || e.code === 'Space') {
                // Toggle play/pause when spacebar is pressed (only if trailer exists)
                if (trailer && showModal && !showJsonDebug) {
                    e.preventDefault()
                    togglePlaying()
                }
            } else if (e.key === 'l' || e.key === 'L') {
                // Toggle like when 'l' is pressed (only if modal is open)
                if (currentMovie && showModal && !showJsonDebug) {
                    e.preventDefault()

                    // Get the current rating and toggle like
                    const currentRating = getRating(currentMovie.id)
                    const isLiked = currentRating?.rating === 'liked'

                    if (isLiked) {
                        removeRating(currentMovie.id)
                    } else {
                        setRating(currentMovie.id, 'liked', currentMovie as Content)
                    }
                }
            } else if (e.key === 'h' || e.key === 'H') {
                // Toggle hide/unhide when 'h' is pressed (only if modal is open)
                if (currentMovie && showModal && !showJsonDebug) {
                    e.preventDefault()

                    const currentRating = getRating(currentMovie.id)
                    const isHidden = currentRating?.rating === 'disliked'

                    if (isHidden) {
                        // Unhide (remove rating)
                        removeRating(currentMovie.id)
                        showContentShown(
                            `${getTitle(currentMovie as Content)} Shown`,
                            'Will appear in recommendations again'
                        )
                    } else {
                        // Hide (set disliked rating)
                        setRating(currentMovie.id, 'disliked', currentMovie as Content)
                        showContentHidden(
                            `${getTitle(currentMovie as Content)} Hidden`,
                            'Hidden from recommendations'
                        )
                    }
                }
            } else if (e.key === 'r' || e.key === 'R') {
                // Open YouTube when 'r' is pressed (only if modal is open and trailer exists)
                if (trailer && showModal && !showJsonDebug) {
                    e.preventDefault()
                    window.open(`https://www.youtube.com/watch?v=${trailer}`, '_blank')
                }
            }
        }

        if (showModal || showJsonDebug) {
            document.addEventListener('keydown', handleKeyDown)
            return () => document.removeEventListener('keydown', handleKeyDown)
        }
    }, [
        showModal,
        showJsonDebug,
        trailer,
        muted,
        playing,
        getRating,
        setRating,
        removeRating,
        currentMovie,
        showContentShown,
        showContentHidden,
    ])

    // Handle auto-play with sound when Play button is clicked
    useEffect(() => {
        if (autoPlayWithSound && trailer && showModal) {
            setMuted(false)
            setPlaying(true)
            setTrailerEnded(false)
            // Reset the flag after use
            setAutoPlayWithSound(false)
        }
    }, [autoPlayWithSound, trailer, showModal, setAutoPlayWithSound])

    // Handle click outside inline dropdown
    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            if (
                inlineDropdownRef.current &&
                !inlineDropdownRef.current.contains(event.target as Node)
            ) {
                setShowInlineListDropdown(false)
                setShowCreateInput(false)
                setNewListName('')
            }
        }

        if (showInlineListDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showInlineListDropdown])

    const anchorRef = React.useRef<HTMLDivElement>(null)
    const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null)
    React.useEffect(() => {
        setTimeout(() => setAnchorEl(anchorRef?.current), 2000)
    }, [anchorRef])
    return (
        <MuiModal
            open={showModal}
            onClose={handleClose}
            disableAutoFocus
            disableEnforceFocus
            sx={{
                '& .MuiBackdrop-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                },
            }}
        >
            <div
                className="fixed inset-0 flex justify-center items-center p-2 sm:p-4 md:p-8"
                onClick={handleClose}
            >
                <div
                    className="relative w-full max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-5xl z-10 rounded-md max-h-[92vh] bg-[#141414] overflow-y-auto flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Video Container - Responsive */}
                    <div className="relative w-full aspect-[16/10] bg-black flex-shrink-0">
                        {/* Close Button */}
                        <button
                            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 rounded-full bg-black/80 p-1 sm:p-2"
                            onClick={handleClose}
                        >
                            <XMarkIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                        </button>

                        {/* Clickable Overlay */}
                        <div
                            className="absolute inset-0 bg-transparent cursor-pointer z-10"
                            onClick={(e) => {
                                handleSingleOrDoubleClick(e)
                            }}
                        ></div>

                        {/* Video Player or Static Image */}
                        {(trailer && !trailerEnded) || playing || fullScreen ? (
                            <ReactPlayer
                                config={{
                                    youtube: {
                                        playerVars: {
                                            cc_load_policy: 1,
                                            autoplay: 0,
                                            controls: 0,
                                            iv_load_policy: 3,
                                            modestbranding: 1,
                                        },
                                        embedOptions: {},
                                    },
                                }}
                                url={`https://www.youtube.com/watch?v=${trailer}`}
                                width="100%"
                                height="100%"
                                className="absolute inset-0 rounded-md"
                                playing={playing}
                                volume={0.5}
                                muted={muted}
                                onEnded={() => {
                                    setTrailerEnded(true)
                                    setPlaying(false)
                                    setFullScreen(false)
                                    setSecondsPlayed(0)
                                }}
                                onPause={() => {
                                    setPlaying(false)
                                    setTrailerEnded(true)
                                }}
                                onPlay={() => {
                                    setPlaying(true)
                                    setTrailerEnded(false)
                                }}
                                onReady={handlePlayerReady}
                                ref={handlePlayerRef}
                            />
                        ) : (
                            <Image
                                src={`https://image.tmdb.org/t/p/original/${currentMovie?.backdrop_path}`}
                                alt="movie_backdrop"
                                fill
                                quality={100}
                                priority
                                style={{ objectFit: 'cover' }}
                                className="rounded-md"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                            />
                        )}

                        {/* Gradient Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 md:h-40 bg-gradient-to-t from-[#141414] via-[#141414]/90 to-transparent z-20"></div>

                        {/* Video Player Controls */}
                        <VideoPlayerControls
                            trailer={trailer}
                            muted={muted}
                            fullScreen={fullScreen}
                            onMuteToggle={handleMuteToggle}
                            onFullscreenClick={handleFullscreenButtonClick}
                            currentMovieTitle={
                                currentMovie ? getTitle(currentMovie as Content) : ''
                            }
                        />

                        {/* Controls Overlay */}
                        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-30">
                            <div className="space-y-4">
                                {/* Inline Watchlist Dropdown */}
                                {currentMovie && showInlineListDropdown && (
                                    <div
                                        ref={inlineDropdownRef}
                                        className="bg-[#141414] border border-gray-600 rounded-lg shadow-2xl p-4 mb-4 w-64 max-w-sm"
                                    >
                                        {(() => {
                                            const defaultLists = getDefaultLists()
                                            const watchlist = defaultLists.watchlist
                                            const listsContaining = getListsContaining(
                                                currentMovie.id
                                            )
                                            const isInWatchlist = watchlist
                                                ? watchlist.items.some(
                                                      (item) => item.id === currentMovie.id
                                                  )
                                                : false

                                            const customLists = getCustomLists()
                                            // Exclude Liked and Not For Me as they're rating categories, not user lists
                                            const filteredDefaultLists = Object.values(
                                                defaultLists
                                            ).filter(
                                                (list) =>
                                                    list &&
                                                    list.name !== 'Liked' &&
                                                    list.name !== 'Not For Me'
                                            )
                                            const allLists = [
                                                ...filteredDefaultLists,
                                                ...customLists,
                                            ] as UserList[]

                                            return (
                                                <div className="space-y-3">
                                                    {/* Create New List - Always at top */}
                                                    {!showCreateInput ? (
                                                        <button
                                                            onClick={() => setShowCreateInput(true)}
                                                            className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-700/50 transition-colors text-left rounded"
                                                        >
                                                            <PlusIcon className="w-5 h-5 text-green-400" />
                                                            <span className="text-white font-medium">
                                                                Create New List
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                placeholder="List name..."
                                                                value={newListName}
                                                                onChange={(e) =>
                                                                    setNewListName(e.target.value)
                                                                }
                                                                onKeyDown={handleKeyPress}
                                                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                                autoFocus
                                                            />
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={handleCreateList}
                                                                    disabled={!newListName.trim()}
                                                                    className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    Create
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setShowCreateInput(false)
                                                                        setNewListName('')
                                                                    }}
                                                                    className="flex-1 px-3 py-1.5 bg-gray-600 text-white rounded text-sm font-medium transition-colors hover:bg-gray-700"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* All Lists */}
                                                    {allLists.map((list) => {
                                                        const isInList = list.items.some(
                                                            (item) => item.id === currentMovie.id
                                                        )
                                                        const getListIcon = () => {
                                                            if (list.name === 'Liked') {
                                                                return (
                                                                    <HandThumbUpIcon className="w-5 h-5 text-green-400" />
                                                                )
                                                            } else if (list.name === 'Not For Me') {
                                                                return (
                                                                    <HandThumbDownIcon className="w-5 h-5 text-red-400" />
                                                                )
                                                            } else if (list.name === 'Watchlist') {
                                                                return (
                                                                    <EyeIcon className="w-5 h-5 text-blue-400" />
                                                                )
                                                            }
                                                            return (
                                                                <EyeIcon className="w-5 h-5 text-white" />
                                                            )
                                                        }

                                                        const handleListToggle = () => {
                                                            console.log(
                                                                '🎬 Modal handleListToggle called for list:',
                                                                list.name
                                                            )
                                                            console.log('🎬 isInList:', isInList)
                                                            if (isInList) {
                                                                console.log(
                                                                    '🎬 Removing from list...'
                                                                )
                                                                removeFromList(
                                                                    list.id,
                                                                    currentMovie.id
                                                                )
                                                                // Show appropriate toast based on list type
                                                                if (
                                                                    list.name === 'My List' ||
                                                                    list.name === 'Watchlist'
                                                                ) {
                                                                    showWatchlistRemove(
                                                                        `Removed ${getTitle(currentMovie as Content)} from ${list.name}`
                                                                    )
                                                                } else {
                                                                    showSuccess(
                                                                        'Removed from list',
                                                                        `Removed ${getTitle(currentMovie as Content)} from "${list.name}"`
                                                                    )
                                                                }
                                                            } else {
                                                                console.log('🎬 Adding to list...')
                                                                addToList(
                                                                    list.id,
                                                                    currentMovie as Content
                                                                )
                                                                // Show appropriate toast based on list type
                                                                if (
                                                                    list.name === 'My List' ||
                                                                    list.name === 'Watchlist'
                                                                ) {
                                                                    showWatchlistAdd(
                                                                        `Added ${getTitle(currentMovie as Content)} to ${list.name}`
                                                                    )
                                                                } else {
                                                                    showSuccess(
                                                                        'Added to list',
                                                                        `Added ${getTitle(currentMovie as Content)} to "${list.name}"`
                                                                    )
                                                                }
                                                            }
                                                        }

                                                        return (
                                                            <button
                                                                key={list.id}
                                                                onClick={handleListToggle}
                                                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700/50 transition-colors text-left rounded"
                                                            >
                                                                <div className="flex items-center space-x-3">
                                                                    {getListIcon()}
                                                                    <span className="text-white font-medium">
                                                                        {list.name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    {isInList ? (
                                                                        <CheckIcon className="w-4 h-4 text-green-400" />
                                                                    ) : (
                                                                        <PlusIcon className="w-4 h-4 text-gray-400" />
                                                                    )}
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                )}

                                {/* Control Buttons Row */}
                                <div className="flex flex-wrap gap-4 sm:gap-8 items-center justify-between">
                                    {/* Left side buttons */}
                                    <div className="flex gap-2 sm:gap-4 items-center">
                                        {trailer && (
                                            <button
                                                className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-6 sm:py-2 bg-white text-black hover:bg-white/80 rounded text-sm sm:text-base font-semibold"
                                                onClick={togglePlaying}
                                            >
                                                {playing || !trailer ? (
                                                    <>
                                                        <PauseIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                                        <span className="hidden sm:inline">
                                                            Pause
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                                        <span className="hidden sm:inline">
                                                            Play
                                                        </span>
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {/* My List Button - Modified to toggle inline dropdown */}
                                        {currentMovie && 'media_type' in currentMovie && (
                                            <ToolTipMod
                                                title={showInlineListDropdown ? '' : 'Add to Lists'}
                                            >
                                                <button
                                                    className={`relative p-2 sm:p-3 rounded-full border-2 ${(() => {
                                                        const defaultLists = getDefaultLists()
                                                        const listsContaining = getListsContaining(
                                                            currentMovie.id
                                                        )
                                                        const isInAnyList =
                                                            listsContaining.length > 0
                                                        return isInAnyList
                                                            ? 'border-green-400/60 bg-green-500/20 hover:bg-green-500/30'
                                                            : 'border-white/30 bg-black/20 hover:bg-black/50'
                                                    })()} hover:border-white text-white transition-all duration-200`}
                                                    onClick={() =>
                                                        setShowInlineListDropdown(
                                                            !showInlineListDropdown
                                                        )
                                                    }
                                                >
                                                    {(() => {
                                                        const defaultLists = getDefaultLists()
                                                        const listsContaining = getListsContaining(
                                                            currentMovie.id
                                                        )
                                                        const isInAnyList =
                                                            listsContaining.length > 0

                                                        return (
                                                            <>
                                                                {isInAnyList ? (
                                                                    <CheckIcon className="h-4 w-4 sm:h-6 sm:w-6 text-green-400" />
                                                                ) : (
                                                                    <PlusIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                                                                )}

                                                                {/* Show count badge if in multiple lists */}
                                                                {listsContaining.length > 1 && (
                                                                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                                        {listsContaining.length}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )
                                                    })()}
                                                </button>
                                            </ToolTipMod>
                                        )}

                                        {/* Like Button */}
                                        <SimpleLikeButton />

                                        {/* Hide/Unhide Toggle Button */}
                                        {currentMovie &&
                                            'media_type' in currentMovie &&
                                            (() => {
                                                const currentRating = getRating(currentMovie.id)
                                                const isHidden =
                                                    currentRating?.rating === 'disliked'

                                                return (
                                                    <ToolTipMod title={isHidden ? 'Show' : 'Hide'}>
                                                        <button
                                                            className={`relative p-2 sm:p-3 rounded-full border-2 transition-all duration-200 ${
                                                                isHidden
                                                                    ? 'border-red-500/50 bg-red-500/20 hover:bg-red-500/40 hover:border-red-500 text-red-300'
                                                                    : 'border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white'
                                                            }`}
                                                            onClick={() => {
                                                                if (currentMovie) {
                                                                    if (isHidden) {
                                                                        // Remove from "Not For Me" list (remove rating)
                                                                        removeRating(
                                                                            currentMovie.id
                                                                        )
                                                                        showContentShown(
                                                                            `${getTitle(currentMovie as Content)} Shown`,
                                                                            'Will appear in recommendations again'
                                                                        )
                                                                    } else {
                                                                        // Add to "Not For Me" list (dislike rating)
                                                                        setRating(
                                                                            currentMovie.id,
                                                                            'disliked',
                                                                            currentMovie as Content
                                                                        )
                                                                        showContentHidden(
                                                                            `${getTitle(currentMovie as Content)} Hidden`,
                                                                            'Hidden from recommendations'
                                                                        )
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {isHidden ? (
                                                                <EyeSlashIcon className="h-4 w-4 sm:h-6 sm:w-6 text-red-500" />
                                                            ) : (
                                                                <EyeIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                                                            )}
                                                        </button>
                                                    </ToolTipMod>
                                                )
                                            })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section - Below Video */}
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
                        {/* Content Metadata */}
                        {isLoading && !enhancedMovieData ? (
                            <ContentMetadataSkeleton />
                        ) : enhancedMovieData ? (
                            <ContentMetadata
                                content={enhancedMovieData}
                                showDebugButton={true}
                                onDebugClick={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                        const mediaType =
                                            currentMovie?.media_type === 'tv' ? 'tv' : 'movie'
                                        const url = `/api/movies/details/${currentMovie?.id}?media_type=${mediaType}`
                                        window.open(url, '_blank')
                                    } else {
                                        setShowJsonDebug(true)
                                    }
                                }}
                            />
                        ) : null}
                    </div>
                </div>

                {/* Keyboard Shortcuts - Below Modal */}
                {!showJsonDebug && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
                        <KeyboardShortcuts
                            shortcuts={[
                                { key: 'ESC', description: 'Close' },
                                { key: 'SPACE', description: 'Play/Pause' },
                                { key: 'M', description: 'Mute/Unmute' },
                                { key: 'F', description: 'Fullscreen', icon: '⛶' },
                                { key: 'L', description: 'Like/Unlike', icon: '👍' },
                                { key: 'H', description: 'Hide/Show' },
                                { key: 'R', description: 'Watch on YouTube' },
                            ]}
                            className="opacity-80 hover:opacity-100 transition-opacity"
                        />
                    </div>
                )}

                {/* JSON Debug Modal */}
                {showJsonDebug && (
                    <div
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
                        onClick={() => setShowJsonDebug(false)}
                    >
                        <div
                            className="bg-gray-900 rounded-lg max-w-4xl max-h-[80vh] w-full mx-4 flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center p-4 border-b border-gray-700">
                                <h3 className="text-white text-lg font-semibold">
                                    API Response JSON
                                </h3>
                                <button
                                    onClick={() => setShowJsonDebug(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-4 flex-1 overflow-auto">
                                <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-words">
                                    {enhancedMovieData
                                        ? JSON.stringify(enhancedMovieData, null, 2)
                                        : 'No data available'}
                                </pre>
                            </div>
                            <div className="p-4 border-t border-gray-700 flex justify-end">
                                <button
                                    onClick={() => {
                                        if (enhancedMovieData) {
                                            navigator.clipboard.writeText(
                                                JSON.stringify(enhancedMovieData, null, 2)
                                            )
                                        }
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-2"
                                >
                                    Copy JSON
                                </button>
                                <button
                                    onClick={() => setShowJsonDebug(false)}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MuiModal>
    )
}

export default Modal
