import React, { useEffect, useState } from 'react'
import MuiModal from '@mui/material/Modal'
import { useRecoilState, useRecoilValue } from 'recoil'
import { modalState, movieState } from '../atoms/modalAtom'
import {
    FaceFrownIcon,
    FaceSmileIcon,
    HandThumbDownIcon,
    HeartIcon,
    PlayIcon,
    PlusIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    XMarkIcon,
} from '@heroicons/react/24/solid'
import { HandThumbUpIcon } from '@heroicons/react/24/outline'
import ReactPlayer from 'react-player'
import Image from 'next/image'
import { Tooltip } from '@mui/material'
import { Element, Genre } from '../typings'

function Modal() {
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentMovie, setCurrentMovie] = useRecoilState(movieState)
    const [trailer, setTrailer] = useState('')
    const [genres, setGenres] = useState<Genre[]>([])
    const [muted, setMuted] = useState(true)
    const [playing, setPlaying] = useState(true)
    const [trailerEnded, setTrailerEnded] = useState(false)

    const handleClose = () => {
        setShowModal(!showModal)
    }
    const handleVolume = () => {}

    useEffect(() => {
        if (!currentMovie) return

        async function fetchMovie() {
            const data = await fetch(
                `https://api.themoviedb.org/3/${
                    currentMovie?.media_type === 'tv' ? 'tv' : 'movie'
                }/${currentMovie?.id}?api_key=${
                    process.env.NEXT_PUBLIC_API_KEY
                }&language=en-US&append_to_response=videos`
            ).then((response) => response.json())
            if (data?.videos) {
                const index = data.videos.results.findIndex(
                    (element: Element) => element.type === 'Trailer'
                )
                setTrailer(data.videos?.results[index]?.key)
            }
            if (data?.genres) {
                setGenres(data.genres)
            }
        }

        fetchMovie()
    }, [currentMovie])

    return (
        <MuiModal open={showModal} onClose={handleClose}>
            <>
                <div className="absolute flex justify-center w-screen h-screen">
                    <div className=" relative  min-w-[850px] z-10 rounded-md h-screen top-[2em] bg-[#141414]">
                        <div className="absolute h-[450px] w-[850px]  bg-more-info ">
                            <button
                                className=" z-30 absolute cursor-pointer rounded-full bg-black/80  py-1 px-1 right-5 top-5"
                                onClick={handleClose}
                            >
                                <XMarkIcon className="h-6 w-6 rounded-full "></XMarkIcon>
                            </button>

                            <button
                                className=" z-30 absolute cursor-pointer  right-5 bottom-5"
                                onClick={handleVolume}
                            >
                                {muted ? (
                                    <SpeakerXMarkIcon
                                        onClick={() => setMuted(!muted)}
                                        className="h-6 w-6 rounded-full "
                                    ></SpeakerXMarkIcon>
                                ) : (
                                    <SpeakerWaveIcon
                                        onClick={() => setMuted(!muted)}
                                        className="h-6 w-6 rounded-full "
                                    ></SpeakerWaveIcon>
                                )}
                            </button>
                            <div className=" absolute z-20 top-0  bg-more-info h-screen w-full "></div>

                            {trailer && !trailerEnded ? (
                                <div className="   relative pt-[56.25%]">
                                    <ReactPlayer
                                        config={{
                                            youtube: {
                                                playerVars: {
                                                    cc_load_policy: 1,
                                                    autoplay: 0,
                                                    controls: 0,
                                                    iv_load_policy: 1,
                                                    modestbranding: 1,
                                                },
                                                embedOptions: {},
                                            },
                                        }}
                                        url={`https://www.youtube.com/watch?v=${trailer}`}
                                        width="100%"
                                        height="100%"
                                        className=" absolute top-0 left-0 rounded-md"
                                        playing={playing}
                                        volume={0.5}
                                        muted={muted}
                                        onEnded={() => {
                                            setTrailerEnded(true)
                                            setPlaying(false)
                                        }}
                                    />
                                </div>
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
                            {!playing && (
                                <h3 className="absolute z-20 pl-[1em] font-semibold  text-shadow-3xl  text-white text-7xl top-40 w-[600px] ">
                                    {currentMovie?.title || currentMovie?.name}
                                </h3>
                            )}
                            <div className="absolute flex bottom-20 left-20  items-center  gap-2 ">
                                <div className="flex gap-2 z-30">
                                    <button className=" modalButtons  bg-[white] text-black hover:bg-[white]/[.6] ">
                                        <PlayIcon className=" md:h-10 md:w-10 lg:h-10 lg:w-10 " />
                                        <div>Play</div>
                                    </button>
                                    <Tooltip
                                        title="Add to My List"
                                        placement="top"
                                        arrow
                                        enterDelay={100}
                                        leaveDelay={100}
                                        componentsProps={{
                                            popper: {
                                                modifiers: [
                                                    {
                                                        name: 'offset',
                                                        options: {
                                                            offset: [
                                                                0, 15, 0, 0,
                                                            ],
                                                        },
                                                    },
                                                ],
                                            },

                                            arrow: {
                                                sx: {
                                                    color: '#4A4A4A',
                                                    '&::before': {
                                                        backgroundColor:
                                                            'white',
                                                    },
                                                },
                                            },
                                            tooltip: {
                                                sx: {
                                                    color: '#141414',
                                                    fontSize: '1.3rem',
                                                    fontWeight: '600',
                                                    backgroundColor: 'white',
                                                    border: '1px solid white',
                                                    boxShadow:
                                                        '5px 5px 20px black',
                                                },
                                            },
                                        }}
                                    >
                                        <PlusIcon className="  border-solid border-white/30 py-0.5 border-2 hover:bg-[black]/50 hover:border-white rounded-full bg-black/20  md:h-10 md:w-10 lg:h-10 lg:w-10 " />
                                    </Tooltip>
                                </div>
                                <div className="relative flex left-5 group items-center justify-center ">
                                    <HandThumbUpIcon className=" absolute peer border-solid py-1 border-2  border-white/30 hover:bg-black/50 rounded-full bg-black/20  md:h-10 md:w-10 lg:h-10 lg:w-10 " />
                                    <div className="absolute flex group  h-14 items-center  rounded-3xl   w-44 justify-center z-20 duration-200  group-hover:z-40 hover:bg-[#141414] transition-all  hover:drop-shadow-4xl    ">
                                        <Tooltip
                                            title="Not for me"
                                            placement="top"
                                            arrow
                                            enterDelay={200}
                                            leaveDelay={0}
                                            componentsProps={{
                                                popper: {
                                                    modifiers: [
                                                        {
                                                            name: 'offset',
                                                            options: {
                                                                offset: [
                                                                    0, 15, 0, 0,
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },

                                                arrow: {
                                                    sx: {
                                                        color: '#4A4A4A',
                                                        '&::before': {
                                                            backgroundColor:
                                                                'white',
                                                        },
                                                    },
                                                },
                                                tooltip: {
                                                    sx: {
                                                        color: '#141414',
                                                        fontSize: '1.3rem',
                                                        fontWeight: '600',
                                                        backgroundColor:
                                                            'white',
                                                        border: '1px solid white',
                                                        boxShadow:
                                                            '5px 5px 20px black',
                                                    },
                                                },
                                            }}
                                        >
                                            <HandThumbDownIcon className=" relative items-center hover:bg-gray-700  border-solid  transition-all  duration-300 group-hover:-translate-x-8  text-transparent  group-hover:text-blue-500   py-1  rounded-full  group-hover:z-40 md:h-10 md:w-10 lg:h-10 lg:w-10 " />
                                        </Tooltip>

                                        <Tooltip
                                            title="I like this"
                                            placement="top"
                                            arrow
                                            enterDelay={200}
                                            leaveDelay={0}
                                            componentsProps={{
                                                popper: {
                                                    modifiers: [
                                                        {
                                                            name: 'offset',
                                                            options: {
                                                                offset: [
                                                                    0, 15, 0, 0,
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },

                                                arrow: {
                                                    sx: {
                                                        color: '#4A4A4A',
                                                        '&::before': {
                                                            backgroundColor:
                                                                'white',
                                                        },
                                                    },
                                                },
                                                tooltip: {
                                                    sx: {
                                                        color: '#141414',
                                                        fontSize: '1.3rem',
                                                        fontWeight: '600',
                                                        backgroundColor:
                                                            'white',
                                                        border: '1px solid white',
                                                        boxShadow:
                                                            '5px 5px 20px black',
                                                    },
                                                },
                                            }}
                                        >
                                            <HandThumbUpIcon className=" absolute  py-1   items-center hidden group-hover:inline border-white/30 hover:bg-gray-700 rounded-full bg-black/20 -full md:h-10 md:w-10 lg:h-10 lg:w-10 " />
                                        </Tooltip>
                                        <Tooltip
                                            title="Love this!"
                                            placement="top"
                                            arrow
                                            enterDelay={200}
                                            leaveDelay={0}
                                            componentsProps={{
                                                popper: {
                                                    modifiers: [
                                                        {
                                                            name: 'offset',
                                                            options: {
                                                                offset: [
                                                                    0, 15, 0, 0,
                                                                ],
                                                            },
                                                        },
                                                    ],
                                                },

                                                arrow: {
                                                    sx: {
                                                        color: '#4A4A4A',
                                                        '&::before': {
                                                            backgroundColor:
                                                                'white',
                                                        },
                                                    },
                                                },
                                                tooltip: {
                                                    sx: {
                                                        color: '#141414',
                                                        fontSize: '1.3rem',
                                                        fontWeight: '600',
                                                        backgroundColor:
                                                            'white',
                                                        border: '1px solid white',
                                                        boxShadow:
                                                            '5px 5px 20px black',
                                                    },
                                                },
                                            }}
                                        >
                                            <HeartIcon className="    transition-all items-center justify-self-center z-10 duration-300   hover:bg-gray-700 group-hover:translate-x-8 text-transparent  group-hover:text-red-500   py-1   rounded-full  -full md:h-10 md:w-10 lg:h-10 lg:w-10 " />
                                        </Tooltip>
                                    </div>
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
