'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Content } from '../../../typings'
import { isYouTubeApiLoaded, loadYouTubeApi } from '../../../lib/youtubeIframeApi'

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
    /** The player element (an HTMLMediaElement-like YouTube element), once it mounts. */
    onReady: (player: HTMLVideoElement) => void
    onPlayerRef: (ref: HTMLVideoElement | null) => void
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
    // Without a trailer there is nothing to play, so nothing loads from YouTube.
    const wantsPlayer = Boolean(trailer) && (!trailerEnded || playing || fullScreen)
    // YouTube's player API comes from this site, so youtube.com sets no
    // cookies (lib/youtubeIframeApi.ts); the player waits for it, showing the
    // backdrop meanwhile.
    const [apiReady, setApiReady] = useState(isYouTubeApiLoaded)
    useEffect(() => {
        if (!wantsPlayer || apiReady) return
        let cancelled = false
        loadYouTubeApi().then(
            () => !cancelled && setApiReady(true),
            (error) => console.warn('[trailer]', error)
        )
        return () => {
            cancelled = true
        }
    }, [wantsPlayer, apiReady])

    // react-player 3 hands out the player element through its ref, and its
    // onReady (no arguments) fires on the element's loadstart, which can pass
    // before React attaches listeners. The element is usable as soon as it
    // mounts: its methods and currentTime wait for YouTube's player to load.
    const onReadyRef = useRef(onReady)
    useEffect(() => {
        onReadyRef.current = onReady
    }, [onReady])
    const handleRef = useCallback(
        (node: HTMLVideoElement | null) => {
            onPlayerRef(node)
            if (node) onReadyRef.current(node)
        },
        [onPlayerRef]
    )

    return (
        <div
            className="absolute inset-0 pointer-events-auto z-0"
            onClick={(e) => {
                onSingleOrDoubleClick(e)
            }}
        >
            {wantsPlayer && apiReady ? (
                <ReactPlayer
                    // YouTube player parameters. Without the controls or
                    // autoplay props the embed has no YouTube controls and
                    // does not autoplay (playing starts it), as before.
                    config={{
                        youtube: {
                            cc_load_policy: 1,
                            iv_load_policy: 3,
                            // The page origin, as react-player 2 sent it, so the
                            // player's postMessage API only talks to this site.
                            origin: window.location.origin,
                        },
                    }}
                    // YouTube's no-cookie host: react-player embeds from
                    // www.youtube-nocookie.com for these URLs, so a trailer
                    // sets no youtube.com cookies (lib/csp.ts frame-src).
                    src={`https://www.youtube-nocookie.com/embed/${trailer}`}
                    width="100%"
                    height="100%"
                    className={`absolute inset-0 ${fullScreen ? '' : 'rounded-md'}`}
                    playing={playing}
                    volume={volume}
                    muted={muted}
                    onEnded={onEnded}
                    onPause={onPause}
                    onPlay={onPlay}
                    ref={handleRef}
                />
            ) : (
                <Image
                    src={`https://image.tmdb.org/t/p/w1280${currentMovie?.backdrop_path}`}
                    alt="movie_backdrop"
                    fill
                    style={{ objectFit: 'cover' }}
                    className={fullScreen ? '' : 'rounded-md'}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                />
            )}
        </div>
    )
}

export default ModalVideoPlayer
