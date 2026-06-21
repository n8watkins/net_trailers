/**
 * /api/upload — image uploads to Vercel Blob.
 *
 * Authenticated users upload images (avatars, forum/thread images). Files are
 * stored under `uploads/{userId}/...` and served from the Blob CDN. Requires
 * BLOB_READ_WRITE_TOKEN (read automatically by @vercel/blob).
 */

import { del, put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

import { withAuth } from '@/lib/auth-middleware'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB

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
    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Image must be less than 5MB' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || 'webp').toLowerCase().replace(/[^a-z0-9]/g, '')
    const pathname = `uploads/${userId}/${crypto.randomUUID()}.${ext}`

    try {
        const blob = await put(pathname, file, { access: 'public' })
        return NextResponse.json({ url: blob.url })
    } catch (error) {
        console.error('[upload] Vercel Blob put failed:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
})

export const DELETE = withAuth(async (request: NextRequest, userId: string) => {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    if (!url) {
        return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }
    // Only allow deleting blobs the user owns (path is scoped to their userId).
    if (!url.includes(`/uploads/${userId}/`)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    try {
        await del(url)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[upload] Vercel Blob del failed:', error)
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }
})
