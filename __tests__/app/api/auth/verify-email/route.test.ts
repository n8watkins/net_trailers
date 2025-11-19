/**
 * Tests for /api/auth/verify-email
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '../../../../../app/api/auth/verify-email/route'

jest.mock('../../../../../lib/firebase-admin', () => ({
    getAdminDb: jest.fn(),
    getAdminAuth: jest.fn(),
}))

import { getAdminDb, getAdminAuth } from '../../../../../lib/firebase-admin'

const mockUsersGet = jest.fn()
const mockUserRefUpdate = jest.fn()
const mockProfileSet = jest.fn()
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

            if (name === 'profiles') {
                return {
                    doc: jest.fn(() => ({
                        set: mockProfileSet,
                    })),
                }
            }

            throw new Error(`Unexpected collection: ${name}`)
        }),
    }
}

function buildSnapshot(data: Record<string, unknown>) {
    return {
        empty: false,
        docs: [
            {
                id: 'user-123',
                data: () => ({
                    emailVerificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
                    pendingEmailVerification: 'pending@example.com',
                    profile: { email: 'current@example.com' },
                    ...data,
                }),
                ref: { update: mockUserRefUpdate },
            },
        ],
    }
}

function createRequest(body: unknown) {
    const url = new URL('http://localhost:3000/api/auth/verify-email')
    return new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

describe('/api/auth/verify-email', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockUsersGet.mockReset()
        mockUserRefUpdate.mockReset()
        mockProfileSet.mockReset()
        mockUpdateUser.mockReset()
        ;(getAdminDb as jest.Mock).mockReturnValue(buildMockDb())
        ;(getAdminAuth as jest.Mock).mockReturnValue({
            updateUser: mockUpdateUser,
        })
    })

    it('verifies email and updates profile data', async () => {
        mockUsersGet.mockResolvedValue(buildSnapshot({}))

        const response = await POST(createRequest({ token: 'verify-token' }))

        expect(response.status).toBe(200)
        expect(mockUpdateUser).toHaveBeenCalledWith('user-123', {
            emailVerified: true,
            email: 'pending@example.com',
        })
        expect(mockUserRefUpdate).toHaveBeenCalledTimes(1)
        expect(mockProfileSet).toHaveBeenCalledWith(
            { email: 'pending@example.com', updatedAt: expect.any(Number) },
            { merge: true }
        )
    })

    it('returns 404 when token is invalid', async () => {
        mockUsersGet.mockResolvedValue({ empty: true, docs: [] })

        const response = await POST(createRequest({ token: 'missing-token' }))

        expect(response.status).toBe(404)
        expect(mockUpdateUser).not.toHaveBeenCalled()
    })

    it('returns 400 when token expired', async () => {
        mockUsersGet.mockResolvedValue(
            buildSnapshot({
                emailVerificationTokenExpiry: Date.now() - 1000,
            })
        )

        const response = await POST(createRequest({ token: 'expired-token' }))

        expect(response.status).toBe(400)
        expect(mockUpdateUser).not.toHaveBeenCalled()
    })
})
