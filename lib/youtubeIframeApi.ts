/**
 * Loads YouTube's IFrame Player API from this site (app/api/youtube/iframe-api)
 * instead of https://www.youtube.com/iframe_api, whose response sets
 * YouTube's tracking cookies. react-player uses `window.YT` as it finds it
 * when it is already loaded, so the trailer player mounts only after this
 * resolves (components/modals/modal-sections/ModalVideoPlayer.tsx), and the
 * player itself runs in the www.youtube-nocookie.com iframe.
 */

export const YOUTUBE_API_PATH = '/api/youtube/iframe-api'

interface YouTubeGlobal {
    loaded?: number
}

declare global {
    interface Window {
        YT?: YouTubeGlobal
        onYouTubeIframeAPIReady?: () => void
    }
}

let pending: Promise<void> | null = null

export function isYouTubeApiLoaded(): boolean {
    return typeof window !== 'undefined' && Boolean(window.YT?.loaded)
}

/** Resolves once `window.YT` is ready; loads the API on first use. */
export function loadYouTubeApi(): Promise<void> {
    if (isYouTubeApiLoaded()) return Promise.resolve()
    if (pending) return pending
    pending = new Promise<void>((resolve, reject) => {
        const previous = window.onYouTubeIframeAPIReady
        window.onYouTubeIframeAPIReady = () => {
            previous?.()
            resolve()
        }
        const script = document.createElement('script')
        script.src = YOUTUBE_API_PATH
        script.async = true
        script.onerror = () => {
            // Let a later trailer try again.
            pending = null
            reject(new Error('YouTube player API failed to load'))
        }
        document.head.appendChild(script)
    })
    return pending
}

/** Tests only: forget a load in progress. */
export function resetYouTubeApiForTests(): void {
    pending = null
}
