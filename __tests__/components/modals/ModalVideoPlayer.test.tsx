/**
 * Trailers embed from YouTube's no-cookie host (audit K2): react-player picks
 * www.youtube-nocookie.com as the embed host for these URLs, so playing a
 * trailer sets no youtube.com cookies.
 */
import { render } from '@testing-library/react'

import ModalVideoPlayer from '../../../components/modals/modal-sections/ModalVideoPlayer'

// The real player loads YouTube's script; record the URL it would be given.
jest.mock('next/dynamic', () => () => {
    const Player = (props: { url: string }) => <div data-testid="player" data-url={props.url} />
    return Player
})

describe('ModalVideoPlayer', () => {
    it('plays trailers from youtube-nocookie.com', () => {
        const { getByTestId } = render(
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
                onReady={jest.fn()}
                onPlayerRef={jest.fn()}
            />
        )
        const url = getByTestId('player').getAttribute('data-url') ?? ''
        expect(url).toBe('https://www.youtube-nocookie.com/embed/qKGgw7Ob5f4')
        // react-player's own test for the no-cookie host (players/YouTube.js).
        expect(/youtube-nocookie\.com/.test(url)).toBe(true)
    })
})
