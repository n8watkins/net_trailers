import { act, renderHook } from '@testing-library/react'
import {
    TOUR_PENDING_TIMEOUT_MS,
    TOUR_READY_TIMEOUT_MS,
    useTourLauncher,
} from '../../../components/onboarding/useTourLauncher'

function addPoster(width = 200, height = 300) {
    const card = document.createElement('div')
    card.setAttribute('data-tour', 'content-card')
    card.getBoundingClientRect = () =>
        ({ top: 0, left: 0, width, height, right: width, bottom: height }) as DOMRect
    document.body.appendChild(card)
    return card
}

function setLocation(path: string) {
    window.history.replaceState(null, '', path)
}

describe('useTourLauncher', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        document.body.innerHTML = ''
        setLocation('/')
    })
    afterEach(() => {
        jest.useRealTimers()
    })

    async function flush() {
        // MutationObserver callbacks are microtasks; the start waits one frame
        await act(async () => {
            await Promise.resolve()
            jest.advanceTimersByTime(50)
        })
    }

    it('from another page: goes home, then starts once the first poster is there', async () => {
        setLocation('/profile')
        const navigate = jest.fn()
        const { result, rerender } = renderHook(
            ({ pathname }) => useTourLauncher({ pathname, navigate }),
            { initialProps: { pathname: '/profile' } }
        )

        act(() => result.current.startTour())
        expect(navigate).toHaveBeenCalledWith('/')
        expect(result.current.phase).toBe('pending')

        // The Help window that asked for it is gone; the request survives the route change
        setLocation('/')
        rerender({ pathname: '/' })
        await flush()
        expect(result.current.phase).toBe('pending')

        addPoster()
        await flush()
        expect(result.current.phase).toBe('active')
    })

    it('on the home page: does not navigate and starts when posters already exist', async () => {
        addPoster()
        const navigate = jest.fn()
        const { result } = renderHook(() => useTourLauncher({ pathname: '/', navigate }))
        act(() => result.current.startTour())
        await flush()
        expect(navigate).not.toHaveBeenCalled()
        expect(result.current.phase).toBe('active')
    })

    it('ignores a zero-size poster and starts anyway after the timeout', async () => {
        addPoster(0, 0)
        const { result } = renderHook(() => useTourLauncher({ pathname: '/', navigate: jest.fn() }))
        act(() => result.current.startTour())
        await flush()
        expect(result.current.phase).toBe('pending')
        await act(async () => {
            jest.advanceTimersByTime(TOUR_READY_TIMEOUT_MS + 50)
        })
        expect(result.current.phase).toBe('active')
    })

    it('ends the tour when the visitor leaves the home page', async () => {
        addPoster()
        const { result, rerender } = renderHook(
            ({ pathname }) => useTourLauncher({ pathname, navigate: jest.fn() }),
            { initialProps: { pathname: '/' } }
        )
        act(() => result.current.startTour())
        await flush()
        expect(result.current.phase).toBe('active')
        rerender({ pathname: '/settings' })
        expect(result.current.phase).toBe('idle')
    })

    it('drops a request that never reaches the home page', async () => {
        setLocation('/profile')
        const { result } = renderHook(() =>
            useTourLauncher({ pathname: '/profile', navigate: jest.fn() })
        )
        act(() => result.current.startTour())
        await act(async () => {
            jest.advanceTimersByTime(TOUR_PENDING_TIMEOUT_MS + 50)
        })
        expect(result.current.phase).toBe('idle')
    })

    it('removes the retired onboarding state from storage', () => {
        window.localStorage.setItem('net_trailer_onboarding', '{"hasCompletedTour":true}')
        renderHook(() => useTourLauncher({ pathname: '/', navigate: jest.fn() }))
        expect(window.localStorage.getItem('net_trailer_onboarding')).toBeNull()
    })
})
