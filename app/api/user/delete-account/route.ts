/**
 * /api/user/delete-account — permanently delete the current user and all data.
 *
 * The user id comes from the Auth.js session (never the request body). After
 * this returns the client should sign out (the session row is already deleted).
 */

import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { deleteUserAccount } from '@/db/queries/account'

export const DELETE = withAuth(async (_request, userId: string) => {
    try {
        await deleteUserAccount(userId)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[delete-account] failed:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete account' },
            { status: 500 }
        )
    }
})
