/**
 * Unit Tests for Admin Activity API Route: /api/admin/activity
 *
 * Tests the activity tracking and analytics endpoints:
 * - GET: Fetch activity data with admin authentication
 * - POST: Record activity with validation and rate limiting
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '../../../../../app/api/admin/activity/route'

// Mock Firebase Admin
const mockGet = jest.fn()
const mockAdd = jest.fn()
const mockCollection = jest.fn(() => ({
    where: jest.fn(() => ({
        orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
                get: mockGet,
            })),
        })),
    })),
    add: mockAdd,
}))

jest.mock('../../../../../lib/firebase-admin', () => ({
    getAdminDb: jest.fn(() => ({
        collection: mockCollection,
    })),
}))

// Mock admin middleware
jest.mock('../../../../../utils/adminMiddleware', () => ({
    validateAdminRequest: jest.fn(),
    createUnauthorizedResponse: jest.fn(),
    createForbiddenResponse: jest.fn(),
}))

import {
    validateAdminRequest,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from '../../../../../utils/adminMiddleware'

const mockValidateAdminRequest = validateAdminRequest as jest.MockedFunction<
    typeof validateAdminRequest
>
const mockCreateUnauthorizedResponse = createUnauthorizedResponse as jest.MockedFunction<
    typeof createUnauthorizedResponse
>
const mockCreateForbiddenResponse = createForbiddenResponse as jest.MockedFunction<
    typeof createForbiddenResponse
>

/**
 * Helper to create a NextRequest
 */
function createGetRequest(queryParams?: Record<string, string>): NextRequest {
    const url = new URL('http://localhost:3000/api/admin/activity')
    if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
            url.searchParams.set(key, value)
        })
    }
    return new NextRequest(url, {
        headers: {
            Authorization: 'Bearer mock-admin-token',
        },
    })
}

function createPostRequest(body: any, ip?: string): NextRequest {
    const url = new URL('http://localhost:3000/api/admin/activity')
    return new NextRequest(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(ip && { 'x-forwarded-for': ip }),
        },
        body: JSON.stringify(body),
    })
}

describe('GET /api/admin/activity', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Reset rate limit map
        global.activityRateLimits = undefined
    })

    it('should return 401 when not authorized', async () => {
        mockValidateAdminRequest.mockResolvedValue({
            authorized: false,
            error: 'Unauthorized',
        })
        mockCreateUnauthorizedResponse.mockReturnValue(
            new Response('Unauthorized', { status: 401 })
        )

        const request = createGetRequest()
        const response = await GET(request)

        expect(response.status).toBe(401)
        expect(mockValidateAdminRequest).toHaveBeenCalledWith(request)
    })

    it('should return 403 when user is not an administrator', async () => {
        mockValidateAdminRequest.mockResolvedValue({
            authorized: false,
            error: 'User is not an administrator',
        })
        mockCreateForbiddenResponse.mockReturnValue(new Response('Forbidden', { status: 403 }))

        const request = createGetRequest()
        const response = await GET(request)

        expect(response.status).toBe(403)
        expect(mockValidateAdminRequest).toHaveBeenCalledWith(request)
    })

    it('should fetch all activity when authorized', async () => {
        mockValidateAdminRequest.mockResolvedValue({
            authorized: true,
            userId: 'admin-uid',
        })

        const mockActivities = [
            {
                id: 'act1',
                type: 'login',
                userId: 'user1',
                userEmail: 'user@example.com',
                timestamp: Date.now(),
            },
            {
                id: 'act2',
                type: 'view',
                userId: 'user2',
                page: '/movies',
                timestamp: Date.now() - 1000,
            },
        ]

        mockGet.mockResolvedValue({
            docs: mockActivities.map((data) => ({
                id: data.id,
                data: () => ({ ...data }),
            })),
        })

        const request = createGetRequest()
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.activities).toHaveLength(2)
        expect(data.stats.total).toBe(2)
        expect(data.stats.uniqueUsers).toBe(2)
    })

    it('should filter by type when specified', async () => {
        mockValidateAdminRequest.mockResolvedValue({
            authorized: true,
            userId: 'admin-uid',
        })

        mockGet.mockResolvedValue({
            docs: [
                {
                    id: 'act1',
                    data: () => ({
                        type: 'login',
                        userId: 'user1',
                        timestamp: Date.now(),
                    }),
                },
            ],
        })

        const request = createGetRequest({ type: 'logins' })
        await GET(request)

        // Verify the request was made (actual filtering happens after Firestore fetch)
        expect(mockGet).toHaveBeenCalled()
    })

    it('should filter by userId when specified', async () => {
        mockValidateAdminRequest.mockResolvedValue({
            authorized: true,
            userId: 'admin-uid',
        })

        mockGet.mockResolvedValue({
            docs: [],
        })

        const request = createGetRequest({ userId: 'specific-user' })
        await GET(request)

        expect(mockGet).toHaveBeenCalled()
    })
})

describe('POST /api/admin/activity', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Reset rate limit map
        global.activityRateLimits = undefined
    })

    it('should return 400 when required fields are missing', async () => {
        const request = createPostRequest({})
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Missing required fields')
    })

    it('should return 400 for invalid activity type', async () => {
        const request = createPostRequest({
            type: 'invalid',
            userId: 'user1',
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid activity type')
    })

    it('should return 400 for invalid email format', async () => {
        const request = createPostRequest({
            type: 'login',
            userId: 'user1',
            userEmail: 'not-an-email',
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid email format')
    })

    it('should return 400 for invalid page format', async () => {
        const request = createPostRequest({
            type: 'view',
            userId: 'user1',
            page: 'not-a-path',
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('Invalid page format')
    })

    it('should record valid activity', async () => {
        mockAdd.mockResolvedValue({ id: 'new-activity-id' })

        const request = createPostRequest({
            type: 'login',
            userId: 'user1',
            userEmail: 'user@example.com',
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'login',
                userId: 'user1',
                userEmail: 'user@example.com',
            })
        )
    })

    it('should sanitize and truncate user agent', async () => {
        mockAdd.mockResolvedValue({ id: 'new-activity-id' })

        const longUserAgent = 'A'.repeat(1000)
        const request = createPostRequest({
            type: 'view',
            userId: 'user1',
            page: '/movies',
            userAgent: longUserAgent,
        })
        await POST(request)

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                userAgent: expect.stringMatching(/^A{500}$/),
            })
        )
    })

    it('should enforce rate limiting', async () => {
        mockAdd.mockResolvedValue({ id: 'new-activity-id' })

        const validBody = {
            type: 'view',
            userId: 'user1',
            page: '/movies',
        }

        // Make 30 requests (should succeed)
        for (let i = 0; i < 30; i++) {
            const request = createPostRequest(validBody, '192.168.1.1')
            const response = await POST(request)
            expect(response.status).toBe(200)
        }

        // 31st request should be rate limited
        const request = createPostRequest(validBody, '192.168.1.1')
        const response = await POST(request)

        expect(response.status).toBe(429)
        const data = await response.json()
        expect(data.error).toContain('Rate limit exceeded')
    })

    it('should allow requests from different IPs', async () => {
        mockAdd.mockResolvedValue({ id: 'new-activity-id' })

        const validBody = {
            type: 'view',
            userId: 'user1',
            page: '/movies',
        }

        // Make 30 requests from IP 1
        for (let i = 0; i < 30; i++) {
            const request = createPostRequest(validBody, '192.168.1.1')
            const response = await POST(request)
            expect(response.status).toBe(200)
        }

        // Request from IP 2 should succeed
        const request = createPostRequest(validBody, '192.168.1.2')
        const response = await POST(request)
        expect(response.status).toBe(200)
    })

    it('should accept guest activity', async () => {
        mockAdd.mockResolvedValue({ id: 'new-activity-id' })

        const request = createPostRequest({
            type: 'view',
            guestId: 'guest-123',
            page: '/tv',
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'view',
                guestId: 'guest-123',
                userId: null,
                page: '/tv',
            })
        )
    })
})
