import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../../../lib/auth-middleware'
import { getAdminDb } from '../../../../../lib/firebase-admin'

/**
 * GET /api/admin/users/filtered
 *
 * Get filtered list of users for email targeting (ADMIN ONLY)
 * Requires authentication
 *
 * Query params:
 * - filter: 'all' | 'trending' | 'social' | 'recent' | 'inactive'
 */
async function handleGetFilteredUsers(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
        // ADMIN ONLY: Check if user is admin
        const ADMIN_UID = process.env.ADMIN_UID
        if (!ADMIN_UID || userId !== ADMIN_UID) {
            console.error('[AdminUsersFiltered] User is not admin:', userId)
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter') || 'all'

        console.log(`👥 [AdminUsersFiltered] Fetching users with filter: ${filter}`)

        const db = getAdminDb()

        // Fetch all users from Firestore
        const usersSnapshot = await db.collection('users').get()

        interface UserData {
            userId: string
            email: string
            displayName?: string
            createdAt: number
            lastActive?: number
            emailNotifications: {
                trending: boolean
                social: boolean
            }
        }

        const users: UserData[] = usersSnapshot.docs
            .map((doc) => {
                const data = doc.data()
                return {
                    userId: doc.id,
                    email: data.email || '',
                    displayName: data.displayName,
                    createdAt: data.createdAt || 0,
                    lastActive: data.lastActive,
                    emailNotifications: {
                        trending: data.emailNotifications?.trending || false,
                        social: data.emailNotifications?.social || false,
                    },
                }
            })
            .filter((u) => Boolean(u.email)) // Only include users with email addresses

        // Apply filtering based on query parameter
        let filteredUsers = users

        switch (filter) {
            case 'trending':
                filteredUsers = users.filter((u) => u.emailNotifications.trending === true)
                break
            case 'social':
                filteredUsers = users.filter((u) => u.emailNotifications.social === true)
                break
            case 'recent': {
                // Active in last 7 days
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
                filteredUsers = users.filter((u) => (u.lastActive || 0) > sevenDaysAgo)
                break
            }
            case 'inactive': {
                // Not active in last 30 days
                const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
                filteredUsers = users.filter((u) => (u.lastActive || 0) < thirtyDaysAgo)
                break
            }
            case 'all':
            default:
                // Return all users
                break
        }

        // Sort by last active (most recent first), fallback to createdAt
        filteredUsers.sort((a, b) => {
            const aTime = a.lastActive || a.createdAt || 0
            const bTime = b.lastActive || b.createdAt || 0
            return bTime - aTime
        })

        console.log(
            `👥 [AdminUsersFiltered] Returning ${filteredUsers.length} users (filter: ${filter})`
        )

        return NextResponse.json({
            success: true,
            users: filteredUsers,
            totalUsers: users.length,
            filter,
        })
    } catch (error) {
        console.error('[AdminUsersFiltered] Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch users',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

export const GET = withAuth(handleGetFilteredUsers)
