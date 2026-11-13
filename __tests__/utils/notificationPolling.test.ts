import {
    POLL_BASE_INTERVAL_MS,
    POLL_MAX_INTERVAL_MS,
    subscribeToNotifications,
} from '@/utils/firestore/notifications'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

jest.mock('@/lib/authenticatedFetch', () => ({ authenticatedFetch: jest.fn() }))
const fetchMock = authenticatedFetch as jest.Mock

let list: { id: string; isRead: boolean }[] = []
function setHidden(hidden: boolean) {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    document.dispatchEvent(new Event('visibilitychange'))
}
/** Lets the poll's awaits finish. */
const settle = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('subscribeToNotifications', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        list = [{ id: 'a', isRead: false }]
        fetchMock.mockReset()
        fetchMock.mockImplementation(async () => ({
            ok: true,
            json: async () => ({ success: true, notifications: list }),
        }))
        setHidden(false)
    })
    afterEach(() => jest.useRealTimers())

    it('polls at once, then backs off while nothing changes', async () => {
        const onUpdate = jest.fn()
        const stop = subscribeToNotifications('u1', onUpdate)
        await settle()
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(onUpdate).toHaveBeenCalledTimes(1)

        // Unchanged: 2 min, then 4, then 8, then capped at 10
        const waits = [
            POLL_BASE_INTERVAL_MS,
            POLL_BASE_INTERVAL_MS * 2,
            POLL_BASE_INTERVAL_MS * 4,
            POLL_MAX_INTERVAL_MS,
        ]
        for (const [i, wait] of waits.entries()) {
            await jest.advanceTimersByTimeAsync(wait - 1)
            expect(fetchMock).toHaveBeenCalledTimes(i + 1)
            await jest.advanceTimersByTimeAsync(1)
            await settle()
            expect(fetchMock).toHaveBeenCalledTimes(i + 2)
        }
        expect(onUpdate).toHaveBeenCalledTimes(1)

        // A change is passed on and resets the interval
        list = [{ id: 'b', isRead: false }, ...list]
        await jest.advanceTimersByTimeAsync(POLL_MAX_INTERVAL_MS)
        await settle()
        expect(onUpdate).toHaveBeenCalledTimes(2)
        const calls = fetchMock.mock.calls.length
        await jest.advanceTimersByTimeAsync(POLL_BASE_INTERVAL_MS)
        await settle()
        expect(fetchMock).toHaveBeenCalledTimes(calls + 1)
        stop()
    })

    it('never polls while the tab is hidden, and catches up when it is shown', async () => {
        const stop = subscribeToNotifications('u1', jest.fn())
        await settle()
        setHidden(true)
        await jest.advanceTimersByTimeAsync(60 * 60_000)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        setHidden(false)
        await settle()
        expect(fetchMock).toHaveBeenCalledTimes(2)
        stop()
        await jest.advanceTimersByTimeAsync(60 * 60_000)
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('does nothing without a user', async () => {
        subscribeToNotifications('', jest.fn())
        await jest.advanceTimersByTimeAsync(POLL_MAX_INTERVAL_MS)
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
