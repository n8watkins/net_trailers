/**
 * /api/user/delete-account - permanently delete the current user and all data,
 * uploaded images included.
 *
 * The user id comes from the Auth.js session (never the request body). After
 * this returns the client should sign out (the session row is already deleted).
 *
 * Order, and what a failure leaves behind:
 *  1. The user's uploads (R2, `uploads/<userId>/`). If this fails nothing in
 *     the database has been touched: the account still works, the answer is
 *     an error, and trying again deletes the rest.
 *  2. The database rows, in one transaction (db/queries/account.ts). If this
 *     fails the account is still whole, minus some images, and can be retried.
 *  3. The uploads again, for an image whose upload finished between 1 and 2
 *     (the session is gone after 2, so no more can arrive). The account is
 *     already deleted by then, so a failure here is logged, not answered.
 * Deleting the database first would be worse: a failed file delete could then
 * never be retried by the user, whose account no longer exists.
 */

import { NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { cloudflareEnv } from '@/lib/cloudflare/env'
import { deleteUserUploads, type UploadBucket } from '@/lib/uploads'
import { deleteUserAccount } from '@/db/queries/account'

/**
 * The uploads bucket, or null off Workers (next dev, next start, tests), where
 * /api/upload answers 503 and so no upload can exist. On Workers a missing
 * binding is a misconfiguration: refuse rather than leave the files behind.
 */
function uploadsBucket(): UploadBucket | null {
    const env = cloudflareEnv()
    if (!env) return null
    if (!env.UPLOADS) throw new Error('UPLOADS binding is missing')
    return env.UPLOADS
}

export const DELETE = withAuth(async (_request, userId: string) => {
    let bucket: UploadBucket | null
    try {
        bucket = uploadsBucket()
        if (bucket) await deleteUserUploads(bucket, userId)
    } catch (error) {
        console.error('[delete-account] deleting uploads failed; account kept:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Could not delete your uploaded images, so your account was not deleted. Please try again.',
            },
            { status: 500 }
        )
    }

    try {
        await deleteUserAccount(userId)
    } catch (error) {
        console.error('[delete-account] failed:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete account' },
            { status: 500 }
        )
    }

    if (bucket) {
        try {
            await deleteUserUploads(bucket, userId)
        } catch (error) {
            console.error('[delete-account] final uploads sweep failed:', error)
        }
    }
    return NextResponse.json({ success: true })
})
