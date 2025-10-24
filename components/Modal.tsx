import React, {
    useEffect,
    useState,
    useRef,
    useCallback,
    useMemo,
    MouseEventHandler,
    MouseEvent,
} from 'react'
import MuiModal from '@mui/material/Modal'
import { useAppStore } from '../stores/appStore'
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
    LockClosedIcon,
} from '@heroicons/react/24/solid'

import ReactPlayer from 'react-player'
import VideoPlayerControls from './VideoPlayerControls'
import ContentMetadata from './ContentMetadata'
import KeyboardShortcuts from './KeyboardShortcuts'
import VolumeSlider from './VolumeSlider'
import Image from 'next/image'
import { Element, Genre } from '../typings'
import ToolTipMod from '../components/ToolTipMod'
import SimpleLikeButton from './SimpleLikeButton'
import WatchLaterButton from './WatchLaterButton'
import useUserData from '../hooks/useUserData'
import { useToast } from '../hooks/useToast'
import { UserList } from '../types/userLists'
import { useAuthStatus } from '../hooks/useAuthStatus'
import { useRecoilState } from 'recoil'
import { authModalState } from '../atoms/authModalAtom'
import { listModalState } from '../atoms/listModalAtom'
import { useDebugSettings } from './DebugControls'
import { getCachedMovieDetails } from '../utils/prefetchCache'

function Modal() {
    // Debug settings
    const debugSettings = useDebugSettings()

    // Zustand store
    const { modal, closeModal, setAutoPlayWithSound, isLoading, setLoading, openListModal } =
        useAppStore()

    // Extract modal state
    const showModal = modal.isOpen
    const currentMovie = modal.content?.content || null
    const autoPlayWithSound = modal.content?.autoPlayWithSound || false
    const [trailer, setTrailer] = useState('')
    const [genres, setGenres] = useState<Genre[]>([])
    const [enhancedMovieData, setEnhancedMovieData] = useState<Content | null>(null)
    const [muted, setMuted] = useState(true)
    const [volume, setVolume] = useState(0.5) // ReactPlayer uses 0-1 range, default 50%
    const [previousVolume, setPreviousVolume] = useState(0.5) // Track volume before muting
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

    const inlineDropdownRef = useRef<HTMLDivElement>(null)
    const inlineDropdownButtonRef = useRef<HTMLButtonElement>(null)

    // Volume slider state
    const [showVolumeSlider, setShowVolumeSlider] = useState(false)
    const volumeSliderRef = useRef<HTMLDivElement>(null)
    const volumeButtonRef = useRef<HTMLDivElement>(null)

    // Auth status for inline dropdown (NEW SCHEMA)
    const { isGuest } = useAuthStatus()
    const [authModal, setAuthModal] = useRecoilState(authModalState)
    const [listModal, setListModal] = useRecoilState(listModalState)

    // User data hooks for inline dropdown (NEW SCHEMA)
    const {
        getListsContaining,
        addToList,
        removeFromList,
        createList,
        getAllLists,
        isLiked,
        isHidden,
        addLikedMovie,
        addHiddenMovie,
        removeLikedMovie,
        removeHiddenMovie,
        isInWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        // Subscribe to actual data to trigger re-renders
        defaultWatchlist,
        userCreatedWatchlists,
        userSession,
    } = useUserData()

    // Get user preferences for video player (must be after useUserData hook)
    const userAutoMute = userSession?.preferences?.autoMute ?? true
    const userDefaultVolume = userSession?.preferences?.defaultVolume ?? 50

    const {
        showSuccess,
        showWatchlistAdd,
        showWatchlistRemove,
        showContentHidden,
        showContentShown,
        showError,
    } = useToast()
    const errorHandler = createErrorHandler(showError)

    // Memoize the list computation so it updates when data changes
    const allLists = useMemo(() => {
        const watchlistVirtual = {
            id: 'default-watchlist',
            name: 'Watchlist',
            items: defaultWatchlist,
            emoji: '📺',
            color: '#E50914',
            isPublic: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }
        return [watchlistVirtual, ...userCreatedWatchlists]
    }, [defaultWatchlist, userCreatedWatchlists])

    function isFullScreen() {
        return !!document.fullscreenElement
    }

    function handleSingleOrDoubleClick(event: MouseEvent) {
        if (player && typeof player.getCurrentTime === 'function') {
            setSecondsPlayed(player.getCurrentTime())
        }
        // If starting to play, also unmute
        if (!playing) {
            setMuted(false)
            setPlaying(true)
            setTrailerEnded(false)
        } else {
            setPlaying(false)
        }
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
        if (muted) {
            // Unmuting: restore previous volume
            setMuted(false)
            setVolume(previousVolume > 0 ? previousVolume : 0.5)
        } else {
            // Muting: save current volume and set to 0
            setPreviousVolume(volume)
            setMuted(true)
            setVolume(0)
        }
    }

    const togglePlaying = () => {
        // If starting to play, also unmute
        if (!playing) {
            setMuted(false)
            setPlaying(true)
            setTrailerEnded(false)
        } else {
            setPlaying(false)
        }
    }

    const handleClose = () => {
        closeModal()
        // DON'T reset movie data - keep it cached for instant reopen
        // The data is already in memory, and switching movies clears old data anyway
        // This works with the prefetch cache for smooth UX
        // setTrailer('')             // <-- Keep cached!
        // setGenres([])              // <-- Keep cached!
        // setEnhancedMovieData(null) // <-- Keep cached!
        // setLoadedMovieId(null)     // <-- Keep cached!

        // Only reset UI state
        setShowInlineListDropdown(false)
        // Reset video player state to defaults
        setMuted(userAutoMute)
        setVolume(userDefaultVolume / 100)
        setPreviousVolume(userDefaultVolume / 100)
        setPlaying(true)
        setTrailerEnded(true)
    }

    // Inline dropdown helper functions (NEW SCHEMA)
    const handleWatchlistToggle = () => {
        console.log('🎬 Modal handleWatchlistToggle called')
        if (!currentMovie) {
            console.log('🎬 No currentMovie, returning')
            return
        }
        console.log('🎬 Current movie:', getTitle(currentMovie as Content))
        const inWatchlist = isInWatchlist(currentMovie.id)

        console.log('🎬 isInWatchlist:', inWatchlist)

        if (inWatchlist) {
            console.log('🎬 Removing from watchlist...')
            removeFromWatchlist(currentMovie.id)
            console.log('🎬 Calling showWatchlistRemove')
            showWatchlistRemove(`Removed ${getTitle(currentMovie as Content)} from My List`)
        } else {
            console.log('🎬 Adding to watchlist...')
            addToWatchlist(currentMovie as Content)
            console.log('🎬 Calling showWatchlistAdd')
            showWatchlistAdd(`Added ${getTitle(currentMovie as Content)} to My List`)
        }
    }

    const handleOpenCreateList = () => {
        if (!currentMovie) return
        // Open list modal with current content to show create option
        setListModal({
            isOpen: true,
            content: currentMovie as Content,
        })
        setShowInlineListDropdown(false)
    }

    useEffect(() => {
        if (!currentMovie || !currentMovie.id) return

        // If switching to a different movie, clear old enhanced data immediately
        if (loadedMovieId !== currentMovie.id && loadedMovieId !== null) {
            setEnhancedMovieData(null)
            setTrailer('')
        }

        // Only fetch if we haven't already loaded this movie's details
        if (loadedMovieId === currentMovie.id) return

        async function fetchMovie() {
            try {
                const mediaType = currentMovie?.media_type === 'tv' ? 'tv' : 'movie'

                // Check prefetch cache first
                const cachedData = getCachedMovieDetails(currentMovie.id, mediaType)

                if (cachedData) {
                    // Use cached data - no loading spinner needed!
                    if (cachedData?.videos) {
                        const index = cachedData.videos.results.findIndex(
                            (element: Element) => element.type === 'Trailer'
                        )
                        setTrailer(cachedData.videos?.results[index]?.key)
                    }
                    if (cachedData?.genres) {
                        setGenres(cachedData.genres)
                    }

                    setEnhancedMovieData(cachedData)
                    setLoadedMovieId(currentMovie.id)
                    return // No need to fetch from API
                }

                // No cached data, fetch from API
                setLoading(true)

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

                // Store the complete enhanced data with media_type preserved
                // CRITICAL: Ensure media_type is set for type guards to work
                const enhancedData = {
                    ...data,
                    media_type: mediaType, // Preserve the media_type from the query
                }
                setEnhancedMovieData(enhancedData as Content)

                // Mark this movie as loaded
                setLoadedMovieId(currentMovie?.id || 0)
            } catch (error: any) {
                console.error('Failed to fetch movie details:', error)
                errorHandler.handleApiError(error, 'load movie details')
                setTrailer('')
                setGenres([])
            } finally {
                setLoading(false)
            }
        }

        fetchMovie()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMovie, loadedMovieId, setLoading])

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
                    // If starting to play, also unmute
                    if (!playing) {
                        setMuted(false)
                        setPlaying(true)
                        setTrailerEnded(false)
                    } else {
                        setPlaying(false)
                    }
                }
            } else if (e.key === 'l' || e.key === 'L') {
                // Toggle like when 'l' is pressed (only if modal is open)
                if (currentMovie && showModal && !showJsonDebug) {
                    e.preventDefault()

                    // Toggle like (NEW SCHEMA)
                    const liked = isLiked(currentMovie.id)

                    if (liked) {
                        removeLikedMovie(currentMovie.id)
                    } else {
                        addLikedMovie(currentMovie as Content)
                    }
                }
            } else if (e.key === 'h' || e.key === 'H') {
                // Toggle hide/unhide when 'h' is pressed (only if modal is open)
                if (currentMovie && showModal && !showJsonDebug) {
                    e.preventDefault()

                    // Toggle hidden (NEW SCHEMA)
                    const hidden = isHidden(currentMovie.id)

                    if (hidden) {
                        // Unhide (remove from hidden)
                        removeHiddenMovie(currentMovie.id)
                        showContentShown(
                            `${getTitle(currentMovie as Content)} Shown`,
                            'Will appear in recommendations again'
                        )
                    } else {
                        // Hide (add to hidden)
                        addHiddenMovie(currentMovie as Content)
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
        isLiked,
        isHidden,
        addLikedMovie,
        removeLikedMovie,
        addHiddenMovie,
        removeHiddenMovie,
        currentMovie,
        showContentShown,
        showContentHidden,
    ])

    // Update muted and volume states when user preferences change
    useEffect(() => {
        setMuted(userAutoMute)
        setVolume(userDefaultVolume / 100)
    }, [userAutoMute, userDefaultVolume])

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
            // Don't close if clicking the button or the dropdown itself
            if (
                inlineDropdownRef.current &&
                !inlineDropdownRef.current.contains(event.target as Node) &&
                inlineDropdownButtonRef.current &&
                !inlineDropdownButtonRef.current.contains(event.target as Node)
            ) {
                setShowInlineListDropdown(false)
            }
        }

        if (showInlineListDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showInlineListDropdown])

    // Handle click outside volume slider
    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            // Don't close if clicking the button or the slider itself
            if (
                volumeSliderRef.current &&
                !volumeSliderRef.current.contains(event.target as Node) &&
                volumeButtonRef.current &&
                !volumeButtonRef.current.contains(event.target as Node)
            ) {
                setShowVolumeSlider(false)
            }
        }

        if (showVolumeSlider) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showVolumeSlider])

    return (
        <MuiModal
            open={showModal}
            onClose={handleClose}
            disableAutoFocus
            disableEnforceFocus
            sx={{
                zIndex: 50000,
                '& .MuiBackdrop-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                },
            }}
        >
            <div
                className={`fixed inset-0 flex justify-center items-center ${
                    fullScreen ? '' : 'p-2 sm:p-4 md:p-8'
                }`}
                onClick={handleClose}
            >
                <div
                    className={`relative w-full z-10 bg-[#141414] flex flex-col ${
                        fullScreen
                            ? 'h-screen max-h-screen'
                            : 'rounded-md max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-5xl max-h-[92vh] overflow-y-auto'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Video Container - Responsive */}
                    <div
                        className={`relative w-full bg-black flex-shrink-0 ${
                            fullScreen ? 'h-screen' : 'aspect-[16/10]'
                        }`}
                    >
                        {/* Close Button - Hidden in fullscreen */}
                        {!fullScreen && (
                            <button
                                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 rounded-full bg-black/80 p-1 sm:p-2"
                                onClick={handleClose}
                            >
                                <XMarkIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                            </button>
                        )}

                        {/* Video Player or Static Image */}
                        <div
                            className="absolute inset-0 pointer-events-auto z-0"
                            onClick={(e) => {
                                handleSingleOrDoubleClick(e)
                            }}
                        >
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
                                    className={`absolute inset-0 ${fullScreen ? '' : 'rounded-md'}`}
                                    playing={playing}
                                    volume={volume}
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
                                    className={fullScreen ? '' : 'rounded-md'}
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                                />
                            )}
                        </div>

                        {/* Gradient Overlay - Hidden in fullscreen */}
                        {!fullScreen && (
                            <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 md:h-40 bg-gradient-to-t from-[#141414] via-[#141414]/90 to-transparent z-20"></div>
                        )}

                        {/* Controls Overlay - Hidden in fullscreen */}
                        {!fullScreen && (
                            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-30">
                                <div className="space-y-4">
                                    {/* Inline Watchlist Dropdown */}
                                    {currentMovie && showInlineListDropdown && (
                                        <div
                                            ref={inlineDropdownRef}
                                            className="bg-[#141414] border border-gray-600 rounded-lg shadow-2xl p-4 mb-4 w-64 max-w-sm relative"
                                        >
                                            <div className="space-y-3">
                                                {/* Create New List Button - At the top */}
                                                <button
                                                    onClick={handleOpenCreateList}
                                                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800/30 hover:bg-gray-700/50 border-2 border-gray-600/30 hover:border-gray-500/50 rounded-lg transition-all duration-200"
                                                >
                                                    <PlusIcon className="w-5 h-5 text-gray-400" />
                                                    <span className="text-gray-300 font-medium">
                                                        Create New List
                                                    </span>
                                                </button>

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

                                                        // Handle default watchlist separately (just like ListSelectionModal)
                                                        if (list.id === 'default-watchlist') {
                                                            const inWatchlist = isInWatchlist(
                                                                currentMovie.id
                                                            )
                                                            if (inWatchlist) {
                                                                console.log(
                                                                    '🎬 Removing from watchlist...'
                                                                )
                                                                removeFromWatchlist(currentMovie.id)
                                                                showWatchlistRemove(
                                                                    `Removed ${getTitle(currentMovie as Content)} from ${list.name}`
                                                                )
                                                            } else {
                                                                console.log(
                                                                    '🎬 Adding to watchlist...'
                                                                )
                                                                addToWatchlist(
                                                                    currentMovie as Content
                                                                )
                                                                showWatchlistAdd(
                                                                    `Added ${getTitle(currentMovie as Content)} to ${list.name}`
                                                                )
                                                            }
                                                        } else {
                                                            // Handle custom lists
                                                            if (isInList) {
                                                                console.log(
                                                                    '🎬 Removing from list...'
                                                                )
                                                                removeFromList(
                                                                    list.id,
                                                                    currentMovie.id
                                                                )
                                                                showSuccess(
                                                                    'Removed from list',
                                                                    `Removed ${getTitle(currentMovie as Content)} from "${list.name}"`
                                                                )
                                                            } else {
                                                                console.log('🎬 Adding to list...')
                                                                addToList(
                                                                    list.id,
                                                                    currentMovie as Content
                                                                )
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
                                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 border-2 ${
                                                                list.name === 'Watchlist'
                                                                    ? 'bg-yellow-500/20 border-yellow-500/70'
                                                                    : isInList
                                                                      ? 'bg-white/10 border-green-500/50 hover:bg-white/15 hover:border-green-500/70'
                                                                      : 'bg-gray-800/50 border-gray-700/30 hover:bg-gray-700/70 hover:border-gray-600/50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center space-x-3">
                                                                {getListIcon()}
                                                                <span
                                                                    className={`font-semibold ${isInList ? 'text-white' : 'text-gray-200'}`}
                                                                >
                                                                    {list.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {isInList ? (
                                                                    <CheckIcon className="w-5 h-5 text-green-400" />
                                                                ) : (
                                                                    <PlusIcon className="w-5 h-5 text-gray-400" />
                                                                )}
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Control Buttons Row */}
                                    <div className="flex flex-wrap gap-4 sm:gap-8 items-center justify-between">
                                        {/* Left side buttons */}
                                        <div className="flex gap-2 sm:gap-4 items-center">
                                            {/* Play/Pause button - always show to prevent layout shift */}
                                            <button
                                                className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-6 sm:py-2 bg-white text-black hover:bg-white/80 rounded text-sm sm:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={togglePlaying}
                                                disabled={!trailer}
                                            >
                                                {playing ? (
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

                                            {/* My List Button - Modified to open inline dropdown */}
                                            {currentMovie && 'media_type' in currentMovie && (
                                                <ToolTipMod
                                                    title={
                                                        showInlineListDropdown ? '' : 'Add to Lists'
                                                    }
                                                >
                                                    <button
                                                        ref={inlineDropdownButtonRef}
                                                        className={`group relative p-2 sm:p-3 rounded-full border-2 text-white ${
                                                            showInlineListDropdown
                                                                ? 'border-white bg-black/50'
                                                                : 'border-white/30 bg-black/20 hover:bg-black/50 hover:border-white transition-colors'
                                                        }`}
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            // Toggle the dropdown open/closed
                                                            setShowInlineListDropdown(
                                                                !showInlineListDropdown
                                                            )
                                                        }}
                                                    >
                                                        {(() => {
                                                            const listsContaining =
                                                                getListsContaining(currentMovie.id)
                                                            const isInAnyList =
                                                                listsContaining.length > 0

                                                            return (
                                                                <>
                                                                    {isInAnyList ? (
                                                                        <CheckIcon
                                                                            className={`h-4 w-4 sm:h-6 sm:w-6 ${
                                                                                showInlineListDropdown
                                                                                    ? 'text-white'
                                                                                    : 'text-green-400 group-hover:text-white transition-colors'
                                                                            }`}
                                                                        />
                                                                    ) : (
                                                                        <PlusIcon
                                                                            className={`h-4 w-4 sm:h-6 sm:w-6 ${
                                                                                showInlineListDropdown
                                                                                    ? 'text-white'
                                                                                    : 'text-white/70 group-hover:text-white transition-colors'
                                                                            }`}
                                                                        />
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

                                            {/* Hide/Unhide Toggle Button (NEW SCHEMA) */}
                                            {currentMovie &&
                                                'media_type' in currentMovie &&
                                                (() => {
                                                    const hidden = isHidden(currentMovie.id)

                                                    return (
                                                        <ToolTipMod
                                                            title={hidden ? 'Show' : 'Hide'}
                                                        >
                                                            <button
                                                                className="group relative p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white transition-colors duration-200"
                                                                onClick={() => {
                                                                    if (currentMovie) {
                                                                        if (hidden) {
                                                                            // Remove from hidden movies
                                                                            removeHiddenMovie(
                                                                                currentMovie.id
                                                                            )
                                                                            showContentShown(
                                                                                `${getTitle(currentMovie as Content)} Shown`,
                                                                                'Will appear in recommendations again'
                                                                            )
                                                                        } else {
                                                                            // Add to hidden movies
                                                                            addHiddenMovie(
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
                                                                {hidden ? (
                                                                    <EyeSlashIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                                                                ) : (
                                                                    <EyeIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                                                                )}
                                                            </button>
                                                        </ToolTipMod>
                                                    )
                                                })()}
                                        </div>

                                        {/* Right side buttons - Video Controls */}
                                        {trailer && (
                                            <div className="flex gap-2 sm:gap-4 items-center">
                                                {/* Volume/Mute Button with Slider */}
                                                <div
                                                    ref={volumeButtonRef}
                                                    className="relative z-10"
                                                    onMouseEnter={() => setShowVolumeSlider(true)}
                                                    onMouseLeave={() => setShowVolumeSlider(false)}
                                                >
                                                    {/* Custom Vertical Volume Slider - Behind button at bottom */}
                                                    {showVolumeSlider && (
                                                        <div
                                                            ref={volumeSliderRef}
                                                            className="absolute bottom-full left-1/2 transform -translate-x-1/2 z-0"
                                                            style={{ marginBottom: '-26px' }}
                                                            onMouseEnter={() =>
                                                                setShowVolumeSlider(true)
                                                            }
                                                            onMouseLeave={() =>
                                                                setShowVolumeSlider(false)
                                                            }
                                                        >
                                                            {/* Larger transparent hover area - extends down behind button */}
                                                            <div className="flex flex-col items-center px-8 pt-4 pb-6">
                                                                <VolumeSlider
                                                                    volume={volume}
                                                                    onChange={(newVolume) => {
                                                                        setVolume(newVolume)

                                                                        // Update previous volume if not zero (so we can restore it later)
                                                                        if (newVolume > 0) {
                                                                            setPreviousVolume(
                                                                                newVolume
                                                                            )
                                                                        }

                                                                        // Unmute if volume is increased from 0
                                                                        if (
                                                                            newVolume > 0 &&
                                                                            muted
                                                                        ) {
                                                                            setMuted(false)
                                                                        }
                                                                        // Mute if volume is set to 0
                                                                        if (newVolume === 0) {
                                                                            setMuted(true)
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <ToolTipMod
                                                        title={
                                                            showVolumeSlider
                                                                ? ''
                                                                : muted
                                                                  ? 'Unmute'
                                                                  : 'Mute'
                                                        }
                                                    >
                                                        <button
                                                            className={`group relative z-20 p-2 sm:p-3 rounded-full border-2 text-white transition-colors ${
                                                                showVolumeSlider
                                                                    ? 'border-white bg-[#1a1a1a]'
                                                                    : 'border-white/30 bg-[#141414] hover:bg-[#1a1a1a] hover:border-white'
                                                            }`}
                                                            onClick={handleMuteToggle}
                                                            onMouseEnter={() =>
                                                                setShowVolumeSlider(true)
                                                            }
                                                            onMouseLeave={() =>
                                                                setShowVolumeSlider(false)
                                                            }
                                                        >
                                                            {muted ? (
                                                                <SpeakerXMarkIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                                                            ) : (
                                                                <SpeakerWaveIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                                                            )}
                                                        </button>
                                                    </ToolTipMod>
                                                </div>

                                                {/* YouTube Link Button */}
                                                <ToolTipMod title="Watch on YouTube">
                                                    <button
                                                        className="group p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white transition-colors"
                                                        onClick={() =>
                                                            window.open(
                                                                `https://www.youtube.com/watch?v=${trailer}`,
                                                                '_blank'
                                                            )
                                                        }
                                                    >
                                                        <ArrowTopRightOnSquareIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                                                    </button>
                                                </ToolTipMod>

                                                {/* Fullscreen Button */}
                                                <ToolTipMod
                                                    title={
                                                        fullScreen
                                                            ? 'Exit Fullscreen'
                                                            : 'Fullscreen'
                                                    }
                                                >
                                                    <button
                                                        className="group p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white transition-colors"
                                                        onClick={handleFullscreenButtonClick}
                                                    >
                                                        {fullScreen ? (
                                                            <ArrowsPointingInIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                                                        ) : (
                                                            <ArrowsPointingOutIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white/70 group-hover:text-white transition-colors" />
                                                        )}
                                                    </button>
                                                </ToolTipMod>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Section - Below Video - Hidden in fullscreen */}
                    {!fullScreen && (
                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto min-h-[450px]">
                            {/* Content Metadata - Show immediately with card data, enhanced data loads in background */}
                            <ContentMetadata
                                content={(enhancedMovieData || currentMovie) as Content}
                                showDebugButton={
                                    process.env.NODE_ENV === 'development' &&
                                    debugSettings.showApiResults
                                }
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
                        </div>
                    )}
                </div>

                {/* Keyboard Shortcuts - Below Modal - Hidden in fullscreen */}
                {!showJsonDebug && !fullScreen && (
                    <div className="absolute -bottom-24 sm:-bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-4xl z-[50000]">
                        <KeyboardShortcuts
                            shortcuts={[
                                { key: 'ESC', description: 'Close' },
                                trailer && {
                                    key: 'SPACE',
                                    description: playing ? 'Pause' : 'Play',
                                },
                                trailer && { key: 'M', description: muted ? 'Unmute' : 'Mute' },
                                trailer && { key: 'F', description: 'Fullscreen', icon: '⛶' },
                                currentMovie && {
                                    key: 'L',
                                    description: isLiked(currentMovie.id) ? 'Unlike' : 'Like',
                                    icon: '👍',
                                },
                                currentMovie && {
                                    key: 'H',
                                    description: isHidden(currentMovie.id) ? 'Show' : 'Hide',
                                },
                                trailer && { key: 'R', description: 'Watch on YouTube' },
                            ].filter(Boolean)}
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
