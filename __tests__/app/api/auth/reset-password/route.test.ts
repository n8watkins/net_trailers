/**
 * Tests for /api/auth/reset-password
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '../../../../../app/api/auth/reset-password/route'

jest.mock('../../../../../lib/firebase-admin', () => ({
    getAdminDb: jest.fn(),
    getAdminAuth: jest.fn(),
}))

import { getAdminDb, getAdminAuth } from '../../../../../lib/firebase-admin'

const mockUsersGet = jest.fn()
const mockUserRefUpdate = jest.fn()
const mockUpdateUser = jest.fn()

function buildMockDb() {
    return {
        collection: jest.fn((name: string) => {
            if (name === 'users') {
                return {
                    where: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: mockUsersGet,
                        })),
                    })),
                }
            }
            throw new Error(`Unexpected collection: ${name}`)
        }),
    }
}

function buildSnapshot(data: Record<string, unknown>, opts?: { expired?: boolean }) {
    const expiresAt = opts?.expired ? Date.now() - 1000 : Date.now() + 60 * 60 * 1000
    return {
        empty: false,
        docs: [
            {
                id: 'user-123',
                data: () => ({
                    profile: { email: 'user@example.com' },
                    passwordResetTokenExpiry: expiresAt,
                    ...data,
                }),
                ref: { update: mockUserRefUpdate },
            },
        ],
    }
}

function createRequest(method: 'GET' | 'POST', body?: unknown, token = 'valid-token') {
    const url = new URL(`http://localhost:3000/api/auth/reset-password`)
    if (method === 'GET') {
        url.searchParams.set('token', token)
    }
    return new NextRequest(url, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers:
            method === 'POST'
                ? {
                      'Content-Type': 'application/json',
                      Origin: 'http://localhost:3000', // Required for CSRF protection
                  }
                : undefined,
    })
}

describe('/api/auth/reset-password', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockUsersGet.mockReset()
        mockUserRefUpdate.mockReset()
        mockUpdateUser.mockReset()
        ;(getAdminDb as jest.Mock).mockReturnValue(buildMockDb())
        ;(getAdminAuth as jest.Mock).mockReturnValue({
            updateUser: mockUpdateUser,
            getUser: jest.fn().mockResolvedValue({
                uid: 'user-123',
                providerData: [{ providerId: 'password' }],
            }),
        })
    })

    it('GET returns token info when valid', async () => {
        mockUsersGet.mockResolvedValue(buildSnapshot({}))

        const response = await GET(createRequest('GET'))

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.valid).toBe(true)
        expect(data.email).toBe('user@example.com')
    })

    it('GET rejects expired tokens', async () => {
        mockUsersGet.mockResolvedValue(buildSnapshot({}, { expired: true }))

        const response = await GET(createRequest('GET'))

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.reason).toBe('expired')
    })

    it('POST resets password when token is valid', async () => {
        mockUsersGet.mockResolvedValue(buildSnapshot({}))

        const request = createRequest('POST', { token: 'valid-token', password: 'newPassword123' })
        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockUpdateUser).toHaveBeenCalledWith('user-123', { password: 'newPassword123' })
        expect(mockUserRefUpdate).toHaveBeenCalledTimes(1)
        const updatePayload = mockUserRefUpdate.mock.calls[0][0]
        expect(updatePayload).toHaveProperty('lastPasswordResetAt')
    })

    it('POST returns 404 when token record is missing', async () => {
        mockUsersGet.mockResolvedValue({ empty: true, docs: [] })

        const request = createRequest('POST', { token: 'missing-token', password: 'abc12345' })
        const response = await POST(request)

        expect(response.status).toBe(404)
        expect(mockUpdateUser).not.toHaveBeenCalled()
    })
})
