/**
 * Image Upload Utilities
 *
 * Handles uploading images to Firebase Storage for forum content
 * with automatic compression for optimized file sizes
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/firebase'
import imageCompression from 'browser-image-compression'

/**
 * Compress an image file to reduce size and improve performance
 * @param file - The image file to compress
 * @returns Promise<File> - The compressed image file
 */
export async function compressImage(file: File): Promise<File> {
    try {
        // Skip compression for small files (< 100KB)
        if (file.size < 100 * 1024) {
            console.log('Image already small, skipping compression:', file.name)
            return file
        }

        const options = {
            maxSizeMB: 1, // Maximum file size in MB
            maxWidthOrHeight: 1920, // Maximum dimension (width or height)
            useWebWorker: true, // Use web worker for better performance
            fileType: 'image/jpeg', // Convert to JPEG for best compression
            initialQuality: 0.85, // Quality setting (0-1)
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
        return file // Fallback to original file if compression fails
    }
}

/**
 * Upload an image to Firebase Storage with automatic compression
 * @param file - The image file to upload
 * @param path - The storage path (e.g., 'forum/threads/{threadId}')
 * @returns Promise<string> - The download URL of the uploaded image
 */
export async function uploadImage(file: File, path: string): Promise<string> {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image')
        }

        // Validate file size (max 5MB before compression)
        const maxSize = 5 * 1024 * 1024 // 5MB in bytes
        if (file.size > maxSize) {
            throw new Error('Image size must be less than 5MB')
        }

        // Compress image before uploading
        const compressedFile = await compressImage(file)

        // Create a unique filename using timestamp and random string
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 15)
        // Always use .jpg extension since we convert to JPEG
        const filename = `${timestamp}_${randomStr}.jpg`

        // Create storage reference
        const storageRef = ref(storage, `${path}/${filename}`)

        // Upload compressed file
        await uploadBytes(storageRef, compressedFile)

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef)

        return downloadURL
    } catch (error) {
        console.error('Error uploading image:', error)
        throw error
    }
}

/**
 * Upload multiple images to Firebase Storage
 * @param files - Array of image files to upload
 * @param path - The storage path (e.g., 'forum/threads/{threadId}')
 * @returns Promise<string[]> - Array of download URLs
 */
export async function uploadImages(files: File[], path: string): Promise<string[]> {
    try {
        // Validate number of files (max 4 images per post)
        if (files.length > 4) {
            throw new Error('Maximum 4 images allowed per post')
        }

        // Upload all files in parallel
        const uploadPromises = files.map((file) => uploadImage(file, path))
        const downloadURLs = await Promise.all(uploadPromises)

        return downloadURLs
    } catch (error) {
        console.error('Error uploading images:', error)
        throw error
    }
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The download URL of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
    try {
        // Extract storage path from URL
        const storageRef = ref(storage, imageUrl)
        await deleteObject(storageRef)
    } catch (error) {
        console.error('Error deleting image:', error)
        throw error
    }
}

/**
 * Delete multiple images from Firebase Storage
 * @param imageUrls - Array of download URLs to delete
 */
export async function deleteImages(imageUrls: string[]): Promise<void> {
    try {
        const deletePromises = imageUrls.map((url) => deleteImage(url))
        await Promise.all(deletePromises)
    } catch (error) {
        console.error('Error deleting images:', error)
        throw error
    }
}

/**
 * Validate image file
 * @param file - The file to validate
 * @returns boolean - True if valid, false otherwise
 */
export function isValidImageFile(file: File): boolean {
    // Check file type
    if (!file.type.startsWith('image/')) {
        return false
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
        return false
    }

    return true
}

/**
 * Get file size in human-readable format
 * @param bytes - File size in bytes
 * @returns string - Formatted file size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
