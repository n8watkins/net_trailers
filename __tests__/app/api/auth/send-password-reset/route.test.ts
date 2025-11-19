/**
 * Tests for /api/auth/send-password-reset
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST } from '../../../../../app/api/auth/send-password-reset/route'

jest.mock('../../../../../lib/firebase-admin', () => ({
    getAdminDb: jest.fn(),
    getAdminAuth: jest.fn(),
}))

jest.mock('../../../../../lib/email/email-service', () => ({
    EmailService: {
        sendPasswordReset: jest.fn().mockResolvedValue({ data: { id: 'email-123' } }),
    },
}))

import { getAdminDb, getAdminAuth } from '../../../../../lib/firebase-admin'

const mockUsersGet = jest.fn()
const mockUserRefUpdate = jest.fn()
const mockGetUser = jest.fn()

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
                    doc: jest.fn(() => ({
                        update: mockUserRefUpdate,
                    })),
                }
            }
            throw new Error(`Unexpected collection: ${name}`)
        }),
    }
}

function buildSnapshot(providerId = 'password') {
    return {
        empty: false,
        docs: [
            {
                id: 'user-123',
                data: () => ({
                    profile: { email: 'user@example.com', username: 'TestUser' },
                }),
            },
        ],
    }
}

function createRequest(body: unknown) {
    const url = new URL('http://localhost:3000/api/auth/send-password-reset')
    return new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
}

describe('/api/auth/send-password-reset', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockUsersGet.mockReset()
        mockUserRefUpdate.mockReset()
        mockGetUser.mockReset()
        ;(getAdminDb as jest.Mock).mockReturnValue(buildMockDb())
        ;(getAdminAuth as jest.Mock).mockReturnValue({
            getUser: mockGetUser,
        })
    })

    it('sends password reset for email/password users', async () => {
        mockUsersGet.mockResolvedValue(buildSnapshot('password'))
        mockGetUser.mockResolvedValue({
            uid: 'user-123',
            providerData: [{ providerId: 'password' }],
        })

        const response = await POST(createRequest({ email: 'user@example.com' }))

        expect(response.status).toBe(200)
        expect(mockUserRefUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                passwordResetToken: expect.any(String),
                passwordResetTokenExpiry: expect.any(Number),
            })
        )
    })

    it('blocks password reset for Google auth users', async () => {
        mockUsersGet.mockResolvedValue(buildSnapshot('google.com'))
        mockGetUser.mockResolvedValue({
            uid: 'user-123',
            providerData: [{ providerId: 'google.com' }],
        })

        const response = await POST(createRequest({ email: 'google@example.com' }))

        expect(response.status).toBe(200)
        // Should still return success for security (don't reveal auth method)
        const data = await response.json()
        expect(data.success).toBe(true)
        // But should NOT create reset token
        expect(mockUserRefUpdate).not.toHaveBeenCalled()
    })

    it('allows password reset for hybrid auth users (Google + Password)', async () => {
        mockUsersGet.mockResolvedValue(buildSnapshot('password'))
        mockGetUser.mockResolvedValue({
            uid: 'user-123',
            providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
        })

        const response = await POST(createRequest({ email: 'hybrid@example.com' }))

        expect(response.status).toBe(200)
        expect(mockUserRefUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                passwordResetToken: expect.any(String),
            })
        )
    })

    it('returns success message for non-existent email (security)', async () => {
        mockUsersGet.mockResolvedValue({ empty: true, docs: [] })

        const response = await POST(createRequest({ email: 'nonexistent@example.com' }))

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.message).toContain('If an account exists')
    })

    it('validates email format', async () => {
        const response = await POST(createRequest({ email: 'invalid-email' }))

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Invalid email format')
    })

    it('requires email parameter', async () => {
        const response = await POST(createRequest({}))

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Email is required')
    })

    it('handles auth provider check errors gracefully', async () => {
        mockUsersGet.mockResolvedValue(buildSnapshot('password'))
        mockGetUser.mockRejectedValue(new Error('Firebase Admin error'))

        const response = await POST(createRequest({ email: 'user@example.com' }))

        // Should still process the request even if provider check fails
        expect(response.status).toBe(200)
        expect(mockUserRefUpdate).toHaveBeenCalled()
    })
})
