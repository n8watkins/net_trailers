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

const mockUserDocGet = jest.fn()
const mockUserRefUpdate = jest.fn()
const mockUsersCollectionDoc = jest.fn()
const mockGetUserByEmail = jest.fn()

function buildMockDb() {
    return {
        collection: jest.fn((name: string) => {
            if (name === 'users') {
                return {
                    doc: mockUsersCollectionDoc,
                }
            }
            throw new Error(`Unexpected collection: ${name}`)
        }),
    }
}

function buildUserDocSnapshot() {
    return {
        exists: true,
        id: 'user-123',
        data: () => ({
            profile: { email: 'user@example.com', username: 'TestUser' },
        }),
    }
}

function buildUserRecord(providerIds: string[]) {
    return {
        uid: 'user-123',
        providerData: providerIds.map((providerId) => ({ providerId })),
    }
}

function createRequest(body: unknown) {
    const url = new URL('http://localhost:3000/api/auth/send-password-reset')
    return new NextRequest(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Origin: 'http://localhost:3000', // Required for CSRF protection
        },
        body: JSON.stringify(body),
    })
}

describe('/api/auth/send-password-reset', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockUserDocGet.mockReset()
        mockUserRefUpdate.mockReset()
        mockUsersCollectionDoc.mockReset()
        mockGetUserByEmail.mockReset()
        mockUsersCollectionDoc.mockReturnValue({
            get: mockUserDocGet,
            update: mockUserRefUpdate,
        })
        mockUserDocGet.mockResolvedValue(buildUserDocSnapshot())
        mockGetUserByEmail.mockResolvedValue(buildUserRecord(['password']))
        ;(getAdminDb as jest.Mock).mockReturnValue(buildMockDb())
        ;(getAdminAuth as jest.Mock).mockReturnValue({
            getUserByEmail: mockGetUserByEmail,
        })
    })

    it('sends password reset for email/password users', async () => {
        mockGetUserByEmail.mockResolvedValue(buildUserRecord(['password']))

        const response = await POST(createRequest({ email: 'user@example.com' }))

        expect(response.status).toBe(200)
        expect(mockUsersCollectionDoc).toHaveBeenCalledWith('user-123')
        expect(mockUserRefUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                passwordResetToken: expect.any(String),
                passwordResetTokenExpiry: expect.any(Number),
            })
        )
    })

    it('allows password reset for hybrid auth users (Google + password)', async () => {
        mockGetUserByEmail.mockResolvedValue(buildUserRecord(['google.com', 'password']))

        const response = await POST(createRequest({ email: 'hybrid@example.com' }))

        expect(response.status).toBe(200)
        expect(mockUserRefUpdate).toHaveBeenCalled()
    })

    it('blocks password reset for Google auth users', async () => {
        mockGetUserByEmail.mockResolvedValue(buildUserRecord(['google.com']))

        const response = await POST(createRequest({ email: 'google@example.com' }))

        expect(response.status).toBe(200)
        // Should still return success for security (don't reveal auth method)
        const data = await response.json()
        expect(data.success).toBe(true)
        // But should NOT create reset token
        expect(mockUserRefUpdate).not.toHaveBeenCalled()
    })

    it('returns success message for non-existent email (security)', async () => {
        const notFoundError = Object.assign(new Error('User not found'), {
            code: 'auth/user-not-found',
        })
        mockGetUserByEmail.mockRejectedValue(notFoundError)

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

    it('normalizes email casing before lookup', async () => {
        await POST(createRequest({ email: 'User@Example.com' }))

        expect(mockGetUserByEmail).toHaveBeenCalledWith('user@example.com')
    })

    it('gracefully handles missing Firestore user doc', async () => {
        mockUserDocGet.mockResolvedValue({
            exists: false,
            id: 'user-123',
            data: () => null,
        })

        const response = await POST(createRequest({ email: 'user@example.com' }))

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(mockUserRefUpdate).not.toHaveBeenCalled()
    })
})
