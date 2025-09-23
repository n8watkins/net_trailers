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
import { errorsState, loadingState } from '../atoms/errorAtom'
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
} from '@heroicons/react/24/solid'

import ReactPlayer from 'react-player'
import Image from 'next/image'
import { Element, Genre } from '../typings'
import ToolTipMod from '../components/ToolTipMod'
import LikeOptions from './LikeOptions'
import WatchLaterButton from './WatchLaterButton'

function Modal() {
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentMovie, setCurrentMovie] = useRecoilState(movieState)
    const [autoPlayWithSound, setAutoPlayWithSound] = useRecoilState(autoPlayWithSoundState)
    const [errors, setErrors] = useRecoilState(errorsState)
    const [isLoading, setIsLoading] = useRecoilState(loadingState)
    const errorHandler = createErrorHandler(setErrors)
    const [trailer, setTrailer] = useState('')
    const [genres, setGenres] = useState<Genre[]>([])
    const [enhancedMovieData, setEnhancedMovieData] = useState<Content | null>(null)
    const [muted, setMuted] = useState(true)
    const [playing, setPlaying] = useState(true)
    const [trailerEnded, setTrailerEnded] = useState(true)
    const [fullScreen, setFullScreen] = useState(false)
    const [player, setPlayer] = useState<ReactPlayer | null>(null)
    const divRef = useRef<HTMLDivElement>(null)
    const [secondsPlayed, setSecondsPlayed] = useState(0)
    const [loadedMovieId, setLoadedMovieId] = useState<number | null>(null)
    const [showJsonDebug, setShowJsonDebug] = useState(false)

    let timeout: ReturnType<typeof setTimeout> | null = null
    let timeout2: ReturnType<typeof setTimeout> | null = null

    let clickCount = 0

    function isFullScreen() {
        return document.fullscreenElement
    }

    function handleSingleOrDoubleClick(event: MouseEvent) {
        if (player) {
            setSecondsPlayed(player?.getCurrentTime())
        }
        togglePlaying()
    }

    const handleFullscreenChange = useCallback(() => {
        if (!isFullScreen()) {
            setFullScreen(false)
        }
        if (isFullScreen()) {
            setMuted(false)
            setFullScreen(true)
        }
    }, [])

    const makeFullScreen = () => {
        player?.getInternalPlayer().h.requestFullscreen()
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
    }, [currentMovie?.id, loadedMovieId, errorHandler, setIsLoading])

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [handleFullscreenChange])

    // Handle Escape key for both main modal and JSON debug modal
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
            }
        }

        if (showModal || showJsonDebug) {
            document.addEventListener('keydown', handleKeyDown)
            return () => document.removeEventListener('keydown', handleKeyDown)
        }
    }, [showModal, showJsonDebug])

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
            <>
                <div
                    className="absolute flex justify-center items-start w-screen h-screen p-2 sm:p-4 md:p-8"
                    onClick={handleClose}
                >
                    <div
                        className="relative w-full max-w-sm sm:max-w-2xl md:max-w-4xl lg:max-w-6xl z-10 rounded-md max-h-[95vh] bg-[#141414] overflow-y-auto mt-2 sm:mt-4 md:mt-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Video Container - Responsive */}
                        <div className="relative w-full aspect-video bg-black">
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
                                    onReady={() => {
                                        setTimeout(() => {
                                            player!.seekTo(secondsPlayed, 'seconds')
                                        }, 50)
                                    }}
                                    ref={(ref) => setPlayer(ref)}
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

                            {/* Controls Overlay */}
                            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-30">
                                <div className="flex flex-wrap gap-4 sm:gap-8 items-center">
                                    {trailer && (
                                        <button
                                            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-6 sm:py-2 bg-white text-black hover:bg-white/80 rounded text-sm sm:text-base font-semibold"
                                            onClick={togglePlaying}
                                        >
                                            {playing || !trailer ? (
                                                <>
                                                    <PauseIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                                    <span className="hidden sm:inline">Pause</span>
                                                </>
                                            ) : (
                                                <>
                                                    <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                                    <span className="hidden sm:inline">Play</span>
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {/* My List Button */}
                                    {currentMovie && 'media_type' in currentMovie && (
                                        <WatchLaterButton
                                            content={currentMovie as Content}
                                            variant="modal"
                                        />
                                    )}

                                    {/* Like Options */}
                                    <LikeOptions />

                                    {/* YouTube Link */}
                                    {trailer && (
                                        <ToolTipMod title="Watch on YouTube">
                                            <button className="p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white">
                                                <ArrowTopRightOnSquareIcon
                                                    className="h-4 w-4 sm:h-6 sm:w-6"
                                                    onClick={() =>
                                                        window.open(
                                                            `https://www.youtube.com/watch?v=${trailer}`,
                                                            '_blank'
                                                        )
                                                    }
                                                />
                                            </button>
                                        </ToolTipMod>
                                    )}

                                    {/* Video Controls - Only show when playing */}
                                    {playing && trailer && (
                                        <>
                                            {/* Mute Button */}
                                            <button className="p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white">
                                                {muted ? (
                                                    <SpeakerXMarkIcon
                                                        className="h-4 w-4 sm:h-6 sm:w-6"
                                                        onClick={handleMuteToggle}
                                                    />
                                                ) : (
                                                    <SpeakerWaveIcon
                                                        className="h-4 w-4 sm:h-6 sm:w-6"
                                                        onClick={handleMuteToggle}
                                                    />
                                                )}
                                            </button>

                                            {/* Fullscreen Button */}
                                            <button className="p-2 sm:p-3 rounded-full border-2 border-white/30 bg-black/20 hover:bg-black/50 hover:border-white text-white">
                                                <ArrowsPointingOutIcon
                                                    className="h-4 w-4 sm:h-6 sm:w-6"
                                                    onClick={() => makeFullScreen()}
                                                />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content Section - Below Video */}
                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                            {/* Title */}
                            <h3
                                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white cursor-pointer"
                                style={{
                                    textShadow:
                                        '0 0 3px rgba(0, 0, 0, .8), 0 0 5px rgba(0, 0, 0, .9)',
                                }}
                                onClick={handleSingleOrDoubleClick}
                            >
                                {currentMovie ? getTitle(currentMovie as Content) : ''}
                            </h3>

                            {/* JSON Debug Button */}
                            <button
                                className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-md text-xs sm:text-sm font-medium transition-colors border border-gray-600/50 hover:border-gray-500"
                                onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                        const mediaType =
                                            currentMovie?.media_type === 'tv' ? 'tv' : 'movie'
                                        const url = `/api/movies/details/${currentMovie?.id}?media_type=${mediaType}`
                                        window.open(url, '_blank')
                                    } else {
                                        setShowJsonDebug(true)
                                    }
                                }}
                                title="Click to view JSON in modal, Ctrl+Click to open in new tab"
                            >
                                📊 View API Data
                            </button>

                            {/* Enhanced Metadata Section */}
                            {enhancedMovieData && (
                                <div
                                    className="text-white"
                                    style={{ textShadow: '0 0 3px rgba(0, 0, 0, .8)' }}
                                >
                                    {/* Year, Rating, Runtime, Type */}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg font-medium mb-3">
                                        <span>{getYear(enhancedMovieData)}</span>
                                        {getRating(enhancedMovieData) && (
                                            <>
                                                <span className="text-gray-300">•</span>
                                                <span className="border border-white/60 px-1 text-xs sm:text-sm">
                                                    {getRating(enhancedMovieData)}
                                                </span>
                                            </>
                                        )}
                                        {getRuntime(enhancedMovieData) && (
                                            <>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-xs sm:text-sm md:text-base">
                                                    {getRuntime(enhancedMovieData)}
                                                </span>
                                            </>
                                        )}
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs sm:text-sm md:text-base">
                                            {getContentType(enhancedMovieData)}
                                        </span>
                                    </div>

                                    {/* Overview */}
                                    <p className="text-gray-200 text-base leading-relaxed mb-4 line-clamp-3">
                                        {enhancedMovieData.overview}
                                    </p>

                                    {/* Director & Cast */}
                                    <div className="space-y-2 text-sm">
                                        {getDirector(enhancedMovieData) && (
                                            <div>
                                                <span className="text-gray-400">Director: </span>
                                                <span className="text-white">
                                                    {getDirector(enhancedMovieData)}
                                                </span>
                                            </div>
                                        )}

                                        {getMainCast(enhancedMovieData, 3).length > 0 && (
                                            <div>
                                                <span className="text-gray-400">Cast: </span>
                                                <span className="text-white">
                                                    {getMainCast(enhancedMovieData, 3)
                                                        .map((actor) => actor.name)
                                                        .join(', ')}
                                                </span>
                                            </div>
                                        )}

                                        {getGenreNames(enhancedMovieData).length > 0 && (
                                            <div>
                                                <span className="text-gray-400">Genres: </span>
                                                <span className="text-white">
                                                    {getGenreNames(enhancedMovieData).join(', ')}
                                                </span>
                                            </div>
                                        )}

                                        {getIMDbRating(enhancedMovieData).url && (
                                            <div>
                                                <span className="text-gray-400">IMDb: </span>
                                                <a
                                                    href={getIMDbRating(enhancedMovieData).url!}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-yellow-400 hover:text-yellow-300 underline"
                                                >
                                                    View on IMDb
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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
            </>
        </MuiModal>
    )
}

export default Modal
