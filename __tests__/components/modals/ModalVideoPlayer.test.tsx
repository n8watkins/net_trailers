/**
 * Trailers set no YouTube cookies (audit K2): the player embeds from
 * www.youtube-nocookie.com, and YouTube's player API is loaded from this site
 * (app/api/youtube/iframe-api) instead of www.youtube.com/iframe_api, whose
 * response sets YouTube's tracking cookies.
 */
import { act, render } from '@testing-library/react'

import ModalVideoPlayer from '../../../components/modals/modal-sections/ModalVideoPlayer'
import { YOUTUBE_API_PATH, resetYouTubeApiForTests } from '../../../lib/youtubeIframeApi'

// The real player loads YouTube's script; record the URL it would be given.
jest.mock('next/dynamic', () => () => {
    const Player = (props: {
        src: string
        playsInline?: boolean
        ref?: React.Ref<HTMLDivElement>
    }) => (
        <div
            ref={props.ref}
            data-testid="player"
            data-src={props.src}
            data-plays-inline={String(Boolean(props.playsInline))}
        />
    )
    return Player
})

function renderPlayer(onReady = jest.fn()) {
    return render(
        <ModalVideoPlayer
            trailer="qKGgw7Ob5f4"
            trailerEnded={false}
            playing
            volume={0.5}
            muted
            fullScreen={false}
            currentMovie={null}
            onSingleOrDoubleClick={jest.fn()}
            onEnded={jest.fn()}
            onPause={jest.fn()}
            onPlay={jest.fn()}
            onReady={onReady}
            onPlayerRef={jest.fn()}
        />
    )
}

describe('ModalVideoPlayer', () => {
    afterEach(() => {
        delete window.YT
        delete window.onYouTubeIframeAPIReady
        document.head.querySelectorAll('script').forEach((s) => s.remove())
        resetYouTubeApiForTests()
    })

    it('plays trailers from youtube-nocookie.com', () => {
        window.YT = { loaded: 1 }
        const { getByTestId } = renderPlayer()
        expect(getByTestId('player').getAttribute('data-src')).toBe(
            'https://www.youtube-nocookie.com/embed/qKGgw7Ob5f4'
        )
    })

    it('plays inline, so an iPhone keeps the trailer in the window', () => {
        window.YT = { loaded: 1 }
        const { getByTestId } = renderPlayer()
        expect(getByTestId('player').getAttribute('data-plays-inline')).toBe('true')
    })

    it('hands the mounted player element to onReady, so a resumed trailer can seek', () => {
        window.YT = { loaded: 1 }
        const onReady = jest.fn()
        const { getByTestId } = renderPlayer(onReady)
        expect(onReady).toHaveBeenCalledTimes(1)
        expect(onReady).toHaveBeenCalledWith(getByTestId('player'))
    })

    it("loads YouTube's player API from this site, then mounts the player", async () => {
        const { queryByTestId } = renderPlayer()
        expect(queryByTestId('player')).toBeNull()

        const scripts = [...document.head.querySelectorAll('script')].map((s) =>
            s.getAttribute('src')
        )
        expect(scripts).toEqual([YOUTUBE_API_PATH])
        expect(scripts.some((src) => src?.includes('youtube.com'))).toBe(false)

        // What the relayed loader does once YouTube's widget API is in.
        await act(async () => {
            window.YT = { loaded: 1 }
            window.onYouTubeIframeAPIReady?.()
        })
        expect(queryByTestId('player')).not.toBeNull()
    })
})
