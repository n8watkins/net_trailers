/**
 * Image Upload Utilities
 *
 * Images are compressed client-side then uploaded to **Vercel Blob** via the
 * server route `/api/upload` (which holds BLOB_READ_WRITE_TOKEN). The route
 * returns a public CDN URL that is stored in the relevant DB field.
 */

import imageCompression from 'browser-image-compression'
import { authenticatedFetch } from '../lib/authenticatedFetch'

/**
 * Compress an image file to reduce size and improve performance.
 */
export async function compressImage(file: File): Promise<File> {
    try {
        // Skip compression for small files (< 100KB)
        if (file.size < 100 * 1024) {
            console.log('Image already small, skipping compression:', file.name)
            return file
        }

        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: 0.85,
        }

        console.log('Compressing image:', file.name, 'Original size:', formatFileSize(file.size))

        const compressedFile = await imageCompression(file, options)

        console.log(
            'Compression complete:',
            compressedFile.name,
            'New size:',
            formatFileSize(compressedFile.size),
            `(${Math.round(((file.size - compressedFile.size) / file.size) * 100)}% reduction)`
        )

        return compressedFile
    } catch (error) {
        console.error('Image compression failed, using original:', error)
        return file
    }
}

/**
 * Upload an image — compresses it client-side, then uploads to Vercel Blob via
 * `/api/upload`. Returns the public CDN URL. The `path` parameter is used as a
 * grouping hint for the blob key.
 */
export async function uploadImage(file: File, path: string): Promise<string> {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image')
    }

    // Validate file size (max 5MB before compression)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
        throw new Error('Image size must be less than 5MB')
    }

    // Compress before upload
    const compressedFile = await compressImage(file)

    const form = new FormData()
    form.append('file', compressedFile, compressedFile.name || 'image.webp')
    if (path) form.append('path', path)

    const res = await authenticatedFetch('/api/upload', { method: 'POST', body: form })
    if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Image upload failed')
    }
    const data = await res.json()
    return data.url as string
}

/**
 * "Upload" multiple images — returns an array of base64 data URLs.
 */
export async function uploadImages(files: File[], path: string): Promise<string[]> {
    try {
        if (files.length > 4) {
            throw new Error('Maximum 4 images allowed per post')
        }

        const uploadPromises = files.map((file) => uploadImage(file, path))
        return await Promise.all(uploadPromises)
    } catch (error) {
        console.error('Error processing images:', error)
        throw error
    }
}

/**
 * Delete an image from Vercel Blob (best-effort; only the owner's blobs).
 * Ignores non-blob URLs (e.g. legacy data URLs).
 */
export async function deleteImage(imageUrl: string): Promise<void> {
    if (!imageUrl || !imageUrl.includes('.blob.vercel-storage.com')) return
    try {
        await authenticatedFetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
            method: 'DELETE',
        })
    } catch (error) {
        console.warn('Failed to delete image:', error)
    }
}

/**
 * Delete multiple images (best-effort).
 */
export async function deleteImages(imageUrls: string[]): Promise<void> {
    await Promise.all(imageUrls.map((url) => deleteImage(url)))
}

/**
 * Validate image file.
 */
export function isValidImageFile(file: File): boolean {
    if (!file.type.startsWith('image/')) {
        return false
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
        return false
    }

    return true
}

/**
 * Get file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
