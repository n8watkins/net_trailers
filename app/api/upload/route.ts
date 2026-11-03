/**
 * /api/upload - image uploads to the R2 bucket bound as UPLOADS (lib/uploads.ts).
 *
 * Authenticated users upload images (avatars, forum/thread images). Files are
 * stored under `uploads/{userId}/...` and served by the Worker at the returned
 * site-relative path.
 */

import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'
import { cloudflareEnv } from '@/lib/cloudflare/env'
import { UPLOAD_MAX_BYTES, UPLOAD_TYPES, newUploadKey, ownedUploadKey } from '@/lib/uploads'

function bucket() {
    return cloudflareEnv()?.UPLOADS
}

export const POST = withAuth(async (request: NextRequest, userId: string) => {
    let form: FormData
    try {
        form = await request.formData()
    } catch {
        return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
    }

    const file = form.get('file')
    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!UPLOAD_TYPES[file.type]) {
        return NextResponse.json(
            { error: 'Image must be a JPEG, PNG, WebP, GIF or AVIF file' },
            { status: 400 }
        )
    }
    if (file.size > UPLOAD_MAX_BYTES) {
        return NextResponse.json({ error: 'Image must be less than 5MB' }, { status: 400 })
    }

    const uploads = bucket()
    if (!uploads) {
        return NextResponse.json({ error: 'Uploads are not available here' }, { status: 503 })
    }

    const { key, path } = newUploadKey(userId, file.type)
    try {
        await uploads.put(key, await file.arrayBuffer(), {
            httpMetadata: { contentType: file.type },
        })
        return NextResponse.json({ url: path })
    } catch (error) {
        console.error('[upload] R2 put failed:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
})

export const DELETE = withAuth(async (request: NextRequest, userId: string) => {
    const url = new URL(request.url).searchParams.get('url')
    if (!url) {
        return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }
    // Only the user's own uploads (the path is scoped to their userId).
    const key = ownedUploadKey(url, userId)
    if (!key) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const uploads = bucket()
    if (!uploads) {
        return NextResponse.json({ error: 'Uploads are not available here' }, { status: 503 })
    }
    try {
        await uploads.delete(key)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[upload] R2 delete failed:', error)
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }
})
