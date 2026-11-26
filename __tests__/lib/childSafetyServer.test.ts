/**
 * @jest-environment node
 *
 * The one server answer to "is Child Safety Mode on for this request"
 * (lib/childSafetyServer.ts): the stored setting for a signed-in account, the
 * server-set cookie for a guest, never less because of what the client sends,
 * and "filter" when the setting cannot be read.
 */

import { NextRequest } from 'next/server'

import { auth } from '@/auth'
import { loadChildSafetyMode } from '@/db/queries/userPreferences'
import {
    CHILD_SAFETY_COOKIE,
    childSafetyForRequest,
    resolveChildSafety,
    resolveChildSafetyForUser,
    syncChildSafetyCookie,
} from '@/lib/childSafetyServer'

let cookieValue: string | undefined
const setCookie = jest.fn()
jest.mock('next/headers', () => ({
    cookies: async () => ({
        get: (name: string) =>
            name === 'nettrailer_child_safety' && cookieValue !== undefined
                ? { name, value: cookieValue }
                : undefined,
        set: (...args: unknown[]) => setCookie(...args),
    }),
}))

jest.mock('@/db/queries/userPreferences', () => ({
    loadChildSafetyMode: jest.fn(),
}))

const mockAuth = auth as unknown as jest.Mock
const mockLoad = loadChildSafetyMode as jest.Mock

function signIn(userId: string | null) {
    mockAuth.mockResolvedValue(
        userId ? { user: { id: userId }, expires: '2999-01-01T00:00:00.000Z' } : null
    )
}

const request = (query = '') => new NextRequest(`https://nt.example/api/search?query=x${query}`)

beforeEach(() => {
    cookieValue = undefined
    setCookie.mockReset()
    mockLoad.mockReset()
    mockAuth.mockClear()
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
})
afterEach(() => jest.restoreAllMocks())

describe('childSafetyForRequest', () => {
    it('is off for a guest without the cookie, unless the request asks for filtering', async () => {
        signIn(null)
        expect(await childSafetyForRequest(request())).toBe(false)
        expect(await childSafetyForRequest(request('&childSafetyMode=false'))).toBe(false)
        expect(await childSafetyForRequest(request('&childSafetyMode=true'))).toBe(true)
    })

    it('is on for a guest with the cookie, whatever the parameter says', async () => {
        signIn(null)
        cookieValue = 'true'
        expect(await childSafetyForRequest(request())).toBe(true)
        expect(await childSafetyForRequest(request('&childSafetyMode=false'))).toBe(true)
        expect(await childSafetyForRequest(request('&childSafetyMode=0'))).toBe(true)
    })

    it('uses the stored setting for a signed-in account and ignores the cookie', async () => {
        signIn('u1')
        mockLoad.mockResolvedValue(true)
        expect(await childSafetyForRequest(request('&childSafetyMode=false'))).toBe(true)
        expect(mockLoad).toHaveBeenCalledWith('u1')

        mockLoad.mockResolvedValue(false)
        cookieValue = 'true'
        expect(await childSafetyForRequest(request())).toBe(false)
    })

    it('filters when the stored setting cannot be read', async () => {
        signIn('u1')
        mockLoad.mockRejectedValue(new Error('database down'))
        expect(await childSafetyForRequest(request())).toBe(true)
    })
})

describe('resolveChildSafety and resolveChildSafetyForUser (body fields)', () => {
    it('take only true or "true" as asking for filtering', async () => {
        signIn(null)
        for (const asked of [false, 'false', undefined, null, 1, 'yes']) {
            expect(await resolveChildSafety(asked)).toBe(false)
        }
        expect(await resolveChildSafety(true)).toBe(true)
        expect(await resolveChildSafety('true')).toBe(true)
    })

    it('read a known account directly, and filter when that fails', async () => {
        mockLoad.mockResolvedValue(true)
        expect(await resolveChildSafetyForUser('u2', false)).toBe(true)
        expect(mockAuth).not.toHaveBeenCalled()
        mockLoad.mockRejectedValue(new Error('database down'))
        expect(await resolveChildSafetyForUser('u2')).toBe(true)
    })
})

describe('syncChildSafetyCookie', () => {
    it('writes the httpOnly cookie from the stored setting, never from the caller', async () => {
        signIn('u1')
        mockLoad.mockResolvedValue(true)
        expect(await syncChildSafetyCookie()).toBe(true)
        expect(setCookie).toHaveBeenCalledWith(
            CHILD_SAFETY_COOKIE,
            'true',
            expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
        )
    })

    it('changes nothing for a guest', async () => {
        signIn(null)
        cookieValue = 'true'
        expect(await syncChildSafetyCookie()).toBe(true)
        expect(setCookie).not.toHaveBeenCalled()
    })
})
