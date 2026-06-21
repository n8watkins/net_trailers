/**
 * Image Upload Utilities
 *
 * Firebase Storage has been removed. Images are now returned as base64 data
 * URLs so that forum/thread components keep working without any server-side
 * storage dependency.
 *
 * NOTE: Data URLs are suitable for small images in a portfolio context.
 * To support large-file hosting in the future, swap `uploadImage` /
 * `uploadImages` to upload to S3, Cloudinary, or Vercel Blob — the exported
 * function signatures are unchanged, so callers need no modifications.
 *
 * Delete functions are no-ops because there is no remote object to remove;
 * data URLs live only in the document/database field that references them.
 */

import imageCompression from 'browser-image-compression'

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
 * Read a File as a base64 data URL.
 */
function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file as data URL'))
        reader.readAsDataURL(file)
    })
}

/**
 * "Upload" an image — compresses it and returns a base64 data URL.
 *
 * The `path` parameter is accepted for API compatibility but not used;
 * swap this function body for a real upload when object storage is added.
 */
export async function uploadImage(file: File, _path: string): Promise<string> {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image')
        }

        // Validate file size (max 5MB before compression)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            throw new Error('Image size must be less than 5MB')
        }

        // Compress before encoding
        const compressedFile = await compressImage(file)

        // Return data URL (no remote upload)
        return await fileToDataURL(compressedFile)
    } catch (error) {
        console.error('Error processing image:', error)
        throw error
    }
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
 * Delete an image — no-op when using data URLs.
 * If a remote storage provider is added later, implement the delete here.
 */
export async function deleteImage(_imageUrl: string): Promise<void> {
    // Data URLs have no remote object to delete.
}

/**
 * Delete multiple images — no-op when using data URLs.
 */
export async function deleteImages(_imageUrls: string[]): Promise<void> {
    // Data URLs have no remote objects to delete.
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
