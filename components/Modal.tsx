import React, {
    useEffect,
    useState,
    useRef,
    MouseEventHandler,
    MouseEvent,
} from 'react'
import MuiModal from '@mui/material/Modal'
import { useRecoilState, useRecoilValue } from 'recoil'
import { modalState, movieState } from '../atoms/modalAtom'
import { errorsState, loadingState } from '../atoms/errorAtom'
import { createErrorHandler } from '../utils/errorHandler'
import { getTitle, getYear, getContentType, Content, isMovie } from '../typings'
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
} from '@heroicons/react/24/solid'

import ReactPlayer from 'react-player'
import Image from 'next/image'
import { Element, Genre } from '../typings'
import ToolTipMod from '../components/ToolTipMod'
import LikeOptions from './LikeOptions'

function Modal() {
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentMovie, setCurrentMovie] = useRecoilState(movieState)
    const [errors, setErrors] = useRecoilState(errorsState)
    const [isLoading, setIsLoading] = useRecoilState(loadingState)
    const errorHandler = createErrorHandler(setErrors)
    const [trailer, setTrailer] = useState('')
    const [genres, setGenres] = useState<Genre[]>([])
    const [muted, setMuted] = useState(true)
    const [playing, setPlaying] = useState(true)
    const [trailerEnded, setTrailerEnded] = useState(true)
    const [fullScreen, setFullScreen] = useState(false)
    const [player, setPlayer] = useState<ReactPlayer | null>(null)
    const divRef = useRef<HTMLDivElement>(null)
    const [secondsPlayed, setSecondsPlayed] = useState(0)
    const [onMyList, setOnMyList] = useState(false)

    let timeout: ReturnType<typeof setTimeout> | null = null
    let timeout2: ReturnType<typeof setTimeout> | null = null

    let clickCount = 0

    function isFullScreen() {
        return document.fullscreenElement
    }

    function handleSingleOrDoubleClick(event: MouseEvent) {
        if (player) {
            // console.log('currentTime', player?.getCurrentTime())
            setSecondsPlayed(player?.getCurrentTime())
        }
        togglePlaying()
    }

    function handleFullscreenChange() {
        if (!isFullScreen()) {
            setFullScreen(false)
        }
        if (isFullScreen()) {
            setMuted(false)
            setFullScreen(true)
        }
    }

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
        setShowModal(!showModal)
    }

    useEffect(() => {
        if (!currentMovie) return

        async function fetchMovie() {
            try {
                setIsLoading(true)
                const response = await fetch(
                    `https://api.themoviedb.org/3/${
                        currentMovie?.media_type === 'tv' ? 'tv' : 'movie'
                    }/${currentMovie?.id}?api_key=${
                        process.env.NEXT_PUBLIC_API_KEY
                    }&language=en-US&append_to_response=videos`
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
    }, [currentMovie])

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange
            )
        }
    }, [])

    const anchorRef = React.useRef<HTMLDivElement>(null)
    const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null)
    React.useEffect(() => {
        setTimeout(() => setAnchorEl(anchorRef?.current), 2000)
    }, [anchorRef])
    return (
        <MuiModal open={showModal} onClose={handleClose}>
            <>
                <div className="absolute flex justify-center w-screen h-screen">
                    <div className=" relative  min-w-[850px] z-10 rounded-md h-screen top-[2em] bg-[#141414]">
                        <div className={`absolute h-[450px] w-[850px]`}>
                            <div
                                //should only be clickable if not full screen
                                className="absolute top-0 right-0 h-[500px] w-[850px]  bg-transparent cursor-pointer bg-moreInfo z-10 "
                                onClick={(e) => {
                                    handleSingleOrDoubleClick(e)
                                }}
                            ></div>
                            <button
                                className=" z-30 absolute cursor-pointer rounded-full bg-black/80  py-1 px-1 right-5 top-5"
                                onClick={handleClose}
                            >
                                <XMarkIcon className="h-6 w-6 rounded-full "></XMarkIcon>
                            </button>

                            {(trailer && !trailerEnded) ||
                            playing ||
                            fullScreen ? (
                                <>
                                    <div
                                        className=" relative bg-black pt-[56.25%]"
                                        ref={divRef}
                                        onClick={() => {/* TODO: Implement share functionality */}}
                                    >
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
                                            width="99%"
                                            height="100%"
                                            className="z-5 absolute top-0 left-1     rounded-md"
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
                                                // Check to see if the user has already played the video
                                                setTimeout(() => {
                                                    player!.seekTo(
                                                        secondsPlayed,
                                                        'seconds'
                                                    )
                                                }, 50)
                                                // if (fullScreen) {
                                                //     player!
                                                //         .getInternalPlayer()
                                                //         .h.requestFullscreen()
                                                // }
                                            }}
                                            ref={(ref) => setPlayer(ref)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-center items-center h-full w-full">
                                    <Image
                                        src={`https://image.tmdb.org/t/p/original/${currentMovie?.backdrop_path}`}
                                        alt="movie_backdrop"
                                        fill
                                        quality={100}
                                        priority
                                        style={{ objectFit: 'cover' }}
                                        className="  rounded-md h-[50wh] w-[100vw] -z-20 "
                                    ></Image>
                                </div>
                            )}

                            <div className="absolute flex flex-col  top-80 left-20  z-30 items-center  gap-2 ">
                                <div>
                                    <div className=" absolutue flex gap-2 cursor-pointer w-80 right-0">
                                        {trailer && (
                                            <button
                                                className=" modalButtons  bg-[white] lg:w-44 text-black hover:bg-[white]/[.6] "
                                                onClick={togglePlaying}
                                            >
                                                {playing || !trailer ? (
                                                    <>
                                                        <PauseIcon className=" IconDimensions " />
                                                        <div>Pause</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <PlayIcon className=" IconDimensions " />
                                                        <div>Play</div>
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {onMyList ? (
                                            <ToolTipMod
                                                title="Remove from My List "
                                            >
                                                <CheckIcon
                                                    className=" IconDimensions ratingIcon relative border-solid border-white/30 z-10 border-2 hover:bg-[black]/50 hover:border-white  bg-black/20  text-white"
                                                    onClick={() =>
                                                        setOnMyList(!onMyList)
                                                    }
                                                />
                                            </ToolTipMod>
                                        ) : (
                                            <ToolTipMod title="Add to My List">
                                                <PlusIcon
                                                    className="IconDimensions ratingIcon relative border-solid border-white/30 z-10 border-2 hover:bg-[black]/50 hover:border-white  bg-black/20  text-white"
                                                    onClick={() =>
                                                        setOnMyList(!onMyList)
                                                    }
                                                />
                                            </ToolTipMod>
                                        )}
                                        <LikeOptions />
                                        {playing && trailer && (
                                            <>
                                                <div className="absolute -right-20  top-0 z-60">
                                                    {muted ? (
                                                        <SpeakerXMarkIcon
                                                            onClick={
                                                                handleMuteToggle
                                                            }
                                                            className="h-10 w-10 rounded-full  border-solid border-white/30  border-2 hover:bg-[black]/50 hover:border-white  bg-black/20  text-white py-1"
                                                        ></SpeakerXMarkIcon>
                                                    ) : (
                                                        <SpeakerWaveIcon
                                                            onClick={
                                                                handleMuteToggle
                                                            }
                                                            className="h-10 w-10 rounded-full  border-solid border-white/30  border-2 hover:bg-[black]/50 hover:border-white  bg-black/20  text-white py-1"
                                                        ></SpeakerWaveIcon>
                                                    )}
                                                </div>
                                                <div className="absolute -right-32  top-0 z-60">
                                                    <ArrowsPointingOutIcon
                                                        onClick={() =>
                                                            makeFullScreen()
                                                        }
                                                        className="h-10 w-10 rounded-full  border-solid border-white/30  border-2 hover:bg-[black]/50 hover:border-white  bg-black/20  text-white py-1"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div
                                        className="absolute   bg-transparent w-80 h-11 top-0 right-0 cursor-pointer"
                                        onClick={handleSingleOrDoubleClick}
                                    ></div>
                                    <h3
                                        className=" z-20 font-semibold cursor-pointer text-shadow-3xl  text-white text-7xl  w-[600px] "
                                        onClick={handleSingleOrDoubleClick}
                                    >
                                        {currentMovie ? getTitle(currentMovie as Content) : ''}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        </MuiModal>
    )
}

export default Modal
