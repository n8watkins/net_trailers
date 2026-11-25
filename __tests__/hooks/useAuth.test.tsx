import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { Session } from 'next-auth'

import useAuth, { AuthProvider, SeedSession } from '../../hooks/useAuth'

const session: Session = {
    expires: '2099-01-01T00:00:00.000Z',
    user: { id: 'user-1', name: 'Ada', email: 'ada@example.test', image: null, isAdmin: false },
} as Session

function Probe() {
    const { user, loading } = useAuth()
    return <p data-testid="probe">{loading ? 'loading' : (user?.uid ?? 'guest')}</p>
}

/** A minimal BroadcastChannel: every channel of a name hears the others. */
class FakeChannel {
    static all: FakeChannel[] = []
    onmessage: ((event: MessageEvent) => void) | null = null
    constructor(public name: string) {
        FakeChannel.all.push(this)
    }
    postMessage(data: unknown) {
        for (const c of FakeChannel.all)
            if (c !== this && c.name === this.name) c.onmessage?.({ data } as MessageEvent)
    }
    close() {
        FakeChannel.all = FakeChannel.all.filter((c) => c !== this)
    }
}

const fetchMock = jest.fn()

beforeEach(() => {
    FakeChannel.all = []
    ;(globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = FakeChannel
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, json: async () => session })
    globalThis.fetch = fetchMock as unknown as typeof fetch
})

const sessionReads = () =>
    fetchMock.mock.calls.filter(([url]) => String(url) === '/api/auth/session').length

describe('AuthProvider', () => {
    it('reads the session once per page load, not twice', async () => {
        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>
        )
        expect(screen.getByTestId('probe')).toHaveTextContent('loading')
        await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('user-1'))
        // Give a second read (next-auth's echo of its own broadcast) the chance to happen
        await act(async () => {
            await new Promise((r) => setTimeout(r, 20))
        })
        expect(sessionReads()).toBe(1)
    })

    it('takes a seeded session at once and does not ask for it', async () => {
        render(
            <AuthProvider>
                <SeedSession session={session} />
                <Probe />
            </AuthProvider>
        )
        // Seeded in the first commit: no "loading" frame after mount
        expect(screen.getByTestId('probe')).toHaveTextContent('user-1')
        await act(async () => {
            await new Promise((r) => setTimeout(r, 20))
        })
        expect(sessionReads()).toBe(0)
    })

    it('takes a seeded signed-out session as a guest, without a read', async () => {
        render(
            <AuthProvider>
                <SeedSession session={null} />
                <Probe />
            </AuthProvider>
        )
        expect(screen.getByTestId('probe')).toHaveTextContent('guest')
        expect(sessionReads()).toBe(0)
    })

    it('reads the session again when sign-in or sign-out is announced', async () => {
        render(
            <AuthProvider>
                <SeedSession session={session} />
                <Probe />
            </AuthProvider>
        )
        fetchMock.mockResolvedValue({ ok: true, json: async () => null })
        act(() => {
            // what next-auth/react's signOut posts
            new FakeChannel('next-auth').postMessage({
                event: 'session',
                data: { trigger: 'signout' },
            })
        })
        await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('guest'))
        expect(sessionReads()).toBe(1)
    })

    it('treats a failed read as signed out', async () => {
        fetchMock.mockRejectedValue(new Error('offline'))
        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>
        )
        await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('guest'))
    })
})
