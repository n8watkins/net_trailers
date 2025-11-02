'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import type ReactPlayerType from 'react-player'
import Image from 'next/image'
import { Content } from '../../../typings'

// Dynamically import ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

interface ModalVideoPlayerProps {
    trailer: string
    trailerEnded: boolean
    playing: boolean
    volume: number
    muted: boolean
    fullScreen: boolean
    currentMovie: Content | null
    onSingleOrDoubleClick: (e: React.MouseEvent) => void
    onEnded: () => void
    onPause: () => void
    onPlay: () => void
    onReady: (player: ReactPlayerType) => void
    onPlayerRef: (ref: ReactPlayerType | null) => void
}

function ModalVideoPlayer({
    trailer,
    trailerEnded,
    playing,
    volume,
    muted,
    fullScreen,
    currentMovie,
    onSingleOrDoubleClick,
    onEnded,
    onPause,
    onPlay,
    onReady,
    onPlayerRef,
}: ModalVideoPlayerProps) {
    return (
        <div
            className="absolute inset-0 pointer-events-auto z-0"
            onClick={(e) => {
                onSingleOrDoubleClick(e)
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
                    onEnded={onEnded}
                    onPause={onPause}
                    onPlay={onPlay}
                    onReady={onReady}
                    ref={onPlayerRef}
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
    )
}

export default ModalVideoPlayer
